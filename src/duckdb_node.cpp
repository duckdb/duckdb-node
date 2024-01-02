#define NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED // apparently electron does not like those

#include "napi.h"
#include "duckdb.h" // NB: C API

using namespace Napi;
using namespace std;

typedef uint8_t data_t;

template <class T>
class PointerHolder : public ObjectWrap<PointerHolder<T>> {
public:
	static Napi::FunctionReference *Init(Env env, const char *name) {
		// This method is used to hook the accessor and method callbacks
		auto func = ObjectWrap<PointerHolder<T>>::DefineClass(env, name, {});
		auto constructor = new Napi::FunctionReference();
		*constructor = Napi::Persistent(func); // weird
		env.SetInstanceData<Napi::FunctionReference>(constructor);
		return constructor;
	}

	PointerHolder(const Napi::CallbackInfo &info) : Napi::ObjectWrap<PointerHolder<T>>(info) {
		ptr = unique_ptr<data_t[]>(new data_t[sizeof(T)]);
	}

	T *Get() {
		return (T *)ptr.get();
	}

private:
	unique_ptr<data_t[]> ptr;
};

static Value GetValue(const CallbackInfo &info, size_t offset) {
	Env env = info.Env();

	if (info.Length() < offset) {
		throw TypeError::New(env, "Value expected at offset " + to_string(offset));
	}
	return info[offset].As<Value>();
}

template <class T>
static Value ToJS(Env &env, T val);

template <>
static Value ToJS(Env &env, duckdb_state val) {
	switch (val) {
	case DuckDBSuccess:
		return String::New(env, "SUCCESS"); // TODO make this a sort-of enum
	case DuckDBError:
		return String::New(env, "ERROR"); // TODO make this a sort-of enum
	default:
		return env.Null();
	}
}

template <>
static Value ToJS(Env &env, duckdb_string val) {
	auto ret = String::New(env, val.data, val.size);
	duckdb_free(val.data);
	return ret;
}

template <>
static Value ToJS(Env &env, const char *val) {
	return String::New(env, val);
}

template <>
static Value ToJS(Env &env, int32_t val) {
	return Number::New(env, val);
}

template <>
static Value ToJS(Env &env, uint32_t val) {
	return Number::New(env, val);
}

// this dance is done so we can keep ownership of a string value returned by napi
template <class T>
struct OwnershipType {
	using owner_type = T;
	static T &Get(owner_type &owner) {
		return owner;
	}
};

template <>
struct OwnershipType<const char *> {
	using owner_type = std::string;
	static const char *Get(owner_type &owner) {
		return owner.c_str();
	}
};

template <class T>
static T FromJS(const CallbackInfo &info, idx_t offset);

template <>
std::string FromJS(const CallbackInfo &info, idx_t offset) {
	return GetValue(info, offset).As<Napi::String>();
}

// TODO generate those wrappers too, also their exposure to js
template <>
duckdb_database *FromJS(const CallbackInfo &info, idx_t offset) {
	return Napi::ObjectWrap<PointerHolder<duckdb_database>>::Unwrap(GetValue(info, offset).As<Object>())->Get();
}

template <>
duckdb_database FromJS(const CallbackInfo &info, idx_t offset) {
	return *FromJS<duckdb_database *>(info, offset);
}

template <>
duckdb_connection *FromJS(const CallbackInfo &info, idx_t offset) {
	return Napi::ObjectWrap<PointerHolder<duckdb_connection>>::Unwrap(GetValue(info, offset).As<Object>())->Get();
}

template <>
duckdb_connection FromJS(const CallbackInfo &info, idx_t offset) {
	return *FromJS<duckdb_connection *>(info, offset);
}

template <>
duckdb_config *FromJS(const CallbackInfo &info, idx_t offset) {
	return Napi::ObjectWrap<PointerHolder<duckdb_config>>::Unwrap(GetValue(info, offset).As<Object>())->Get();
}

template <>
duckdb_config FromJS(const CallbackInfo &info, idx_t offset) {
	return *FromJS<duckdb_config *>(info, offset);
}

template <>
duckdb_result *FromJS(const CallbackInfo &info, idx_t offset) {
	return Napi::ObjectWrap<PointerHolder<duckdb_result>>::Unwrap(GetValue(info, offset).As<Object>())->Get();
}

template <>
duckdb_result FromJS(const CallbackInfo &info, idx_t offset) {
	return *FromJS<duckdb_result *>(info, offset);
}

template <>
duckdb_prepared_statement *FromJS(const CallbackInfo &info, idx_t offset) {
	return Napi::ObjectWrap<PointerHolder<duckdb_prepared_statement>>::Unwrap(GetValue(info, offset).As<Object>())
	    ->Get();
}

template <>
duckdb_prepared_statement FromJS(const CallbackInfo &info, idx_t offset) {
	return *FromJS<duckdb_prepared_statement *>(info, offset);
}

template <>
duckdb_appender *FromJS(const CallbackInfo &info, idx_t offset) {
	return Napi::ObjectWrap<PointerHolder<duckdb_appender>>::Unwrap(GetValue(info, offset).As<Object>())->Get();
}

template <>
duckdb_appender FromJS(const CallbackInfo &info, idx_t offset) {
	return *FromJS<duckdb_appender *>(info, offset);
}

template <>
idx_t FromJS(const CallbackInfo &info, idx_t offset) {
	return GetValue(info, offset).As<Number>().Int64Value();
}

template <>
int32_t FromJS(const CallbackInfo &info, idx_t offset) {
	return GetValue(info, offset).As<Number>().Int32Value();
}

class PromiseWorker : public AsyncWorker {
public:
	PromiseWorker(Napi::Env &env) : AsyncWorker(env), deferred(Promise::Deferred::New(env)) {
	}

	virtual Value Result() {
		auto env = Env();
		return env.Null();
	}

	void OnOK() override {
		deferred.Resolve(Result());
	}

	void OnError(const Error &e) override {
		deferred.Reject(e.Value());
	}

	Promise QueueAndPromise() {
		Queue();
		return deferred.Promise();
	}

protected:
	Promise::Deferred deferred;
};

template <class RET>
class PromiseRetWorker : public PromiseWorker {

public:
	PromiseRetWorker(Napi::Env &env) : PromiseWorker(env) {
	}

	Value Result() override {
		auto env = Env();
		return ToJS(env, ret);
	}

public:
	RET ret;
};

template <class ARG1>
class Worker1Arg {

public:
	Worker1Arg(Napi::Env &env, const CallbackInfo &info) {
		arg1 = FromJS<typename OwnershipType<ARG1>::owner_type>(info, 0);
	}

public:
	typename OwnershipType<ARG1>::owner_type arg1;
};

template <class ARG1, class ARG2>
class Worker2Arg {

public:
	Worker2Arg(Napi::Env &env, const CallbackInfo &info) {
		arg1 = FromJS<typename OwnershipType<ARG1>::owner_type>(info, 0);
		arg2 = FromJS<typename OwnershipType<ARG2>::owner_type>(info, 1);
	}

public:
	typename OwnershipType<ARG1>::owner_type arg1;
	typename OwnershipType<ARG2>::owner_type arg2;
};

template <class ARG1, class ARG2, class ARG3>
class Worker3Arg {

public:
	Worker3Arg(Napi::Env &env, const CallbackInfo &info) {
		arg1 = FromJS<typename OwnershipType<ARG1>::owner_type>(info, 0);
		arg2 = FromJS<typename OwnershipType<ARG2>::owner_type>(info, 1);
		arg3 = FromJS<typename OwnershipType<ARG3>::owner_type>(info, 2);
	}

public:
	typename OwnershipType<ARG1>::owner_type arg1;
	typename OwnershipType<ARG2>::owner_type arg2;
	typename OwnershipType<ARG3>::owner_type arg3;
};

template <class ARG1, class ARG2, class ARG3, class ARG4>
class Worker4Arg {

public:
	Worker4Arg(Napi::Env &env, const CallbackInfo &info) {
		arg1 = FromJS<typename OwnershipType<ARG1>::owner_type>(info, 0);
		arg2 = FromJS<typename OwnershipType<ARG2>::owner_type>(info, 1);
		arg3 = FromJS<typename OwnershipType<ARG3>::owner_type>(info, 2);
		arg4 = FromJS<typename OwnershipType<ARG4>::owner_type>(info, 3);
	}

public:
	typename OwnershipType<ARG1>::owner_type arg1;
	typename OwnershipType<ARG2>::owner_type arg2;
	typename OwnershipType<ARG3>::owner_type arg3;
	typename OwnershipType<ARG4>::owner_type arg4;
};

template <class ARG1, class ARG2, class ARG3, class ARG4, class ARG5>
class Worker5Arg {

public:
	Worker5Arg(Napi::Env &env, const CallbackInfo &info) {
		arg1 = FromJS<typename OwnershipType<ARG1>::owner_type>(info, 0);
		arg2 = FromJS<typename OwnershipType<ARG2>::owner_type>(info, 1);
		arg3 = FromJS<typename OwnershipType<ARG3>::owner_type>(info, 2);
		arg4 = FromJS<typename OwnershipType<ARG4>::owner_type>(info, 3);
		arg5 = FromJS<typename OwnershipType<ARG5>::owner_type>(info, 4);
	}

public:
	typename OwnershipType<ARG1>::owner_type arg1;
	typename OwnershipType<ARG2>::owner_type arg2;
	typename OwnershipType<ARG3>::owner_type arg3;
	typename OwnershipType<ARG4>::owner_type arg4;
	typename OwnershipType<ARG5>::owner_type arg5;
};

// workers
template <class RET, RET (*FUN)()>
class FunctionWorker0 : public PromiseRetWorker<RET> {
public:
	FunctionWorker0(Napi::Env &env, const CallbackInfo &info) : PromiseRetWorker<RET>(env) {
	}

	void Execute() override {
		this->ret = FUN();
	}
};

template <class RET, class ARG1, RET (*FUN)(ARG1)>
class FunctionWorker1 : public PromiseRetWorker<RET>, Worker1Arg<ARG1> {
public:
	FunctionWorker1(Napi::Env &env, const CallbackInfo &info)
	    : PromiseRetWorker<RET>(env), Worker1Arg<ARG1>(env, info) {
	}

	void Execute() override {
		this->ret = FUN(OwnershipType<ARG1>::Get(this->arg1));
	}
};

template <class ARG1, void (*FUN)(ARG1)>
class FunctionWorker1Void : public PromiseWorker, Worker1Arg<ARG1> {
public:
	FunctionWorker1Void(Napi::Env &env, const CallbackInfo &info) : PromiseWorker(env), Worker1Arg<ARG1>(env, info) {
	}

	void Execute() override {
		FUN(OwnershipType<ARG1>::Get(this->arg1));
	}
};

template <class RET, class ARG1, class ARG2, RET (*FUN)(ARG1, ARG2)>
class FunctionWorker2 : public PromiseRetWorker<RET>, Worker2Arg<ARG1, ARG2> {
public:
	FunctionWorker2(Napi::Env &env, const CallbackInfo &info)
	    : PromiseRetWorker<RET>(env), Worker2Arg<ARG1, ARG2>(env, info) {
	}

	void Execute() override {
		this->ret = FUN(OwnershipType<ARG1>::Get(this->arg1), OwnershipType<ARG2>::Get(this->arg2));
	}
};

template <class ARG1, class ARG2, void (*FUN)(ARG1, ARG2)>
class FunctionWorker2Void : public PromiseWorker, Worker2Arg<ARG1, ARG2> {
public:
	FunctionWorker2Void(Napi::Env &env, const CallbackInfo &info)
	    : PromiseWorker(env), Worker2Arg<ARG1, ARG2>(env, info) {
	}

	void Execute() override {
		FUN(OwnershipType<ARG1>::Get(this->arg1), OwnershipType<ARG2>::Get(this->arg2));
	}
};

template <class RET, class ARG1, class ARG2, class ARG3, RET (*FUN)(ARG1, ARG2, ARG3)>
class FunctionWorker3 : public PromiseRetWorker<RET>, Worker3Arg<ARG1, ARG2, ARG3> {
public:
	FunctionWorker3(Napi::Env &env, const CallbackInfo &info)
	    : PromiseRetWorker<RET>(env), Worker3Arg<ARG1, ARG2, ARG3>(env, info) {
	}

	void Execute() override {
		this->ret = FUN(OwnershipType<ARG1>::Get(this->arg1), OwnershipType<ARG2>::Get(this->arg2),
		                OwnershipType<ARG3>::Get(this->arg3));
	}
};

template <class ARG1, class ARG2, class ARG3, void (*FUN)(ARG1, ARG2, ARG3)>
class FunctionWorker3Void : public PromiseWorker, Worker3Arg<ARG1, ARG2, ARG3> {
public:
	FunctionWorker3Void(Napi::Env &env, const CallbackInfo &info)
	    : PromiseWorker(env), Worker3Arg<ARG1, ARG2, ARG3>(env, info) {
	}

	void Execute() override {
		FUN(OwnershipType<ARG1>::Get(this->arg1), OwnershipType<ARG2>::Get(this->arg2),
		    OwnershipType<ARG3>::Get(this->arg3));
	}
};

template <class RET, class ARG1, class ARG2, class ARG3, class ARG4, RET (*FUN)(ARG1, ARG2, ARG3, ARG4)>
class FunctionWorker4 : public PromiseRetWorker<RET>, Worker4Arg<ARG1, ARG2, ARG3, ARG4> {
public:
	FunctionWorker4(Napi::Env &env, const CallbackInfo &info)
	    : PromiseRetWorker<RET>(env), Worker4Arg<ARG1, ARG2, ARG3, ARG4>(env, info) {
	}

	void Execute() override {
		this->ret = FUN(OwnershipType<ARG1>::Get(this->arg1), OwnershipType<ARG2>::Get(this->arg2),
		                OwnershipType<ARG3>::Get(this->arg3), OwnershipType<ARG4>::Get(this->arg4));
	}
};

template <class ARG1, class ARG2, class ARG3, class ARG4, void (*FUN)(ARG1, ARG2, ARG3, ARG4)>
class FunctionWorker4Void : public PromiseWorker, Worker4Arg<ARG1, ARG2, ARG3, ARG4> {
public:
	FunctionWorker4Void(Napi::Env &env, const CallbackInfo &info)
	    : PromiseWorker(env), Worker4Arg<ARG1, ARG2, ARG3, ARG4>(env, info) {
	}

	void Execute() override {
		FUN(OwnershipType<ARG1>::Get(this->arg1), OwnershipType<ARG2>::Get(this->arg2),
		    OwnershipType<ARG3>::Get(this->arg3), OwnershipType<ARG4>::Get(this->arg4));
	}
};

template <class RET, class ARG1, class ARG2, class ARG3, class ARG4, class ARG5,
          RET (*FUN)(ARG1, ARG2, ARG3, ARG4, ARG5)>
class FunctionWorker5 : public PromiseRetWorker<RET>, Worker5Arg<ARG1, ARG2, ARG3, ARG4, ARG5> {
public:
	FunctionWorker5(Napi::Env &env, const CallbackInfo &info)
	    : PromiseRetWorker<RET>(env), Worker5Arg<ARG1, ARG2, ARG3, ARG4, ARG5>(env, info) {
	}

	void Execute() override {
		this->ret = FUN(OwnershipType<ARG1>::Get(this->arg1), OwnershipType<ARG2>::Get(this->arg2),
		                OwnershipType<ARG3>::Get(this->arg3), OwnershipType<ARG4>::Get(this->arg4),
		                OwnershipType<ARG5>::Get(this->arg5));
	}
};

// async wrappers

template <class RET, class ARG1, RET (*FUN)(ARG1)>
static Value AsyncFunctionWrapper1(const CallbackInfo &info) {
	Env env = info.Env();
	return (new FunctionWorker1<RET, ARG1, FUN>(env, info))->QueueAndPromise();
}

template <class RET, RET (*FUN)()>
static Value AsyncFunctionWrapper0(const CallbackInfo &info) {
	Env env = info.Env();
	return (new FunctionWorker0<RET, FUN>(env, info))->QueueAndPromise();
}

template <class RET, class ARG1, class ARG2, RET (*FUN)(ARG1, ARG2)>
static Value AsyncFunctionWrapper2(const CallbackInfo &info) {
	Env env = info.Env();
	return (new FunctionWorker2<RET, ARG1, ARG2, FUN>(env, info))->QueueAndPromise();
}

template <class RET, class ARG1, class ARG2, class ARG3, RET (*FUN)(ARG1, ARG2, ARG3)>
static Value AsyncFunctionWrapper3(const CallbackInfo &info) {
	Env env = info.Env();
	return (new FunctionWorker3<RET, ARG1, ARG2, ARG3, FUN>(env, info))->QueueAndPromise();
}

template <class ARG1, class ARG2, void (*FUN)(ARG1, ARG2)>
static Value AsyncFunctionWrapper2Void(const CallbackInfo &info) {
	Env env = info.Env();
	return (new FunctionWorker2Void<ARG1, ARG2, FUN>(env, info))->QueueAndPromise();
}

template <class ARG1, class ARG2, class ARG3, void (*FUN)(ARG1, ARG2, ARG3)>
static Value AsyncFunctionWrapper3Void(const CallbackInfo &info) {
	Env env = info.Env();
	return (new FunctionWorker3Void<ARG1, ARG2, ARG3, FUN>(env, info))->QueueAndPromise();
}

template <class RET, class ARG1, class ARG2, class ARG3, class ARG4, RET (*FUN)(ARG1, ARG2, ARG3, ARG4)>
static Value AsyncFunctionWrapper4(const CallbackInfo &info) {
	Env env = info.Env();
	return (new FunctionWorker4<RET, ARG1, ARG2, ARG3, ARG4, FUN>(env, info))->QueueAndPromise();
}

template <class ARG1, class ARG2, class ARG3, class ARG4, void (*FUN)(ARG1, ARG2, ARG3, ARG4)>
static Value AsyncFunctionWrapper4Void(const CallbackInfo &info) {
	Env env = info.Env();
	return (new FunctionWorker4Void<ARG1, ARG2, ARG3, ARG4, FUN>(env, info))->QueueAndPromise();
}

template <class RET, class ARG1, class ARG2, class ARG3, class ARG4, class ARG5, RET (*FUN)(ARG1, ARG2, ARG3)>
static Value AsyncFunctionWrapper5(const CallbackInfo &info) {
	Env env = info.Env();
	return (new FunctionWorker5<RET, ARG1, ARG2, ARG3, ARG4, ARG5, FUN>(env, info))->QueueAndPromise();
}

template <class ARG1, void (*FUN)(ARG1)>
static Value AsyncFunctionWrapper1Void(const CallbackInfo &info) {
	Env env = info.Env();
	return (new FunctionWorker1Void<ARG1, FUN>(env, info))->QueueAndPromise();
}

// sync wrappers

template <class ARG1, void (*FUN)(ARG1)>
static Value FunctionWrapper1Void(const CallbackInfo &info) {
	Env env = info.Env();
	FunctionWorker1Void<ARG1, FUN> worker(env, info);
	worker.Execute();
	return worker.Result();
}

template <class RET, RET (*FUN)()>
static Value FunctionWrapper0(const CallbackInfo &info) {
	Env env = info.Env();
	FunctionWorker0<RET, FUN> worker(env, info);
	worker.Execute();
	return worker.Result();
}

template <class RET, class ARG1, RET (*FUN)(ARG1)>
static Value FunctionWrapper1(const CallbackInfo &info) {
	Env env = info.Env();
	FunctionWorker1<RET, ARG1, FUN> worker(env, info);
	worker.Execute();
	return worker.Result();
}

template <class RET, class ARG1, class ARG2, RET (*FUN)(ARG1, ARG2)>
static Value FunctionWrapper2(const CallbackInfo &info) {
	Env env = info.Env();
	FunctionWorker2<RET, ARG1, ARG2, FUN> worker(env, info);
	worker.Execute();
	return worker.Result();
}

template <class ARG1, class ARG2, void (*FUN)(ARG1, ARG2)>
static Value FunctionWrapper2Void(const CallbackInfo &info) {
	Env env = info.Env();
	FunctionWorker2Void<ARG1, ARG2, FUN> worker(env, info);
	worker.Execute();
	return worker.Result();
}

template <class RET, class ARG1, class ARG2, class ARG3, RET (*FUN)(ARG1, ARG2, ARG3)>
static Value FunctionWrapper3(const CallbackInfo &info) {
	Env env = info.Env();
	FunctionWorker3<RET, ARG1, ARG2, ARG3, FUN> worker(env, info);
	worker.Execute();
	return worker.Result();
}

template <class ARG1, class ARG2, class ARG3, void (*FUN)(ARG1, ARG2, ARG3)>
static Value FunctionWrapper3Void(const CallbackInfo &info) {
	Env env = info.Env();
	FunctionWorker3Void<ARG1, ARG2, ARG3, FUN> worker(env, info);
	worker.Execute();
	return worker.Result();
}

template <class RET, class ARG1, class ARG2, class ARG3, class ARG4, RET (*FUN)(ARG1, ARG2, ARG3, ARG4)>
static Value FunctionWrapper4(const CallbackInfo &info) {
	Env env = info.Env();
	FunctionWorker4<RET, ARG1, ARG2, ARG3, ARG4, FUN> worker(env, info);
	worker.Execute();
	return worker.Result();
}

template <class ARG1, class ARG2, class ARG3, class ARG4, void (*FUN)(ARG1, ARG2, ARG3, ARG4)>
static Value FunctionWrapper4Void(const CallbackInfo &info) {
	Env env = info.Env();
	FunctionWorker4Void<ARG1, ARG2, ARG3, ARG4, FUN> worker(env, info);
	worker.Execute();
	return worker.Result();
}

// this file contains generated template instantiations from duckdb.h
#include "duckdb_node_generated.cpp"

class DuckDBNodeNative : public Napi::Addon<DuckDBNodeNative> {
public:
	DuckDBNodeNative(Napi::Env env, Napi::Object exports) {
		RegisterGenerated(env, exports);

		// some pointers
		// TODO generate those, too
		exports.Set(String::New(env, "config"), PointerHolder<duckdb_config>::Init(env, "duckdb_config")->Value());
		exports.Set(String::New(env, "database"),
		            PointerHolder<duckdb_database>::Init(env, "duckdb_database")->Value());
		exports.Set(String::New(env, "connection"),
		            PointerHolder<duckdb_connection>::Init(env, "duckdb_connection")->Value());
		exports.Set(String::New(env, "prepared_statement"),
		            PointerHolder<duckdb_prepared_statement>::Init(env, "duckdb_prepared_statement")->Value());
		exports.Set(String::New(env, "result"), PointerHolder<duckdb_result>::Init(env, "duckdb_result")->Value());
		exports.Set(String::New(env, "appender"),
		            PointerHolder<duckdb_appender>::Init(env, "duckdb_appender")->Value());
	}
};

NODE_API_ADDON(DuckDBNodeNative);

// DUCKDB_API duckdb_state duckdb_query(duckdb_connection connection, const char *query, duckdb_result *out_result);