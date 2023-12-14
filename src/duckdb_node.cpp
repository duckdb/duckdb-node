#define NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED // apparently electron does not like those

#include "napi.h"
#include "duckdb.h" // NB: C API

using namespace Napi;
using namespace std;

enum NodeObjectType {
    INVALID,
    DATABASE,
    CONNECTION
};


static Object GetObject(const CallbackInfo &info, size_t offset, NodeObjectType type) {
    Env env = info.Env();

    if (info.Length() < offset || !info[offset].IsObject()) {
        throw TypeError::New(env, "Object expected");
    }
    auto object = info[offset].As<Object>();
    if (!object.Has("type") || !object.Has("ptr")) {
        throw Error::New(env, "Not a wrapper object");
    }
    if (object.Get("type").As<Number>().Uint32Value() != type) {
        throw Error::New(env, "Invalid wrapper object type");
    }
    auto ptr = (void *) object.Get("ptr").As<Number>().Int64Value();
    if (!ptr) {
        throw Error::New(env, "Invalid pointer"); // TODO?
    }
    return object;
}

static void* GetObjectPtr2(Env& env, Object object) {
    auto ptr = (void *) object.Get("ptr").As<Number>().Int64Value();
    if (!ptr) {
        throw Error::New(env, "Invalid pointer");
    }
    return ptr;
}

static Object InvalidateObjectPtr2(Env& env, Object object) {
    if (!object.Has("type") || !object.Has("ptr")) {
        throw Error::New(env, "Not a wrapper object");
    }
    object.Set("ptr", env.Null());
    object.Set("type", env.Null());

    return object;
}

static Object CreateObjectPtr(Env &env, void *ptr, NodeObjectType type) {
    auto ret = Object::New(env);
    ret.Set("ptr", Number::New(env, (ptrdiff_t) ptr));
    ret.Set("type", Number::New(env, type));
    return ret;
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
    }

    void Execute() override { // this runs on worker thread so no allocs etc. (?)
        db = (duckdb_database *) malloc(sizeof(duckdb_database));
        if (!db || duckdb_open(path.c_str(), db) == DuckDBError) {
            SetError("Error opening database");
            free(db);
        }
    }

    void OnOK() override {
        auto env = Env();
        deferred.Resolve(CreateObjectPtr(env, db, NodeObjectType::DATABASE));
    }

private:
    std::string path;
    duckdb_database *db;
};


class ConnectWorker : public PromiseWorker {
public:
    ConnectWorker(Napi::Env &env, const CallbackInfo &info)
    : PromiseWorker(env) {
            auto db_object = GetObject(info, 0, NodeObjectType::DATABASE);
            db_object_ref = Persistent(db_object);
            db = (duckdb_database*)GetObjectPtr2(env, db_object);
    }


    void Execute() override {
        con = (duckdb_connection *) malloc(sizeof(duckdb_connection));
        if (!con || duckdb_connect(*db, con) == DuckDBError) {
            SetError("Error connecting to database");
            free(con);
        }
    }

    void OnOK() override {
        auto env = Env();
        deferred.Resolve(CreateObjectPtr(env, con, NodeObjectType::CONNECTION));
    }

private:
    ObjectReference db_object_ref;

    duckdb_connection *con;
    duckdb_database *db;

};

class CloseWorker : public PromiseWorker {
public:
    CloseWorker(Napi::Env &env, const CallbackInfo &info)
    : PromiseWorker(env) {
            auto db_object = GetObject(info, 0, NodeObjectType::DATABASE);
            db_object_ref = Persistent(db_object);
            db = (duckdb_database*)GetObjectPtr2(env, db_object);
    }

    void Execute() override {
        duckdb_close(db);
    }

    void OnOK() override {
        auto env = Env();
        InvalidateObjectPtr2(env, db_object_ref.Value());
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
        auto con_object = GetObject(info, 0, NodeObjectType::CONNECTION);
        con_object_ref = Persistent(con_object);
        con = (duckdb_connection*)GetObjectPtr2(env, con_object);
    }

    void Execute() override {
        duckdb_disconnect(con);
    }

    void OnOK() override {
        auto env = Env();
        InvalidateObjectPtr2(env, con_object_ref.Value());
        PromiseWorker::OnOK();
    }

private:
    ObjectReference con_object_ref;
    duckdb_connection *con;
};

template <class WORKER>
static Value WorkerWrapper(const CallbackInfo &info) {
    Env env = info.Env();
    return (new WORKER(env, info))->QueueAndPromise();
}

// sync methods, just return a constant
static Value LibraryVersion(const CallbackInfo &info) {
    Env env = info.Env();
    return String::New(env, duckdb_library_version());
}

static Object Init(Env env, Object exports) {
    exports.Set(String::New(env, "library_version"), Function::New<LibraryVersion>(env));

    // generate a bunch of async promise worker wrappers


    exports.Set(String::New(env, "open"), Function::New<WorkerWrapper<OpenWorker>>(env));
    exports.Set(String::New(env, "connect"), Function::New<WorkerWrapper<ConnectWorker>>(env));
    exports.Set(String::New(env, "disconnect"), Function::New<WorkerWrapper<DisconnectWorker>>(env));
    exports.Set(String::New(env, "close"), Function::New<WorkerWrapper<CloseWorker>>(env));

    return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
