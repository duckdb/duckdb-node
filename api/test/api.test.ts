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
  DuckDBListVector,
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
  DuckDBVector,
  configurationOptionDescriptions,
  version
} from '../src';

const N_2_7 = 2 ** 7;
const N_2_8 = 2 ** 8;
const N_2_15 = 2 ** 15;
const N_2_16 = 2 ** 16;
const N_2_31 = 2 ** 31;
const N_2_32 = 2 ** 32;

const BI_0 = BigInt(0);
const BI_1 = BigInt(1);
// const BI_2 = BigInt(2);
const BI_24 = BigInt(24);
const BI_60 = BigInt(60);
const BI_1000 = BigInt(1000);
const BI_2_63 = BI_1 << BigInt(63);
const BI_2_64 = BI_1 << BigInt(64);
const BI_2_127 = BI_1 << BigInt(127);
// const BI_2_128 = BI_1 << BigInt(128);

const MinInt8 = -N_2_7;
const MaxInt8 = N_2_7 - 1;
const MinUInt8 = 0;
const MaxUInt8 = N_2_8 - 1;
const MinInt16 = -N_2_15;
const MaxInt16 = N_2_15 - 1;
const MinUInt16 = 0;
const MaxUInt16 = N_2_16 - 1;
const MinInt32 = -N_2_31;
const MaxInt32 = N_2_31 - 1;
const MinUInt32 = 0;
const MaxUInt32 = N_2_32 - 1;
const MinInt64 = -BI_2_63;
const MaxInt64 = BI_2_63 - BI_1;
const MinUInt64 = BI_0;
const MaxUInt64 = BI_2_64 - BI_1;
const MinInt128 = -BI_2_127;
const MaxInt128 = BI_2_127 - BI_1;
const MinHugeInt = MinInt128 + BI_1; // This oddness was fixed in https://github.com/duckdb/duckdb/pull/9441, but we don't have that yet here
const MinDate = MinInt32 + 2;
const MaxDate = MaxInt32 - 1;
const DateInf = MaxInt32;
const MinTime = BI_0;
const MaxTime = BI_24 * BI_60 * BI_60 * BI_1000 * BI_1000 - BI_1; // 86399999999
const MinTS_S = BigInt(-9223372022400); // from test_all_types() select epoch(timestamp_s)::bigint;
const MaxTS_S = BigInt(9223372036854);
const MinTS_MS = MinTS_S * BI_1000;
const MaxTS_MS = (MaxInt64 - BI_1) / BI_1000;
const MinTS_US = MinTS_MS * BI_1000;
const MaxTS_US = MaxInt64 - BI_1;
const TS_US_Inf = MaxInt64;
const MinTS_NS = MinInt64;
const MaxTS_NS = MaxInt64 - BI_1;
const MinFloat32 = Math.fround(-3.4028235e+38);
const MaxFloat32 = Math.fround(3.4028235e+38);
const MinFloat64 = -Number.MAX_VALUE;
const MaxFloat64 = Number.MAX_VALUE;
const MinUUID = MinInt128 + BI_1;
const MaxUUID = MaxInt128;

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
    assert.strictEqual(result.columnName(i), name, 'column name');
    assert.strictEqual(result.columnTypeId(i), type.typeId, `column type id (column: ${name})`);
    assert.deepStrictEqual(result.columnType(i), type, `column type (column: ${name})`);
  }
}

function getColumnVector<TValue, TVector extends DuckDBVector<TValue>>(
  chunk: DuckDBDataChunk,
  columnIndex: number,
  vectorType: new (...args: any[]) => TVector
): TVector {
  const column = chunk.getColumn(columnIndex);
  if (!(column instanceof vectorType)) {
    assert.fail(`expected column ${columnIndex} to be a ${vectorType}`);
  }
  return column;
}

function assertVectorValues<T>(vector: DuckDBVector<T> | null, values: readonly T[], vectorName: string) {
  if (!vector) {
    assert.fail(`${vectorName} unexpectedly null`);
  }
  assert.strictEqual(vector.itemCount, values.length,
      `expected vector ${vectorName} item count to be ${values.length} but found ${vector.itemCount}`);
  for (let i = 0; i < values.length; i++) {
    const actual: T | null = vector.getItem(i);
    const expected = values[i];
    assert.deepStrictEqual(actual, expected,
      `expected vector ${vectorName}[${i}] to be ${expected} but found ${actual}`);
  }
}

function assertNestedVectorValues<T>(
  vector: DuckDBVector<T> | null,
  checkVectorValueFns: ((value: T | null, valueName: string) => void)[],
  vectorName: string,
) {
  if (!vector) {
    assert.fail(`${vectorName} unexpectedly null`);
  }
  assert.strictEqual(vector.itemCount, checkVectorValueFns.length,
      `expected vector ${vectorName} item count to be ${checkVectorValueFns.length} but found ${vector.itemCount}`);
  for (let i = 0; i < vector.itemCount; i++) {
    checkVectorValueFns[i](vector.getItem(i), `${vectorName}[${i}]`)
  }
}

function assertValues<TValue, TVector extends DuckDBVector<TValue>>(
  chunk: DuckDBDataChunk,
  columnIndex: number,
  vectorType: new (...args: any[]) => TVector,
  values: readonly (TValue | null)[],
) {
  const vector = getColumnVector(chunk, columnIndex, vectorType);
  assertVectorValues(vector, values, `${columnIndex}`);
}

function assertNestedValues<TValue, TVector extends DuckDBVector<TValue>>(
  chunk: DuckDBDataChunk,
  columnIndex: number,
  vectorType: new (...args: any[]) => TVector,
  checkVectorValueFns: ((value: TValue | null, valueName: string) => void)[],
) {
  const vector = getColumnVector(chunk, columnIndex, vectorType);
  assertNestedVectorValues(vector, checkVectorValueFns, `col${columnIndex}`);
}

const textEncoder = new TextEncoder();
function blobFromString(str: string): Uint8Array {
  return Buffer.from(textEncoder.encode(str));
}

function bigints(start: bigint, end: bigint) {
  return Array.from({ length: Number(end - start) + 1 }).map((_, i) => start + BigInt(i));
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
    assert.strictEqual(result.rowCount, 1);
    assert.strictEqual(result.chunkCount, 1);
    const chunk = result.getChunk(0);
    assert.strictEqual(chunk.columnCount, 1);
    assert.strictEqual(chunk.rowCount, 1);
    assertValues(chunk, 0, DuckDBIntegerVector, [42]);
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
      assertValues(chunk, 0, DuckDBIntegerVector, [10]);
      assertValues(chunk, 1, DuckDBVarCharVector, ['abc']);
      assertValues(chunk, 2, DuckDBBooleanVector, [true]);
      assertValues<number, DuckDBIntegerVector>(chunk, 3, DuckDBIntegerVector, [null]);
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
      assertValues(chunk, 0, DuckDBIntegerVector, [MinInt32, MaxInt32, null]);
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
      assertValues(chunks[0], 0, DuckDBBigIntVector, bigints(BigInt(0), BigInt(2048-1)));
      assertValues(chunks[1], 0, DuckDBBigIntVector, bigints(BigInt(2048), BigInt(2048*2-1)));
      assertValues(chunks[2], 0, DuckDBBigIntVector, bigints(BigInt(2048*2), BigInt(2048*3-1)));
      assertValues(chunks[3], 0, DuckDBBigIntVector, bigints(BigInt(2048*3), BigInt(2048*4-1)));
      assertValues(chunks[4], 0, DuckDBBigIntVector, bigints(BigInt(2048*4), BigInt(9999)));
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

      assertValues(chunk, 0, DuckDBBooleanVector, [false, true, null]);
      assertValues(chunk, 1, DuckDBTinyIntVector, [MinInt8, MaxInt8, null]);
      assertValues(chunk, 2, DuckDBSmallIntVector, [MinInt16, MaxInt16, null]);
      assertValues(chunk, 3, DuckDBIntegerVector, [MinInt32, MaxInt32, null]);
      assertValues(chunk, 4, DuckDBBigIntVector, [MinInt64, MaxInt64, null]);
      assertValues(chunk, 5, DuckDBHugeIntVector, [MinHugeInt, MaxInt128, null]);
      assertValues(chunk, 6, DuckDBUTinyIntVector, [MinUInt8, MaxUInt8, null]);
      assertValues(chunk, 7, DuckDBUSmallIntVector, [MinUInt16, MaxUInt16, null]);
      assertValues(chunk, 8, DuckDBUIntegerVector, [MinUInt32, MaxUInt32, null]);
      assertValues(chunk, 9, DuckDBUBigIntVector, [MinUInt64, MaxUInt64, null]);
      assertValues(chunk, 10, DuckDBDateVector, [MinDate, MaxDate, null]);
      assertValues(chunk, 11, DuckDBTimeVector, [MinTime, MaxTime, null]);
      assertValues(chunk, 12, DuckDBTimestampVector, [MinTS_US, MaxTS_US, null]);
      assertValues(chunk, 13, DuckDBTimestampSecondsVector, [MinTS_S, MaxTS_S, null]);
      assertValues(chunk, 14, DuckDBTimestampMillisecondsVector, [MinTS_MS, MaxTS_MS, null]);
      assertValues(chunk, 15, DuckDBTimestampNanosecondsVector, [MinTS_NS, MaxTS_NS, null]);
      // TODO: TIME_TZ
      assertValues(chunk, 17, DuckDBTimestampVector, [MinTS_US, MaxTS_US, null]);
      assertValues(chunk, 18, DuckDBFloatVector, [MinFloat32, MaxFloat32, null]);
      assertValues(chunk, 19, DuckDBDoubleVector, [MinFloat64, MaxFloat64, null]);
      // TODO: DECIMAL (int16)
      // TODO: DECIMAL (int32)
      // TODO: DECIMAL (int64)
      // TODO: DECIMAL (int128)
      assertValues(chunk, 24, DuckDBUUIDVector, [MinUUID, MaxUUID, null]);
      // TODO: INTERVAL
      assertValues(chunk, 26, DuckDBVarCharVector, ["🦆🦆🦆🦆🦆🦆", "goo\0se", null]);
      assertValues(chunk, 27, DuckDBBlobVector, [
        blobFromString("thisisalongblob\x00withnullbytes"),
        blobFromString("\x00\x00\x00a"),
        null,
      ]);
      // TODO: BIT
      // TODO: ENUM (small)
      // TODO: ENUM (medium)
      // TODO: ENUM (large)
      // TODO: LISTs <-
      assertNestedValues<DuckDBVector<number>, DuckDBListVector<number>>(chunk, 32, DuckDBListVector, [
        (v, n) => assertVectorValues(v, [], n),
        (v, n) => assertVectorValues(v, [42, 999, null, null, -42], n),
        (v, n) => assert.strictEqual(v, null, n),
      ]);
      assertNestedValues<DuckDBVector<number>, DuckDBListVector<number>>(chunk, 33, DuckDBListVector, [
        (v, n) => assertVectorValues(v, [], n),
        (v, n) => assertVectorValues(v, [42.0, NaN, Infinity, -Infinity, null, -42.0], n),
        (v, n) => assert.strictEqual(v, null, n),
      ]);
      assertNestedValues<DuckDBVector<number>, DuckDBListVector<number>>(chunk, 34, DuckDBListVector, [
        (v, n) => assertVectorValues(v, [], n),
        (v, n) => assertVectorValues(v, [0, DateInf, -DateInf, null, 19124], n),
        (v, n) => assert.strictEqual(v, null, n),
      ]);
      // 1652372625 is 2022-05-12 16:23:45
      assertNestedValues<DuckDBVector<bigint>, DuckDBListVector<bigint>>(chunk, 35, DuckDBListVector, [
        (v, n) => assertVectorValues(v, [], n),
        (v, n) => assertVectorValues(v, [BI_0, TS_US_Inf, -TS_US_Inf, null, BigInt(1652372625)*BI_1000*BI_1000], n),
        (v, n) => assert.strictEqual(v, null, n),
      ]);
      // 1652397825 = 1652372625 + 25200, 25200 = 7 * 60 * 60 = 7 hours in seconds
      // This 7 hour difference is hard coded into test_all_types (value is 2022-05-12 16:23:45-07)
      assertNestedValues<DuckDBVector<bigint>, DuckDBListVector<bigint>>(chunk, 36, DuckDBListVector, [
        (v, n) => assertVectorValues(v, [], n),
        (v, n) => assertVectorValues(v, [BI_0, TS_US_Inf, -TS_US_Inf, null, BigInt(1652397825)*BI_1000*BI_1000], n),
        (v, n) => assert.strictEqual(v, null, n),
      ]);
      // Note that the string "goose" in varchar_array does NOT have an embedded null character.
      assertNestedValues<DuckDBVector<string>, DuckDBListVector<string>>(chunk, 37, DuckDBListVector, [
        (v, n) => assertVectorValues(v, [], n),
        (v, n) => assertVectorValues(v, ["🦆🦆🦆🦆🦆🦆", "goose", null, ""], n),
        (v, n) => assert.strictEqual(v, null, n),
      ]);
      assertNestedValues<DuckDBVector<DuckDBVector<number>>, DuckDBListVector<DuckDBVector<number>>>(chunk, 38, DuckDBListVector, [
        (v, n) => {
          assert.ok(v, `${n} unexpectedly null`);
          assert.strictEqual(v.itemCount, 0, `${n} not empty`);
        },
        (v, n) => assertNestedVectorValues(v, [
          (vv, nn) => assertVectorValues(vv, [], nn),
          (vv, nn) => assertVectorValues(vv, [42, 999, null, null, -42], nn),
          (vv, nn) => assert.strictEqual(vv, null, nn),
          (vv, nn) => assertVectorValues(vv, [], nn),
          (vv, nn) => assertVectorValues(vv, [42, 999, null, null, -42], nn),
        ], n),
        (v, n) => assert.strictEqual(v, null, n),
      ]);
      // TODO: STRUCT <-
      // TODO: struct_of_arrays <-
      // TODO: array_of_structs <-
      // TODO: MAP <-
      // TODO: UNION <-

      chunk.dispose();
      result.dispose();
    });
  });
});
