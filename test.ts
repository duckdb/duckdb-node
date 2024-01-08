import * as ddb from '.';

console.log(`DuckDB version: ${ddb.duckdb_library_version()}`);

// const dec_type = ddb.duckdb_create_decimal_type(0, 18);
// console.log(dec_type);
// console.log(typeof dec_type);
