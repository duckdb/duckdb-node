#pragma once

#include "napi.h"
#include "duckdb.h"



namespace duckdb_node {

typedef uint8_t data_t;

static Napi::Value GetValue(const Napi::CallbackInfo &info, size_t offset) {
	Napi::Env env = info.Env();

	if (info.Length() < offset) {
		throw Napi::TypeError::New(env, "Value expected at offset " + std::to_string(offset));
	}
	return info[offset].As<Napi::Value>();
}

//
//
//class ObjectDestructorWrapper : public Napi::ObjectWrap<ObjectDestructorWrapper> {
//public:
//    static Napi::FunctionReference *Init(Napi::Env env) {
//        // TODO needs a getter
//        auto func = Napi::ObjectWrap<ObjectDestructorWrapper>::DefineClass(env, "duckdb_object_destructor", {});
//        auto constructor = new Napi::FunctionReference();
//        *constructor = Napi::Persistent(func);                     // weird
//        env.SetInstanceData<Napi::FunctionReference>(constructor); // is this so this is eventually freed?
//        return constructor;
//    }
//
//    ObjectDestructorWrapper(const Napi::CallbackInfo &info) : Napi::ObjectWrap<ObjectDestructorWrapper>(info) {
//        object = Persistent(GetValue(info, 0).As<Napi::Object>());
//        destructor = Persistent(GetValue(info, 1).As<Napi::Function>());
//    }
//
//    void Finalize(Napi::Env env) override {
//            printf("%p\n", object);
//
//    }
//
//private:
//    Napi::ObjectReference object;
//    Napi::FunctionReference destructor;
//};
//


template <class T>
class PointerHolder : public Napi::ObjectWrap<PointerHolder<T>> {
public:
	static Napi::FunctionReference *Init(Napi::Env env, const char *name) {
		auto func = Napi::ObjectWrap<PointerHolder<T>>::DefineClass(env, name, {});
		auto constructor = new Napi::FunctionReference();
		*constructor = Napi::Persistent(func);                     // weird
		env.SetInstanceData<Napi::FunctionReference>(constructor); // is this so this is eventually freed?
		return constructor;
	}

	PointerHolder(const Napi::CallbackInfo &info) : Napi::ObjectWrap<PointerHolder<T>>(info) {
		ptr = std::unique_ptr<data_t[]>(new data_t[sizeof(T)]);
	}

	static T *FromInfo(const Napi::CallbackInfo &info, idx_t offset) {
		return Napi::ObjectWrap<PointerHolder<T>>::Unwrap(GetValue(info, offset).As<Napi::Object>())->Get();
	}

	static Napi::Value NewAndSet(Napi::Env &env, T val) {
		// TODO use actual constructor here ?
		auto res = PointerHolder<T>::DefineClass(env, "duckdb_pointer_holder", {}, nullptr).New({});
		Napi::ObjectWrap<PointerHolder<T>>::Unwrap(res)->Set(val);
		return res;
	}

	T *Get() {
		return (T *)ptr.get();
	}
	void Set(T val) {
		memcpy(ptr.get(), &val, sizeof(T));
	}

private:
	std::unique_ptr<data_t[]> ptr;
};

struct out_string_wrapper {
	const char *ptr;
};

class ValueConversion {
public:
	template <class T>
	static Napi::Value ToJS(Napi::Env &env, T val) {
		// static_assert(false, "Unimplemented value conversion to JS");
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, duckdb_state val) {
		return Napi::Number::New(env, (uint8_t)val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, duckdb_pending_state val) {
		return Napi::Number::New(env, (uint8_t)val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, duckdb_type val) {
		return Napi::Number::New(env, (uint8_t)val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, duckdb_data_chunk val) {
		return PointerHolder<duckdb_data_chunk>::NewAndSet(env, val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, duckdb_vector val) {
		return PointerHolder<duckdb_vector>::NewAndSet(env, val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, duckdb_logical_type val) {
		return PointerHolder<duckdb_logical_type>::NewAndSet(env, val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, void *val) {
		return PointerHolder<void *>::NewAndSet(env, val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, uint64_t *val) {
		return PointerHolder<uint64_t *>::NewAndSet(env, val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, duckdb_string val) {
		auto ret = Napi::String::New(env, val.data, val.size);
		duckdb_free(val.data);
		return ret;
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, const char *val) {
		return Napi::String::New(env, val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, char *val) {
		return Napi::String::New(env, val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, int32_t val) {
		return Napi::Number::New(env, val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, uint32_t val) {
		return Napi::Number::New(env, val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, idx_t val) {
		return Napi::Number::New(env, val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, bool val) {
		return Napi::Boolean::New(env, val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, double val) {
		return Napi::Number::New(env, val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, size_t val) {
		return Napi::Number::New(env, val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, int8_t val) {
		return Napi::Number::New(env, val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, int16_t val) {
		return Napi::Number::New(env, val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, int64_t val) {
		return Napi::Number::New(env, val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, uint8_t val) {
		return Napi::Number::New(env, val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, uint16_t val) {
		return Napi::Number::New(env, val);
	}

	template <>
	static Napi::Value ToJS(Napi::Env &env, float val) {
		return Napi::Number::New(env, val);
	}

	template <class T>
	static T FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		// static_assert(false, "Unimplemented value conversion from JS");
	}

	template <>
	std::string FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return GetValue(info, offset).As<Napi::String>();
	}

	template <>
	duckdb_database *FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return PointerHolder<duckdb_database>::FromInfo(info, offset);
	}

	template <>
	duckdb_database FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return *FromJS<duckdb_database *>(info, offset);
	}

	template <>
	duckdb_connection *FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return PointerHolder<duckdb_connection>::FromInfo(info, offset);
	}

	template <>
	duckdb_connection FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return *FromJS<duckdb_connection *>(info, offset);
	}

	template <>
	duckdb_config *FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return PointerHolder<duckdb_config>::FromInfo(info, offset);
	}

	template <>
	duckdb_config FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return *FromJS<duckdb_config *>(info, offset);
	}

	template <>
	duckdb_result *FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return PointerHolder<duckdb_result>::FromInfo(info, offset);
	}

	template <>
	duckdb_result FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return *FromJS<duckdb_result *>(info, offset);
	}

	template <>
	duckdb_prepared_statement *FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return PointerHolder<duckdb_prepared_statement>::FromInfo(info, offset);
	}

	template <>
	duckdb_prepared_statement FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return *FromJS<duckdb_prepared_statement *>(info, offset);
	}

	template <>
	duckdb_appender *FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return PointerHolder<duckdb_appender>::FromInfo(info, offset);
	}

	template <>
	duckdb_appender FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return *FromJS<duckdb_appender *>(info, offset);
	}

	template <>
	duckdb_data_chunk *FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return PointerHolder<duckdb_data_chunk>::FromInfo(info, offset);
	}

	template <>
	duckdb_data_chunk FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return *FromJS<duckdb_data_chunk *>(info, offset);
	}

	template <>
	duckdb_vector *FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return PointerHolder<duckdb_vector>::FromInfo(info, offset);
	}

	template <>
	duckdb_vector FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return *FromJS<duckdb_vector *>(info, offset);
	}

	template <>
	duckdb_pending_result *FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return PointerHolder<duckdb_pending_result>::FromInfo(info, offset);
	}

	template <>
	const char **FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return &(PointerHolder<out_string_wrapper>::FromInfo(info, offset)->ptr);
	}

	template <>
	char **FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return (char **)&(PointerHolder<out_string_wrapper>::FromInfo(info, offset)->ptr);
	}

	template <>
	duckdb_pending_result FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return *FromJS<duckdb_pending_result *>(info, offset);
	}

	template <>
	duckdb_logical_type FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return *FromJS<duckdb_logical_type *>(info, offset);
	}

	template <>
	duckdb_logical_type *FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return PointerHolder<duckdb_logical_type>::FromInfo(info, offset);
	}

	template <>
	void *FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return *PointerHolder<void *>::FromInfo(info, offset);
	}

	template <>
	uint64_t *FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return *PointerHolder<uint64_t *>::FromInfo(info, offset);
	}

	template <>
	idx_t FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return GetValue(info, offset).As<Napi::Number>().Int64Value();
	}

	template <>
	size_t FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return GetValue(info, offset).As<Napi::Number>().Int64Value();
	}

	template <>
	int64_t FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return GetValue(info, offset).As<Napi::Number>().Int64Value();
	}

	template <>
	int32_t FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return GetValue(info, offset).As<Napi::Number>().Int32Value();
	}

	template <>
	uint32_t FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return GetValue(info, offset).As<Napi::Number>().Int32Value();
	}

	template <>
	int16_t FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return GetValue(info, offset).As<Napi::Number>().Int32Value();
	}

	template <>
	uint16_t FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return GetValue(info, offset).As<Napi::Number>().Int32Value();
	}

	template <>
	float FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return GetValue(info, offset).As<Napi::Number>().FloatValue();
	}

	template <>
	int8_t FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return GetValue(info, offset).As<Napi::Number>().Int32Value();
	}

	template <>
	bool FromJS(const Napi::CallbackInfo &info, idx_t offset) {
		return GetValue(info, offset).As<Napi::Boolean>().Value();
	}
};
} // namespace duckdb_node