import * as ddb from '../..';
import { DuckDBPreparedStatement } from './DuckDBPreparedStatement';
import { throwOnFailure } from './throwOnFailure';

export class DuckDBExtractedStatements {
  private readonly connection: ddb.duckdb_connection;
  private readonly extracted_statements: ddb.duckdb_extracted_statements;
  private readonly statementCount: number;
  constructor(connection: ddb.duckdb_connection, extracted_statements: ddb.duckdb_extracted_statements, statementCount: number) {
    this.connection = connection;
    this.extracted_statements = extracted_statements;
    this.statementCount = statementCount;
  }
  public dispose() {
    ddb.duckdb_destroy_extracted(this.extracted_statements);
  }
  public get count(): number {
    return this.statementCount;
  }
  public async prepare(index: number): Promise<DuckDBPreparedStatement> {
    const prepared_statement = new ddb.duckdb_prepared_statement;
    throwOnFailure(await ddb.duckdb_prepare_extracted_statement(this.connection, this.extracted_statements, index, prepared_statement),
      'Failed to prepare extracted statement', () => ddb.duckdb_prepare_error(prepared_statement),
      () => ddb.duckdb_destroy_prepare(prepared_statement));
    return new DuckDBPreparedStatement(prepared_statement);
  }
  // TODO
}
