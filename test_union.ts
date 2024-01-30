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

    const create_result = new ddb.duckdb_result;
    const create_query_state = await ddb.duckdb_query(con, `create table tbl1(u union(num int, flt float, str varchar))`, create_result);
    if (create_query_state != ddb.duckdb_state.DuckDBSuccess) {
      throw new Error('Failed to create: ' + ddb.duckdb_result_error(create_result));
    }
    console.log('create successful');

    const insert_result = new ddb.duckdb_result;
    const insert_query_state = await ddb.duckdb_query(con, `insert into tbl1 values ('abc'), (123), (3.14)`, insert_result);
    if (insert_query_state != ddb.duckdb_state.DuckDBSuccess) {
      throw new Error('Failed to insert: ' + ddb.duckdb_result_error(insert_result));
    }
    console.log('insert successful');

    const select_result = new ddb.duckdb_result;
    const select_query_state = await ddb.duckdb_query(con, `select * from tbl1`, select_result);
    if (select_query_state != ddb.duckdb_state.DuckDBSuccess) {
      throw new Error('Failed to query: ' + ddb.duckdb_result_error(select_result));
    }
    console.log('select successful');

    console.log('column count:', ddb.duckdb_column_count(select_result));
    console.log('column 0 name:', ddb.duckdb_column_name(select_result, 0));
    const rowCount = ddb.duckdb_row_count(select_result);
    console.log('row count:', rowCount);

    const chunk0 = ddb.duckdb_result_get_chunk(select_result, 0);
    console.log('chunk column count:', ddb.duckdb_data_chunk_get_column_count(chunk0));
    console.log('chunk size:', ddb.duckdb_data_chunk_get_size(chunk0)); // chunk size = row count

    const vector0_0 = ddb.duckdb_data_chunk_get_vector(chunk0, 0);
    const logical_type_vector0 = ddb.duckdb_vector_get_column_type(vector0_0);
    console.log('type id vector 0 0:', ddb.duckdb_get_type_id(logical_type_vector0)); // 28 = UNION
    const logical_type_vector0_count = ddb.duckdb_struct_type_child_count(logical_type_vector0);
    console.log('vector 0 0 struct type child count:', logical_type_vector0_count);
    for (let i = 0; i < logical_type_vector0_count; i++) {
      const child_name = ddb.duckdb_struct_type_child_name(logical_type_vector0, i);
      console.log('vector 0 0 struct type child name:', i, child_name);
      const child_type = ddb.duckdb_struct_type_child_type(logical_type_vector0, i);
      console.log('vector 0 0 struct type child type id:', i, ddb.duckdb_get_type_id(child_type));  // 0: 6 = UTINYINT
    }

    for (let i = 0; i < logical_type_vector0_count; i++) {
      const child = ddb.duckdb_struct_vector_get_child(vector0_0, i);
      const logical_type_child = ddb.duckdb_vector_get_column_type(child);
      console.log('type id child:', i, ddb.duckdb_get_type_id(logical_type_child)); // 0: 6 = UTINYINT      
    }
    const tag_data_pointer = ddb.duckdb_vector_get_data(ddb.duckdb_struct_vector_get_child(vector0_0, 0));
    const tag_data = ddb.copy_buffer(tag_data_pointer, 3);
    console.log('tag data:', tag_data);
    // type id 4 = INTEGER
    // type id 10 = FLOAT
    // type id 17 = VARCHAR

  } catch (e) {
    console.error(e);
  }
}

test();
