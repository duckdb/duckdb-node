import * as ddb from '../..';
import { DuckDBConnection } from './DuckDBConnection';
import { throwOnFailure } from './throwOnFailure';

export class DuckDBInstance {
  private readonly db: ddb.duckdb_database;
  private config: ddb.duckdb_config | undefined;
  constructor(db: ddb.duckdb_database, config?: ddb.duckdb_config) {
    this.db = db;
    this.config = config;
  }
  public static async create(path: string = ':memory:', options?: Record<string, string>): Promise<DuckDBInstance> {
    const db = new ddb.duckdb_database;
    if (options) {
      const config = new ddb.duckdb_config;
      throwOnFailure(ddb.duckdb_create_config(config), 'Failed to create config');
      for (const optionName in options) {
        const optionValue = options[optionName];
        throwOnFailure(ddb.duckdb_set_config(config, optionName, optionValue),
          'Failed to set config option', () => optionName,
          () => ddb.duckdb_destroy_config(config));
      }
      const errorWrapper = new ddb.out_string_wrapper;
      throwOnFailure(await ddb.duckdb_open_ext(path, db, config, errorWrapper),
        'Failed to open', () => ddb.out_get_string(errorWrapper));
        return new DuckDBInstance(db, config);
    } else {
      throwOnFailure(await ddb.duckdb_open(path, db), 'Failed to open');
      return new DuckDBInstance(db);
    }
  }
  public dispose(): Promise<void> {
    // Do we need to hold on to the config for the lifetime of the instance,
    // or can we destroy it right after it is used?
    // Or do we need to destroy it at all?
    if (this.config) {
      ddb.duckdb_destroy_config(this.config);
    }
    return ddb.duckdb_close(this.db);
  }
  public async connect(): Promise<DuckDBConnection> {
    const connection = new ddb.duckdb_connection;
    throwOnFailure(await ddb.duckdb_connect(this.db, connection), 'Failed to connect');
    return new DuckDBConnection(connection);
  }
}
