import os from 'os';
import * as ddb from '../..';
import { DuckDBLogicalType } from './DuckDBLogicalType';
import {
  DuckDBBigIntType,
  DuckDBBlobType,
  DuckDBBooleanType,
  DuckDBDateType,
  DuckDBDoubleType,
  DuckDBFloatType,
  DuckDBHugeIntType,
  DuckDBIntegerType,
  DuckDBListType,
  DuckDBMapType,
  DuckDBSmallIntType,
  DuckDBStructEntryType,
  DuckDBStructType,
  DuckDBTimeType,
  DuckDBTimestampMillisecondsType,
  DuckDBTimestampNanosecondsType,
  DuckDBTimestampSecondsType,
  DuckDBTimestampType,
  DuckDBTinyIntType,
  DuckDBType,
  DuckDBUBigIntType,
  DuckDBUIntegerType,
  DuckDBUSmallIntType,
  DuckDBUTinyIntType,
  DuckDBUUIDType,
  DuckDBUnionType,
  DuckDBVarCharType,
} from './DuckDBType';
import { DuckDBTypeId } from './DuckDBTypeId';

const littleEndian = os.endianness() === 'LE';

function getInt128(dataView: DataView, offset: number): bigint {
  const lower = dataView.getBigUint64(offset, littleEndian);
  const upper = dataView.getBigInt64(offset + 8, littleEndian);
  return (upper << BigInt(64)) + lower;
}

function getUInt128(dataView: DataView, offset: number): bigint {
  const lower = dataView.getBigUint64(offset, littleEndian);
  const upper = dataView.getBigUint64(offset + 8, littleEndian);
  return BigInt.asUintN(64, upper) << BigInt(64) | BigInt.asUintN(64, lower);
}

const textDecoder = new TextDecoder();

function vectorData(vector: ddb.duckdb_vector, byteCount: number): Uint8Array {
  const pointer = ddb.duckdb_vector_get_data(vector);
  const buffer = ddb.copy_buffer(pointer, byteCount);
  if (!buffer) {
    throw new Error('Failed to get buffer for vector');
  }
  return buffer;
}

// This version of DuckDBValidity is almost 10x slower.
// class DuckDBValidity {
//   private readonly validity_pointer: ddb.uint64_pointer;
//   private readonly offset: number;
//   private constructor(validity_pointer: ddb.uint64_pointer, offset: number = 0) {
//     this.validity_pointer = validity_pointer;
//     this.offset = offset;
//   }
//   public static fromVector(vector: ddb.duckdb_vector, itemCount: number, offset: number = 0): DuckDBValidity {
//     const validity_pointer = ddb.duckdb_vector_get_validity(vector);
//     return new DuckDBValidity(validity_pointer, offset);
//   }
//   public itemValid(itemIndex: number): boolean {
//     return ddb.duckdb_validity_row_is_valid(this.validity_pointer, this.offset + itemIndex);
//   }
//   public slice(offset: number): DuckDBValidity {
//     return new DuckDBValidity(this.validity_pointer, this.offset + offset);
//   }
// }

class DuckDBValidity {
  private readonly data: BigUint64Array | null;
  private readonly offset: number;
  private constructor(data: BigUint64Array | null, offset: number) {
    this.data = data;
    this.offset = offset;
  }
  public static fromVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBValidity {
    const validity_pointer = ddb.duckdb_vector_get_validity(vector);
    const bigintCount = Math.ceil(itemCount / 64);
    const bytes = ddb.copy_buffer(validity_pointer, bigintCount * 8);
    const bigints = bytes ? new BigUint64Array(bytes.buffer, bytes.byteOffset, bigintCount) : null;
    return new DuckDBValidity(bigints, 0);
  }
  public itemValid(itemIndex: number): boolean {
    if (!this.data) {
      return true;
    }
    const bit = this.offset + itemIndex;
    return (this.data[Math.floor(bit / 64)] & (BigInt(1) << BigInt(bit % 64))) !== BigInt(0);
  }
  public slice(offset: number): DuckDBValidity {
    return new DuckDBValidity(this.data, this.offset + offset);
  }
}

export abstract class DuckDBVector<T> {
  public static standardSize(): number {
    return ddb.duckdb_vector_size();
  }
  public static create(vector: ddb.duckdb_vector, itemCount: number, knownType?: DuckDBType): DuckDBVector<any> {
    const vectorType = knownType ? knownType : DuckDBLogicalType.consumeAsType(ddb.duckdb_vector_get_column_type(vector));
    switch (vectorType.typeId) {
      case DuckDBTypeId.BOOLEAN:
        return DuckDBBooleanVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.TINYINT:
        return DuckDBTinyIntVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.SMALLINT:
        return DuckDBSmallIntVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.INTEGER:
        return DuckDBIntegerVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.BIGINT:
        return DuckDBBigIntVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.UTINYINT:
        return DuckDBUTinyIntVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.USMALLINT:
        return DuckDBUSmallIntVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.UINTEGER:
        return DuckDBUIntegerVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.UBIGINT:
        return DuckDBUBigIntVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.FLOAT:
        return DuckDBFloatVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.DOUBLE:
        return DuckDBDoubleVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.TIMESTAMP:
        return DuckDBTimestampVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.DATE:
        return DuckDBDateVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.TIME:
        return DuckDBTimeVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.INTERVAL: // Int32, Int32, Int64
        throw new Error('not yet implemented');
      case DuckDBTypeId.HUGEINT:
        return DuckDBHugeIntVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.VARCHAR:
        return DuckDBVarCharVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.BLOB:
        return DuckDBBlobVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.DECIMAL: // variable: Int8, Int16, Int32, Int64
        throw new Error('not yet implemented');
      case DuckDBTypeId.TIMESTAMP_S:
        return DuckDBTimestampSecondsVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.TIMESTAMP_MS:
        return DuckDBTimestampMillisecondsVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.TIMESTAMP_NS:
        return DuckDBTimestampNanosecondsVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.ENUM: // variable: Uint8, Uint16, Uint32, Uint64
        throw new Error('not yet implemented');
      case DuckDBTypeId.LIST:
        if (vectorType instanceof DuckDBListType) {
          return DuckDBListVector.fromRawVector(vectorType, vector, itemCount);
        }
        throw new Error('DuckDBType has LIST type id but is not an instance of DuckDBListType');
      case DuckDBTypeId.STRUCT:
        if (vectorType instanceof DuckDBStructType) {
          return DuckDBStructVector.fromRawVector(vectorType, vector, itemCount);
        }
        throw new Error('DuckDBType has STRUCT type id but is not an instance of DuckDBStructType');
      case DuckDBTypeId.MAP:
        if (vectorType instanceof DuckDBMapType) {
          return DuckDBMapVector.fromRawVector(vectorType, vector, itemCount);
        }
        throw new Error('DuckDBType has MAP type id but is not an instance of DuckDBMapType');
      case DuckDBTypeId.UUID:
        return DuckDBUUIDVector.fromRawVector(vector, itemCount);
      case DuckDBTypeId.UNION:
        if (vectorType instanceof DuckDBUnionType) {
          return DuckDBUnionVector.fromRawVector(vectorType, vector, itemCount);
        }
        throw new Error('DuckDBType has UNION type id but is not an instance of DuckDBUnionType');
      case DuckDBTypeId.BIT: // binary
        throw new Error('not yet implemented');
      default:
        throw new Error('Invalid type id');
    }
  }
  public abstract get type(): DuckDBType;
  public abstract get itemCount(): number;
  public abstract getItem(itemIndex: number): T | null;
  public abstract slice(offset: number, length: number): DuckDBVector<T>;
}

export class DuckDBBooleanVector extends DuckDBVector<boolean> {
  private readonly items: readonly (boolean | null)[];
  constructor(items: readonly (boolean | null)[]) {
    super();
    this.items = items
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBBooleanVector {
    const items = ddb.convert_boolean_vector(vector, itemCount);
    return new DuckDBBooleanVector(items);
  }
  public override get type(): DuckDBBooleanType {
    return DuckDBBooleanType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): boolean | null {
    return this.items[itemIndex];
  }
  public override slice(offset: number, length: number): DuckDBBooleanVector {
    return new DuckDBBooleanVector(this.items.slice(offset, offset + length));
  }
}

export class DuckDBTinyIntVector extends DuckDBVector<number> {
  private readonly items: Int8Array;
  private readonly validity: DuckDBValidity;
  constructor(items: Int8Array, validity: DuckDBValidity) {
    super();
    this.items = items
    this.validity = validity;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBTinyIntVector {
    const data = vectorData(vector, itemCount * Int8Array.BYTES_PER_ELEMENT);
    const items = new Int8Array(data.buffer, data.byteOffset, itemCount);
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBTinyIntVector(items, validity);
  }
  public override get type(): DuckDBTinyIntType {
    return DuckDBTinyIntType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): number | null {
    return this.validity.itemValid(itemIndex) ? this.items[itemIndex] : null;
  }
  public override slice(offset: number, length: number): DuckDBTinyIntVector {
    return new DuckDBTinyIntVector(this.items.slice(offset, offset + length), this.validity.slice(offset));
  }
}

export class DuckDBSmallIntVector extends DuckDBVector<number> {
  private readonly items: Int16Array;
  private readonly validity: DuckDBValidity;
  constructor(items: Int16Array, validity: DuckDBValidity) {
    super();
    this.items = items;
    this.validity = validity;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBSmallIntVector {
    const data = vectorData(vector, itemCount * Int16Array.BYTES_PER_ELEMENT);
    const items = new Int16Array(data.buffer, data.byteOffset, itemCount);
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBSmallIntVector(items, validity);
  }
  public override get type(): DuckDBSmallIntType {
    return DuckDBSmallIntType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): number | null {
    return this.validity.itemValid(itemIndex) ? this.items[itemIndex] : null;
  }
  public override slice(offset: number, length: number): DuckDBSmallIntVector {
    return new DuckDBSmallIntVector(this.items.slice(offset, offset + length), this.validity.slice(offset));
  }
}

export class DuckDBIntegerVector extends DuckDBVector<number> {
  private readonly items: Int32Array;
  private readonly validity: DuckDBValidity;
  constructor(items: Int32Array, validity: DuckDBValidity) {
    super();
    this.items = items;
    this.validity = validity;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBIntegerVector {
    const data = vectorData(vector, itemCount * Int32Array.BYTES_PER_ELEMENT);
    const items = new Int32Array(data.buffer, data.byteOffset, itemCount);
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBIntegerVector(items, validity);
  }
  public override get type(): DuckDBIntegerType {
    return DuckDBIntegerType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): number | null {
    return this.validity.itemValid(itemIndex) ? this.items[itemIndex] : null;
  }
  public override slice(offset: number, length: number): DuckDBIntegerVector {
    return new DuckDBIntegerVector(this.items.slice(offset, offset + length), this.validity.slice(offset));
  }
}

export class DuckDBBigIntVector extends DuckDBVector<bigint> {
  private readonly items: BigInt64Array;
  private readonly validity: DuckDBValidity;
  constructor(items: BigInt64Array, validity: DuckDBValidity) {
    super();
    this.items = items;
    this.validity = validity;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBBigIntVector {
    const data = vectorData(vector, itemCount * BigInt64Array.BYTES_PER_ELEMENT);
    const items = new BigInt64Array(data.buffer, data.byteOffset, itemCount);
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBBigIntVector(items, validity);
  }
  public override get type(): DuckDBBigIntType {
    return DuckDBBigIntType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): bigint | null {
    return this.validity.itemValid(itemIndex) ? this.items[itemIndex] : null;
  }
  public override slice(offset: number, length: number): DuckDBBigIntVector {
    return new DuckDBBigIntVector(this.items.slice(offset, offset + length), this.validity.slice(offset));
  }
}

export class DuckDBUTinyIntVector extends DuckDBVector<number> {
  private readonly items: Uint8Array;
  private readonly validity: DuckDBValidity;
  constructor(items: Uint8Array, validity: DuckDBValidity) {
    super();
    this.items = items
    this.validity = validity;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBUTinyIntVector {
    const data = vectorData(vector, itemCount * Uint8Array.BYTES_PER_ELEMENT);
    const items = new Uint8Array(data.buffer, data.byteOffset, itemCount);
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBUTinyIntVector(items, validity);
  }
  public override get type(): DuckDBUTinyIntType {
    return DuckDBUTinyIntType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): number | null {
    return this.validity.itemValid(itemIndex) ? this.items[itemIndex] : null;
  }
  public override slice(offset: number, length: number): DuckDBUTinyIntVector {
    return new DuckDBUTinyIntVector(this.items.slice(offset, offset + length), this.validity.slice(offset));
  }
}

export class DuckDBUSmallIntVector extends DuckDBVector<number> {
  private readonly items: Uint16Array;
  private readonly validity: DuckDBValidity;
  constructor(items: Uint16Array, validity: DuckDBValidity) {
    super();
    this.items = items;
    this.validity = validity;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBUSmallIntVector {
    const data = vectorData(vector, itemCount * Uint16Array.BYTES_PER_ELEMENT);
    const items = new Uint16Array(data.buffer, data.byteOffset, itemCount);
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBUSmallIntVector(items, validity);
  }
  public override get type(): DuckDBUSmallIntType {
    return DuckDBUSmallIntType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): number | null {
    return this.validity.itemValid(itemIndex) ? this.items[itemIndex] : null;
  }
  public override slice(offset: number, length: number): DuckDBUSmallIntVector {
    return new DuckDBUSmallIntVector(this.items.slice(offset, offset + length), this.validity.slice(offset));
  }
}

export class DuckDBUIntegerVector extends DuckDBVector<number> {
  private readonly items: Uint32Array;
  private readonly validity: DuckDBValidity;
  constructor(items: Uint32Array, validity: DuckDBValidity) {
    super();
    this.items = items;
    this.validity = validity;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBUIntegerVector {
    const data = vectorData(vector, itemCount * Uint32Array.BYTES_PER_ELEMENT);
    const items = new Uint32Array(data.buffer, data.byteOffset, itemCount);
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBUIntegerVector(items, validity);
  }
  public override get type(): DuckDBUIntegerType {
    return DuckDBUIntegerType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): number | null {
    return this.validity.itemValid(itemIndex) ? this.items[itemIndex] : null;
  }
  public override slice(offset: number, length: number): DuckDBUIntegerVector {
    return new DuckDBUIntegerVector(this.items.slice(offset, offset + length), this.validity.slice(offset));
  }
}

export class DuckDBUBigIntVector extends DuckDBVector<bigint> {
  private readonly items: BigUint64Array;
  private readonly validity: DuckDBValidity;
  constructor(items: BigUint64Array, validity: DuckDBValidity) {
    super();
    this.items = items;
    this.validity = validity;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBUBigIntVector {
    const data = vectorData(vector, itemCount * BigUint64Array.BYTES_PER_ELEMENT);
    const items = new BigUint64Array(data.buffer, data.byteOffset, itemCount);
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBUBigIntVector(items, validity);
  }
  public override get type(): DuckDBUBigIntType {
    return DuckDBUBigIntType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): bigint | null {
    return this.validity.itemValid(itemIndex) ? this.items[itemIndex] : null;
  }
  public override slice(offset: number, length: number): DuckDBUBigIntVector {
    return new DuckDBUBigIntVector(this.items.slice(offset, offset + length), this.validity.slice(offset));
  }
}

export class DuckDBFloatVector extends DuckDBVector<number> {
  private readonly items: Float32Array;
  private readonly validity: DuckDBValidity;
  constructor(items: Float32Array, validity: DuckDBValidity) {
    super();
    this.items = items;
    this.validity = validity;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBFloatVector {
    const data = vectorData(vector, itemCount * Float32Array.BYTES_PER_ELEMENT);
    const items = new Float32Array(data.buffer, data.byteOffset, itemCount);
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBFloatVector(items, validity);
  }
  public override get type(): DuckDBFloatType {
    return DuckDBFloatType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): number | null {
    return this.validity.itemValid(itemIndex) ? this.items[itemIndex] : null;
  }
  public override slice(offset: number, length: number): DuckDBFloatVector {
    return new DuckDBFloatVector(this.items.slice(offset, offset + length), this.validity.slice(offset));
  }
}

export class DuckDBDoubleVector extends DuckDBVector<number> {
  private readonly items: Float64Array;
  private readonly validity: DuckDBValidity;
  constructor(items: Float64Array, validity: DuckDBValidity) {
    super();
    this.items = items;
    this.validity = validity;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBDoubleVector {
    const data = vectorData(vector, itemCount * Float64Array.BYTES_PER_ELEMENT);
    const items = new Float64Array(data.buffer, data.byteOffset, itemCount);
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBDoubleVector(items, validity);
  }
  public override get type(): DuckDBDoubleType {
    return DuckDBDoubleType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): number | null {
    return this.validity.itemValid(itemIndex) ? this.items[itemIndex] : null;
  }
  public override slice(offset: number, length: number): DuckDBDoubleVector {
    return new DuckDBDoubleVector(this.items.slice(offset, offset + length), this.validity.slice(offset));
  }
}

export class DuckDBTimestampVector extends DuckDBVector<bigint> {
  private readonly items: BigInt64Array;
  private readonly validity: DuckDBValidity;
  constructor(items: BigInt64Array, validity: DuckDBValidity) {
    super();
    this.items = items;
    this.validity = validity;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBTimestampVector {
    const data = vectorData(vector, itemCount * BigInt64Array.BYTES_PER_ELEMENT);
    const items = new BigInt64Array(data.buffer, data.byteOffset, itemCount);
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBTimestampVector(items, validity);
  }
  public override get type(): DuckDBTimestampType {
    return DuckDBTimestampType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): bigint | null { // microseconds
    return this.validity.itemValid(itemIndex) ? this.items[itemIndex] : null;
  }
  public override slice(offset: number, length: number): DuckDBTimestampVector {
    return new DuckDBTimestampVector(this.items.slice(offset, offset + length), this.validity.slice(offset));
  }
}

export class DuckDBDateVector extends DuckDBVector<number> {
  private readonly items: Int32Array;
  private readonly validity: DuckDBValidity;
  constructor(items: Int32Array, validity: DuckDBValidity) {
    super();
    this.items = items;
    this.validity = validity;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBDateVector {
    const data = vectorData(vector, itemCount * Int32Array.BYTES_PER_ELEMENT);
    const items = new Int32Array(data.buffer, data.byteOffset, itemCount);
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBDateVector(items, validity);
  }
  public override get type(): DuckDBDateType {
    return DuckDBDateType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): number | null { // days
    return this.validity.itemValid(itemIndex) ? this.items[itemIndex] : null;
  }
  public override slice(offset: number, length: number): DuckDBDateVector {
    return new DuckDBDateVector(this.items.slice(offset, offset + length), this.validity.slice(offset));
  }
}

export class DuckDBTimeVector extends DuckDBVector<bigint> {
  private readonly items: BigInt64Array;
  private readonly validity: DuckDBValidity;
  constructor(items: BigInt64Array, validity: DuckDBValidity) {
    super();
    this.items = items;
    this.validity = validity;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBTimeVector {
    const data = vectorData(vector, itemCount * BigInt64Array.BYTES_PER_ELEMENT);
    const items = new BigInt64Array(data.buffer, data.byteOffset, itemCount);
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBTimeVector(items, validity);
  }
  public override get type(): DuckDBTimeType {
    return DuckDBTimeType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): bigint | null { // microseconds
    return this.validity.itemValid(itemIndex) ? this.items[itemIndex] : null;
  }
  public override slice(offset: number, length: number): DuckDBTimeVector {
    return new DuckDBTimeVector(this.items.slice(offset, offset + length), this.validity.slice(offset));
  }
}

// TODO: INTERVAL

export class DuckDBHugeIntVector extends DuckDBVector<bigint> {
  private readonly dataView: DataView;
  private readonly validity: DuckDBValidity;
  private readonly _itemCount: number;
  constructor(dataView: DataView, validity: DuckDBValidity, itemCount: number) {
    super();
    this.dataView = dataView;
    this.validity = validity;
    this._itemCount = itemCount;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBHugeIntVector {
    const data = vectorData(vector, itemCount * 16);
    const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBHugeIntVector(dataView, validity, itemCount);
  }
  public override get type(): DuckDBHugeIntType {
    return DuckDBHugeIntType.instance;
  }
  public override get itemCount(): number {
    return this._itemCount;
  }
  public override getItem(itemIndex: number): bigint | null {
    return this.validity.itemValid(itemIndex) ? getInt128(this.dataView, itemIndex * 16) : null;
  }
  public override slice(offset: number, length: number): DuckDBHugeIntVector {
    return new DuckDBHugeIntVector(
      new DataView(this.dataView.buffer, offset * 16, length * 16),
      this.validity.slice(offset),
      length,
    );
  }
}

export class DuckDBVarCharVector extends DuckDBVector<string> {
  private readonly items: readonly (string | null)[];
  constructor(items: readonly (string | null)[]) {
    super();
    this.items = items;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBVarCharVector {
    const byteArrays = ddb.convert_string_vector(vector, itemCount);
    const items = byteArrays.map((byteArray) => byteArray ? textDecoder.decode(byteArray) : null);
    return new DuckDBVarCharVector(items);
  }
  public override get type(): DuckDBVarCharType {
    return DuckDBVarCharType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): string | null {
    return this.items[itemIndex];
  }
  public override slice(offset: number, length: number): DuckDBVarCharVector {
    return new DuckDBVarCharVector(this.items.slice(offset, offset + length));
  }
}

export class DuckDBBlobVector extends DuckDBVector<Uint8Array> {
  private readonly items: readonly (Uint8Array | null)[];
  constructor(items: readonly (Uint8Array | null)[]) {
    super();
    this.items = items;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBBlobVector {
    const items = ddb.convert_string_vector(vector, itemCount);
    return new DuckDBBlobVector(items);
  }
  public override get type(): DuckDBBlobType {
    return DuckDBBlobType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): Uint8Array | null {
    return this.items[itemIndex];
  }
  public override slice(offset: number, length: number): DuckDBBlobVector {
    return new DuckDBBlobVector(this.items.slice(offset, offset + length));
  }
}

// TODO: DECIMAL

export class DuckDBTimestampSecondsVector extends DuckDBVector<bigint> {
  private readonly items: BigInt64Array;
  private readonly validity: DuckDBValidity;
  constructor(items: BigInt64Array, validity: DuckDBValidity) {
    super();
    this.items = items;
    this.validity = validity;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBTimestampSecondsVector {
    const data = vectorData(vector, itemCount * BigInt64Array.BYTES_PER_ELEMENT);
    const items = new BigInt64Array(data.buffer, data.byteOffset, itemCount);
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBTimestampSecondsVector(items, validity);
  }
  public override get type(): DuckDBTimestampSecondsType {
    return DuckDBTimestampSecondsType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): bigint | null { // seconds
    return this.validity.itemValid(itemIndex) ? this.items[itemIndex] : null;
  }
  public override slice(offset: number, length: number): DuckDBTimestampSecondsVector {
    return new DuckDBTimestampSecondsVector(this.items.slice(offset, offset + length), this.validity.slice(offset));
  }
}

export class DuckDBTimestampMillisecondsVector extends DuckDBVector<bigint> {
  private readonly items: BigInt64Array;
  private readonly validity: DuckDBValidity;
  constructor(items: BigInt64Array, validity: DuckDBValidity) {
    super();
    this.items = items;
    this.validity = validity;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBTimestampMillisecondsVector {
    const data = vectorData(vector, itemCount * BigInt64Array.BYTES_PER_ELEMENT);
    const items = new BigInt64Array(data.buffer, data.byteOffset, itemCount);
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBTimestampMillisecondsVector(items, validity);
  }
  public override get type(): DuckDBTimestampMillisecondsType {
    return DuckDBTimestampMillisecondsType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): bigint | null { // milliseconds
    return this.validity.itemValid(itemIndex) ? this.items[itemIndex] : null;
  }
  public override slice(offset: number, length: number): DuckDBTimestampMillisecondsVector {
    return new DuckDBTimestampMillisecondsVector(this.items.slice(offset, offset + length), this.validity.slice(offset));
  }
}

export class DuckDBTimestampNanosecondsVector extends DuckDBVector<bigint> {
  private readonly items: BigInt64Array;
  private readonly validity: DuckDBValidity;
  constructor(items: BigInt64Array, validity: DuckDBValidity) {
    super();
    this.items = items;
    this.validity = validity;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBTimestampNanosecondsVector {
    const data = vectorData(vector, itemCount * BigInt64Array.BYTES_PER_ELEMENT);
    const items = new BigInt64Array(data.buffer, data.byteOffset, itemCount);
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBTimestampNanosecondsVector(items, validity);
  }
  public override get type(): DuckDBTimestampNanosecondsType {
    return DuckDBTimestampNanosecondsType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): bigint | null { // nanoseconds
    return this.validity.itemValid(itemIndex) ? this.items[itemIndex] : null;
  }
  public override slice(offset: number, length: number): DuckDBTimestampNanosecondsVector {
    return new DuckDBTimestampNanosecondsVector(this.items.slice(offset, offset + length), this.validity.slice(offset));
  }
}

// TODO: ENUM

export class DuckDBListVector<TValue = any> extends DuckDBVector<DuckDBVector<TValue>> {
  private readonly listType: DuckDBListType;
  private readonly entryData: BigUint64Array;
  private readonly validity: DuckDBValidity;
  private readonly childData: DuckDBVector<TValue>;
  private readonly _itemCount: number;
  constructor(
    listType: DuckDBListType,
    entryData: BigUint64Array,
    validity: DuckDBValidity,
    childData: DuckDBVector<TValue>,
    itemCount: number,
  ) {
    super();
    this.listType = listType;
    this.entryData = entryData;
    this.validity = validity;
    this.childData = childData;
    this._itemCount = itemCount;
  }
  static fromRawVector(listType: DuckDBListType, vector: ddb.duckdb_vector, itemCount: number): DuckDBListVector {
    const data = vectorData(vector, itemCount * BigUint64Array.BYTES_PER_ELEMENT * 2);
    const entryData = new BigUint64Array(data.buffer, data.byteOffset, itemCount * 2);

    const validity = DuckDBValidity.fromVector(vector, itemCount);

    const child_vector = ddb.duckdb_list_vector_get_child(vector);
    const child_vector_size = ddb.duckdb_list_vector_get_size(vector);
    const childData = DuckDBVector.create(child_vector, child_vector_size, listType.valueType);

    return new DuckDBListVector(listType, entryData, validity, childData, itemCount);
  }
  public override get type(): DuckDBListType {
    return this.listType;
  }
  public override get itemCount(): number {
    return this._itemCount;
  }
  public override getItem(itemIndex: number): DuckDBVector<TValue> | null {
    if (!this.validity.itemValid(itemIndex)) {
      return null;
    }
    const entryDataStartIndex = itemIndex * 2;
    const offset = Number(this.entryData[entryDataStartIndex]);
    const length = Number(this.entryData[entryDataStartIndex + 1]);
    return this.childData.slice(offset, length);
  }
  public override slice(offset: number, length: number): DuckDBListVector<TValue> {
    const entryDataStartIndex = offset * 2;
    return new DuckDBListVector<TValue>(
      this.listType,
      this.entryData.slice(entryDataStartIndex, entryDataStartIndex + length * 2),
      this.validity.slice(offset),
      this.childData,
      length,
    );
  }
}

export interface DuckDBStructEntry {
  readonly name: string;
  readonly value: any;
}

export class DuckDBStructVector extends DuckDBVector<readonly DuckDBStructEntry[]> {
  private readonly structType: DuckDBStructType;
  private readonly _itemCount: number;
  private readonly entryVectors: readonly DuckDBVector<any>[];
  private readonly validity: DuckDBValidity;
  constructor(structType: DuckDBStructType, itemCount: number, entryVectors: readonly DuckDBVector<any>[], validity: DuckDBValidity) {
    super();
    this.structType = structType;
    this._itemCount = itemCount;
    this.entryVectors = entryVectors;
    this.validity = validity;
  }
  static fromRawVector(structType: DuckDBStructType, vector: ddb.duckdb_vector, itemCount: number): DuckDBStructVector {
    const entryCount = structType.entries.length;
    const entryVectors: DuckDBVector<any>[] = [];
    for (let i = 0; i < entryCount; i++) {
      const entry = structType.entries[i];
      const child_vector = ddb.duckdb_struct_vector_get_child(vector, i);
      entryVectors.push(DuckDBVector.create(child_vector, itemCount, entry.valueType));
    }
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBStructVector(structType, itemCount, entryVectors, validity);
  }
  public override get type(): DuckDBStructType {
    return this.structType;
  }
  public override get itemCount(): number {
    return this._itemCount;
  }
  public override getItem(itemIndex: number): readonly DuckDBStructEntry[] | null {
    if (!this.validity.itemValid(itemIndex)) {
      return null;
    }
    const entries: DuckDBStructEntry[] = [];
    const entryCount = this.structType.entries.length;
    for (let i = 0; i < entryCount; i++) {
      const entry = this.structType.entries[i];
      const entryVector = this.entryVectors[i];
      entries.push({ name: entry.name, value: entryVector.getItem(itemIndex) });
    }
    return entries;
  }
  public getItemValue(itemIndex: number, entryIndex: number): any | null {
    if (!this.validity.itemValid(itemIndex)) {
      return null;
    }
    const entryVector = this.entryVectors[entryIndex];
    return entryVector.getItem(itemIndex);
  }
  public override slice(offset: number, length: number): DuckDBStructVector {
    return new DuckDBStructVector(
      this.structType,
      length,
      this.entryVectors.map(entryVector => entryVector.slice(offset, length)),
      this.validity.slice(offset),
    );
  }
}

export interface DuckDBMapEntry {
  readonly key: any;
  readonly value: any;
}

// MAP = LIST(STRUCT(key KEY_TYPE, value VALUE_TYPE))
export class DuckDBMapVector extends DuckDBVector<readonly DuckDBMapEntry[]> {
  private readonly mapType: DuckDBMapType;
  private readonly listVector: DuckDBListVector;
  constructor(mapType: DuckDBMapType, listVector: DuckDBListVector) {
    super();
    this.mapType = mapType;
    this.listVector = listVector;
  }
  static fromRawVector(mapType: DuckDBMapType, vector: ddb.duckdb_vector, itemCount: number): DuckDBMapVector {
    const listVectorType = new DuckDBListType(new DuckDBStructType([
      { name: 'key', valueType: mapType.keyType },
      { name: 'value', valueType: mapType.valueType }
    ]));
    return new DuckDBMapVector(mapType, DuckDBListVector.fromRawVector(listVectorType, vector, itemCount));
  }
  public override get type(): DuckDBType {
    return this.mapType;
  }
  public override get itemCount(): number {
    return this.listVector.itemCount;
  }
  public override getItem(itemIndex: number): readonly DuckDBMapEntry[] | null {
    const itemVector = this.listVector.getItem(itemIndex);
    if (!itemVector) {
      return null;
    }
    if (!(itemVector instanceof DuckDBStructVector)) {
      throw new Error('item in map list vector is not a struct');
    }
    const entries: DuckDBMapEntry[] = [];
    const itemEntryCount = itemVector.itemCount;
    for (let i = 0; i < itemEntryCount; i++) {
      const entry = itemVector.getItem(i);
      if (!entry) {
        throw new Error('null entry in map struct');
      }
      const keyEntry = entry[0];
      const valueEntry = entry[1];
      entries.push({ key: keyEntry.value, value: valueEntry.value });
    }
    return entries;
  }
  public override slice(offset: number, length: number): DuckDBMapVector {
    return new DuckDBMapVector(
      this.mapType,
      this.listVector.slice(offset, length),
    );
  }
}

export class DuckDBUUIDVector extends DuckDBVector<bigint> {
  private readonly dataView: DataView;
  private readonly validity: DuckDBValidity;
  private readonly _itemCount: number;
  constructor(dataView: DataView, validity: DuckDBValidity, itemCount: number) {
    super();
    this.dataView = dataView;
    this.validity = validity;
    this._itemCount = itemCount;
  }
  static fromRawVector(vector: ddb.duckdb_vector, itemCount: number): DuckDBUUIDVector {
    const data = vectorData(vector, itemCount * 16);
    const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const validity = DuckDBValidity.fromVector(vector, itemCount);
    return new DuckDBUUIDVector(dataView, validity, itemCount);
  }
  public override get type(): DuckDBUUIDType {
    return DuckDBUUIDType.instance;
  }
  public override get itemCount(): number {
    return this._itemCount;
  }
  public override getItem(itemIndex: number): bigint | null {
    return this.validity.itemValid(itemIndex) ? getInt128(this.dataView, itemIndex * 16) : null;
  }
  public override slice(offset: number, length: number): DuckDBUUIDVector {
    return new DuckDBUUIDVector(
      new DataView(this.dataView.buffer, offset * 16, length * 16),
      this.validity.slice(offset),
      length,
    );
  }
}

export interface DuckDBUnionAlternative {
  readonly tag: string;
  readonly value: any;
}

// UNION = STRUCT with first entry named "tag"
export class DuckDBUnionVector extends DuckDBVector<DuckDBUnionAlternative> {
  private readonly unionType: DuckDBUnionType;
  private readonly structVector: DuckDBStructVector;
  constructor(unionType: DuckDBUnionType, structVector: DuckDBStructVector) {
    super();
    this.unionType = unionType;
    this.structVector = structVector;
  }
  static fromRawVector(unionType: DuckDBUnionType, vector: ddb.duckdb_vector, itemCount: number): DuckDBUnionVector {
    const structEntryTypes: DuckDBStructEntryType[] = [{ name: 'tag', valueType: DuckDBUTinyIntType.instance }];
    for (const alternative of unionType.alternatives) {
      structEntryTypes.push({ name: alternative.tag, valueType: alternative.valueType });
    }
    const structVectorType = new DuckDBStructType(structEntryTypes);
    return new DuckDBUnionVector(unionType, DuckDBStructVector.fromRawVector(structVectorType, vector, itemCount));
  }
  public override get type(): DuckDBUnionType {
    return this.unionType;
  }
  public override get itemCount(): number {
    return this.structVector.itemCount;
  }
  public override getItem(itemIndex: number): DuckDBUnionAlternative | null {
    const tagValue = this.structVector.getItemValue(itemIndex, 0);
    if (tagValue == null) {
      return null;
    }
    const alternativeIndex = Number(tagValue);
    const tag = this.unionType.alternatives[alternativeIndex].tag;
    const entryIndex = alternativeIndex + 1;
    const value = this.structVector.getItemValue(itemIndex, entryIndex);
    return { tag, value };
  }
  public override slice(offset: number, length: number): DuckDBUnionVector {
    return new DuckDBUnionVector(
      this.unionType,
      this.structVector.slice(offset, length),
    );
  }
}

// TODO: BIT
