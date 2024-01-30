import assert from 'assert';
import {
  DuckDBBooleanType,
  DuckDBConnection,
  DuckDBDataChunk,
  DuckDBInstance,
  DuckDBIntegerType,
  DuckDBIntegerVector,
  DuckDBResult,
  DuckDBType,
  DuckDBTypeId,
  DuckDBVarCharType,
  DuckDBVector
} from '../src';

async function withConnection(fn: (connection: DuckDBConnection) => Promise<void>) {
  const instance = await DuckDBInstance.create();
  const connection = await instance.connect();
  await fn(connection);
  connection.dispose();
  instance.dispose();
}

interface ExpectedColumn {
  readonly name: string;
  readonly type: DuckDBType;
}

function assertColumns(result: DuckDBResult, expectedColumns: readonly ExpectedColumn[]) {
  assert.equal(result.columnCount, expectedColumns.length, 'column count');
  for (let i = 0; i < expectedColumns.length; i++) {
    const { name, type } = expectedColumns[i];
    assert.equal(result.columnName(i), name, 'column name');
    assert.equal(result.columnTypeId(i), type.typeId, 'column type id');
    assert.equal(result.columnType(i), type, 'column type');
  }
}

function assertIntegerValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: number) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBIntegerVector)) {
    assert.fail('column not integer vector');
  }
  const value = column.getItem(rowIndex);
  assert.equal(value, expectedValue);
}

function assertNullValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number) {
  const column = chunk.getColumn(columnIndex);
  const value = column.getItem(rowIndex);
  assert.equal(value, null);
}

describe('api', () => {
  it('should support creating, connecting, running a basic query, and reading results', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    const result = await connection.run('select 42 as num');
    assertColumns(result, [{ name: 'num', type: DuckDBIntegerType.instance }]);
    assert.equal(result.rowCount, 1);
    assert.equal(result.chunkCount, 1);
    const chunk = result.getChunk(0);
    assert.equal(chunk.columnCount, 1);
    assert.equal(chunk.rowCount, 1);
    assertIntegerValue(chunk, 0, 0, 42);
    chunk.dispose();
    result.dispose();
    connection.dispose();
    instance.dispose();
  });
  it('should support running prepared statements', async () => {
    await withConnection(async (connection) => {
      const prepared = await connection.prepare('select $num as a, $str as b, $bool as c, $null as d');
      assert.equal(prepared.parameterCount, 4);
      assert.equal(prepared.parameterName(1), 'num');
      assert.equal(prepared.parameterName(2), 'str');
      assert.equal(prepared.parameterName(3), 'bool');
      assert.equal(prepared.parameterName(4), 'null');
      prepared.bindInteger(1, 10);
      prepared.bindVarchar(2, 'abc');
      prepared.bindBoolean(3, true);
      prepared.bindNull(4);
      const result = await prepared.run();
      assertColumns(result, [
        { name: 'a', type: DuckDBIntegerType.instance },
        { name: 'b', type: DuckDBVarCharType.instance },
        { name: 'c', type: DuckDBBooleanType.instance },
        { name: 'd', type: DuckDBIntegerType.instance },
      ]);
      assert.equal(result.rowCount, 1);
      assert.equal(result.chunkCount, 1);
      const chunk = result.getChunk(0);
      assert.equal(chunk.columnCount, 4);
      assert.equal(chunk.rowCount, 1);
      assertIntegerValue(chunk, 0, 0, 10);
      // TODO: validate varchar
      // TODO: validate boolean
      assertNullValue(chunk, 3, 0);
      chunk.dispose();
      result.dispose();
      prepared.dispose();
    });
  });
});
