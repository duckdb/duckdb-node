import * as ddb from '../..';
import { throwOnFailure } from './throwOnFailure';

export class DuckDBAppender {
  private readonly appender: ddb.duckdb_appender;
  constructor(appender: ddb.duckdb_appender) {
    this.appender = appender;
  }
  public async dispose() {
    throwOnFailure(await ddb.duckdb_appender_destroy(this.appender),
      'Failed to destroy appender', () => ddb.duckdb_appender_error(this.appender));
  }
  public async flush() {
    throwOnFailure(await ddb.duckdb_appender_flush(this.appender),
      'Failed to flush appender', () => ddb.duckdb_appender_error(this.appender));
  }
  // TODO
}
