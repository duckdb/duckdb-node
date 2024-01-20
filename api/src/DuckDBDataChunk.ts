import * as ddb from '../..';
import { DuckDBVector } from './DuckDBVector';

export class DuckDBDataChunk {
  private readonly chunk: ddb.duckdb_data_chunk;
  constructor(chunk: ddb.duckdb_data_chunk) {
    this.chunk = chunk;
  }
  public static create(): DuckDBDataChunk {
    // TODO: C API takes raw pointer (list of types)
    throw new Error('not implemented');
  }
  public dispose() {
    ddb.duckdb_destroy_data_chunk(this.chunk);
  }
  public reset() {
    ddb.duckdb_data_chunk_reset(this.chunk);
  }
  public get columnCount(): number {
    return ddb.duckdb_data_chunk_get_column_count(this.chunk);
  }
  public getColumn(columnIndex: number): DuckDBVector<any> {
    // TODO: cache vectors?
    return DuckDBVector.create(ddb.duckdb_data_chunk_get_vector(this.chunk, columnIndex), this.rowCount);
  }
  public get rowCount(): number {
    return ddb.duckdb_data_chunk_get_size(this.chunk);
  }
  public set rowCount(count: number) {
    ddb.duckdb_data_chunk_set_size(this.chunk, count);
  }
}
