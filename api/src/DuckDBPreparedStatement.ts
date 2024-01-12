import * as ddb from '../..';

export class DuckDBPreparedStatement {
  private readonly prepared_statement: ddb.duckdb_prepared_statement;
  constructor(prepared_statement: ddb.duckdb_prepared_statement) {
    this.prepared_statement = prepared_statement;
  }
  public dispose() {
    ddb.duckdb_destroy_prepare(this.prepared_statement);
  }
  // TODO
}
