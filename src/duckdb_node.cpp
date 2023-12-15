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

private:
    unique_ptr<data_t[]> ptr;
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

class OpenWorker : public PromiseWorker {
public:
    OpenWorker(Napi::Env &env, const CallbackInfo &info)
            : PromiseWorker(env) {
        path = ":memory:"; // TODO
        auto db_object = DuckDBNodeNative::GetData(info.Env())->database_holder_constructor->New({});
        db = Napi::ObjectWrap<PointerHolder<duckdb_database>>::Unwrap(db_object)->Get(); // todo simplify
        db_object_ref = Persistent(db_object);
    }

    void Execute() override { // this runs on worker thread so no allocs etc. (?)
        if (duckdb_open(path.c_str(), db) == DuckDBError) {
            SetError("Error opening database");
            free(db);
        }
    }

    void OnOK() override {
        deferred.Resolve(db_object_ref.Value());
    }

private:
    std::string path;
    ObjectReference db_object_ref;

    duckdb_database *db;
};


class ConnectWorker : public PromiseWorker {
public:
    ConnectWorker(Napi::Env &env, const CallbackInfo &info)
            : PromiseWorker(env) {
        auto db_object = GetObject(info, 0);
        db = Napi::ObjectWrap<PointerHolder<duckdb_database>>::Unwrap(db_object)->Get(); // todo simplify
        db_object_ref = Persistent(db_object);

        auto con_object = DuckDBNodeNative::GetData(info.Env())->connection_holder_constructor->New({});
        con = Napi::ObjectWrap<PointerHolder<duckdb_connection>>::Unwrap(con_object)->Get(); // todo simplify
        con_object_ref = Persistent(con_object);
    }


    void Execute() override {
        if (duckdb_connect(*db, con) == DuckDBError) {
            SetError("Error connecting to database");
        }
    }

    void OnOK() override {
        auto env = Env();
        deferred.Resolve(con_object_ref.Value());
    }

private:
    ObjectReference db_object_ref;
    ObjectReference con_object_ref;

    duckdb_database *db;
    duckdb_connection *con;


};

class CloseWorker : public PromiseWorker {
public:
    CloseWorker(Napi::Env &env, const CallbackInfo &info)
            : PromiseWorker(env) {
        auto db_object = GetObject(info, 0);
        db_object_ref = Persistent(db_object);
        db = Napi::ObjectWrap<PointerHolder<duckdb_database>>::Unwrap(db_object)->Get(); // todo simplify
    }

    void Execute() override {
        duckdb_close(db);
    }

    void OnOK() override {
        auto env = Env();
        PromiseWorker::OnOK();
    }


private:
    ObjectReference db_object_ref;
    duckdb_database *db;
};


class DisconnectWorker : public PromiseWorker {
public:
    DisconnectWorker(Napi::Env &env, const CallbackInfo &info)
            : PromiseWorker(env) {
        auto con_object = GetObject(info, 0);
        con_object_ref = Persistent(con_object);
        con = Napi::ObjectWrap<PointerHolder<duckdb_connection>>::Unwrap(con_object)->Get(); // todo simplify
    }

    void Execute() override {
        duckdb_disconnect(con);
    }

    void OnOK() override {
        auto env = Env();
        PromiseWorker::OnOK();
    }

private:
    ObjectReference con_object_ref;
    duckdb_connection *con;
};

template<class WORKER>
static Value WorkerWrapper(const CallbackInfo &info) {
    Env env = info.Env();
    return (new WORKER(env, info))->QueueAndPromise();
}

// sync methods, just return a constant
static Value LibraryVersion(const CallbackInfo &info) {
    Env env = info.Env();
    return String::New(env, duckdb_library_version());
}

static Value CreateConfig(const CallbackInfo &info) {
    auto config_object = DuckDBNodeNative::GetData(info.Env())->config_holder_constructor->New({});
    auto config = Napi::ObjectWrap<PointerHolder<duckdb_config>>::Unwrap(config_object)->Get(); // todo simplify
    duckdb_create_config(config);
    return config_object;
}

DuckDBNodeNative::DuckDBNodeNative(Env env, Object exports) {
    exports.Set(String::New(env, "library_version"), Function::New<LibraryVersion>(env));
    exports.Set(String::New(env, "create_config"), Function::New<CreateConfig>(env));

    // generate a bunch of async promise worker wrappers
    exports.Set(String::New(env, "open"), Function::New<WorkerWrapper<OpenWorker>>(env));
    exports.Set(String::New(env, "connect"),
                Function::New<WorkerWrapper<ConnectWorker>>(env)); // TODO this can never block?
    exports.Set(String::New(env, "disconnect"),
                Function::New<WorkerWrapper<DisconnectWorker>>(env)); // TODO this can never block?
    exports.Set(String::New(env, "close"), Function::New<WorkerWrapper<CloseWorker>>(env));

    config_holder_constructor = PointerHolder<duckdb_config>::Init(env, "duckdb_config");
    database_holder_constructor = PointerHolder<duckdb_database>::Init(env, "duckdb_database");
    connection_holder_constructor = PointerHolder<duckdb_connection>::Init(env, "duckdb_connection");

}

NODE_API_ADDON(DuckDBNodeNative);