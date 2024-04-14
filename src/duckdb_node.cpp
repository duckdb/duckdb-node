#define NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED // apparently electron does not like those

#include "napi.h"

#include <dlfcn.h>

static void *duckdb_node_dlopen_handle;

// this file contains generated template instantiations from duckdb.h
#include "duckdb_node_generated.cpp"

// dependent on the runtime we may or may not be allowed to pass pointers back and forth
// see here: https://github.com/nodejs/node-addon-api/blob/main/doc/external_buffer.md
static Napi::Value CopyBuffer(const Napi::CallbackInfo &info) {
	Napi::Env env = info.Env();
	auto pointer = duckdb_node::ValueConversion::FromJS<void *>(info, 0);
	if (!pointer) {
		return env.Null();
	}
	auto n = duckdb_node::ValueConversion::FromJS<idx_t>(info, 1);
	return Napi::Buffer<uint8_t>::NewOrCopy(env, (uint8_t *)pointer, n);
}

// taking a pointer from a double like cavemen but well
static Napi::Value CopyBufferDouble(const Napi::CallbackInfo &info) {
	Napi::Env env = info.Env();
	auto ptr_dbl = duckdb_node::ValueConversion::FromJS<double>(info, 0);
	auto pointer = *((uint8_t **)&ptr_dbl);
	if (!pointer) {
		return env.Null();
	}
	auto n = duckdb_node::ValueConversion::FromJS<idx_t>(info, 1);
	return Napi::Buffer<uint8_t>::NewOrCopy(env, pointer, n);
}

// special case handling for api functions that take a char**
static Napi::Value OutGetString(const Napi::CallbackInfo &info) {
	Napi::Env env = info.Env();
	auto pp = duckdb_node::ValueConversion::FromJS<const char **>(info, 0);
	return duckdb_node::ValueConversion::ToJS(env, *pp);
}

// TODO this relies on RTLD_LAZY but should probably switch to use a bunch of (generated) function pointers
static Napi::Value Initialize(const Napi::CallbackInfo &info) {
	Napi::Env env = info.Env();
	auto path = duckdb_node::ValueConversion::FromJS<std::string>(info, 0);
	auto path2 = path.substr(0, path.rfind('/')) + "/libduckdb";
	duckdb_node_dlopen_handle = dlopen(path2.c_str(), RTLD_GLOBAL);
	if (!duckdb_node_dlopen_handle) {
		return Napi::Boolean::New(env, false);
	}
	return Napi::Boolean::New(env, true);
}

DuckDBNodeAddon::DuckDBNodeAddon(Napi::Env env, Napi::Object exports) {
	RegisterGenerated(env, exports, constructors);

	duckdb_node::PointerHolder<void *>::Init(env, exports, constructors, "pointer");
	duckdb_node::PointerHolder<uint64_t *>::Init(env, exports, constructors, "uint64_pointer");
	// TODO: add idx_pointer?
	duckdb_node::PointerHolder<duckdb_node::out_string_wrapper>::Init(env, exports, constructors, "out_string_wrapper");

	exports.Set(Napi::String::New(env, "sizeof_bool"), Napi::Number::New(env, sizeof(bool)));
	exports.Set(Napi::String::New(env, "copy_buffer"), Napi::Function::New<CopyBuffer>(env));
	exports.Set(Napi::String::New(env, "copy_buffer_double"), Napi::Function::New<CopyBufferDouble>(env));
	exports.Set(Napi::String::New(env, "out_get_string"), Napi::Function::New<OutGetString>(env));

	// for binding; not exposed in TypeScript
	exports.Set(Napi::String::New(env, "initialize"), Napi::Function::New<Initialize>(env));
}

NODE_API_ADDON(DuckDBNodeAddon);
