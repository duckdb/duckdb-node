#define NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED // apparently electron does not like those

#include "napi.h"

// this file contains generated template instantiations from duckdb.h
#include "duckdb_node_generated.cpp"

class DuckDBNodeNative : public Napi::Addon<DuckDBNodeNative> {
public:
	DuckDBNodeNative(Napi::Env env, Napi::Object exports) {
		RegisterGenerated(env, exports);
	}
};

NODE_API_ADDON(DuckDBNodeNative);
