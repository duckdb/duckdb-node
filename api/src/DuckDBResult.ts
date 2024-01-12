import * as ddb from '../..';
import { DuckDBDataChunk } from './DuckDBDataChunk';
import { DuckDBLogicalType } from './DuckDBLogicalType';
import { DuckDBTypeId } from './DuckDBTypeId';

export class DuckDBResult {
  private readonly result: ddb.duckdb_result;
  constructor(result: ddb.duckdb_result) {
    this.result = result;
  }
  public dispose() {
    ddb.duckdb_destroy_result(this.result);
  }
  public get isStreaming(): boolean {
    return ddb.duckdb_result_is_streaming(this.result);
  }
  public get columnCount(): number {
    return ddb.duckdb_column_count(this.result);
  }
  public columnName(columnIndex: number): string {
    return ddb.duckdb_column_name(this.result, columnIndex);
  }
  public columnType(columnIndex: number): DuckDBTypeId {
    return ddb.duckdb_column_type(this.result, columnIndex) as unknown as DuckDBTypeId;
  }
  public columnLogicalType(columnIndex: number): DuckDBLogicalType {
    return DuckDBLogicalType.create(ddb.duckdb_column_logical_type(this.result, columnIndex));
  }
  public get rowCount(): number {
    return ddb.duckdb_row_count(this.result);
  }
  public get rowsChanged(): number {
    return ddb.duckdb_rows_changed(this.result);
  }
  public get chunkCount(): number {
    return ddb.duckdb_result_chunk_count(this.result);
  }
  public getChunk(chunkIndex: number): DuckDBDataChunk {
    return new DuckDBDataChunk(ddb.duckdb_result_get_chunk(this.result, chunkIndex));
  }
}
