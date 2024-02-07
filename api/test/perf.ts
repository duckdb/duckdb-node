import { DuckDBBigIntVector, DuckDBInstance } from '../src';

describe('perf', () => {
  it('of validity', async () => {
    const instance = await DuckDBInstance.create();
    const connection = await instance.connect();
    const startTime = performance.now();
    const prepared = await connection.prepare(
      'SELECT CASE WHEN range % 2 = 0 THEN range ELSE NULL END asdf FROM range(1000000)');
    const preparedTime = performance.now();
    const pending = prepared.startStreaming();
    const result = await pending.getResult();
    const resultTime = performance.now();
    let numCount = 0;
    let nullCount = 0;
    let chunk = await result.fetchChunk();
    const firstChunkTime = performance.now();
    while (chunk.rowCount > 0) {
      const col0 = chunk.getColumn(0);
      if (!(col0 instanceof DuckDBBigIntVector)) {
        throw new Error(`wrong type: ${col0.type.typeId}`);
      }
      for (let i = 0; i < col0.itemCount; i++) {
        if (col0.getItem(i) === null) {
          numCount++;
        } else {
          nullCount++;
        }
      }
      chunk.dispose();
      chunk = await result.fetchChunk();
    }
    chunk.dispose();
    const doneTime = performance.now();
    console.log(numCount, nullCount);
    const totalTime = doneTime - startTime;
    const chunkTime = doneTime - resultTime;
    console.log({
      startTime,
      preparedTime,
      resultTime,
      firstChunkTime,
      doneTime,
      totalTime,
      chunkTime,
    });
  });
});
