#define NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED // apparently electron does not like those

#include "napi.h"
#include "duckdb.h" // NB: C API

using namespace Napi;
using namespace std;

typedef uint8_t data_t;


class DuckDBNodeNative : public Napi::Addon<DuckDBNodeNative> {
public:
    DuckDBNodeNative(Napi::Env env, Napi::Object exports);

    static DuckDBNodeNative *GetData(Napi::Env env) {
        return env.GetInstanceData<DuckDBNodeNative>();
    }

    Napi::FunctionReference *config_holder_constructor;
    Napi::FunctionReference *database_holder_constructor;
    Napi::FunctionReference *connection_holder_constructor;
    Napi::FunctionReference *prepared_statement_holder_constructor;
    Napi::FunctionReference *result_holder_constructor;

};


template<class T>
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
        // TODO check here that we are getting the right kind of pointer
        return (T *) ptr.get();
    }

    void Clear() {
        ptr.reset();
    }


    std::mutex& Mutex() {
        return ptr_mutex;
    }

private:
    unique_ptr<data_t[]> ptr;
    std::mutex ptr_mutex;

};


static Object GetObject(const CallbackInfo &info, size_t offset) {
    Env env = info.Env();

    if (info.Length() < offset || !info[offset].IsObject()) {
        throw TypeError::New(env, "Object expected");
    }
    return info[offset].As<Object>();
}


class PromiseWorker : public AsyncWorker {
public:
    PromiseWorker(Napi::Env &env)
            : AsyncWorker(env), deferred(Promise::Deferred::New(env)) {}

//    virtual void ExecuteInternal();
//
//    void Execute()  override { // this runs on worker thread so no allocs etc. (?)
//        std::lock_guard<std::mutex> ptr_lock(ptr_mutex);
//        ExecuteInternal();
//    }


    void OnOK() override {
        auto env = Env();
        deferred.Resolve(env.Null());
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

template <class T>
static Value ConvertNative(Env& env, T val);


template<>
static Value ConvertNative(Env& env, duckdb_state val) {
    switch (val) {
        case DuckDBSuccess:
            return String::New(env, "SUCCESS"); // TODO make this a sort-of enum
        case DuckDBError:
            return String::New(env, "ERROR"); // TODO make this a sort-of enum
        default:
            return env.Null();
    }
}

template<>
static Value ConvertNative(Env& env, duckdb_string val) {
    auto ret = String::New(env, val.data, val.size);
    duckdb_free(val.data);
    return ret;
}

template<>
static Value ConvertNative(Env& env, const char* val) {
    return String::New(env, val);
}



template<>
static Value ConvertNative(Env& env, int32_t val) {
    return Number::New(env, val);
}

template<>
static Value ConvertNative(Env& env, uint32_t val) {
    return Number::New(env, val);
}


template<class T> struct OwnershipType {
        using owner_type = T;
        static T& Get(owner_type& owner) {
            return owner;
        }
    };

template<> struct OwnershipType<const char*> {
    using owner_type = std::string;
    static const char* Get(owner_type& owner) {
        return owner.c_str();
    }
};

template <class T>
static T ConvertValue(const CallbackInfo& info, idx_t offset);

template<>
std::string ConvertValue(const CallbackInfo& info, idx_t offset) {
    auto val = info[offset].As<Value>();
   return val.As<Napi::String>();
}

template<>
duckdb_database* ConvertValue(const CallbackInfo& info, idx_t offset) {
    return Napi::ObjectWrap<PointerHolder<duckdb_database>>::Unwrap(info[offset].As<Object>())->Get();
}

template<>
duckdb_database ConvertValue(const CallbackInfo& info, idx_t offset) {
    return *ConvertValue<duckdb_database*>(info, offset);
}


template<>
duckdb_connection* ConvertValue(const CallbackInfo& info, idx_t offset) {
    return Napi::ObjectWrap<PointerHolder<duckdb_connection>>::Unwrap(info[offset].As<Object>())->Get();
}

template<>
duckdb_connection ConvertValue(const CallbackInfo& info, idx_t offset) {
    return *ConvertValue<duckdb_connection*>(info, offset);
}


template<>
duckdb_config* ConvertValue(const CallbackInfo& info, idx_t offset) {
    return Napi::ObjectWrap<PointerHolder<duckdb_config>>::Unwrap(info[offset].As<Object>())->Get();
}

template<>
duckdb_config ConvertValue(const CallbackInfo& info, idx_t offset) {
    return *ConvertValue<duckdb_config*>(info, offset);
}

template<>
duckdb_result* ConvertValue(const CallbackInfo& info, idx_t offset) {
    return Napi::ObjectWrap<PointerHolder<duckdb_result>>::Unwrap(info[offset].As<Object>())->Get();
}

template<>
duckdb_result ConvertValue(const CallbackInfo& info, idx_t offset) {
    return *ConvertValue<duckdb_result*>(info, offset);
}


template<>
duckdb_prepared_statement * ConvertValue(const CallbackInfo& info, idx_t offset) {
    return Napi::ObjectWrap<PointerHolder<duckdb_prepared_statement>>::Unwrap(info[offset].As<Object>())->Get();
}

template<>
duckdb_prepared_statement ConvertValue(const CallbackInfo& info, idx_t offset) {
    return *ConvertValue<duckdb_prepared_statement*>(info, offset);
}

template<>
idx_t ConvertValue(const CallbackInfo& info, idx_t offset) {
    return info[offset].As<Number>().Int64Value();
}


template<class RET,  RET (*FUN)()>
class AsyncFunctionWorker0 : public PromiseWorker {
public:
    AsyncFunctionWorker0(Napi::Env &env, const CallbackInfo &info)
            : PromiseWorker(env) {

    }

    void Execute() override {
        ret = FUN();
    }

    void OnOK() override {
        auto env = Env();
        deferred.Resolve(ConvertNative(env, ret));
    }
    RET ret;
};


template<class RET, RET (*FUN)()>
static Value AsyncFunctionWrapper0(const CallbackInfo &info) {
    Env env = info.Env();
    return (new AsyncFunctionWorker0<RET, FUN>(env, info))->QueueAndPromise();
}





template<class RET, class ARG1, RET (*FUN)(ARG1)>
class AsyncFunctionWorker1 : public PromiseWorker {
public:
    AsyncFunctionWorker1(Napi::Env &env, const CallbackInfo &info)
            : PromiseWorker(env) {
        arg1 = ConvertValue<typename OwnershipType<ARG1>::owner_type>(info, 0); // TODO verify

    }

    void Execute() override {
        ret = FUN(OwnershipType<ARG1>::Get(arg1));
    }

    void OnOK() override {
        auto env = Env();
        deferred.Resolve(ConvertNative(env, ret));
    }

    typename OwnershipType<ARG1>::owner_type arg1;


    RET ret;
};


template<class RET, class ARG1, RET (*FUN)(ARG1)>
static Value AsyncFunctionWrapper1(const CallbackInfo &info) {
    Env env = info.Env();
    return (new AsyncFunctionWorker1<RET, ARG1, FUN>(env, info))->QueueAndPromise();
}




template<class RET, class ARG1, class ARG2, RET (*FUN)(ARG1, ARG2)>
class AsyncFunctionWorker2 : public PromiseWorker {
public:
    AsyncFunctionWorker2(Napi::Env &env, const CallbackInfo &info)
            : PromiseWorker(env) {
        arg1 = ConvertValue<typename OwnershipType<ARG1>::owner_type>(info, 0); // TODO verify
        arg2 = ConvertValue<typename OwnershipType<ARG2>::owner_type>(info, 1); // TODO verify
    }

    void Execute() override {
        ret = FUN(OwnershipType<ARG1>::Get(arg1), OwnershipType<ARG2>::Get(arg2));
    }

    void OnOK() override {
        auto env = Env();
        deferred.Resolve(ConvertNative(env, ret));
    }

    typename OwnershipType<ARG1>::owner_type arg1;
    typename OwnershipType<ARG2>::owner_type arg2;
    RET ret;
};


template<class RET, class ARG1, class ARG2, RET (*FUN)(ARG1, ARG2)>
static Value AsyncFunctionWrapper2(const CallbackInfo &info) {
    Env env = info.Env();
    return (new AsyncFunctionWorker2<RET, ARG1, ARG2, FUN>(env, info))->QueueAndPromise();
}



template< class ARG1, class ARG2, void (*FUN)(ARG1, ARG2)>
class AsyncFunctionWorker2Void : public PromiseWorker {
public:
    AsyncFunctionWorker2Void(Napi::Env &env, const CallbackInfo &info)
            : PromiseWorker(env) {
        arg1 = ConvertValue<typename OwnershipType<ARG1>::owner_type>(info, 0); // TODO verify
        arg2 = ConvertValue<typename OwnershipType<ARG2>::owner_type>(info, 1); // TODO verify
    }

    void Execute() override {
        FUN(OwnershipType<ARG1>::Get(arg1), OwnershipType<ARG2>::Get(arg2));
    }

    void OnOK() override {
        auto env = Env();
        deferred.Resolve(env.Null());
    }

    typename OwnershipType<ARG1>::owner_type arg1;
    typename OwnershipType<ARG2>::owner_type arg2;
};


template<class ARG1, class ARG2, void (*FUN)(ARG1, ARG2)>
static Value AsyncFunctionWrapper2Void(const CallbackInfo &info) {
    Env env = info.Env();
    return (new AsyncFunctionWorker2Void<ARG1, ARG2, FUN>(env, info))->QueueAndPromise();
}




template<class RET, class ARG1, class ARG2, class ARG3, RET (*FUN)(ARG1, ARG2, ARG3)>
class AsyncFunctionWorker3 : public PromiseWorker {
public:
    AsyncFunctionWorker3(Napi::Env &env, const CallbackInfo &info)
            : PromiseWorker(env) {
        arg1 = ConvertValue<typename OwnershipType<ARG1>::owner_type>(info, 0); // TODO verify
        arg2 = ConvertValue<typename OwnershipType<ARG2>::owner_type>(info, 1); // TODO verify
        arg3 = ConvertValue<typename OwnershipType<ARG3>::owner_type>(info, 2); // TODO verify
    }

    void Execute() override {
        ret = FUN(OwnershipType<ARG1>::Get(arg1), OwnershipType<ARG2>::Get(arg2), OwnershipType<ARG3>::Get(arg3));
    }

    void OnOK() override {
        auto env = Env();
        deferred.Resolve(ConvertNative(env, ret));
    }

    typename OwnershipType<ARG1>::owner_type arg1;
    typename OwnershipType<ARG2>::owner_type arg2;
    typename OwnershipType<ARG3>::owner_type arg3;

    RET ret;
};


template<class RET, class ARG1, class ARG2, class ARG3, RET (*FUN)(ARG1, ARG2, ARG3)>
static Value AsyncFunctionWrapper3(const CallbackInfo &info) {
    Env env = info.Env();
    return (new AsyncFunctionWorker3<RET, ARG1, ARG2, ARG3, FUN>(env, info))->QueueAndPromise();
}





template<class ARG1, class ARG2, class ARG3, void (*FUN)(ARG1, ARG2, ARG3)>
class AsyncFunctionWorker3Void : public PromiseWorker {
public:
    AsyncFunctionWorker3Void(Napi::Env &env, const CallbackInfo &info)
            : PromiseWorker(env) {
        arg1 = ConvertValue<typename OwnershipType<ARG1>::owner_type>(info, 0); // TODO verify
        arg2 = ConvertValue<typename OwnershipType<ARG2>::owner_type>(info, 1); // TODO verify
        arg3 = ConvertValue<typename OwnershipType<ARG3>::owner_type>(info, 2); // TODO verify
    }

    void Execute() override {
        FUN(OwnershipType<ARG1>::Get(arg1), OwnershipType<ARG2>::Get(arg2), OwnershipType<ARG3>::Get(arg3));
    }

    void OnOK() override {
        auto env = Env();
        deferred.Resolve(env.Null());
    }

    typename OwnershipType<ARG1>::owner_type arg1;
    typename OwnershipType<ARG2>::owner_type arg2;
    typename OwnershipType<ARG3>::owner_type arg3;

};


template<class ARG1, class ARG2, class ARG3, void (*FUN)(ARG1, ARG2, ARG3)>
static Value AsyncFunctionWrapper3Void(const CallbackInfo &info) {
    Env env = info.Env();
    return (new AsyncFunctionWorker3Void<ARG1, ARG2, ARG3, FUN>(env, info))->QueueAndPromise();
}






template<class RET, class ARG1, class ARG2, class ARG3, class ARG4, RET (*FUN)(ARG1, ARG2, ARG3, ARG4)>
class AsyncFunctionWorker4 : public PromiseWorker {
public:
    AsyncFunctionWorker4(Napi::Env &env, const CallbackInfo &info)
            : PromiseWorker(env) {
        arg1 = ConvertValue<typename OwnershipType<ARG1>::owner_type>(info, 0); // TODO verify
        arg2 = ConvertValue<typename OwnershipType<ARG2>::owner_type>(info, 1); // TODO verify
        arg3 = ConvertValue<typename OwnershipType<ARG3>::owner_type>(info, 2); // TODO verify
        arg4 = ConvertValue<typename OwnershipType<ARG4>::owner_type>(info, 3); // TODO verify

    }

    void Execute() override {
        ret = FUN(OwnershipType<ARG1>::Get(arg1), OwnershipType<ARG2>::Get(arg2), OwnershipType<ARG3>::Get(arg3), OwnershipType<ARG4>::Get(arg4));
    }

    void OnOK() override {
        auto env = Env();
        deferred.Resolve(ConvertNative(env, ret));
    }

    typename OwnershipType<ARG1>::owner_type arg1;
    typename OwnershipType<ARG2>::owner_type arg2;
    typename OwnershipType<ARG3>::owner_type arg3;
    typename OwnershipType<ARG4>::owner_type arg4;

    RET ret;
};




template<class RET, class ARG1, class ARG2, class ARG3, class ARG4, RET (*FUN)(ARG1, ARG2, ARG3, ARG4)>
static Value AsyncFunctionWrapper4(const CallbackInfo &info) {
    Env env = info.Env();
    return (new AsyncFunctionWorker4<RET, ARG1, ARG2, ARG3, ARG4, FUN>(env, info))->QueueAndPromise();
}



template<class ARG1, class ARG2, class ARG3, class ARG4, void (*FUN)(ARG1, ARG2, ARG3, ARG4)>
class AsyncFunctionWorker4Void : public PromiseWorker {
public:
    AsyncFunctionWorker4Void(Napi::Env &env, const CallbackInfo &info)
            : PromiseWorker(env) {
        arg1 = ConvertValue<typename OwnershipType<ARG1>::owner_type>(info, 0); // TODO verify
        arg2 = ConvertValue<typename OwnershipType<ARG2>::owner_type>(info, 1); // TODO verify
        arg3 = ConvertValue<typename OwnershipType<ARG3>::owner_type>(info, 2); // TODO verify
        arg4 = ConvertValue<typename OwnershipType<ARG4>::owner_type>(info, 3); // TODO verify

    }

    void Execute() override {
         FUN(OwnershipType<ARG1>::Get(arg1), OwnershipType<ARG2>::Get(arg2), OwnershipType<ARG3>::Get(arg3), OwnershipType<ARG4>::Get(arg4));
    }

    void OnOK() override {
        auto env = Env();
        deferred.Resolve(env.Null());
    }

    typename OwnershipType<ARG1>::owner_type arg1;
    typename OwnershipType<ARG2>::owner_type arg2;
    typename OwnershipType<ARG3>::owner_type arg3;
    typename OwnershipType<ARG4>::owner_type arg4;

};




template< class ARG1, class ARG2, class ARG3, class ARG4, void (*FUN)(ARG1, ARG2, ARG3, ARG4)>
static Value AsyncFunctionWrapper4Void(const CallbackInfo &info) {
    Env env = info.Env();
    return (new AsyncFunctionWorker4Void<ARG1, ARG2, ARG3, ARG4, FUN>(env, info))->QueueAndPromise();
}




template<class RET, class ARG1, class ARG2, class ARG3, class ARG4, class ARG5, RET (*FUN)(ARG1, ARG2, ARG3, ARG4, ARG5)>
class AsyncFunctionWorker5 : public PromiseWorker {
public:
    AsyncFunctionWorker5(Napi::Env &env, const CallbackInfo &info)
            : PromiseWorker(env) {
        arg1 = ConvertValue<typename OwnershipType<ARG1>::owner_type>(info, 0); // TODO verify
        arg2 = ConvertValue<typename OwnershipType<ARG2>::owner_type>(info, 1); // TODO verify
        arg3 = ConvertValue<typename OwnershipType<ARG3>::owner_type>(info, 2); // TODO verify
        arg4 = ConvertValue<typename OwnershipType<ARG4>::owner_type>(info, 3); // TODO verify
        arg5 = ConvertValue<typename OwnershipType<ARG5>::owner_type>(info, 4); // TODO verify


    }

    void Execute() override {
        ret = FUN(OwnershipType<ARG1>::Get(arg1), OwnershipType<ARG2>::Get(arg2), OwnershipType<ARG3>::Get(arg3), OwnershipType<ARG4>::Get(arg4), OwnershipType<ARG5>::Get(arg5));
    }

    void OnOK() override {
        auto env = Env();
        deferred.Resolve(ConvertNative(env, ret));
    }

    typename OwnershipType<ARG1>::owner_type arg1;
    typename OwnershipType<ARG2>::owner_type arg2;
    typename OwnershipType<ARG3>::owner_type arg3;
    typename OwnershipType<ARG4>::owner_type arg4;
    typename OwnershipType<ARG5>::owner_type arg5;

    RET ret;
};


template<class RET, class ARG1, class ARG2, class ARG3, class ARG4, class ARG5, RET (*FUN)(ARG1, ARG2, ARG3)>
static Value AsyncFunctionWrapper5(const CallbackInfo &info) {
    Env env = info.Env();
    return (new AsyncFunctionWorker5<RET, ARG1, ARG2, ARG3, ARG4, ARG5, FUN>(env, info))->QueueAndPromise();
}



template<class ARG1, void (*FUN)(ARG1)>
class AsyncFunctionWorker1Void : public PromiseWorker {
public:
    AsyncFunctionWorker1Void(Napi::Env &env, const CallbackInfo &info)
            : PromiseWorker(env) {
        arg1 = ConvertValue<typename OwnershipType<ARG1>::owner_type>(info, 0); // TODO verify
    }

    void Execute() override {
        FUN(OwnershipType<ARG1>::Get(arg1));
    }

    void OnOK() override {
        auto env = Env();
        deferred.Resolve(env.Null());
    }

    typename OwnershipType<ARG1>::owner_type arg1;
};


template<class ARG1, void (*FUN)(ARG1)>
static Value AsyncFunctionWrapper1Void(const CallbackInfo &info) {
    Env env = info.Env();
    return (new AsyncFunctionWorker1Void<ARG1, FUN>(env, info))->QueueAndPromise();
}

// this file contains generated template instantiations from duckdb.h
#include "duckdb_node_generated.cpp"

DuckDBNodeNative::DuckDBNodeNative(Env env, Object exports) {
    RegisterGenerated(env, exports);

    config_holder_constructor = PointerHolder<duckdb_config>::Init(env, "duckdb_config");
    database_holder_constructor = PointerHolder<duckdb_database>::Init(env, "duckdb_database");
    connection_holder_constructor = PointerHolder<duckdb_connection>::Init(env, "duckdb_connection");
    prepared_statement_holder_constructor = PointerHolder<duckdb_prepared_statement>::Init(env, "duckdb_prepared_statement");
    result_holder_constructor = PointerHolder<duckdb_result>::Init(env, "duckdb_result");

    exports.Set(String::New(env, "config"), config_holder_constructor->Value());
    exports.Set(String::New(env, "database"), database_holder_constructor->Value());
    exports.Set(String::New(env, "connection"), connection_holder_constructor->Value());
    exports.Set(String::New(env, "prepared_statement"), prepared_statement_holder_constructor->Value());
    exports.Set(String::New(env, "result"), result_holder_constructor->Value());
}

NODE_API_ADDON(DuckDBNodeNative);


//DUCKDB_API duckdb_state duckdb_query(duckdb_connection connection, const char *query, duckdb_result *out_result);