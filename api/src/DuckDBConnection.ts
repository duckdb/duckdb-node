import * as ddb from '../..';
import { DuckDBAppender } from './DuckDBAppender';
import { DuckDBExtractedStatements } from './DuckDBExtractedStatements';
import { DuckDBInstance } from './DuckDBInstance';
import { DuckDBPreparedStatement } from './DuckDBPreparedStatement';
import { DuckDBResult } from './DuckDBResult';
import { throwOnFailure } from './throwOnFailure';

export class DuckDBConnection {
  private readonly connection: ddb.duckdb_connection;
  constructor(connection: ddb.duckdb_connection) {
    this.connection = connection;
  }
  public static async create(instance: DuckDBInstance): Promise<DuckDBConnection> {
    return instance.connect();
  }
  public dispose(): Promise<void> {
    return ddb.duckdb_disconnect(this.connection);
  }
  public interrupt() {
    ddb.duckdb_interrupt(this.connection);
  }
  // TODO: duckdb_query_progress returns a duckdb_query_progress_type struct containing three values: percentage,
  // rows_processed, and total_rows_to_process. Unfortunately there is no current way for JS to access the fields of
  // this struct.
  // public get progress(): number {
  //   return ddb.duckdb_query_progress(this.connection);
  // }
  public async run(sql: string): Promise<DuckDBResult> {
    const result = new ddb.duckdb_result;
    throwOnFailure(await ddb.duckdb_query(this.connection, sql, result),
      'Failed to query', () => ddb.duckdb_result_error(result),
      () => ddb.duckdb_destroy_result(result));
    return new DuckDBResult(result);
  }
  public async prepare(sql: string): Promise<DuckDBPreparedStatement> {
    const prepared_statement = new ddb.duckdb_prepared_statement;
    throwOnFailure(await ddb.duckdb_prepare(this.connection, sql, prepared_statement),
      'Failed to prepare', () => ddb.duckdb_prepare_error(prepared_statement),
      () => ddb.duckdb_destroy_prepare(prepared_statement));
    return new DuckDBPreparedStatement(prepared_statement);
  }
  public async extractStatements(sql: string): Promise<DuckDBExtractedStatements> {
    const extracted_statements = new ddb.duckdb_extracted_statements;
    const statementCount = await ddb.duckdb_extract_statements(this.connection, sql, extracted_statements);
    if (statementCount === 0) {
      try {
        throw new Error(`Failed to extract statements: ${ddb.duckdb_extract_statements_error(extracted_statements)}`);
      } finally {
        ddb.duckdb_destroy_extracted(extracted_statements);
      }
    }
    return new DuckDBExtractedStatements(this.connection, extracted_statements, statementCount);
  }
  public async createAppender(schema: string, table: string): Promise<DuckDBAppender> {
    const appender = new ddb.duckdb_appender;
    throwOnFailure(await ddb.duckdb_appender_create(this.connection, schema, table, appender),
      'Failed to create appender', () => ddb.duckdb_appender_error(appender),
      () => ddb.duckdb_appender_destroy(appender));
    return new DuckDBAppender(appender);
  }
}
