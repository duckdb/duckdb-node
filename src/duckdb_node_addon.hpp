#include "napi.h"

#include <unordered_map>

class DuckDBNodeAddon : public Napi::Addon<DuckDBNodeAddon> {
public:
	DuckDBNodeAddon(Napi::Env env, Napi::Object exports);
	std::unordered_map<const char *, Napi::FunctionReference> constructors;
};
