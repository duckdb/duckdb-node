import * as ddb from '../..';
import { DuckDBDataChunk } from './DuckDBDataChunk';
import { DuckDBLogicalType } from './DuckDBLogicalType';
import { DuckDBType } from './DuckDBType';
import { DuckDBTypeId } from './DuckDBTypeId';

export class DuckDBResult {
  private readonly result: ddb.duckdb_result;
  constructor(result: ddb.duckdb_result) {
    this.result = result;
  }
  public dispose() {
    ddb.duckdb_destroy_result(this.result);
  }
  public get columnCount(): number {
    return ddb.duckdb_column_count(this.result);
  }
  public columnName(columnIndex: number): string {
    return ddb.duckdb_column_name(this.result, columnIndex);
  }
  public columnTypeId(columnIndex: number): DuckDBTypeId {
    return ddb.duckdb_column_type(this.result, columnIndex) as unknown as DuckDBTypeId;
  }
  public columnLogicalType(columnIndex: number): DuckDBLogicalType {
    return DuckDBLogicalType.create(ddb.duckdb_column_logical_type(this.result, columnIndex));
  }
  public columnType(columnIndex: number): DuckDBType {
    return DuckDBLogicalType.consumeAsType(ddb.duckdb_column_logical_type(this.result, columnIndex));
  }
  public get rowsChanged(): number {
    return ddb.duckdb_rows_changed(this.result);
  }
  public async fetchChunk(): Promise<DuckDBDataChunk> {
    return new DuckDBDataChunk(await ddb.duckdb_fetch_chunk(this.result));
  }
}
