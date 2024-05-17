var duckdb = require('duckdb');

var db = new duckdb.Database(':memory:'); // or a file name for a persistent DB

db.all('SELECT 42 AS fortytwo', function(err, res) {
  if (err) {
    console.warn(err);
  }
  console.log(res[0].fortytwo)
});
