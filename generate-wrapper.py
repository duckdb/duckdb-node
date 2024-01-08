import shutil
import sys
import pycparser
import tempfile
import urllib.request
import os
import zipfile

# those functions return promises asynchronously since they may block and/or do IO
async_functions = ['duckdb_open', 'duckdb_open_ext', 'duckdb_close', 'duckdb_connect', 'duckdb_disconnect', 'duckdb_query', 'duckdb_prepare', 'duckdb_execute_prepared', 'duckdb_stream_fetch_chunk', 'duckdb_execute_tasks', 'duckdb_appender_create', 'duckdb_appender_flush', 'duckdb_appender_close', 'duckdb_appender_destroy', 'duckdb_execute_prepared', 'duckdb_extract_statements', 'duckdb_prepare_extracted_statement', 'duckdb_execute_pending']

pointer_wrappers = ['duckdb_appender',
                     'duckdb_config', 'duckdb_connection', 'duckdb_data_chunk', 'duckdb_database', 'duckdb_extracted_statements', 'duckdb_logical_type', 'duckdb_pending_result', 'duckdb_prepared_statement', 'duckdb_value', 'duckdb_vector'] # 'duckdb_arrow', 'duckdb_arrow_array', 'duckdb_arrow_schema', 'duckdb_arrow_stream'

deprecated_functions = ['duckdb_column_data', 'duckdb_nullmask_data', 'duckdb_validity_row_is_valid', 'duckdb_validity_set_row_invalid', 'duckdb_validity_set_row_valid', 'duckdb_validity_set_row_validity', 'duckdb_value_blob', 'duckdb_value_boolean', 'duckdb_value_date', 'duckdb_value_decimal', 'duckdb_value_double', 'duckdb_value_float', 'duckdb_value_hugeint', 'duckdb_value_int16', 'duckdb_value_int32', 'duckdb_value_int64', 'duckdb_value_int8', 'duckdb_value_interval', 'duckdb_value_is_null', 'duckdb_value_string', 'duckdb_value_string_internal', 'duckdb_value_time', 'duckdb_value_timestamp', 'duckdb_value_uint16', 'duckdb_value_uint32', 'duckdb_value_uint64', 'duckdb_value_uint8', 'duckdb_value_varchar', 'duckdb_value_varchar_internal']

def typename(decl):
    const = ''
    if hasattr(decl, 'quals') and 'const' in decl.quals:
        const = 'const '
    if isinstance(decl, pycparser.c_ast.TypeDecl):
        return const + typename(decl.type)
    elif isinstance(decl, pycparser.c_ast.PtrDecl):
        return const + typename(decl.type) + '*'
    elif isinstance(decl, pycparser.c_ast.IdentifierType):
        return decl.names[0].replace('_Bool', 'bool')
    else:
       raise ValueError(decl)

class DuckDBHeaderVisitor(pycparser.c_ast.NodeVisitor):
    result = ''
    types_result = ''
    c_type_to_ts_type = {
        "bool": "boolean",
        "double": "number",
        "char*": "string",
        "const char*": "string",
        "idx_t": "number",
        "int64_t": "number", # should use bigint because max safe int in JS is 2^53-1
        "uint8_t": "number",
        "uint32_t": "number",
        "size_t": "number",
        "void": "void",
    }

    def visit_TypeDecl(self, node):
        name = node.declname
        if not name.startswith('duckdb_'):
            return

        if isinstance(node.type, pycparser.c_ast.Struct):
            self.result += f'exports.Set(Napi::String::New(env, "{name}"), duckdb_node::PointerHolder<{name}>::Init(env, "{name}")->Value());\n'
            self.types_result += f'export type {name} = object;\n'
            self.c_type_to_ts_type[name] = name

        if isinstance(node.type, pycparser.c_ast.Enum):
            self.result += f'auto {name}_enum = Napi::Object::New(env);\n'
            self.types_result += f'export enum {name} {{\n'
            self.c_type_to_ts_type[name] = name
            enum_idx = 0
            for enum in node.type.values.enumerators:
                if enum.value is not None:
                    enum_idx = int(enum.value.value)
                self.result += f'{name}_enum.Set("{enum.name}", {enum_idx});\n'
                self.types_result += f'  {enum.name} = {enum_idx},\n'
                enum_idx += 1
            self.result += f'exports.DefineProperty(Napi::PropertyDescriptor::Value("{name}", {name}_enum, static_cast<napi_property_attributes>(napi_enumerable | napi_configurable)));\n'
            self.types_result += f'}}\n'


    def visit_FuncDecl(self, node):
       name = None
       ret = typename(node.type)

       args = []
       if isinstance(node.type, pycparser.c_ast.TypeDecl):
           name = node.type.declname
       elif isinstance(node.type, pycparser.c_ast.PtrDecl):
           name = node.type.type.declname
       else:
           raise ValueError(node.type)


       if node.args:
           for p in node.args.params:
               args.append(typename(p.type))

       if name == '__routine':
           return # ??

       if 'replacement' in name:
           return # ??

       if 'delete_callback' in name:
           return # ??

       if 'duckdb_init_' in name:
            return

       if 'table_function' in name:
           return # TODO

       if 'arrow' in name:
           return # TODO

       if name in deprecated_functions:
           return

       print(f"{name}")

       n_args = len(args)
       args.append(name)
       asyncstr = ''
       if name in async_functions:
           asyncstr = 'Async'
       voidstr = ''
       if ret == 'void':
           voidstr = 'Void'
       else:
           args.insert(0, ret)
       arg_str = ', '.join(args)

       self.result += f'exports.Set(Napi::String::New(env, "{name}"), Napi::Function::New<duckdb_node::FunctionWrappers::{asyncstr}FunctionWrapper{n_args}{voidstr}<{arg_str}>>(env));\n'
       if ret in self.c_type_to_ts_type:
           self.types_result += f'export function {name}(): {self.c_type_to_ts_type[ret]};\n' 
       else:
           self.types_result += f'// export function {name}(): {ret};\n'


def create_func_defs(filename):
    ast = pycparser.parse_file(filename, use_cpp=False)

    v = DuckDBHeaderVisitor()
    v.visit(ast)
    return v.result


if __name__ == "__main__":

    with tempfile.TemporaryDirectory() as tmp:
        zip_path = os.path.join(tmp, "libduckdb.zip")
        urllib.request.urlretrieve("https://github.com/duckdb/duckdb/releases/download/v0.9.2/libduckdb-osx-universal.zip", zip_path)
        zip = zipfile.ZipFile(zip_path)
        zip.extract("libduckdb.dylib", tmp)
        shutil.copy(os.path.join(tmp, "libduckdb.dylib"), "lib/binding/libduckdb")

        zip.extract("duckdb.h", "src")
        zip.extract("duckdb.h", tmp)

        os.system("sed -i -e 's/#include <stdlib.h>/#include <stddef.h>/' %s" % os.path.join(tmp, "duckdb.h")) # until 0.10.0 has been released
        os.system("gcc -E -D__builtin_va_list=int %s > %s" % (os.path.join(tmp, "duckdb.h"), os.path.join(tmp, "duckdb-preprocessed.h")))

        cpp_result, types_result = create_func_defs(os.path.join(tmp, "duckdb-preprocessed.h"))

        out = open('src/duckdb_node_generated.cpp', 'wb')
        out.write('// This file is generated by generate-wrapper.py, please do not edit\n\n#include "function_wrappers.hpp"\n#include "duckdb.h"\n\nstatic void RegisterGenerated(Napi::Env env, Napi::Object exports){\n'.encode())
        out.write(cpp_result.encode())
        out.write('}\n\n'.encode())
        types_out = open('lib/duckdb.d.ts', 'wb')
        types_out.write(types_result.encode())

