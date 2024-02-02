import assert from 'assert';
import {
  DuckDBBigIntType,
  DuckDBBigIntVector,
  DuckDBBitType,
  DuckDBBlobType,
  DuckDBBlobVector,
  DuckDBBooleanType,
  DuckDBBooleanVector,
  DuckDBConnection,
  DuckDBDataChunk,
  DuckDBDateType,
  DuckDBDateVector,
  DuckDBDecimalType,
  DuckDBDoubleType,
  DuckDBDoubleVector,
  DuckDBEnumType,
  DuckDBFloatType,
  DuckDBFloatVector,
  DuckDBHugeIntType,
  DuckDBHugeIntVector,
  DuckDBInstance,
  DuckDBIntegerType,
  DuckDBIntegerVector,
  DuckDBIntervalType,
  DuckDBListType,
  DuckDBMapType,
  DuckDBPendingResultState,
  DuckDBResult,
  DuckDBSmallIntType,
  DuckDBSmallIntVector,
  DuckDBStructType,
  DuckDBTimeType,
  DuckDBTimeVector,
  DuckDBTimestampMillisecondsType,
  DuckDBTimestampMillisecondsVector,
  DuckDBTimestampNanosecondsType,
  DuckDBTimestampNanosecondsVector,
  DuckDBTimestampSecondsType,
  DuckDBTimestampSecondsVector,
  DuckDBTimestampType,
  DuckDBTimestampVector,
  DuckDBTinyIntType,
  DuckDBTinyIntVector,
  DuckDBType,
  DuckDBUBigIntType,
  DuckDBUBigIntVector,
  DuckDBUIntegerType,
  DuckDBUIntegerVector,
  DuckDBUSmallIntType,
  DuckDBUSmallIntVector,
  DuckDBUTinyIntType,
  DuckDBUTinyIntVector,
  DuckDBUUIDType,
  DuckDBUUIDVector,
  DuckDBUnionType,
  DuckDBVarCharType,
  DuckDBVarCharVector,
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
  assert.strictEqual(result.columnCount, expectedColumns.length, 'column count');
  for (let i = 0; i < expectedColumns.length; i++) {
    const { name, type } = expectedColumns[i];
    // console.log(`${result.columnName(i)} ${result.columnTypeId(i)}`);
    assert.strictEqual(result.columnName(i), name, 'column name');
    assert.strictEqual(result.columnTypeId(i), type.typeId, `column type id (column: ${name})`);
    assert.deepStrictEqual(result.columnType(i), type, `column type (column: ${name})`);
  }
}

function assertNullValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number) {
  const column = chunk.getColumn(columnIndex);
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, null);
}

function assertBooleanValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: boolean) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBBooleanVector)) {
    assert.fail('column not boolean vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

function assertTinyIntValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: number) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBTinyIntVector)) {
    assert.fail('column not tinyint vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

function assertSmallIntValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: number) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBSmallIntVector)) {
    assert.fail('column not smallint vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

function assertIntegerValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: number) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBIntegerVector)) {
    assert.fail('column not integer vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

function assertBigIntValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: bigint) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBBigIntVector)) {
    assert.fail('column not bigint vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

function assertUTinyIntValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: number) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBUTinyIntVector)) {
    assert.fail('column not utinyint vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

function assertUSmallIntValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: number) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBUSmallIntVector)) {
    assert.fail('column not usmallint vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

function assertUIntegerValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: number) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBUIntegerVector)) {
    assert.fail('column not uinteger vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

function assertUBigIntValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: bigint) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBUBigIntVector)) {
    assert.fail('column not ubigint vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

function assertFloatValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: number) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBFloatVector)) {
    assert.fail('column not float vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

function assertDoubleValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: number) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBDoubleVector)) {
    assert.fail('column not double vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

function assertTimestampValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: bigint) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBTimestampVector)) {
    assert.fail('column not timestamp vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

function assertDateValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: number) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBDateVector)) {
    assert.fail('column not date vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

function assertTimeValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: bigint) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBTimeVector)) {
    assert.fail('column not time vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

// TODO: INTERVAL

function assertHugeIntValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: bigint) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBHugeIntVector)) {
    assert.fail('column not hugeint vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

function assertVarCharValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: string) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBVarCharVector)) {
    assert.fail('column not varchar vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

function assertBlobValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: Uint8Array) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBBlobVector)) {
    assert.fail('column not blob vector');
  }
  const value = column.getItem(rowIndex);
  assert.deepStrictEqual(value, expectedValue);
}

// TODO: DECIMAL

function assertTimestampSecondsValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: bigint) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBTimestampSecondsVector)) {
    assert.fail('column not timestamp seconds vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

function assertTimestampMillisecondsValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: bigint) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBTimestampMillisecondsVector)) {
    assert.fail('column not timestamp milliseconds vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

function assertTimestampNanosecondsValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: bigint) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBTimestampNanosecondsVector)) {
    assert.fail('column not timestamp nanoseconds vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

// TODO: ENUM

// TODO: LIST

// TODO: STRUCT

// TODO: MAP

function assertUUIDValue(chunk: DuckDBDataChunk, columnIndex: number, rowIndex: number, expectedValue: bigint) {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof DuckDBUUIDVector)) {
    assert.fail('column not uuid vector');
  }
  const value = column.getItem(rowIndex);
  assert.strictEqual(value, expectedValue);
}

// TODO: UNION

// TODO: BIT

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
    assert.strictEqual(result.rowCount, 1);
    assert.strictEqual(result.chunkCount, 1);
    const chunk = result.getChunk(0);
    assert.strictEqual(chunk.columnCount, 1);
    assert.strictEqual(chunk.rowCount, 1);
    assertIntegerValue(chunk, 0, 0, 42);
    chunk.dispose();
    result.dispose();
    connection.dispose();
    instance.dispose();
  });
  it('should support running prepared statements', async () => {
    await withConnection(async (connection) => {
      const prepared = await connection.prepare('select $num as a, $str as b, $bool as c, $null as d');
      assert.strictEqual(prepared.parameterCount, 4);
      assert.strictEqual(prepared.parameterName(1), 'num');
      assert.strictEqual(prepared.parameterName(2), 'str');
      assert.strictEqual(prepared.parameterName(3), 'bool');
      assert.strictEqual(prepared.parameterName(4), 'null');
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
      assert.strictEqual(result.rowCount, 1);
      assert.strictEqual(result.chunkCount, 1);
      const chunk = result.getChunk(0);
      assert.strictEqual(chunk.columnCount, 4);
      assert.strictEqual(chunk.rowCount, 1);
      assertIntegerValue(chunk, 0, 0, 10);
      assertVarCharValue(chunk, 1, 0, 'abc');
      assertBooleanValue(chunk, 2, 0, true);
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
      assert.strictEqual(result.rowCount, 3);
      assert.strictEqual(result.chunkCount, 1);
      const chunk = result.getChunk(0);
      assert.strictEqual(chunk.columnCount, 1);
      assert.strictEqual(chunk.rowCount, 3);
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
      assert.strictEqual(chunks.length, 5); // ceil(10000 / 2048) = 5
      assert.strictEqual(chunks[0].rowCount, 2048);
      assert.strictEqual(chunks[1].rowCount, 2048);
      assert.strictEqual(chunks[2].rowCount, 2048);
      assert.strictEqual(chunks[3].rowCount, 2048);
      assert.strictEqual(chunks[4].rowCount, 1808); // 10000 - 2048 * 4 = 1808
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
  it('should support all data types', async () => {
    await withConnection(async (connection) => {
      const result = await connection.run('from test_all_types()');
      assertColumns(result, [
        { name: 'bool', type: DuckDBBooleanType.instance },
        { name: 'tinyint', type: DuckDBTinyIntType.instance },
        { name: 'smallint', type: DuckDBSmallIntType.instance },
        { name: 'int', type: DuckDBIntegerType.instance },
        { name: 'bigint', type: DuckDBBigIntType.instance },
        { name: 'hugeint', type: DuckDBHugeIntType.instance },
        { name: 'utinyint', type: DuckDBUTinyIntType.instance },
        { name: 'usmallint', type: DuckDBUSmallIntType.instance },
        { name: 'uint', type: DuckDBUIntegerType.instance },
        { name: 'ubigint', type: DuckDBUBigIntType.instance },
        { name: 'date', type: DuckDBDateType.instance },
        { name: 'time', type: DuckDBTimeType.instance },
        { name: 'timestamp', type: DuckDBTimestampType.instance },
        { name: 'timestamp_s', type: DuckDBTimestampSecondsType.instance },
        { name: 'timestamp_ms', type: DuckDBTimestampMillisecondsType.instance },
        { name: 'timestamp_ns', type: DuckDBTimestampNanosecondsType.instance },
        { name: 'time_tz', type: DuckDBTimeType.instance },
        { name: 'timestamp_tz', type: DuckDBTimestampType.instance },
        { name: 'float', type: DuckDBFloatType.instance },
        { name: 'double', type: DuckDBDoubleType.instance },
        { name: 'dec_4_1', type: new DuckDBDecimalType(4, 1) },
        { name: 'dec_9_4', type: new DuckDBDecimalType(9, 4) },
        { name: 'dec_18_6', type: new DuckDBDecimalType(18, 6) },
        { name: 'dec38_10', type: new DuckDBDecimalType(38, 10) },
        { name: 'uuid', type: DuckDBUUIDType.instance },
        { name: 'interval', type: DuckDBIntervalType.instance },
        { name: 'varchar', type: DuckDBVarCharType.instance },
        { name: 'blob', type: DuckDBBlobType.instance },
        { name: 'bit', type: DuckDBBitType.instance },
        { name: 'small_enum', type: new DuckDBEnumType(['DUCK_DUCK_ENUM', 'GOOSE']) },
        { name: 'medium_enum', type: new DuckDBEnumType(Array.from({ length: 300 }).map((_, i) => `enum_${i}`)) },
        { name: 'large_enum', type: new DuckDBEnumType(['enum_0', 'enum_69999']) },
        { name: 'int_array', type: new DuckDBListType(DuckDBIntegerType.instance) },
        { name: 'double_array', type: new DuckDBListType(DuckDBDoubleType.instance) },
        { name: 'date_array', type: new DuckDBListType(DuckDBDateType.instance) },
        { name: 'timestamp_array', type: new DuckDBListType(DuckDBTimestampType.instance) },
        { name: 'timestamptz_array', type: new DuckDBListType(DuckDBTimestampType.instance) },
        { name: 'varchar_array', type: new DuckDBListType(DuckDBVarCharType.instance) },
        { name: 'nested_int_array', type: new DuckDBListType(new DuckDBListType(DuckDBIntegerType.instance)) },
        { name: 'struct', type: new DuckDBStructType([
          { name: 'a', valueType: DuckDBIntegerType.instance },
          { name: 'b', valueType: DuckDBVarCharType.instance },
        ])},
        { name: 'struct_of_arrays', type: new DuckDBStructType([
          { name: 'a', valueType: new DuckDBListType(DuckDBIntegerType.instance) },
          { name: 'b', valueType: new DuckDBListType(DuckDBVarCharType.instance) },
        ])},
        { name: 'array_of_structs', type: new DuckDBListType(new DuckDBStructType([
          { name: 'a', valueType: DuckDBIntegerType.instance },
          { name: 'b', valueType: DuckDBVarCharType.instance },
        ]))},
        { name: 'map', type: new DuckDBMapType(DuckDBVarCharType.instance, DuckDBVarCharType.instance) },
        { name: 'union', type: new DuckDBUnionType([
          { tag: 'name', valueType: DuckDBVarCharType.instance },
          { tag: 'age', valueType: DuckDBSmallIntType.instance },
        ])},
      ]);
      assert.strictEqual(result.rowCount, 3);
      assert.strictEqual(result.chunkCount, 1);
      const chunk = result.getChunk(0);
      assert.strictEqual(chunk.columnCount, 44);
      assert.strictEqual(chunk.rowCount, 3);

      assertBooleanValue(chunk, 0, 0, false);
      assertBooleanValue(chunk, 0, 1, true);
      assertNullValue(chunk, 0, 2);
      assertTinyIntValue(chunk, 1, 0, -128);
      assertTinyIntValue(chunk, 1, 1, 127);
      assertNullValue(chunk, 1, 2);
      assertSmallIntValue(chunk, 2, 0, -32768);
      assertSmallIntValue(chunk, 2, 1, 32767);
      assertNullValue(chunk, 2, 2);
      assertIntegerValue(chunk, 3, 0, -2147483648);
      assertIntegerValue(chunk, 3, 1, 2147483647);
      assertNullValue(chunk, 3, 2);
      assertBigIntValue(chunk, 4, 0, -(BigInt(1)<<BigInt(63)));
      assertBigIntValue(chunk, 4, 1, (BigInt(1)<<BigInt(63))-BigInt(1));
      assertNullValue(chunk, 4, 2);
      assertHugeIntValue(chunk, 5, 0, -((BigInt(1)<<BigInt(127))-BigInt(1)));
      assertHugeIntValue(chunk, 5, 1, (BigInt(1)<<BigInt(127))-BigInt(1));
      assertNullValue(chunk, 5, 2);
      assertUTinyIntValue(chunk, 6, 0, 0);
      assertUTinyIntValue(chunk, 6, 1, 255);
      assertNullValue(chunk, 6, 2);
      assertUSmallIntValue(chunk, 7, 0, 0);
      assertUSmallIntValue(chunk, 7, 1, 65535);
      assertNullValue(chunk, 7, 2);
      assertUIntegerValue(chunk, 8, 0, 0);
      assertUIntegerValue(chunk, 8, 1, 4294967295);
      assertNullValue(chunk, 8, 2);
      assertUBigIntValue(chunk, 9, 0, BigInt(0));
      assertUBigIntValue(chunk, 9, 1, (BigInt(1)<<BigInt(64))-BigInt(1));
      assertNullValue(chunk, 9, 2);
      assertDateValue(chunk, 10, 0, -(2 ** 31) + 2);
      assertDateValue(chunk, 10, 1, 2 ** 31 - 2);
      assertNullValue(chunk, 10, 2);
      assertTimeValue(chunk, 11, 0, BigInt(0));
      assertTimeValue(chunk, 11, 1, BigInt(86399999999));
      assertNullValue(chunk, 11, 2);
      assertTimestampValue(chunk, 12, 0, BigInt(-9223372022400)*BigInt(1000000));
      assertTimestampValue(chunk, 12, 1, (BigInt(1)<<BigInt(63))-BigInt(2));
      assertNullValue(chunk, 12, 2);
      assertTimestampSecondsValue(chunk, 13, 0, BigInt(-9223372022400));
      assertTimestampSecondsValue(chunk, 13, 1, BigInt(9223372036854));
      assertNullValue(chunk, 13, 2);
      assertTimestampMillisecondsValue(chunk, 14, 0, BigInt(-9223372022400)*BigInt(1000));
      assertTimestampMillisecondsValue(chunk, 14, 1, ((BigInt(1)<<BigInt(63))-BigInt(2)) / BigInt(1000));
      assertNullValue(chunk, 14, 2);
      assertTimestampNanosecondsValue(chunk, 15, 0, -(BigInt(1)<<BigInt(63)));
      assertTimestampNanosecondsValue(chunk, 15, 1, (BigInt(1)<<BigInt(63))-BigInt(2));
      assertNullValue(chunk, 15, 2);
      // TODO: TIME_TZ
      assertTimestampValue(chunk, 17, 0, BigInt(-9223372022400)*BigInt(1000000));
      assertTimestampValue(chunk, 17, 1, (BigInt(1)<<BigInt(63))-BigInt(2));
      assertNullValue(chunk, 17, 2);
      assertFloatValue(chunk, 18, 0, Math.fround(-3.4028235e+38));
      assertFloatValue(chunk, 18, 1, Math.fround(3.4028235e+38));
      assertNullValue(chunk, 18, 2);
      assertDoubleValue(chunk, 19, 0, -Number.MAX_VALUE);
      assertDoubleValue(chunk, 19, 1, Number.MAX_VALUE);
      assertNullValue(chunk, 19, 2);
      // TODO: DECIMAL
      assertUUIDValue(chunk, 24, 0, -((BigInt(1)<<BigInt(127))-BigInt(1)));
      assertUUIDValue(chunk, 24, 1, (BigInt(1)<<BigInt(127))-BigInt(1));
      assertNullValue(chunk, 24, 2);
      // TODO: INTERVAL
      assertVarCharValue(chunk, 26, 0, "🦆🦆🦆🦆🦆🦆");
      assertVarCharValue(chunk, 26, 1, "goo\0se");
      assertNullValue(chunk, 26, 2);
      assertBlobValue(chunk, 27, 0, Buffer.from(new TextEncoder().encode("thisisalongblob\x00withnullbytes")));
      assertBlobValue(chunk, 27, 1, Buffer.from(new TextEncoder().encode("\x00\x00\x00a")));
      assertNullValue(chunk, 27, 2);
      // TODO: BIT
      // TODO: ENUMs
      // TODO: LISTs <-
      // TODO: STRUCTs <-
      // TODO: MAP <-
      // TODO: UNION <-
      chunk.dispose();
      result.dispose();
    });
  });
});
