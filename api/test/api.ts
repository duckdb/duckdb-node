import assert from 'assert';
import {
  DuckDBInstance,
  DuckDBIntegerType,
  DuckDBIntegerVector,
  DuckDBTypeId
} from '../src';

describe('api', () => {
  it('should support creating, connecting, running a basic query, and reading results', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();

    const result = await connection.run('select 42 as num');
    assert.equal(result.columnCount, 1);
    assert.equal(result.columnName(0), 'num');
    assert.equal(result.columnTypeId(0), DuckDBTypeId.INTEGER);
    assert.equal(result.columnType(0), DuckDBIntegerType.instance);
    assert.equal(result.rowCount, 1);
    assert.equal(result.chunkCount, 1);

    const chunk = result.getChunk(0);
    assert.equal(chunk.columnCount, 1);
    assert.equal(chunk.rowCount, 1);
    const column = chunk.getColumn(0);
    if (!(column instanceof DuckDBIntegerVector)) {
      assert.fail('column not integer vector');
    }
    const value = column.getItem(0);
    assert.equal(value, 42);

    chunk.dispose();
    result.dispose();
    connection.dispose();
    instance.dispose();
  });
});
