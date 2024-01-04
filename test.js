const duckdb_native = require('.');

// const config = duckdb.create_config();
// console.log(config);

console.log("DuckDB version:", duckdb_native.duckdb_library_version());


async function test() {


  // TODO try config

  const db = new duckdb_native.duckdb_database;
  const status1 = await duckdb_native.duckdb_open(":memory:", db);

  if (status1 != duckdb_native.duckdb_state.DuckDBSuccess) {
    console.log("error", status1);
    return;
  }

  const con = new duckdb_native.duckdb_connection;
  const status2 = await duckdb_native.duckdb_connect(db, con);

  // create a statement and bind some values to it
  const prepared_statement = new duckdb_native.duckdb_prepared_statement;
  const status3 = await duckdb_native.duckdb_prepare(con, "FROM range(?)", prepared_statement);
  const stateb = duckdb_native.duckdb_bind_int64(prepared_statement, 1, 4000);

  // we want an incremental AND streaming query result
  const pending_result = new duckdb_native.duckdb_pending_result;
  const result = new duckdb_native.duckdb_result;
  var status4 = await duckdb_native.duckdb_pending_prepared_streaming(prepared_statement, pending_result);

  // pending query api, allows abandoning query processing between each call to pending_execute_task()
  while (true) {
    const status = await duckdb_native.duckdb_pending_execute_task(pending_result);
    if (status == duckdb_native.duckdb_pending_state.DUCKDB_PENDING_ERROR) {
      console.log(duckdb_native.duckdb_pending_state.duckdb_pending_error(pending_result)); // TODO this seems broken
      return;
    }
    else if (status == duckdb_native.duckdb_pending_state.DUCKDB_PENDING_RESULT_READY) {
      const status5 = await duckdb_native.duckdb_execute_pending(pending_result, result);
      break; }
    else if (status == duckdb_native.duckdb_pending_state.DUCKDB_PENDING_RESULT_NOT_READY) {
        continue;
    } else { // ??
      console.log(status);
      return;
    }
  }

  if (!duckdb_native.duckdb_result_is_streaming(result)) {
    // FIXME: this should also working for streaming result sets!
    return;
  }

  // now consume result set stream
  while (true) {
    const chunk = await duckdb_native.duckdb_stream_fetch_chunk(result);
    if (duckdb_native.duckdb_data_chunk_get_size(chunk) == 0) { // empty chunk means end of stream
      break;
    }
    const n = duckdb_native.duckdb_data_chunk_get_size(chunk);

    // loop over columns and interpret vector bytes
    for (let col_idx = 0; col_idx < duckdb_native.duckdb_data_chunk_get_column_count(chunk); col_idx++) {
      const vector = duckdb_native.duckdb_data_chunk_get_vector(chunk, col_idx);

      const type = duckdb_native.duckdb_vector_get_column_type(vector);
      const type_id = duckdb_native.duckdb_get_type_id(type);

      const data_ptr = duckdb_native.duckdb_vector_get_data(vector);

      switch(type_id) {
        case duckdb_native.duckdb_type.DUCKDB_TYPE_BIGINT:
          const data_buf = duckdb_native.copy_buffer(data_ptr, 8 * n);
          const typed_data_arr = new BigInt64Array(data_buf.buffer);
          console.log(typed_data_arr);
          break;
        default:
          console.log('Unsupported type :/');
      }
    }

    duckdb_native.duckdb_destroy_data_chunk(chunk);
  }
  // clean up again
  duckdb_native.duckdb_destroy_pending(pending_result);
  duckdb_native.duckdb_destroy_result(result);
  duckdb_native.duckdb_destroy_prepare(prepared_statement);


/*
  const result2 = new duckdb.result;
  const status5 = await duckdb.query(con, "CREATE TABLE people (id INTEGER, name VARCHAR)", result2);
  console.log(status5)
  await duckdb.destroy_result(result2);

  const appender = new duckdb.appender;

  const status6 = await duckdb.appender_create(con, "", "people", appender);
  console.log(status6)

  duckdb.append_int32(appender, 1);
  duckdb.append_varchar(appender, "Mark");
  await duckdb.appender_end_row(appender);

  duckdb.append_int32(appender, 2);
  duckdb.append_varchar(appender, "Hannes");
  await duckdb.appender_end_row(appender);

  const status7 = await duckdb.appender_destroy(appender);
  console.log(status7)
*/


  await duckdb_native.duckdb_disconnect(con);
  await duckdb_native.duckdb_close(db);


}

test();
