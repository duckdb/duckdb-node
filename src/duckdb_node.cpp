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

class DuckDBNodeNative : public Napi::Addon<DuckDBNodeNative> {
public:
	DuckDBNodeNative(Napi::Env env, Napi::Object exports) {
		RegisterGenerated(env, exports);

		exports.Set(Napi::String::New(env, "copy_buffer"), Napi::Function::New<CopyBuffer>(env));
	}
};

NODE_API_ADDON(DuckDBNodeNative);
