import * as ddb from '../..';

export class DuckDBDataChunk {
  private readonly chunk: ddb.duckdb_data_chunk;
  constructor(chunk: ddb.duckdb_data_chunk) {
    this.chunk = chunk;
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
  public getColumn(columnIndex: number) /* : DuckDBVector */ {
    return ddb.duckdb_data_chunk_get_vector(this.chunk, columnIndex);
  }
  public get rowCount(): number {
    return ddb.duckdb_data_chunk_get_size(this.chunk);
  }
  public set rowCount(count: number) {
    ddb.duckdb_data_chunk_set_size(this.chunk, count);
  }
  // TODO
}
