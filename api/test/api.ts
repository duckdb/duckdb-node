import assert from 'assert';
import {
  DuckDBBigIntType,
  DuckDBBigIntVector,
  DuckDBBooleanType,
  DuckDBConnection,
  DuckDBDataChunk,
  DuckDBInstance,
  DuckDBIntegerType,
  DuckDBIntegerVector,
  DuckDBPendingResultState,
  DuckDBResult,
  DuckDBType,
  DuckDBVarCharType,
  configurationOptionDescriptions,
  version
} from '../src';

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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

function assertBigIntValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: bigint) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBBigIntVector)) {
    assert.fail('column not bigint vector');
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
  it('should expose version', () => {
    const ver = version();
    assert.ok(ver.startsWith('v'), `version starts with 'v'`);
  });
  it('should expose configuration option descriptions', () => {
    const descriptions = configurationOptionDescriptions();
    assert.ok(descriptions['memory_limit'], `descriptions has 'memory_limit'`);
  });
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
  it('should support starting prepared statements and running them incrementally', async () => {
    await withConnection(async (connection) => {
      const prepared = await connection.prepare('select int from test_all_types()');
      const pending = prepared.start();
      let taskCount = 0;
      while (pending.runTask() !== DuckDBPendingResultState.RESULT_READY) {
        taskCount++;
        if (taskCount > 100) { // arbitrary upper bound on the number of tasks expected for this simple query
          assert.fail('Unexpectedly large number of tasks');
        }
        await sleep(1);
      }
      // console.debug('task count: ', taskCount);
      const result = await pending.getResult();
      assert.ok(!result.isStreaming, 'result should not be streaming');
      assertColumns(result, [
        { name: 'int', type: DuckDBIntegerType.instance },
      ]);
      assert.equal(result.rowCount, 3);
      assert.equal(result.chunkCount, 1);
      const chunk = result.getChunk(0);
      assert.equal(chunk.columnCount, 1);
      assert.equal(chunk.rowCount, 3);
      assertIntegerValue(chunk, 0, 0, -2147483648);
      assertIntegerValue(chunk, 0, 1, 2147483647);
      assertNullValue(chunk, 0, 2);
      chunk.dispose();
      result.dispose();
      pending.dispose();
      prepared.dispose();
    });
  });
  it('should support streaming results from prepared statements', async () => {
    await withConnection(async (connection) => {
      const prepared = await connection.prepare('from range(10000)');
      const pending = prepared.startStreaming();
      const result = await pending.getResult();
      assert.ok(result.isStreaming, 'result should be streaming');
      assertColumns(result, [
        { name: 'range', type: DuckDBBigIntType.instance },
      ]);
      const chunks: DuckDBDataChunk[] = [];
      let currentChunk = await result.fetchChunk();
      while (currentChunk.rowCount > 0) {
        chunks.push(currentChunk);
        currentChunk = await result.fetchChunk();
      }
      currentChunk.dispose(); // this is the empty chunk that signifies the end of the stream
      assert.equal(chunks.length, 5); // ceil(10000 / 2048) = 5
      assert.equal(chunks[0].rowCount, 2048);
      assert.equal(chunks[1].rowCount, 2048);
      assert.equal(chunks[2].rowCount, 2048);
      assert.equal(chunks[3].rowCount, 2048);
      assert.equal(chunks[4].rowCount, 1808); // 10000 - 2048 * 4 = 1808
      assertBigIntValue(chunks[4], 0, 0, BigInt(8192)); // 2048 * 4 = 8192
      assertBigIntValue(chunks[4], 0, 1807, BigInt(9999));
      for (const chunk of chunks) {
        chunk.dispose();
      }
      result.dispose();
      pending.dispose();
      prepared.dispose();
    });
  });
});
