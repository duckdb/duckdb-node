// placeholder interfaces for pointer types
export interface pointer {}
export interface uint64_pointer extends pointer {}
export interface idx_pointer extends pointer {}
// bindings-defined types
export class out_string_wrapper {}
// generated types and functions
export enum duckdb_type {
  DUCKDB_TYPE_INVALID = 0,
  DUCKDB_TYPE_BOOLEAN = 1,
  DUCKDB_TYPE_TINYINT = 2,
  DUCKDB_TYPE_SMALLINT = 3,
  DUCKDB_TYPE_INTEGER = 4,
  DUCKDB_TYPE_BIGINT = 5,
  DUCKDB_TYPE_UTINYINT = 6,
  DUCKDB_TYPE_USMALLINT = 7,
  DUCKDB_TYPE_UINTEGER = 8,
  DUCKDB_TYPE_UBIGINT = 9,
  DUCKDB_TYPE_FLOAT = 10,
  DUCKDB_TYPE_DOUBLE = 11,
  DUCKDB_TYPE_TIMESTAMP = 12,
  DUCKDB_TYPE_DATE = 13,
  DUCKDB_TYPE_TIME = 14,
  DUCKDB_TYPE_INTERVAL = 15,
  DUCKDB_TYPE_HUGEINT = 16,
  DUCKDB_TYPE_UHUGEINT = 17,
  DUCKDB_TYPE_VARCHAR = 18,
  DUCKDB_TYPE_BLOB = 19,
  DUCKDB_TYPE_DECIMAL = 20,
  DUCKDB_TYPE_TIMESTAMP_S = 21,
  DUCKDB_TYPE_TIMESTAMP_MS = 22,
  DUCKDB_TYPE_TIMESTAMP_NS = 23,
  DUCKDB_TYPE_ENUM = 24,
  DUCKDB_TYPE_LIST = 25,
  DUCKDB_TYPE_STRUCT = 26,
  DUCKDB_TYPE_MAP = 27,
  DUCKDB_TYPE_UUID = 28,
  DUCKDB_TYPE_UNION = 29,
  DUCKDB_TYPE_BIT = 30,
  DUCKDB_TYPE_TIME_TZ = 31,
  DUCKDB_TYPE_TIMESTAMP_TZ = 32,
}
export enum duckdb_state {
  DuckDBSuccess = 0,
  DuckDBError = 1,
}
export enum duckdb_pending_state {
  DUCKDB_PENDING_RESULT_READY = 0,
  DUCKDB_PENDING_RESULT_NOT_READY = 1,
  DUCKDB_PENDING_ERROR = 2,
  DUCKDB_PENDING_NO_TASKS_AVAILABLE = 3,
}
export enum duckdb_result_type {
  DUCKDB_RESULT_TYPE_INVALID = 0,
  DUCKDB_RESULT_TYPE_CHANGED_ROWS = 1,
  DUCKDB_RESULT_TYPE_NOTHING = 2,
  DUCKDB_RESULT_TYPE_QUERY_RESULT = 3,
}
export enum duckdb_statement_type {
  DUCKDB_STATEMENT_TYPE_INVALID = 0,
  DUCKDB_STATEMENT_TYPE_SELECT = 1,
  DUCKDB_STATEMENT_TYPE_INSERT = 2,
  DUCKDB_STATEMENT_TYPE_UPDATE = 3,
  DUCKDB_STATEMENT_TYPE_EXPLAIN = 4,
  DUCKDB_STATEMENT_TYPE_DELETE = 5,
  DUCKDB_STATEMENT_TYPE_PREPARE = 6,
  DUCKDB_STATEMENT_TYPE_CREATE = 7,
  DUCKDB_STATEMENT_TYPE_EXECUTE = 8,
  DUCKDB_STATEMENT_TYPE_ALTER = 9,
  DUCKDB_STATEMENT_TYPE_TRANSACTION = 10,
  DUCKDB_STATEMENT_TYPE_COPY = 11,
  DUCKDB_STATEMENT_TYPE_ANALYZE = 12,
  DUCKDB_STATEMENT_TYPE_VARIABLE_SET = 13,
  DUCKDB_STATEMENT_TYPE_CREATE_FUNC = 14,
  DUCKDB_STATEMENT_TYPE_DROP = 15,
  DUCKDB_STATEMENT_TYPE_EXPORT = 16,
  DUCKDB_STATEMENT_TYPE_PRAGMA = 17,
  DUCKDB_STATEMENT_TYPE_VACUUM = 18,
  DUCKDB_STATEMENT_TYPE_CALL = 19,
  DUCKDB_STATEMENT_TYPE_SET = 20,
  DUCKDB_STATEMENT_TYPE_LOAD = 21,
  DUCKDB_STATEMENT_TYPE_RELATION = 22,
  DUCKDB_STATEMENT_TYPE_EXTENSION = 23,
  DUCKDB_STATEMENT_TYPE_LOGICAL_PLAN = 24,
  DUCKDB_STATEMENT_TYPE_ATTACH = 25,
  DUCKDB_STATEMENT_TYPE_DETACH = 26,
  DUCKDB_STATEMENT_TYPE_MULTI = 27,
}
export type duckdb_delete_callback_t = (data: pointer) => void;
export class duckdb_task_state {}
export class duckdb_date {}
export class duckdb_date_struct {}
export class duckdb_time {}
export class duckdb_time_struct {}
export class duckdb_time_tz {}
export class duckdb_time_tz_struct {}
export class duckdb_timestamp {}
export class duckdb_timestamp_struct {}
export class duckdb_interval {}
export class duckdb_hugeint {}
export class duckdb_uhugeint {}
export class duckdb_decimal {}
export class duckdb_query_progress_type {}
export class duckdb_string_t {}
export class duckdb_list_entry {}
export class duckdb_column {}
export class duckdb_vector {}
export class duckdb_string {}
export class duckdb_blob {}
export class duckdb_result {}
export class duckdb_database {}
export class duckdb_connection {}
export class duckdb_prepared_statement {}
export class duckdb_extracted_statements {}
export class duckdb_pending_result {}
export class duckdb_appender {}
export class duckdb_config {}
export class duckdb_logical_type {}
export class duckdb_data_chunk {}
export class duckdb_value {}
export class duckdb_table_function {}
export class duckdb_bind_info {}
export class duckdb_init_info {}
export class duckdb_function_info {}
export class duckdb_replacement_scan_info {}
export class duckdb_arrow {}
export class duckdb_arrow_stream {}
export class duckdb_arrow_schema {}
export class duckdb_arrow_array {}
export function duckdb_open(path: string, out_database: duckdb_database): Promise<duckdb_state>;
export function duckdb_open_ext(path: string, out_database: duckdb_database, config: duckdb_config, out_error: out_string_wrapper): Promise<duckdb_state>;
export function duckdb_close(database: duckdb_database): Promise<void>;
export function duckdb_connect(database: duckdb_database, out_connection: duckdb_connection): Promise<duckdb_state>;
export function duckdb_interrupt(connection: duckdb_connection): void;
export function duckdb_query_progress(connection: duckdb_connection): duckdb_query_progress_type;
export function duckdb_disconnect(connection: duckdb_connection): Promise<void>;
export function duckdb_library_version(): string;
export function duckdb_create_config(out_config: duckdb_config): duckdb_state;
export function duckdb_config_count(): number;
export function duckdb_get_config_flag(index: number, out_name: out_string_wrapper, out_description: out_string_wrapper): duckdb_state;
export function duckdb_set_config(config: duckdb_config, name: string, option: string): duckdb_state;
export function duckdb_destroy_config(config: duckdb_config): void;
export function duckdb_query(connection: duckdb_connection, query: string, out_result: duckdb_result): Promise<duckdb_state>;
export function duckdb_destroy_result(result: duckdb_result): void;
export function duckdb_column_name(result: duckdb_result, col: number): string;
export function duckdb_column_type(result: duckdb_result, col: number): duckdb_type;
export function duckdb_result_statement_type(result: duckdb_result): duckdb_statement_type;
export function duckdb_column_logical_type(result: duckdb_result, col: number): duckdb_logical_type;
export function duckdb_column_count(result: duckdb_result): number;
export function duckdb_row_count(result: duckdb_result): number;
export function duckdb_rows_changed(result: duckdb_result): number;
export function duckdb_result_error(result: duckdb_result): string;
export function duckdb_result_get_chunk(result: duckdb_result, chunk_index: number): duckdb_data_chunk;
export function duckdb_result_is_streaming(result: duckdb_result): boolean;
export function duckdb_result_chunk_count(result: duckdb_result): number;
export function duckdb_result_return_type(result: duckdb_result): duckdb_result_type;
export function duckdb_value_uhugeint(result: duckdb_result, col: number, row: number): duckdb_uhugeint;
export function duckdb_malloc(size: number): pointer;
export function duckdb_free(ptr: pointer): void;
export function duckdb_vector_size(): number;
export function duckdb_string_is_inlined(string: duckdb_string_t): boolean;
export function duckdb_from_date(date: duckdb_date): duckdb_date_struct;
export function duckdb_to_date(date: duckdb_date_struct): duckdb_date;
export function duckdb_is_finite_date(date: duckdb_date): boolean;
export function duckdb_from_time(time: duckdb_time): duckdb_time_struct;
export function duckdb_create_time_tz(micros: number, offset: number): duckdb_time_tz;
export function duckdb_from_time_tz(micros: duckdb_time_tz): duckdb_time_tz_struct;
export function duckdb_to_time(time: duckdb_time_struct): duckdb_time;
export function duckdb_from_timestamp(ts: duckdb_timestamp): duckdb_timestamp_struct;
export function duckdb_to_timestamp(ts: duckdb_timestamp_struct): duckdb_timestamp;
export function duckdb_is_finite_timestamp(ts: duckdb_timestamp): boolean;
export function duckdb_hugeint_to_double(val: duckdb_hugeint): number;
export function duckdb_double_to_hugeint(val: number): duckdb_hugeint;
export function duckdb_uhugeint_to_double(val: duckdb_uhugeint): number;
export function duckdb_double_to_uhugeint(val: number): duckdb_uhugeint;
export function duckdb_double_to_decimal(val: number, width: number, scale: number): duckdb_decimal;
export function duckdb_decimal_to_double(val: duckdb_decimal): number;
export function duckdb_prepare(connection: duckdb_connection, query: string, out_prepared_statement: duckdb_prepared_statement): Promise<duckdb_state>;
export function duckdb_destroy_prepare(prepared_statement: duckdb_prepared_statement): void;
export function duckdb_prepare_error(prepared_statement: duckdb_prepared_statement): string;
export function duckdb_nparams(prepared_statement: duckdb_prepared_statement): number;
export function duckdb_parameter_name(prepared_statement: duckdb_prepared_statement, index: number): string;
export function duckdb_param_type(prepared_statement: duckdb_prepared_statement, param_idx: number): duckdb_type;
export function duckdb_clear_bindings(prepared_statement: duckdb_prepared_statement): duckdb_state;
export function duckdb_prepared_statement_type(statement: duckdb_prepared_statement): duckdb_statement_type;
export function duckdb_bind_value(prepared_statement: duckdb_prepared_statement, param_idx: number, val: duckdb_value): duckdb_state;
export function duckdb_bind_parameter_index(prepared_statement: duckdb_prepared_statement, param_idx_out: idx_pointer, name: string): duckdb_state;
export function duckdb_bind_boolean(prepared_statement: duckdb_prepared_statement, param_idx: number, val: boolean): duckdb_state;
export function duckdb_bind_int8(prepared_statement: duckdb_prepared_statement, param_idx: number, val: number): duckdb_state;
export function duckdb_bind_int16(prepared_statement: duckdb_prepared_statement, param_idx: number, val: number): duckdb_state;
export function duckdb_bind_int32(prepared_statement: duckdb_prepared_statement, param_idx: number, val: number): duckdb_state;
export function duckdb_bind_int64(prepared_statement: duckdb_prepared_statement, param_idx: number, val: number): duckdb_state;
export function duckdb_bind_hugeint(prepared_statement: duckdb_prepared_statement, param_idx: number, val: duckdb_hugeint): duckdb_state;
export function duckdb_bind_uhugeint(prepared_statement: duckdb_prepared_statement, param_idx: number, val: duckdb_uhugeint): duckdb_state;
export function duckdb_bind_decimal(prepared_statement: duckdb_prepared_statement, param_idx: number, val: duckdb_decimal): duckdb_state;
export function duckdb_bind_uint8(prepared_statement: duckdb_prepared_statement, param_idx: number, val: number): duckdb_state;
export function duckdb_bind_uint16(prepared_statement: duckdb_prepared_statement, param_idx: number, val: number): duckdb_state;
export function duckdb_bind_uint32(prepared_statement: duckdb_prepared_statement, param_idx: number, val: number): duckdb_state;
export function duckdb_bind_uint64(prepared_statement: duckdb_prepared_statement, param_idx: number, val: number): duckdb_state;
export function duckdb_bind_float(prepared_statement: duckdb_prepared_statement, param_idx: number, val: number): duckdb_state;
export function duckdb_bind_double(prepared_statement: duckdb_prepared_statement, param_idx: number, val: number): duckdb_state;
export function duckdb_bind_date(prepared_statement: duckdb_prepared_statement, param_idx: number, val: duckdb_date): duckdb_state;
export function duckdb_bind_time(prepared_statement: duckdb_prepared_statement, param_idx: number, val: duckdb_time): duckdb_state;
export function duckdb_bind_timestamp(prepared_statement: duckdb_prepared_statement, param_idx: number, val: duckdb_timestamp): duckdb_state;
export function duckdb_bind_interval(prepared_statement: duckdb_prepared_statement, param_idx: number, val: duckdb_interval): duckdb_state;
export function duckdb_bind_varchar(prepared_statement: duckdb_prepared_statement, param_idx: number, val: string): duckdb_state;
export function duckdb_bind_varchar_length(prepared_statement: duckdb_prepared_statement, param_idx: number, val: string, length: number): duckdb_state;
export function duckdb_bind_blob(prepared_statement: duckdb_prepared_statement, param_idx: number, data: pointer, length: number): duckdb_state;
export function duckdb_bind_null(prepared_statement: duckdb_prepared_statement, param_idx: number): duckdb_state;
export function duckdb_execute_prepared(prepared_statement: duckdb_prepared_statement, out_result: duckdb_result): Promise<duckdb_state>;
export function duckdb_execute_prepared_streaming(prepared_statement: duckdb_prepared_statement, out_result: duckdb_result): duckdb_state;
export function duckdb_extract_statements(connection: duckdb_connection, query: string, out_extracted_statements: duckdb_extracted_statements): Promise<number>;
export function duckdb_prepare_extracted_statement(connection: duckdb_connection, extracted_statements: duckdb_extracted_statements, index: number, out_prepared_statement: duckdb_prepared_statement): Promise<duckdb_state>;
export function duckdb_extract_statements_error(extracted_statements: duckdb_extracted_statements): string;
export function duckdb_destroy_extracted(extracted_statements: duckdb_extracted_statements): void;
export function duckdb_pending_prepared(prepared_statement: duckdb_prepared_statement, out_result: duckdb_pending_result): duckdb_state;
export function duckdb_pending_prepared_streaming(prepared_statement: duckdb_prepared_statement, out_result: duckdb_pending_result): duckdb_state;
export function duckdb_destroy_pending(pending_result: duckdb_pending_result): void;
export function duckdb_pending_error(pending_result: duckdb_pending_result): string;
export function duckdb_pending_execute_task(pending_result: duckdb_pending_result): duckdb_pending_state;
export function duckdb_pending_execute_check_state(pending_result: duckdb_pending_result): duckdb_pending_state;
export function duckdb_execute_pending(pending_result: duckdb_pending_result, out_result: duckdb_result): Promise<duckdb_state>;
export function duckdb_pending_execution_is_finished(pending_state: duckdb_pending_state): boolean;
export function duckdb_destroy_value(value: duckdb_value): void;
export function duckdb_create_varchar(text: string): duckdb_value;
export function duckdb_create_varchar_length(text: string, length: number): duckdb_value;
export function duckdb_create_int64(val: number): duckdb_value;
export function duckdb_create_struct_value(type: duckdb_logical_type, values: duckdb_value): duckdb_value;
export function duckdb_create_list_value(type: duckdb_logical_type, values: duckdb_value, value_count: number): duckdb_value;
export function duckdb_get_varchar(value: duckdb_value): string;
export function duckdb_get_int64(value: duckdb_value): number;
export function duckdb_create_logical_type(type: duckdb_type): duckdb_logical_type;
export function duckdb_logical_type_get_alias(type: duckdb_logical_type): string;
export function duckdb_create_list_type(type: duckdb_logical_type): duckdb_logical_type;
export function duckdb_create_map_type(key_type: duckdb_logical_type, value_type: duckdb_logical_type): duckdb_logical_type;
export function duckdb_create_union_type(member_types: duckdb_logical_type, member_names: out_string_wrapper, member_count: number): duckdb_logical_type;
export function duckdb_create_struct_type(member_types: duckdb_logical_type, member_names: out_string_wrapper, member_count: number): duckdb_logical_type;
export function duckdb_create_enum_type(member_names: out_string_wrapper, member_count: number): duckdb_logical_type;
export function duckdb_create_decimal_type(width: number, scale: number): duckdb_logical_type;
export function duckdb_get_type_id(type: duckdb_logical_type): duckdb_type;
export function duckdb_decimal_width(type: duckdb_logical_type): number;
export function duckdb_decimal_scale(type: duckdb_logical_type): number;
export function duckdb_decimal_internal_type(type: duckdb_logical_type): duckdb_type;
export function duckdb_enum_internal_type(type: duckdb_logical_type): duckdb_type;
export function duckdb_enum_dictionary_size(type: duckdb_logical_type): number;
export function duckdb_enum_dictionary_value(type: duckdb_logical_type, index: number): string;
export function duckdb_list_type_child_type(type: duckdb_logical_type): duckdb_logical_type;
export function duckdb_map_type_key_type(type: duckdb_logical_type): duckdb_logical_type;
export function duckdb_map_type_value_type(type: duckdb_logical_type): duckdb_logical_type;
export function duckdb_struct_type_child_count(type: duckdb_logical_type): number;
export function duckdb_struct_type_child_name(type: duckdb_logical_type, index: number): string;
export function duckdb_struct_type_child_type(type: duckdb_logical_type, index: number): duckdb_logical_type;
export function duckdb_union_type_member_count(type: duckdb_logical_type): number;
export function duckdb_union_type_member_name(type: duckdb_logical_type, index: number): string;
export function duckdb_union_type_member_type(type: duckdb_logical_type, index: number): duckdb_logical_type;
export function duckdb_destroy_logical_type(type: duckdb_logical_type): void;
export function duckdb_create_data_chunk(types: duckdb_logical_type, column_count: number): duckdb_data_chunk;
export function duckdb_destroy_data_chunk(chunk: duckdb_data_chunk): void;
export function duckdb_data_chunk_reset(chunk: duckdb_data_chunk): void;
export function duckdb_data_chunk_get_column_count(chunk: duckdb_data_chunk): number;
export function duckdb_data_chunk_get_vector(chunk: duckdb_data_chunk, col_idx: number): duckdb_vector;
export function duckdb_data_chunk_get_size(chunk: duckdb_data_chunk): number;
export function duckdb_data_chunk_set_size(chunk: duckdb_data_chunk, size: number): void;
export function duckdb_vector_get_column_type(vector: duckdb_vector): duckdb_logical_type;
export function duckdb_vector_get_data(vector: duckdb_vector): pointer;
export function duckdb_vector_get_validity(vector: duckdb_vector): uint64_pointer;
export function duckdb_vector_assign_string_element(vector: duckdb_vector, index: number, str: string): void;
export function duckdb_vector_assign_string_element_len(vector: duckdb_vector, index: number, str: string, str_len: number): void;
export function duckdb_list_vector_get_child(vector: duckdb_vector): duckdb_vector;
export function duckdb_list_vector_get_size(vector: duckdb_vector): number;
export function duckdb_list_vector_set_size(vector: duckdb_vector, size: number): duckdb_state;
export function duckdb_list_vector_reserve(vector: duckdb_vector, required_capacity: number): duckdb_state;
export function duckdb_struct_vector_get_child(vector: duckdb_vector, index: number): duckdb_vector;
export function duckdb_validity_row_is_valid(validity: uint64_pointer, row: number): boolean;
export function duckdb_bind_get_extra_info(info: duckdb_bind_info): pointer;
export function duckdb_bind_add_result_column(info: duckdb_bind_info, name: string, type: duckdb_logical_type): void;
export function duckdb_bind_get_parameter_count(info: duckdb_bind_info): number;
export function duckdb_bind_get_parameter(info: duckdb_bind_info, index: number): duckdb_value;
export function duckdb_bind_get_named_parameter(info: duckdb_bind_info, name: string): duckdb_value;
export function duckdb_bind_set_cardinality(info: duckdb_bind_info, cardinality: number, is_exact: boolean): void;
export function duckdb_bind_set_error(info: duckdb_bind_info, error: string): void;
export function duckdb_function_get_extra_info(info: duckdb_function_info): pointer;
export function duckdb_function_get_bind_data(info: duckdb_function_info): pointer;
export function duckdb_function_get_init_data(info: duckdb_function_info): pointer;
export function duckdb_function_get_local_init_data(info: duckdb_function_info): pointer;
export function duckdb_function_set_error(info: duckdb_function_info, error: string): void;
export function duckdb_appender_create(connection: duckdb_connection, schema: string, table: string, out_appender: duckdb_appender): Promise<duckdb_state>;
export function duckdb_appender_column_count(appender: duckdb_appender): number;
export function duckdb_appender_column_type(appender: duckdb_appender, col_idx: number): duckdb_logical_type;
export function duckdb_appender_error(appender: duckdb_appender): string;
export function duckdb_appender_flush(appender: duckdb_appender): Promise<duckdb_state>;
export function duckdb_appender_close(appender: duckdb_appender): Promise<duckdb_state>;
export function duckdb_appender_destroy(appender: duckdb_appender): Promise<duckdb_state>;
export function duckdb_appender_begin_row(appender: duckdb_appender): duckdb_state;
export function duckdb_appender_end_row(appender: duckdb_appender): duckdb_state;
export function duckdb_append_bool(appender: duckdb_appender, value: boolean): duckdb_state;
export function duckdb_append_int8(appender: duckdb_appender, value: number): duckdb_state;
export function duckdb_append_int16(appender: duckdb_appender, value: number): duckdb_state;
export function duckdb_append_int32(appender: duckdb_appender, value: number): duckdb_state;
export function duckdb_append_int64(appender: duckdb_appender, value: number): duckdb_state;
export function duckdb_append_hugeint(appender: duckdb_appender, value: duckdb_hugeint): duckdb_state;
export function duckdb_append_uint8(appender: duckdb_appender, value: number): duckdb_state;
export function duckdb_append_uint16(appender: duckdb_appender, value: number): duckdb_state;
export function duckdb_append_uint32(appender: duckdb_appender, value: number): duckdb_state;
export function duckdb_append_uint64(appender: duckdb_appender, value: number): duckdb_state;
export function duckdb_append_uhugeint(appender: duckdb_appender, value: duckdb_uhugeint): duckdb_state;
export function duckdb_append_float(appender: duckdb_appender, value: number): duckdb_state;
export function duckdb_append_double(appender: duckdb_appender, value: number): duckdb_state;
export function duckdb_append_date(appender: duckdb_appender, value: duckdb_date): duckdb_state;
export function duckdb_append_time(appender: duckdb_appender, value: duckdb_time): duckdb_state;
export function duckdb_append_timestamp(appender: duckdb_appender, value: duckdb_timestamp): duckdb_state;
export function duckdb_append_interval(appender: duckdb_appender, value: duckdb_interval): duckdb_state;
export function duckdb_append_varchar(appender: duckdb_appender, val: string): duckdb_state;
export function duckdb_append_varchar_length(appender: duckdb_appender, val: string, length: number): duckdb_state;
export function duckdb_append_blob(appender: duckdb_appender, data: pointer, length: number): duckdb_state;
export function duckdb_append_null(appender: duckdb_appender): duckdb_state;
export function duckdb_append_data_chunk(appender: duckdb_appender, chunk: duckdb_data_chunk): duckdb_state;
export function duckdb_execute_tasks(database: duckdb_database, max_tasks: number): Promise<void>;
export function duckdb_create_task_state(database: duckdb_database): duckdb_task_state;
export function duckdb_execute_tasks_state(state: duckdb_task_state): void;
export function duckdb_execute_n_tasks_state(state: duckdb_task_state, max_tasks: number): number;
export function duckdb_finish_execution(state: duckdb_task_state): void;
export function duckdb_task_state_is_finished(state: duckdb_task_state): boolean;
export function duckdb_destroy_task_state(state: duckdb_task_state): void;
export function duckdb_execution_is_finished(con: duckdb_connection): boolean;
export function duckdb_stream_fetch_chunk(result: duckdb_result): Promise<duckdb_data_chunk>;
// bindings-defined functions
export function copy_buffer(buffer: pointer, length: number): Uint8Array | null;
export function out_get_string(string_wrapper: out_string_wrapper): string;
export function convert_string_vector(vector: duckdb_vector, size: number): (Uint8Array | null)[];
