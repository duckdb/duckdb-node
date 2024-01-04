#pragma once
#include "napi.h"
#include "value_conversion.hpp"

namespace duckdb_node {

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

class PromiseWorker : public Napi::AsyncWorker {
public:
	PromiseWorker(Napi::Env &env) : AsyncWorker(env), deferred(Napi::Promise::Deferred::New(env)) {
	}

	virtual Napi::Value Result() {
		auto env = Env();
		return env.Null();
	}

	void OnOK() override {
		deferred.Resolve(Result());
	}

	void OnError(const Napi::Error &e) override {
		deferred.Reject(e.Value());
	}

	Napi::Promise QueueAndPromise() {
		Queue();
		return deferred.Promise();
	}

	Napi::Value ExecuteAndResult() {
		Execute();
		return Result();
	}

protected:
	Napi::Promise::Deferred deferred;
};

template <class RET>
class PromiseRetWorker : public PromiseWorker {

public:
	PromiseRetWorker(Napi::Env &env) : PromiseWorker(env) {
	}

	Napi::Value Result() override {
		auto env = Env();
		return ValueConversion::ToJS(env, ret);
	}

public:
	RET ret;
};

template <class ARG1>
class Worker1Arg {

public:
	Worker1Arg(Napi::Env &env, const Napi::CallbackInfo &info) {
		arg1 = ValueConversion::FromJS<typename OwnershipType<ARG1>::owner_type>(info, 0);
	}

public:
	typename OwnershipType<ARG1>::owner_type arg1;
};

template <class ARG1, class ARG2>
class Worker2Arg {

public:
	Worker2Arg(Napi::Env &env, const Napi::CallbackInfo &info) {
		arg1 = ValueConversion::FromJS<typename OwnershipType<ARG1>::owner_type>(info, 0);
		arg2 = ValueConversion::FromJS<typename OwnershipType<ARG2>::owner_type>(info, 1);
	}

public:
	typename OwnershipType<ARG1>::owner_type arg1;
	typename OwnershipType<ARG2>::owner_type arg2;
};

template <class ARG1, class ARG2, class ARG3>
class Worker3Arg {

public:
	Worker3Arg(Napi::Env &env, const Napi::CallbackInfo &info) {
		arg1 = ValueConversion::FromJS<typename OwnershipType<ARG1>::owner_type>(info, 0);
		arg2 = ValueConversion::FromJS<typename OwnershipType<ARG2>::owner_type>(info, 1);
		arg3 = ValueConversion::FromJS<typename OwnershipType<ARG3>::owner_type>(info, 2);
	}

public:
	typename OwnershipType<ARG1>::owner_type arg1;
	typename OwnershipType<ARG2>::owner_type arg2;
	typename OwnershipType<ARG3>::owner_type arg3;
};

template <class ARG1, class ARG2, class ARG3, class ARG4>
class Worker4Arg {

public:
	Worker4Arg(Napi::Env &env, const Napi::CallbackInfo &info) {
		arg1 = ValueConversion::FromJS<typename OwnershipType<ARG1>::owner_type>(info, 0);
		arg2 = ValueConversion::FromJS<typename OwnershipType<ARG2>::owner_type>(info, 1);
		arg3 = ValueConversion::FromJS<typename OwnershipType<ARG3>::owner_type>(info, 2);
		arg4 = ValueConversion::FromJS<typename OwnershipType<ARG4>::owner_type>(info, 3);
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
	Worker5Arg(Napi::Env &env, const Napi::CallbackInfo &info) {
		arg1 = ValueConversion::FromJS<typename OwnershipType<ARG1>::owner_type>(info, 0);
		arg2 = ValueConversion::FromJS<typename OwnershipType<ARG2>::owner_type>(info, 1);
		arg3 = ValueConversion::FromJS<typename OwnershipType<ARG3>::owner_type>(info, 2);
		arg4 = ValueConversion::FromJS<typename OwnershipType<ARG4>::owner_type>(info, 3);
		arg5 = ValueConversion::FromJS<typename OwnershipType<ARG5>::owner_type>(info, 4);
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
	FunctionWorker0(Napi::Env &env, const Napi::CallbackInfo &info) : PromiseRetWorker<RET>(env) {
	}

	void Execute() override {
		this->ret = FUN();
	}
};

template <class RET, class ARG1, RET (*FUN)(ARG1)>
class FunctionWorker1 : public PromiseRetWorker<RET>, Worker1Arg<ARG1> {
public:
	FunctionWorker1(Napi::Env &env, const Napi::CallbackInfo &info)
	    : PromiseRetWorker<RET>(env), Worker1Arg<ARG1>(env, info) {
	}

	void Execute() override {
		this->ret = FUN(OwnershipType<ARG1>::Get(this->arg1));
	}
};

template <class ARG1, void (*FUN)(ARG1)>
class FunctionWorker1Void : public PromiseWorker, Worker1Arg<ARG1> {
public:
	FunctionWorker1Void(Napi::Env &env, const Napi::CallbackInfo &info)
	    : PromiseWorker(env), Worker1Arg<ARG1>(env, info) {
	}

	void Execute() override {
		FUN(OwnershipType<ARG1>::Get(this->arg1));
	}
};

template <class RET, class ARG1, class ARG2, RET (*FUN)(ARG1, ARG2)>
class FunctionWorker2 : public PromiseRetWorker<RET>, Worker2Arg<ARG1, ARG2> {
public:
	FunctionWorker2(Napi::Env &env, const Napi::CallbackInfo &info)
	    : PromiseRetWorker<RET>(env), Worker2Arg<ARG1, ARG2>(env, info) {
	}

	void Execute() override {
		this->ret = FUN(OwnershipType<ARG1>::Get(this->arg1), OwnershipType<ARG2>::Get(this->arg2));
	}
};

template <class ARG1, class ARG2, void (*FUN)(ARG1, ARG2)>
class FunctionWorker2Void : public PromiseWorker, Worker2Arg<ARG1, ARG2> {
public:
	FunctionWorker2Void(Napi::Env &env, const Napi::CallbackInfo &info)
	    : PromiseWorker(env), Worker2Arg<ARG1, ARG2>(env, info) {
	}

	void Execute() override {
		FUN(OwnershipType<ARG1>::Get(this->arg1), OwnershipType<ARG2>::Get(this->arg2));
	}
};

template <class RET, class ARG1, class ARG2, class ARG3, RET (*FUN)(ARG1, ARG2, ARG3)>
class FunctionWorker3 : public PromiseRetWorker<RET>, Worker3Arg<ARG1, ARG2, ARG3> {
public:
	FunctionWorker3(Napi::Env &env, const Napi::CallbackInfo &info)
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
	FunctionWorker3Void(Napi::Env &env, const Napi::CallbackInfo &info)
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
	FunctionWorker4(Napi::Env &env, const Napi::CallbackInfo &info)
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
	FunctionWorker4Void(Napi::Env &env, const Napi::CallbackInfo &info)
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
	FunctionWorker5(Napi::Env &env, const Napi::CallbackInfo &info)
	    : PromiseRetWorker<RET>(env), Worker5Arg<ARG1, ARG2, ARG3, ARG4, ARG5>(env, info) {
	}

	void Execute() override {
		this->ret = FUN(OwnershipType<ARG1>::Get(this->arg1), OwnershipType<ARG2>::Get(this->arg2),
		                OwnershipType<ARG3>::Get(this->arg3), OwnershipType<ARG4>::Get(this->arg4),
		                OwnershipType<ARG5>::Get(this->arg5));
	}
};

// async wrappers

class FunctionWrappers {
public:
	template <class RET, class ARG1, RET (*FUN)(ARG1)>
	static Napi::Value AsyncFunctionWrapper1(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		return (new FunctionWorker1<RET, ARG1, FUN>(env, info))->QueueAndPromise();
	}

	template <class RET, RET (*FUN)()>
	static Napi::Value AsyncFunctionWrapper0(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		return (new FunctionWorker0<RET, FUN>(env, info))->QueueAndPromise();
	}

	template <class RET, class ARG1, class ARG2, RET (*FUN)(ARG1, ARG2)>
	static Napi::Value AsyncFunctionWrapper2(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		return (new FunctionWorker2<RET, ARG1, ARG2, FUN>(env, info))->QueueAndPromise();
	}

	template <class RET, class ARG1, class ARG2, class ARG3, RET (*FUN)(ARG1, ARG2, ARG3)>
	static Napi::Value AsyncFunctionWrapper3(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		return (new FunctionWorker3<RET, ARG1, ARG2, ARG3, FUN>(env, info))->QueueAndPromise();
	}

	template <class ARG1, class ARG2, void (*FUN)(ARG1, ARG2)>
	static Napi::Value AsyncFunctionWrapper2Void(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		return (new FunctionWorker2Void<ARG1, ARG2, FUN>(env, info))->QueueAndPromise();
	}

	template <class ARG1, class ARG2, class ARG3, void (*FUN)(ARG1, ARG2, ARG3)>
	static Napi::Value AsyncFunctionWrapper3Void(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		return (new FunctionWorker3Void<ARG1, ARG2, ARG3, FUN>(env, info))->QueueAndPromise();
	}

	template <class RET, class ARG1, class ARG2, class ARG3, class ARG4, RET (*FUN)(ARG1, ARG2, ARG3, ARG4)>
	static Napi::Value AsyncFunctionWrapper4(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		return (new FunctionWorker4<RET, ARG1, ARG2, ARG3, ARG4, FUN>(env, info))->QueueAndPromise();
	}

	template <class ARG1, class ARG2, class ARG3, class ARG4, void (*FUN)(ARG1, ARG2, ARG3, ARG4)>
	static Napi::Value AsyncFunctionWrapper4Void(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		return (new FunctionWorker4Void<ARG1, ARG2, ARG3, ARG4, FUN>(env, info))->QueueAndPromise();
	}

	template <class RET, class ARG1, class ARG2, class ARG3, class ARG4, class ARG5, RET (*FUN)(ARG1, ARG2, ARG3)>
	static Napi::Value AsyncFunctionWrapper5(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		return (new FunctionWorker5<RET, ARG1, ARG2, ARG3, ARG4, ARG5, FUN>(env, info))->QueueAndPromise();
	}

	template <class ARG1, void (*FUN)(ARG1)>
	static Napi::Value AsyncFunctionWrapper1Void(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		return (new FunctionWorker1Void<ARG1, FUN>(env, info))->QueueAndPromise();
	}

	// sync wrappers

	template <class ARG1, void (*FUN)(ARG1)>
	static Napi::Value FunctionWrapper1Void(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		FunctionWorker1Void<ARG1, FUN> worker(env, info);
		return worker.ExecuteAndResult();
	}

	template <class RET, RET (*FUN)()>
	static Napi::Value FunctionWrapper0(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		FunctionWorker0<RET, FUN> worker(env, info);
		return worker.ExecuteAndResult();
	}

	template <class RET, class ARG1, RET (*FUN)(ARG1)>
	static Napi::Value FunctionWrapper1(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		FunctionWorker1<RET, ARG1, FUN> worker(env, info);
		return worker.ExecuteAndResult();
	}

	template <class RET, class ARG1, class ARG2, RET (*FUN)(ARG1, ARG2)>
	static Napi::Value FunctionWrapper2(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		FunctionWorker2<RET, ARG1, ARG2, FUN> worker(env, info);
		return worker.ExecuteAndResult();
	}

	template <class ARG1, class ARG2, void (*FUN)(ARG1, ARG2)>
	static Napi::Value FunctionWrapper2Void(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		FunctionWorker2Void<ARG1, ARG2, FUN> worker(env, info);
		return worker.ExecuteAndResult();
	}

	template <class RET, class ARG1, class ARG2, class ARG3, RET (*FUN)(ARG1, ARG2, ARG3)>
	static Napi::Value FunctionWrapper3(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		FunctionWorker3<RET, ARG1, ARG2, ARG3, FUN> worker(env, info);
		return worker.ExecuteAndResult();
	}

	template <class ARG1, class ARG2, class ARG3, void (*FUN)(ARG1, ARG2, ARG3)>
	static Napi::Value FunctionWrapper3Void(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		FunctionWorker3Void<ARG1, ARG2, ARG3, FUN> worker(env, info);
		return worker.ExecuteAndResult();
	}

	template <class RET, class ARG1, class ARG2, class ARG3, class ARG4, RET (*FUN)(ARG1, ARG2, ARG3, ARG4)>
	static Napi::Value FunctionWrapper4(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		FunctionWorker4<RET, ARG1, ARG2, ARG3, ARG4, FUN> worker(env, info);
		return worker.ExecuteAndResult();
	}

	template <class ARG1, class ARG2, class ARG3, class ARG4, void (*FUN)(ARG1, ARG2, ARG3, ARG4)>
	static Napi::Value FunctionWrapper4Void(const Napi::CallbackInfo &info) {
		Napi::Env env = info.Env();
		FunctionWorker4Void<ARG1, ARG2, ARG3, ARG4, FUN> worker(env, info);
		return worker.ExecuteAndResult();
	}
};
} // namespace duckdb_node