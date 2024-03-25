import * as ddb from '.';

async function test() {
  try {
    const db = new ddb.duckdb_database;
    const open_state = await ddb.duckdb_open(':memory:', db);
    if (open_state != ddb.duckdb_state.DuckDBSuccess) {
      throw new Error('Failed to open');
    }
    console.log('open successful');

    const con = new ddb.duckdb_connection;
    const connect_state = await ddb.duckdb_connect(db, con);
    if (connect_state != ddb.duckdb_state.DuckDBSuccess) {
      throw new Error('Failed to connect');
    }
    console.log('connect succesful');

    // const sql = `from test_all_types() select small_enum`;
    const sql = `from test_all_types() select medium_enum`;
    // const sql = `from test_all_types() select large_enum`;

    const select_result = new ddb.duckdb_result;
    const select_query_state = await ddb.duckdb_query(con, sql, select_result);
    if (select_query_state != ddb.duckdb_state.DuckDBSuccess) {
      throw new Error('Failed to query: ' + ddb.duckdb_result_error(select_result));
    }
    console.log('select successful');

    console.log('column count:', ddb.duckdb_column_count(select_result));
    console.log('column 0 name:', ddb.duckdb_column_name(select_result, 0));
    const rowCount = ddb.duckdb_row_count(select_result);
    console.log('row count:', rowCount);

    const chunk = ddb.duckdb_result_get_chunk(select_result, 0);
    console.log('chunk column count:', ddb.duckdb_data_chunk_get_column_count(chunk));
    const row_count = ddb.duckdb_data_chunk_get_size(chunk);
    console.log('chunk size (row count):', row_count);

    const col0_vec = ddb.duckdb_data_chunk_get_vector(chunk, 0);

    const col0_log_type = ddb.duckdb_vector_get_column_type(col0_vec);
    console.log('col 0 type id:', ddb.duckdb_get_type_id(col0_log_type)); // 24 = ENUM

    const enum_int_type = ddb.duckdb_enum_internal_type(col0_log_type);
    console.log('enum internal type id:', enum_int_type); // 6 = UTINYINT, 7 = USMALLINT
    let bytes_per_value: number | undefined;
    switch (enum_int_type) {
      case 6: // UTINYINT
        bytes_per_value = 1;
        break;
      case 7: // USMALLINT
        bytes_per_value = 2;
        break;
      case 8: // UINTEGER
        bytes_per_value = 4;
        break;
    }

    const enum_dict_size = ddb.duckdb_enum_dictionary_size(col0_log_type); // number of possible values of enum
    console.log('enum dict size:', enum_dict_size);
    const enum_dict_value_0 = ddb.duckdb_enum_dictionary_value(col0_log_type, 0);
    console.log('enum dict value 0:', enum_dict_value_0);

    const col0_vec_data = ddb.duckdb_vector_get_data(col0_vec);
    if (bytes_per_value) {
      const col0_vec_buffer = ddb.copy_buffer(col0_vec_data, row_count * bytes_per_value);
      console.log('buffer:', col0_vec_buffer);
      if (col0_vec_buffer) {
        const dataView = new DataView(col0_vec_buffer.buffer, col0_vec_buffer.byteOffset, col0_vec_buffer.byteLength);
      }
    }

  } catch (e) {
    console.error(e);
  }
}

test();
