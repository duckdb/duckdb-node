const duckdb = require('.');

// const config = duckdb.create_config();
// console.log(config);

console.log(duckdb.library_version());

async function test() {

  const db = new duckdb.database;
  const status1 = await duckdb.open(":memory:", db);
  console.log(status1);

  const con = new duckdb.connection;
  const status2 = await duckdb.connect(db, con);
  console.log(status2);

  const statement = new duckdb.prepared_statement;
  const status3 = await duckdb.prepare(con, "SELECT 42", statement);
  console.log(status3);

  const result = new duckdb.result;
  const status4 = await duckdb.execute_prepared(statement, result);
  console.log(status4)
  const fortytwo = duckdb.value_int32(result, 0, 0);
  console.log(fortytwo)

  // clean up again
  await duckdb.destroy_result(result);
  await duckdb.destroy_prepare(statement);


  const result2 = new duckdb.result;

  const status5 = await duckdb.query(con, "CREATE TABLE people (id INTEGER, name VARCHAR)", result2);
  console.log(status5)
  await duckdb.destroy_result(result2);

  const appender = new duckdb.appender;

  const status6 = await duckdb.appender_create(con, "", "people", appender);
  console.log(status6)

  duckdb.append_int32(appender, 1);
  duckdb.append_varchar(appender, "Mark");
  duckdb.appender_end_row(appender);

  duckdb.append_int32(appender, 2);
  duckdb.append_varchar(appender, "Hannes");
  duckdb.appender_end_row(appender);

  const status7 = await duckdb.appender_destroy(appender);
  console.log(status7)

  await duckdb.disconnect(con);
  await duckdb.close(db);
}

test();

