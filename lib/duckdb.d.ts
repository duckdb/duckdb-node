export enum duckdb_type {
  DUCKDB_TYPE_INVALID = 0,
  DUCKDB_TYPE_BOOLEAN = 1,
  DUCKDB_TYPE_TINYINT = 2,
  DUCKDB_TYPE_SMALLINT = 3,
  DUCKDB_TYPE_INTEGER = 4,
  DUCKDB_TYPE_BIGINT = 5,
  DUCKDB_TYPE_UTINYINT = 6,
  DUCKDB_TYPE_USMALLINT = 7,
  DUCKDB_TYPE_UINTEGER = 8,
  DUCKDB_TYPE_UBIGINT = 9,
  DUCKDB_TYPE_FLOAT = 10,
  DUCKDB_TYPE_DOUBLE = 11,
  DUCKDB_TYPE_TIMESTAMP = 12,
  DUCKDB_TYPE_DATE = 13,
  DUCKDB_TYPE_TIME = 14,
  DUCKDB_TYPE_INTERVAL = 15,
  DUCKDB_TYPE_HUGEINT = 16,
  DUCKDB_TYPE_VARCHAR = 17,
  DUCKDB_TYPE_BLOB = 18,
  DUCKDB_TYPE_DECIMAL = 19,
  DUCKDB_TYPE_TIMESTAMP_S = 20,
  DUCKDB_TYPE_TIMESTAMP_MS = 21,
  DUCKDB_TYPE_TIMESTAMP_NS = 22,
  DUCKDB_TYPE_ENUM = 23,
  DUCKDB_TYPE_LIST = 24,
  DUCKDB_TYPE_STRUCT = 25,
  DUCKDB_TYPE_MAP = 26,
  DUCKDB_TYPE_UUID = 27,
  DUCKDB_TYPE_UNION = 28,
  DUCKDB_TYPE_BIT = 29,
}
export type duckdb_date = object;
export type duckdb_date_struct = object;
export type duckdb_time = object;
export type duckdb_time_struct = object;
export type duckdb_timestamp = object;
export type duckdb_timestamp_struct = object;
export type duckdb_interval = object;
export type duckdb_hugeint = object;
export type duckdb_decimal = object;
export type duckdb_string = object;
export type duckdb_string_t = object;
export type duckdb_blob = object;
export type duckdb_list_entry = object;
export type duckdb_column = object;
export type duckdb_result = object;
export type duckdb_database = object;
export type duckdb_connection = object;
export type duckdb_prepared_statement = object;
export type duckdb_extracted_statements = object;
export type duckdb_pending_result = object;
export type duckdb_appender = object;
export type duckdb_arrow = object;
export type duckdb_arrow_stream = object;
export type duckdb_config = object;
export type duckdb_arrow_schema = object;
export type duckdb_arrow_array = object;
export type duckdb_logical_type = object;
export type duckdb_data_chunk = object;
export type duckdb_vector = object;
export type duckdb_value = object;
export enum duckdb_state {
  DuckDBSuccess = 0,
  DuckDBError = 1,
}
export enum duckdb_pending_state {
  DUCKDB_PENDING_RESULT_READY = 0,
  DUCKDB_PENDING_RESULT_NOT_READY = 1,
  DUCKDB_PENDING_ERROR = 2,
  DUCKDB_PENDING_NO_TASKS_AVAILABLE = 3,
}
export function duckdb_open(): duckdb_state;
export function duckdb_open_ext(): duckdb_state;
export function duckdb_close(): void;
export function duckdb_connect(): duckdb_state;
export function duckdb_interrupt(): void;
export function duckdb_query_progress(): number;
export function duckdb_disconnect(): void;
export function duckdb_library_version(): string;
export function duckdb_create_config(): duckdb_state;
export function duckdb_config_count(): number;
export function duckdb_get_config_flag(): duckdb_state;
export function duckdb_set_config(): duckdb_state;
export function duckdb_destroy_config(): void;
export function duckdb_query(): duckdb_state;
export function duckdb_destroy_result(): void;
export function duckdb_column_name(): string;
export function duckdb_column_type(): duckdb_type;
export function duckdb_column_logical_type(): duckdb_logical_type;
export function duckdb_column_count(): number;
export function duckdb_row_count(): number;
export function duckdb_rows_changed(): number;
export function duckdb_result_error(): string;
export function duckdb_result_get_chunk(): duckdb_data_chunk;
export function duckdb_result_is_streaming(): boolean;
export function duckdb_result_chunk_count(): number;
// export function duckdb_malloc(): void*;
export function duckdb_free(): void;
export function duckdb_vector_size(): number;
export function duckdb_string_is_inlined(): boolean;
export function duckdb_from_date(): duckdb_date_struct;
export function duckdb_to_date(): duckdb_date;
export function duckdb_from_time(): duckdb_time_struct;
export function duckdb_to_time(): duckdb_time;
export function duckdb_from_timestamp(): duckdb_timestamp_struct;
export function duckdb_to_timestamp(): duckdb_timestamp;
export function duckdb_hugeint_to_double(): number;
export function duckdb_double_to_hugeint(): duckdb_hugeint;
export function duckdb_double_to_decimal(): duckdb_decimal;
export function duckdb_decimal_to_double(): number;
export function duckdb_prepare(): duckdb_state;
export function duckdb_destroy_prepare(): void;
export function duckdb_prepare_error(): string;
export function duckdb_nparams(): number;
export function duckdb_parameter_name(): string;
export function duckdb_param_type(): duckdb_type;
export function duckdb_clear_bindings(): duckdb_state;
export function duckdb_bind_value(): duckdb_state;
export function duckdb_bind_parameter_index(): duckdb_state;
export function duckdb_bind_boolean(): duckdb_state;
export function duckdb_bind_int8(): duckdb_state;
export function duckdb_bind_int16(): duckdb_state;
export function duckdb_bind_int32(): duckdb_state;
export function duckdb_bind_int64(): duckdb_state;
export function duckdb_bind_hugeint(): duckdb_state;
export function duckdb_bind_decimal(): duckdb_state;
export function duckdb_bind_uint8(): duckdb_state;
export function duckdb_bind_uint16(): duckdb_state;
export function duckdb_bind_uint32(): duckdb_state;
export function duckdb_bind_uint64(): duckdb_state;
export function duckdb_bind_float(): duckdb_state;
export function duckdb_bind_double(): duckdb_state;
export function duckdb_bind_date(): duckdb_state;
export function duckdb_bind_time(): duckdb_state;
export function duckdb_bind_timestamp(): duckdb_state;
export function duckdb_bind_interval(): duckdb_state;
export function duckdb_bind_varchar(): duckdb_state;
export function duckdb_bind_varchar_length(): duckdb_state;
export function duckdb_bind_blob(): duckdb_state;
export function duckdb_bind_null(): duckdb_state;
export function duckdb_execute_prepared(): duckdb_state;
export function duckdb_extract_statements(): number;
export function duckdb_prepare_extracted_statement(): duckdb_state;
export function duckdb_extract_statements_error(): string;
export function duckdb_destroy_extracted(): void;
export function duckdb_pending_prepared(): duckdb_state;
export function duckdb_pending_prepared_streaming(): duckdb_state;
export function duckdb_destroy_pending(): void;
export function duckdb_pending_error(): string;
export function duckdb_pending_execute_task(): duckdb_pending_state;
export function duckdb_execute_pending(): duckdb_state;
export function duckdb_pending_execution_is_finished(): boolean;
export function duckdb_destroy_value(): void;
export function duckdb_create_varchar(): duckdb_value;
export function duckdb_create_varchar_length(): duckdb_value;
export function duckdb_create_int64(): duckdb_value;
export function duckdb_get_varchar(): string;
export function duckdb_get_int64(): number;
export function duckdb_create_logical_type(): duckdb_logical_type;
export function duckdb_create_list_type(): duckdb_logical_type;
export function duckdb_create_map_type(): duckdb_logical_type;
export function duckdb_create_union_type(): duckdb_logical_type;
export function duckdb_create_struct_type(): duckdb_logical_type;
export function duckdb_create_decimal_type(): duckdb_logical_type;
export function duckdb_get_type_id(): duckdb_type;
export function duckdb_decimal_width(): number;
export function duckdb_decimal_scale(): number;
export function duckdb_decimal_internal_type(): duckdb_type;
export function duckdb_enum_internal_type(): duckdb_type;
export function duckdb_enum_dictionary_size(): number;
export function duckdb_enum_dictionary_value(): string;
export function duckdb_list_type_child_type(): duckdb_logical_type;
export function duckdb_map_type_key_type(): duckdb_logical_type;
export function duckdb_map_type_value_type(): duckdb_logical_type;
export function duckdb_struct_type_child_count(): number;
export function duckdb_struct_type_child_name(): string;
export function duckdb_struct_type_child_type(): duckdb_logical_type;
export function duckdb_union_type_member_count(): number;
export function duckdb_union_type_member_name(): string;
export function duckdb_union_type_member_type(): duckdb_logical_type;
export function duckdb_destroy_logical_type(): void;
export function duckdb_create_data_chunk(): duckdb_data_chunk;
export function duckdb_destroy_data_chunk(): void;
export function duckdb_data_chunk_reset(): void;
export function duckdb_data_chunk_get_column_count(): number;
export function duckdb_data_chunk_get_vector(): duckdb_vector;
export function duckdb_data_chunk_get_size(): number;
export function duckdb_data_chunk_set_size(): void;
export function duckdb_vector_get_column_type(): duckdb_logical_type;
// export function duckdb_vector_get_data(): void*;
// export function duckdb_vector_get_validity(): uint64_t*;
export function duckdb_vector_ensure_validity_writable(): void;
export function duckdb_vector_assign_string_element(): void;
export function duckdb_vector_assign_string_element_len(): void;
export function duckdb_list_vector_get_child(): duckdb_vector;
export function duckdb_list_vector_get_size(): number;
export function duckdb_list_vector_set_size(): duckdb_state;
export function duckdb_list_vector_reserve(): duckdb_state;
export function duckdb_struct_vector_get_child(): duckdb_vector;
// export function duckdb_bind_get_extra_info(): void*;
export function duckdb_bind_add_result_column(): void;
export function duckdb_bind_get_parameter_count(): number;
export function duckdb_bind_get_parameter(): duckdb_value;
export function duckdb_bind_get_named_parameter(): duckdb_value;
export function duckdb_bind_set_bind_data(): void;
export function duckdb_bind_set_cardinality(): void;
export function duckdb_bind_set_error(): void;
// export function duckdb_init_get_extra_info(): void*;
// export function duckdb_init_get_bind_data(): void*;
export function duckdb_init_set_init_data(): void;
export function duckdb_init_get_column_count(): number;
export function duckdb_init_get_column_index(): number;
export function duckdb_init_set_max_threads(): void;
export function duckdb_init_set_error(): void;
// export function duckdb_function_get_extra_info(): void*;
// export function duckdb_function_get_bind_data(): void*;
// export function duckdb_function_get_init_data(): void*;
// export function duckdb_function_get_local_init_data(): void*;
export function duckdb_function_set_error(): void;
export function duckdb_appender_create(): duckdb_state;
export function duckdb_appender_error(): string;
export function duckdb_appender_flush(): duckdb_state;
export function duckdb_appender_close(): duckdb_state;
export function duckdb_appender_destroy(): duckdb_state;
export function duckdb_appender_begin_row(): duckdb_state;
export function duckdb_appender_end_row(): duckdb_state;
export function duckdb_append_bool(): duckdb_state;
export function duckdb_append_int8(): duckdb_state;
export function duckdb_append_int16(): duckdb_state;
export function duckdb_append_int32(): duckdb_state;
export function duckdb_append_int64(): duckdb_state;
export function duckdb_append_hugeint(): duckdb_state;
export function duckdb_append_uint8(): duckdb_state;
export function duckdb_append_uint16(): duckdb_state;
export function duckdb_append_uint32(): duckdb_state;
export function duckdb_append_uint64(): duckdb_state;
export function duckdb_append_float(): duckdb_state;
export function duckdb_append_double(): duckdb_state;
export function duckdb_append_date(): duckdb_state;
export function duckdb_append_time(): duckdb_state;
export function duckdb_append_timestamp(): duckdb_state;
export function duckdb_append_interval(): duckdb_state;
export function duckdb_append_varchar(): duckdb_state;
export function duckdb_append_varchar_length(): duckdb_state;
export function duckdb_append_blob(): duckdb_state;
export function duckdb_append_null(): duckdb_state;
export function duckdb_append_data_chunk(): duckdb_state;
export function duckdb_execute_tasks(): void;
// export function duckdb_create_task_state(): duckdb_task_state;
export function duckdb_execute_tasks_state(): void;
export function duckdb_execute_n_tasks_state(): number;
export function duckdb_finish_execution(): void;
export function duckdb_task_state_is_finished(): boolean;
export function duckdb_destroy_task_state(): void;
export function duckdb_execution_is_finished(): boolean;
export function duckdb_stream_fetch_chunk(): duckdb_data_chunk;
