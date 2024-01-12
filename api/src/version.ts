import * as ddb from '../..';

export function version(): string {
  return ddb.duckdb_library_version();
}
