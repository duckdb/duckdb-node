import * as ddb from '../..';
import { DuckDBResult } from './DuckDBResult';
import { throwOnFailure } from './throwOnFailure';

// Values match similar enum in C API.
export enum DuckDBPendingResultState {
  RESULT_READY = 0,
  RESULT_NOT_READY = 1,
  NO_TASKS_AVAILABLE = 3,
}

export class DuckDBPendingResult {
  private readonly pending_result: ddb.duckdb_pending_result;
  constructor(pending_result: ddb.duckdb_pending_result) {
    this.pending_result = pending_result;
  }
  public dispose() {
    ddb.duckdb_destroy_pending(this.pending_result);
  }
  public runTask(): DuckDBPendingResultState {
    const pending_state = ddb.duckdb_pending_execute_task(this.pending_result);
    switch (pending_state) {
      case ddb.duckdb_pending_state.DUCKDB_PENDING_RESULT_READY:
        return DuckDBPendingResultState.RESULT_READY;
      case ddb.duckdb_pending_state.DUCKDB_PENDING_RESULT_NOT_READY:
        return DuckDBPendingResultState.RESULT_NOT_READY;
      case ddb.duckdb_pending_state.DUCKDB_PENDING_ERROR:
        throw new Error(`Failure running pending result task: ${ddb.duckdb_pending_error(this.pending_result)}`);
      case ddb.duckdb_pending_state.DUCKDB_PENDING_NO_TASKS_AVAILABLE:
        return DuckDBPendingResultState.NO_TASKS_AVAILABLE;
      default:
        throw new Error(`Unexpected pending state: ${pending_state}`);
    }
  }
  public async getResult(): Promise<DuckDBResult> {
    const result = new ddb.duckdb_result;
    throwOnFailure(await ddb.duckdb_execute_pending(this.pending_result, result),
      'Failed to execute pending materialized result', () => ddb.duckdb_pending_error(this.pending_result));
    return new DuckDBResult(result);
  }
}
