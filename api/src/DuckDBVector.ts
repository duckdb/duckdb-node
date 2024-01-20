import * as ddb from '../..';
import { DuckDBLogicalType } from './DuckDBLogicalType';
import {
  DuckDBBigIntType,
  DuckDBDoubleType,
  DuckDBFloatType,
  DuckDBIntegerType,
  DuckDBListType,
  DuckDBSmallIntType,
  DuckDBTinyIntType,
  DuckDBType,
  DuckDBUBigIntType,
  DuckDBUIntegerType,
  DuckDBUSmallIntType,
  DuckDBUTinyIntType,
} from './DuckDBType';
import { DuckDBTypeId } from './DuckDBTypeId';

function vectorData(vector: ddb.duckdb_vector, byteCount: number): Uint8Array {
  const pointer = ddb.duckdb_vector_get_data(vector);
  const buffer = ddb.copy_buffer(pointer, byteCount);
  if (!buffer) {
    throw new Error('Failed to get buffer for vector');
  }
  return buffer;
}

class DuckDBValidity {
  private readonly validity_pointer: ddb.uint64_pointer;
  private readonly offset: number;
  private constructor(validity_pointer: ddb.uint64_pointer, offset: number = 0) {
    this.validity_pointer = validity_pointer;
    this.offset = offset;
  }
  public static fromVector(vector: ddb.duckdb_vector, offset: number = 0): DuckDBValidity {
    const validity_pointer = ddb.duckdb_vector_get_validity(vector);
    return new DuckDBValidity(validity_pointer, offset);
  }
  public itemValid(itemIndex: number): boolean {
    return ddb.duckdb_validity_row_is_valid(this.validity_pointer, itemIndex - this.offset);
  }
  public slice(offset: number): DuckDBValidity {
    return new DuckDBValidity(this.validity_pointer, this.offset + offset);
  }
}

export abstract class DuckDBVector<T> {
  public static standardSize(): number {
    return ddb.duckdb_vector_size();
  }
  public static create(vector: ddb.duckdb_vector, itemCount: number, knownType?: DuckDBType): DuckDBVector<any> {
    const vectorType = knownType ? knownType : DuckDBLogicalType.consumeAsType(ddb.duckdb_vector_get_column_type(vector));
    switch (vectorType.typeId) {
      case DuckDBTypeId.BOOLEAN: // TODO: sizeof(bool) is not guaranteed to be 1
        throw new Error('not yet implemented');
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
        throw new Error('not yet implemented');
      case DuckDBTypeId.DATE:
        throw new Error('not yet implemented');
      case DuckDBTypeId.TIME:
        throw new Error('not yet implemented');
      case DuckDBTypeId.INTERVAL: // Int32, Int32, Int64
        throw new Error('not yet implemented');
      case DuckDBTypeId.HUGEINT: // Int128
        throw new Error('not yet implemented');
      case DuckDBTypeId.VARCHAR: // string
        throw new Error('not yet implemented');
      case DuckDBTypeId.BLOB: // binary
        throw new Error('not yet implemented');
      case DuckDBTypeId.DECIMAL: // variable: Int8, Int16, Int32, Int64
        throw new Error('not yet implemented');
      case DuckDBTypeId.TIMESTAMP_S:
        throw new Error('not yet implemented');
      case DuckDBTypeId.TIMESTAMP_MS:
        throw new Error('not yet implemented');
      case DuckDBTypeId.TIMESTAMP_NS:
        throw new Error('not yet implemented');
      case DuckDBTypeId.ENUM: // variable: Uint8, Uint16, Uint32, Uint64
        throw new Error('not yet implemented');
      case DuckDBTypeId.LIST:
        if (vectorType instanceof DuckDBListType) {
          return DuckDBListVector.fromRawVector(vectorType, vector, itemCount);
        }
        throw new Error('DuckDBType has LIST type id but is not an instance of DuckDBListType');
      case DuckDBTypeId.STRUCT:
        throw new Error('not yet implemented');
      //   return DuckDBStructVector.fromRawVector(vectorType, vector, itemCount);
      case DuckDBTypeId.MAP:
        throw new Error('not yet implemented');
      //   return DuckDBMapVector.fromRawVector(vectorType, vector, itemCount);
      case DuckDBTypeId.UUID: // Int128
        throw new Error('not yet implemented');
      case DuckDBTypeId.UNION:
        throw new Error('not yet implemented');
      //   return DuckDBUnionVector.fromRawVector(vectorType, vector, itemCount);
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
    const validity = DuckDBValidity.fromVector(vector);
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
    const validity = DuckDBValidity.fromVector(vector);
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
    const validity = DuckDBValidity.fromVector(vector);
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
    const validity = DuckDBValidity.fromVector(vector);
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
    const validity = DuckDBValidity.fromVector(vector);
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
    const validity = DuckDBValidity.fromVector(vector);
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
    const validity = DuckDBValidity.fromVector(vector);
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
    const validity = DuckDBValidity.fromVector(vector);
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
    const validity = DuckDBValidity.fromVector(vector);
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
    const validity = DuckDBValidity.fromVector(vector);
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

export class DuckDBListVector extends DuckDBVector<DuckDBVector<any>> {
  private readonly listType: DuckDBListType;
  private readonly entryData: BigUint64Array;
  private readonly validity: DuckDBValidity;
  private readonly childData: DuckDBVector<any>;
  constructor(listType: DuckDBListType, entryData: BigUint64Array, validity: DuckDBValidity, childData: DuckDBVector<any>) {
    super();
    this.listType = listType;
    this.entryData = entryData;
    this.validity = validity;
    this.childData = childData;
  }
  static fromRawVector(listType: DuckDBListType, vector: ddb.duckdb_vector, itemCount: number): DuckDBListVector {
    const data = vectorData(vector, itemCount * BigUint64Array.BYTES_PER_ELEMENT * 2);
    const entryData = new BigUint64Array(data.buffer, data.byteOffset, itemCount * 2);

    const validity = DuckDBValidity.fromVector(vector);

    const child_vector = ddb.duckdb_list_vector_get_child(vector);
    const child_vector_size = ddb.duckdb_list_vector_get_size(vector);
    const childData = DuckDBVector.create(child_vector, child_vector_size, listType.valueType);

    return new DuckDBListVector(listType, entryData, validity, childData);
  }
  public override get type(): DuckDBType {
    return this.listType;
  }
  public override get itemCount(): number {
    return this.entryData.length >> 1;
  }
  public override getItem(itemIndex: number): DuckDBVector<any> | null {
    if (!this.validity.itemValid(itemIndex)) {
      return null;
    }
    const entryDataStartIndex = itemIndex * 2;
    const offset = Number(this.entryData[entryDataStartIndex]);
    const length = Number(this.entryData[entryDataStartIndex + 1]);
    return this.childData.slice(offset, length);
  }
  public override slice(offset: number, length: number): DuckDBVector<DuckDBVector<any>> {
    const entryDataStartIndex = offset * 2;
    return new DuckDBListVector(
      this.listType,
      this.entryData.slice(entryDataStartIndex, entryDataStartIndex + length * 2),
      this.validity.slice(offset),
      this.childData.slice(offset, offset + length),
    );
  }
}

// export class DuckDBStructVector extends DuckDBVector {
//   // TODO
// }

// MAP = LIST(STRUCT(key KEY_TYPE, value VALUE_TYPE))
// TODO: should this contain or extend list vector?
// export class DuckDBMapVector extends DuckDBListVector {
//   // TODO
// }

// TODO: should this contain or extend struct vector?
// export class DuckDBUnionVector extends DuckDBStructVector {
//   // TODO
// }
