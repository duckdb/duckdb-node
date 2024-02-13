const duckdb_native = require('.');

// some warmup
console.log("DuckDB version:", duckdb_native.duckdb_library_version());

let obj = {'asdf' : 42};
function fuu () {
    console.log('boo');
};



duckdb_native.add_finalizer(obj, fuu);

delete obj;