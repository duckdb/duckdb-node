const duckdb = require('.');

// const config = duckdb.create_config();
// console.log(config);

console.log("DuckDB version:", duckdb.library_version());


async function test() {

  const db = new duckdb.database;
  const status1 = await duckdb.open(":memory:", db);

  const con = new duckdb.connection;
  const status2 = await duckdb.connect(db, con);

  const prepared_statement = new duckdb.prepared_statement;
  const status3 = await duckdb.prepare(con, "FROM range(?)", prepared_statement);

  const stateb = duckdb.bind_int64(prepared_statement, 1, 4000);

  const pending_result = new duckdb.pending_result;

  // we want a streaming query result
  var status4 = await duckdb.pending_prepared_streaming(prepared_statement, pending_result);

  const result = new duckdb.result;

  // pending query api, allows abandoning query processing between each call to pending_execute_task()
  while (true) {
    const status = await duckdb.pending_execute_task(pending_result);
    if (status == 'DUCKDB_PENDING_ERROR') {
      console.log(duckdb.pending_error(pending_result)); // TODO this seems broken
      return;
    }
    else if (status == 'DUCKDB_PENDING_RESULT_READY') {
      const status5 = await duckdb.execute_pending(pending_result, result);
      break; }
    else if (status == 'DUCKDB_PENDING_RESULT_NOT_READY') {
        continue;
    } else { // ??
      console.log(status);
      return;
    }
  }

  if (!duckdb.result_is_streaming(result)) {
    // FIXME: this should also working for streaming result sets!
    return;
  }

  while (true) {
    const chunk = await duckdb.stream_fetch_chunk(result);
    if (duckdb.data_chunk_get_size(chunk) == 0) {
      break;
    }
    //console.log();
    const n = duckdb.data_chunk_get_size(chunk);

    for (let col_idx = 0; col_idx < duckdb.data_chunk_get_column_count(chunk); col_idx++) {
      const vector = duckdb.data_chunk_get_vector(chunk, col_idx);

      const type = duckdb.vector_get_column_type(vector);
      const type_id = duckdb.get_type_id(type);

      const data_ptr = duckdb.vector_get_data(vector);

      switch(type_id) {
        case "DUCKDB_TYPE_BIGINT": // TODO make those constant members, not strings
          const data_buf = duckdb.copy_buffer(data_ptr, 8 * n);
          const typed_data_arr = new BigInt64Array(data_buf.buffer);
          console.log(typed_data_arr);
          break;
        default:
          console.log('Unsupported type :/');
      }
    }

    //   console.log(vector);
    duckdb.destroy_data_chunk(chunk);
  }
  // clean up again
  duckdb.destroy_pending(pending_result);
  duckdb.destroy_prepare(prepared_statement);



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


  await duckdb.disconnect(con);
  await duckdb.close(db);


}

test();
