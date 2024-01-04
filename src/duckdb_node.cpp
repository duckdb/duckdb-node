#define NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED // apparently electron does not like those

#include "napi.h"

// this file contains generated template instantiations from duckdb.h
#include "duckdb_node_generated.cpp"

static Napi::Value CopyBuffer(const Napi::CallbackInfo &info) {
	Napi::Env env = info.Env();
	auto pointer = duckdb_node::ValueConversion::FromJS<void *>(info, 0);
	auto n = duckdb_node::ValueConversion::FromJS<idx_t>(info, 1);

	// see here: https://github.com/nodejs/node-addon-api/blob/main/doc/external_buffer.md
	return Napi::Buffer<uint8_t>::NewOrCopy(env, (uint8_t *)pointer, n);
}

static Napi::Value OutGetString(const Napi::CallbackInfo &info) {
	Napi::Env env = info.Env();
	// see here: https://github.com/nodejs/node-addon-api/blob/main/doc/external_buffer.md
	auto pp = duckdb_node::ValueConversion::FromJS<const char **>(info, 0);
	return duckdb_node::ValueConversion::ToJS(env, *pp);
}

class DuckDBNodeNative : public Napi::Addon<DuckDBNodeNative> {
public:
	DuckDBNodeNative(Napi::Env env, Napi::Object exports) {
		RegisterGenerated(env, exports);

		exports.Set(Napi::String::New(env, "copy_buffer"), Napi::Function::New<CopyBuffer>(env));
		exports.Set(
		    Napi::String::New(env, "out_string_wrapper"),
		    duckdb_node::PointerHolder<duckdb_node::out_string_wrapper>::Init(env, "out_string_wrapper")->Value());
		exports.Set(Napi::String::New(env, "out_get_string"), Napi::Function::New<OutGetString>(env));
	}
};

NODE_API_ADDON(DuckDBNodeNative);
