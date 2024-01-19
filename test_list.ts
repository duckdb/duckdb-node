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

    const sql = 'select * from (values ([[100,101,102],[200,201,202,203,204]], 42), ([[300,301],NULL,[500]], 17), (NULL, NULL), ([NULL,[NULL]], -123)) as t(lst,num)';
    console.log('query:', sql);

    const result = new ddb.duckdb_result;
    const query_state = await ddb.duckdb_query(con, sql, result);
    if (query_state != ddb.duckdb_state.DuckDBSuccess) {
      throw new Error('Failed to query');
    }
    console.log('query successful');

    console.log('column count:', ddb.duckdb_column_count(result));
    console.log('column 0 name:', ddb.duckdb_column_name(result, 0));
    console.log('column 1 name:', ddb.duckdb_column_name(result, 1));
    const rowCount = ddb.duckdb_row_count(result);
    console.log('row count:', rowCount);

    const chunk0 = ddb.duckdb_result_get_chunk(result, 0);
    console.log('chunk column count:', ddb.duckdb_data_chunk_get_column_count(chunk0));
    console.log('chunk size:', ddb.duckdb_data_chunk_get_size(chunk0)); // chunk size = row count

    const vector0_0 = ddb.duckdb_data_chunk_get_vector(chunk0, 0);

    const logical_type_0_0 = ddb.duckdb_vector_get_column_type(vector0_0);
    console.log('type id chunk 0, vector 0:', ddb.duckdb_get_type_id(logical_type_0_0)); // 24 = LIST
    const root_list_child_type = ddb.duckdb_list_type_child_type(logical_type_0_0);
    console.log('root list child type id:', ddb.duckdb_get_type_id(root_list_child_type)); // 24 = LIST
    const nested_list_child_type = ddb.duckdb_list_type_child_type(root_list_child_type);
    console.log('nested list child type id:', ddb.duckdb_get_type_id(nested_list_child_type)); // 4 = INTEGER

    const vector0_1 = ddb.duckdb_data_chunk_get_vector(chunk0, 1);

    const logical_type_0_1 = ddb.duckdb_vector_get_column_type(vector0_1);
    console.log('type id chunk 0, vector 1:', ddb.duckdb_get_type_id(logical_type_0_1)); // 4 = INTEGER

    const vector0_0_data_pointer = ddb.duckdb_vector_get_data(vector0_0);
    const vector0_0_data = ddb.copy_buffer(vector0_0_data_pointer, rowCount * 64 * 2);
    if (!vector0_0_data) {
      throw new Error('vector0_0_data is null');
    }
    const root_list_entry_array = new BigUint64Array(vector0_0_data.buffer, vector0_0_data.byteOffset, rowCount * 2);
    console.log('root list entry array: ', root_list_entry_array);

    const root_list_validity_pointer = ddb.duckdb_vector_get_validity(vector0_0);
    const root_list_validity_data = ddb.copy_buffer(root_list_validity_pointer, Math.ceil(rowCount / 64) * 8);
    if (!root_list_validity_data) {
      console.log('root list validity is NULL');
    } else {
      console.log('root list validity:', root_list_validity_data);
    }
    for (let i = 0; i < rowCount; i++) {
      console.log('root list item valid (duckdb_validity_row_is_valid):', i, ddb.duckdb_validity_row_is_valid(root_list_validity_pointer, i));
      if (root_list_validity_data) {
        console.log('root list item valid (js bit math):', i, !!(root_list_validity_data[Math.floor(i >> 3)] & (1 << (i % 8))))
      }
    }

    const root_list_child_vector = ddb.duckdb_list_vector_get_child(vector0_0);
    const root_list_child_vector_size = ddb.duckdb_list_vector_get_size(vector0_0);
    console.log('child vector size:', root_list_child_vector_size);

    const child_vector_data_pointer = ddb.duckdb_vector_get_data(root_list_child_vector);
    const child_vector_data = ddb.copy_buffer(child_vector_data_pointer, root_list_child_vector_size * 64 * 2);
    if (!child_vector_data) {
      throw new Error('child_vector_data is null');
    }
    // console.log('child vector data:', child_vector_data);
    const child_list_entry_array = new BigUint64Array(child_vector_data.buffer, child_vector_data.byteOffset, root_list_child_vector_size * 2);
    console.log('child vector entry array:', child_list_entry_array);

    const child_vector_validity_pointer = ddb.duckdb_vector_get_validity(root_list_child_vector);
    const child_vector_validity_data = ddb.copy_buffer(child_vector_validity_pointer, Math.ceil(root_list_child_vector_size / 64) * 8);
    if (!child_vector_validity_data) {
      console.log('child vector validity is NULL');
    } else {
      console.log('child vector validity:', child_vector_validity_data);
    }
    for (let i = 0; i < root_list_child_vector_size; i++) {
      console.log('child vector item valid (duckdb_validity_row_is_valid):', i, ddb.duckdb_validity_row_is_valid(child_vector_validity_pointer, i));
      if (child_vector_validity_data) {
        console.log('child vector item valid (js bit math):', i, !!(child_vector_validity_data[Math.floor(i >> 3)] & (1 << (i % 8))))
      }
    }

    const child_vector_child_vector = ddb.duckdb_list_vector_get_child(root_list_child_vector);
    const child_vector_child_vector_size = ddb.duckdb_list_vector_get_size(root_list_child_vector);
    console.log('child vector child vector size:', child_vector_child_vector_size);

    const child_vector_child_vector_data_pointer = ddb.duckdb_vector_get_data(child_vector_child_vector);
    const child_vector_child_vector_data = ddb.copy_buffer(child_vector_child_vector_data_pointer, child_vector_child_vector_size * 4);
    if (!child_vector_child_vector_data) {
      throw new Error('child_vector_child_vector_data is null');
    }
    // console.log('child vector child vector data:', child_vector_child_vector_data);
    const child_vector_child_vector_integers = new Int32Array(child_vector_child_vector_data.buffer, child_vector_child_vector_data.byteOffset, child_vector_child_vector_size);
    console.log('child vector child vector integers:', child_vector_child_vector_integers);

    const child_vector_child_vector_validity_pointer = ddb.duckdb_vector_get_validity(child_vector_child_vector);
    const child_vector_child_vector_validity_data = ddb.copy_buffer(child_vector_child_vector_validity_pointer, Math.ceil(child_vector_child_vector_size / 64) * 8);
    if (!child_vector_child_vector_validity_data) {
      console.log('child vector child vector validity is NULL');
    } else {
      console.log('child vector child vector validity:', child_vector_child_vector_validity_data);
    }
    for (let i = 0; i < child_vector_child_vector_size; i++) {
      console.log('child vector child vector item valid (duckdb_validity_row_is_valid):', i, ddb.duckdb_validity_row_is_valid(child_vector_child_vector_validity_pointer, i));
      if (child_vector_child_vector_validity_data) {
        console.log('child vector child vector item valid (js bit math):', i, !!(child_vector_child_vector_validity_data[Math.floor(i >> 3)] & (1 << (i % 8))))
      }
    }


  } catch (e) {
    console.error(e);
  }
}

test();
