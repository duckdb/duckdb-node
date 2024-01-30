import * as ddb from '../..';
import { DuckDBPendingMaterializedResult, DuckDBPendingStreamingResult } from './DuckDBPendingResult';
import { DuckDBMaterializedResult } from './DuckDBResult';
import { DuckDBTypeId } from './DuckDBTypeId';
import { throwOnFailure } from './throwOnFailure';

export class DuckDBPreparedStatement {
  private readonly prepared_statement: ddb.duckdb_prepared_statement;
  constructor(prepared_statement: ddb.duckdb_prepared_statement) {
    this.prepared_statement = prepared_statement;
  }
  public dispose() {
    ddb.duckdb_destroy_prepare(this.prepared_statement);
  }
  public get parameterCount(): number {
    return ddb.duckdb_nparams(this.prepared_statement);
  }
  public parameterName(parameterIndex: number): string {
    return ddb.duckdb_parameter_name(this.prepared_statement, parameterIndex);
  }
  public parameterTypeId(parameterIndex: number): DuckDBTypeId {
    return ddb.duckdb_param_type(this.prepared_statement, parameterIndex) as unknown as DuckDBTypeId;
  }
  public clearBindings() {
    throwOnFailure(ddb.duckdb_clear_bindings(this.prepared_statement), 'Failed to clear bindings');
  }
  // TODO: is duckdb_bind_value useful?
  // TODO: get parameter index from name (duckdb_bind_parameter_index)
  public bindBoolean(parameterIndex: number, value: boolean) {
    throwOnFailure(ddb.duckdb_bind_boolean(this.prepared_statement, parameterIndex, value),
      'Failed to bind boolean parameter', () => `index: ${parameterIndex}, value: ${value}`);
  }
  public bindTinyInt(parameterIndex: number, value: number) {
    throwOnFailure(ddb.duckdb_bind_int8(this.prepared_statement, parameterIndex, value),
      'Failed to bind tinyint parameter', () => `index: ${parameterIndex}, value: ${value}`);
  }
  public bindSmallInt(parameterIndex: number, value: number) {
    throwOnFailure(ddb.duckdb_bind_int16(this.prepared_statement, parameterIndex, value),
      'Failed to bind smallint parameter', () => `index: ${parameterIndex}, value: ${value}`);
  }
  public bindInteger(parameterIndex: number, value: number) {
    throwOnFailure(ddb.duckdb_bind_int32(this.prepared_statement, parameterIndex, value),
      'Failed to bind integer parameter', () => `index: ${parameterIndex}, value: ${value}`);
  }
  public bindBigInt(parameterIndex: number, value: number) {
    throwOnFailure(ddb.duckdb_bind_int64(this.prepared_statement, parameterIndex, value),
      'Failed to bind bigint parameter', () => `index: ${parameterIndex}, value: ${value}`);
  }
  // TODO: bind HUGEINT
  // TODO: bind DECIMAL
  public bindUTinyInt(parameterIndex: number, value: number) {
    throwOnFailure(ddb.duckdb_bind_uint8(this.prepared_statement, parameterIndex, value),
      'Failed to bind utinyint parameter', () => `index: ${parameterIndex}, value: ${value}`);
  }
  public bindUSmallInt(parameterIndex: number, value: number) {
    throwOnFailure(ddb.duckdb_bind_uint16(this.prepared_statement, parameterIndex, value),
      'Failed to bind usmallit parameter', () => `index: ${parameterIndex}, value: ${value}`);
  }
  public bindUInteger(parameterIndex: number, value: number) {
    throwOnFailure(ddb.duckdb_bind_uint32(this.prepared_statement, parameterIndex, value),
      'Failed to bind uinteger parameter', () => `index: ${parameterIndex}, value: ${value}`);
  }
  public bindUBigInt(parameterIndex: number, value: number) {
    throwOnFailure(ddb.duckdb_bind_uint64(this.prepared_statement, parameterIndex, value),
      'Failed to bind ubigint parameter', () => `index: ${parameterIndex}, value: ${value}`);
  }
  public bindFloat(parameterIndex: number, value: number) {
    throwOnFailure(ddb.duckdb_bind_float(this.prepared_statement, parameterIndex, value),
      'Failed to bind float parameter', () => `index: ${parameterIndex}, value: ${value}`);
  }
  public bindDouble(parameterIndex: number, value: number) {
    throwOnFailure(ddb.duckdb_bind_double(this.prepared_statement, parameterIndex, value),
      'Failed to bind double parameter', () => `index: ${parameterIndex}, value: ${value}`);
  }
  // TODO: bind DATE
  // TODO: bind TIME
  // TODO: bind TIMESTAMP
  // TODO: bind TIMESTAMPS_S/_MS/_NS?
  // TODO: bind INTERVAL
  public bindVarchar(parameterIndex: number, value: string) {
    throwOnFailure(ddb.duckdb_bind_varchar(this.prepared_statement, parameterIndex, value),
      'Failed to bind varchar parameter', () => `index: ${parameterIndex}, value: ${value}`);
  }
  // TODO: bind BLOB
  // TODO: bind ENUM?
  // TODO: bind nested types? (LIST, STRUCT, MAP, UNION)
  // TODO: bind UUID?
  // TODO: bind BIT?
  public bindNull(parameterIndex: number) {
    throwOnFailure(ddb.duckdb_bind_null(this.prepared_statement, parameterIndex),
      'Failed to bind null parameter', () => `index: ${parameterIndex}`);
  }
  public async run(): Promise<DuckDBMaterializedResult> {
    const result = new ddb.duckdb_result;
    throwOnFailure(await ddb.duckdb_execute_prepared(this.prepared_statement, result),
      'Failed to execute prepared statement', () => ddb.duckdb_result_error(result),
      () => ddb.duckdb_destroy_result(result));
    return new DuckDBMaterializedResult(result);
  }
  public start(): DuckDBPendingMaterializedResult {
    const pending_result = new ddb.duckdb_pending_result;
    throwOnFailure(ddb.duckdb_pending_prepared(this.prepared_statement, pending_result),
      'Failed to start prepared statement', () => ddb.duckdb_pending_error(pending_result),
      () => ddb.duckdb_destroy_pending(pending_result));
    return new DuckDBPendingMaterializedResult(pending_result);
  }
  public startStreaming(): DuckDBPendingStreamingResult {
    const pending_result = new ddb.duckdb_pending_result;
    throwOnFailure(ddb.duckdb_pending_prepared_streaming(this.prepared_statement, pending_result),
      'Failed to start prepared statement (streaming)', () => ddb.duckdb_pending_error(pending_result),
      () => ddb.duckdb_destroy_pending(pending_result));
    return new DuckDBPendingStreamingResult(pending_result);
  }
}
