import {
  DuckDBBigIntVector,
  DuckDBConnection,
  DuckDBInstance,
} from '../src';

async function measureQuery(connection: DuckDBConnection, query: string): Promise<number> {
  const startTime = performance.now();
  const prepared = await connection.prepare(query);
  // const preparedTime = performance.now();
  const pending = prepared.startStreaming();
  const result = await pending.getResult();
  // const resultTime = performance.now();
  let valueCount = 0;
  let nullCount = 0;
  let chunk = await result.fetchChunk();
  // const firstChunkTime = performance.now();
  while (chunk.rowCount > 0) {
    const col0 = chunk.getColumn(0);
    for (let i = 0; i < col0.itemCount; i++) {
      if (col0.getItem(i) === null) {
        nullCount++;
      } else {
        valueCount++;
      }
    }
    chunk.dispose();
    chunk = await result.fetchChunk();
  }
  chunk.dispose();
  const doneTime = performance.now();
  return doneTime - startTime;
}

async function measureQueryMultiple(connection: DuckDBConnection, query: string, n: number): Promise<number> {
  // ignore the first run
  await measureQuery(connection, query);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += await measureQuery(connection, query);
  }
  return sum / n;
}

describe('perf', () => {
  it('of validity', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      'SELECT CASE WHEN range % 2 = 0 THEN range ELSE NULL END asdf FROM range(1000000)',
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of bool', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      'select true from range(1000000)',
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of tinyint', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      'select 1::tinyint from range(1000000)',
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of smallint', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      'select 1::smallint from range(1000000)',
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of int', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      'select 1::integer from range(1000000)',
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of bigint', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      'select 1::bigint from range(1000000)',
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of float', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select 1::float from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of double', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select 1::double from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of interval', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select interval 1 minute from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of hugeint', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select 1::hugeint from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of uhugeint', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select 1::uhugeint from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of decimal (2 bytes)', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select 999.9::decimal(4,1) from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of decimal (4 bytes)', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select 99999.9999::decimal(9,4) from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of decimal (8 bytes)', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select 999999999999.999999::decimal(18,6) from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of decimal (16 bytes)', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select 9999999999999999999999999999.9999999999::decimal(38,10) from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of varchar (short)', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select 'abcdefghijkl' from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of varchar (long)', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select 'abcdefghijklmnopqrstuvwx' from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of enum (small)', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    await connection.run(`create type small_enum as enum ('a', 'b')`);
    console.log(await measureQueryMultiple(
      connection,
      `select 'a'::small_enum from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of enum (medium)', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    await connection.run(`create type medium_enum as enum (select 'enum_' || i from range(300) t(i))`);
    console.log(await measureQueryMultiple(
      connection,
      `select 'enum_0'::medium_enum from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  // This runs out of memory!
  xit('of enum (large)', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    await connection.run(`create type large_enum as enum (select 'enum_' || i from range(70000) t(i))`);
    console.log(await measureQueryMultiple(
      connection,
      `select 'enum_0'::large_enum from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of list[int]', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select [1] from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of list[varchar]', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select ['a'] from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of struct[int]', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select {a:1} from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of struct[varchar]', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select {a:'a'} from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of bit (small)', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select '101010'::bit from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of bit (short)', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select bitstring('0101011', 11 * 8) from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of bit (short + 1 = smallest long)', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select bitstring('0101011', 11 * 8 + 1) from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of bit (long)', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select bitstring('0101011', 11 * 8 + 12 * 8) from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
  it('of time_tz', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    console.log(await measureQueryMultiple(
      connection,
      `select '12:34:56-15:59:59'::timetz from range(1000000)`,
      5,
    ));
    connection.dispose();
    instance.dispose();
  });
});
