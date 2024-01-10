import * as duckdb_native from '.';

// some warmup
console.log("DuckDB version:", duckdb_native.duckdb_library_version());

function convert_validity(vector: duckdb_native.duckdb_vector, n: number) {
    const res: boolean[] = Array.from<boolean>({ length: n }).fill(true);
    const validity_buf = duckdb_native.copy_buffer(duckdb_native.duckdb_vector_get_validity(vector),
                                                   Math.ceil(n / 64) * 8); // this will be null if all rows are valid
    if (validity_buf == null) {
        return res; // TODO maybe return a singleton so we dont have to allocate?
    }
    const typed_validity_buf = new BigUint64Array(validity_buf.buffer);
    for (let row_idx = 0; row_idx < n; row_idx++) {
        res[row_idx] = (typed_validity_buf[Math.floor(row_idx / 64)] & (BigInt(1) << BigInt(row_idx % 64))) > 0;
    }
    return res;
}

type ArrayType =
  | BigInt64ArrayConstructor
  | BigUint64ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor
  | Int8ArrayConstructor
  | Int16ArrayConstructor
  | Int32ArrayConstructor
  | Uint8ArrayConstructor
  | Uint16ArrayConstructor
  | Uint32ArrayConstructor
  ;

function convert_primitive_vector<T>(vector: duckdb_native.duckdb_vector, n: number, array_type: ArrayType) {
    const validity = convert_validity(vector, n);
    const data_buf =
        duckdb_native.copy_buffer(duckdb_native.duckdb_vector_get_data(vector), array_type.BYTES_PER_ELEMENT * n);
    const typed_data_arr = data_buf ? new array_type(data_buf.buffer) : null;
    const vector_data = new Array(n)
    for (let row_idx = 0; row_idx < n; row_idx++) {
        vector_data[row_idx] = validity[row_idx] ? (typed_data_arr ? typed_data_arr[row_idx] : undefined) : null;
    }
    return vector_data;
}

function convert_vector(vector: duckdb_native.duckdb_vector, n: number) {
    const type = duckdb_native.duckdb_vector_get_column_type(vector);
    const type_id = duckdb_native.duckdb_get_type_id(type);

    switch (type_id) {
    case duckdb_native.duckdb_type.DUCKDB_TYPE_BIGINT:
        return convert_primitive_vector(vector, n, BigInt64Array);

    case duckdb_native.duckdb_type.DUCKDB_TYPE_BIT: {
        break;
    }
    case duckdb_native.duckdb_type.DUCKDB_TYPE_BOOLEAN:
        return convert_primitive_vector(vector, n, Uint8Array);

    case duckdb_native.duckdb_type.DUCKDB_TYPE_DATE: {
        break;
    }
    case duckdb_native.duckdb_type.DUCKDB_TYPE_DECIMAL: {
        const decimal_type = duckdb_native.duckdb_decimal_internal_type(type);
        switch (decimal_type) {
        case duckdb_native.duckdb_type.DUCKDB_TYPE_TINYINT:
            return convert_primitive_vector(vector, n, Int8Array);
        case duckdb_native.duckdb_type.DUCKDB_TYPE_SMALLINT:
            return convert_primitive_vector(vector, n, Int16Array);
        case duckdb_native.duckdb_type.DUCKDB_TYPE_INTEGER:
            return convert_primitive_vector(vector, n, Int32Array);
        case duckdb_native.duckdb_type.DUCKDB_TYPE_BIGINT:
            return convert_primitive_vector(vector, n, BigInt64Array);
        case duckdb_native.duckdb_type.DUCKDB_TYPE_HUGEINT:
            console.log('TODO HUGEINT');
        default:
            console.log('unkown decimal internal type');
        }
        return null;
    }
    case duckdb_native.duckdb_type.DUCKDB_TYPE_DOUBLE:
        return convert_primitive_vector(vector, n, Float64Array);

    case duckdb_native.duckdb_type.DUCKDB_TYPE_ENUM: {
        break;
    }
    case duckdb_native.duckdb_type.DUCKDB_TYPE_FLOAT:
        return convert_primitive_vector(vector, n, Float32Array);

    case duckdb_native.duckdb_type.DUCKDB_TYPE_HUGEINT: {
        break;
    }
    case duckdb_native.duckdb_type.DUCKDB_TYPE_INTEGER:
        return convert_primitive_vector(vector, n, Int32Array);

    case duckdb_native.duckdb_type.DUCKDB_TYPE_INTERVAL: {
        break;
    }
    case duckdb_native.duckdb_type.DUCKDB_TYPE_LIST: {
        const validity = convert_validity(vector, n);

        const result = Array(n);
        const child = convert_vector(duckdb_native.duckdb_list_vector_get_child(vector),
                                     duckdb_native.duckdb_list_vector_get_size(vector));

        const list_buf =
            duckdb_native.copy_buffer(duckdb_native.duckdb_vector_get_data(vector), 128 * n); // two 64 bit numbers
        const typed_list_buf = list_buf ? new BigUint64Array(list_buf.buffer) : null;

        for (let row_idx = 0; row_idx < n; row_idx++) {
            if (typed_list_buf) {
                const offset = typed_list_buf[2 * row_idx];
                const len = typed_list_buf[2 * row_idx + 1];
                result[row_idx] = validity[row_idx] ? child.slice(Number(offset), Number(offset + len)) : null;
            } else {
                result[row_idx] = undefined;
            }
        }
        return result;
    }
    case duckdb_native.duckdb_type.DUCKDB_TYPE_MAP: {
        break;
    }
    case duckdb_native.duckdb_type.DUCKDB_TYPE_SMALLINT:
        return convert_primitive_vector(vector, n, Int16Array);

    case duckdb_native.duckdb_type.DUCKDB_TYPE_STRUCT: {
        const validity = convert_validity(vector, n);

        // TODO handle whole NULL
        const result: any = {};
        for (let child_idx = 0; child_idx < duckdb_native.duckdb_struct_type_child_count(type); child_idx++) {
            const child_name = duckdb_native.duckdb_struct_type_child_name(type, child_idx);
            result[child_name] = convert_vector(duckdb_native.duckdb_struct_vector_get_child(vector, child_idx), n);
        }
        result['__struct_validity'] = validity; // TODO this is uuugly
        return result;
    }
    case duckdb_native.duckdb_type.DUCKDB_TYPE_TIME: {
        break;
    }
    case duckdb_native.duckdb_type.DUCKDB_TYPE_TIMESTAMP: {
        break;
    }
    case duckdb_native.duckdb_type.DUCKDB_TYPE_TIMESTAMP_MS: {
        break;
    }
    case duckdb_native.duckdb_type.DUCKDB_TYPE_TIMESTAMP_NS: {
        break;
    }
    case duckdb_native.duckdb_type.DUCKDB_TYPE_TIMESTAMP_S: {
        break;
    }
    case duckdb_native.duckdb_type.DUCKDB_TYPE_TINYINT:
        return convert_primitive_vector(vector, n, Int8Array);

    case duckdb_native.duckdb_type.DUCKDB_TYPE_UBIGINT:
        return convert_primitive_vector(vector, n, BigUint64Array);

    case duckdb_native.duckdb_type.DUCKDB_TYPE_UINTEGER:
        return convert_primitive_vector(vector, n, Uint32Array);

    case duckdb_native.duckdb_type.DUCKDB_TYPE_UNION:
        break;

    case duckdb_native.duckdb_type.DUCKDB_TYPE_USMALLINT:
        return convert_primitive_vector(vector, n, Uint16Array);

    case duckdb_native.duckdb_type.DUCKDB_TYPE_UTINYINT:
        return convert_primitive_vector(vector, n, Uint8Array);

    case duckdb_native.duckdb_type.DUCKDB_TYPE_UUID: {

        break;
    }
    case duckdb_native.duckdb_type.DUCKDB_TYPE_BLOB:
        return duckdb_native.convert_string_vector(vector, n);
    case duckdb_native.duckdb_type.DUCKDB_TYPE_VARCHAR: {
        const bytes = duckdb_native.convert_string_vector(vector, n);
        const decoder = new TextDecoder('utf-8');
        const ret = new Array(n);
        for (let i = 0; i < n; i++) {
            ret[i] = bytes[i] == null ? null : decoder.decode(bytes[i]);
        }
        return ret;
    }
    default:
        console.log('Unsupported type :/');
        return null;
    }
}

async function test() {

    const config = new duckdb_native.duckdb_config;
    duckdb_native.duckdb_create_config(config);

    /* in case someone would want to list conf options
    for (let conf_idx = 0; conf_idx < duckdb_native.duckdb_config_count(); conf_idx++) {
      const conf_name = new duckdb_native.out_string_wrapper;
      const conf_desc = new duckdb_native.out_string_wrapper;

      const status = duckdb_native.duckdb_get_config_flag(conf_idx, conf_name, conf_desc);
      if (status == duckdb_native.duckdb_state.DuckDBSuccess) {
        console.log(duckdb_native.out_get_string(conf_name), duckdb_native.out_get_string(conf_desc));
      }
    } */

    duckdb_native.duckdb_set_config(config, "threads", "1");

    const db = new duckdb_native.duckdb_database;
    const open_error = new duckdb_native.out_string_wrapper;
    const open_status = await duckdb_native.duckdb_open_ext(":memory:", db, config, open_error);

    if (open_status != duckdb_native.duckdb_state.DuckDBSuccess) {
        console.error("Failed to initialize database", duckdb_native.out_get_string(open_error));
        return;
    }

    const con = new duckdb_native.duckdb_connection;
    await duckdb_native.duckdb_connect(db, con);

    // create a statement and bind a value to it
    const prepared_statement = new duckdb_native.duckdb_prepared_statement;
    // const prepare_status = await duckdb_native.duckdb_prepare(
    //     con,
    //     "SELECT 42.0::DECIMAL, CASE WHEN range % 2 == 0 THEN [1, 2, 3] ELSE NULL END, CASE WHEN range % 2 == 0
    //     THEN {'key1': 'string', 'key2': 1, 'key3': 12.345} ELSE NULL END , range::INTEGER, CASE WHEN range % 2 == 0
    //     THEN range ELSE NULL END, CASE WHEN range % 2 == 0 THEN range::VARCHAR ELSE NULL END FROM range(?)",
    //     prepared_statement);
    //

    const prepare_status =
        await duckdb_native.duckdb_prepare(con, "SELECT range::DECIMAL(10,4) asdf FROM range(?)", prepared_statement);

    if (prepare_status != duckdb_native.duckdb_state.DuckDBSuccess) {
        console.error(duckdb_native.duckdb_prepare_error(prepared_statement));
        duckdb_native.duckdb_destroy_prepare(prepared_statement);
        return;
    }
    const bind_state = duckdb_native.duckdb_bind_int64(prepared_statement, 1, 4000);
    if (bind_state != duckdb_native.duckdb_state.DuckDBSuccess) {
        console.error("Failed to bind parameter");
        return;
    }

    // we want an incremental AND streaming query result
    const pending_result = new duckdb_native.duckdb_pending_result;
    duckdb_native.duckdb_pending_prepared_streaming(prepared_statement, pending_result); // TODO can this fail?

    // pending query api, allows abandoning query processing between each call to pending_execute_task()
    const result = new duckdb_native.duckdb_result;
    var continue_execute = true;
    while (continue_execute) {
        const pending_status = await duckdb_native.duckdb_pending_execute_task(pending_result);

        switch (pending_status) {
        case duckdb_native.duckdb_pending_state.DUCKDB_PENDING_RESULT_NOT_READY:
            continue;
        case duckdb_native.duckdb_pending_state.DUCKDB_PENDING_RESULT_READY:
            await duckdb_native.duckdb_execute_pending(pending_result, result);
            continue_execute = false;
            break;
        case duckdb_native.duckdb_pending_state.DUCKDB_PENDING_ERROR:
            console.error(duckdb_native.duckdb_pending_error(pending_result)); // TODO this seems broken
            return;
        }
    }
    // can clean this stuff up already
    duckdb_native.duckdb_destroy_pending(pending_result);
    duckdb_native.duckdb_destroy_prepare(prepared_statement);

    if (!duckdb_native.duckdb_result_is_streaming(result)) {
        // TODO: this should also working for materialized result sets!
        return;
    }

    for (let col_idx = 0; col_idx < duckdb_native.duckdb_column_count(result); col_idx++) {
        const colname = duckdb_native.duckdb_column_name(result, col_idx);
        console.log(colname, ':', duckdb_native.duckdb_column_type(result, col_idx));
    }

    // now consume result set stream
    while (true) {
        const chunk = await duckdb_native.duckdb_stream_fetch_chunk(result);

        const n = duckdb_native.duckdb_data_chunk_get_size(chunk);
        if (n == 0) { // empty chunk means end of stream
            break;
        }

        // loop over columns and interpret vector bytes
        for (let col_idx = 0; col_idx < duckdb_native.duckdb_data_chunk_get_column_count(chunk); col_idx++) {
            console.log(convert_vector(duckdb_native.duckdb_data_chunk_get_vector(chunk, col_idx), n));
        }

        duckdb_native.duckdb_destroy_data_chunk(chunk);
    }

    // clean up again
    duckdb_native.duckdb_destroy_result(result);

    duckdb_native.duckdb_disconnect(con);
    duckdb_native.duckdb_close(db);
    duckdb_native.duckdb_destroy_config(config);
}

test();
