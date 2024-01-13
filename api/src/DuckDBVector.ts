import * as ddb from '../..';
import { DuckDBLogicalType } from './DuckDBLogicalType';
import { DuckDBType } from './DuckDBType';
import { DuckDBTypeId } from './DuckDBTypeId';

export abstract class DuckDBVector {
  public static standardSize(): number {
    return ddb.duckdb_vector_size();
  }
  protected readonly vector: ddb.duckdb_vector;
  public readonly itemCount: number;
  private _type: DuckDBType | undefined;
  constructor(vector: ddb.duckdb_vector, itemCount: number, _type?: DuckDBType) {
    this.vector = vector;
    this.itemCount = itemCount;
    this._type = _type;
  }
  public static create(vector: ddb.duckdb_vector, itemCount: number): DuckDBVector {
    const type = DuckDBLogicalType.consumeAsType(ddb.duckdb_vector_get_column_type(vector));
    switch (type.typeId) {
      case DuckDBTypeId.TINYINT:
        return new DuckDBInt8Vector(vector, itemCount, type);
      case DuckDBTypeId.SMALLINT:
        return new DuckDBInt16Vector(vector, itemCount, type);
      case DuckDBTypeId.INTEGER:
      case DuckDBTypeId.DATE:
        return new DuckDBInt32Vector(vector, itemCount, type);
      case DuckDBTypeId.BIGINT:
      case DuckDBTypeId.TIME:
      case DuckDBTypeId.TIMESTAMP:
      case DuckDBTypeId.TIMESTAMP_S:
      case DuckDBTypeId.TIMESTAMP_MS:
      case DuckDBTypeId.TIMESTAMP_NS:
        return new DuckDBInt64Vector(vector, itemCount, type);
      case DuckDBTypeId.UTINYINT:
        return new DuckDBUint8Vector(vector, itemCount, type);
      case DuckDBTypeId.USMALLINT:
        return new DuckDBUint16Vector(vector, itemCount, type);
      case DuckDBTypeId.UINTEGER:
        return new DuckDBUint32Vector(vector, itemCount, type);
      case DuckDBTypeId.UBIGINT:
        return new DuckDBUint64Vector(vector, itemCount);
      case DuckDBTypeId.FLOAT:
        return new DuckDBFloat32Vector(vector, itemCount, type);
      case DuckDBTypeId.DOUBLE:
        return new DuckDBFloat64Vector(vector, itemCount, type);
      case DuckDBTypeId.BOOLEAN: // TODO: sizeof(bool) is not guaranteed to be 1
      case DuckDBTypeId.INTERVAL: // Int32, Int32, Int64
      case DuckDBTypeId.HUGEINT: // Int128
      case DuckDBTypeId.UUID: // Int128
      case DuckDBTypeId.VARCHAR: // string
      case DuckDBTypeId.BLOB: // binary
      case DuckDBTypeId.BIT: // binary
      case DuckDBTypeId.DECIMAL: // variable: Int8, Int16, Int32, Int64
      case DuckDBTypeId.ENUM: // variable: Uint8, Uint16, Uint32, Uint64
        throw new Error('not yet implemented');
      case DuckDBTypeId.LIST:
        return new DuckDBListVector(vector, itemCount, type);
      case DuckDBTypeId.MAP:
        return new DuckDBMapVector(vector, itemCount, type);
      case DuckDBTypeId.STRUCT:
        return new DuckDBStructVector(vector, itemCount, type);
      case DuckDBTypeId.UNION:
        return new DuckDBUnionVector(vector, itemCount, type);
      default:
        throw new Error('Invalid type id');
    }
  }
  public logicalType(): DuckDBLogicalType {
    return DuckDBLogicalType.create(ddb.duckdb_vector_get_column_type(this.vector));
  }
  public type(): DuckDBType {
    if (!this._type) {
      this._type = DuckDBLogicalType.consumeAsType(ddb.duckdb_vector_get_column_type(this.vector));
    }
    return this._type;
  }
  public itemValid(itemIndex: number): boolean {
    // TODO: cache validity?
    const validity = ddb.duckdb_vector_get_validity(this.vector);
    return ddb.duckdb_validity_row_is_valid(validity, itemIndex);
  }
}

export type LeafArrayConstructor =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | BigInt64ArrayConstructor
  | BigUint64ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor
  ;

// For non-nested types
export abstract class DuckDBLeafVector<T extends LeafArrayConstructor> extends DuckDBVector {
  private readonly arrayConstructor: T;
  private _array: T['prototype'] | undefined;
  constructor(vector: ddb.duckdb_vector, itemCount: number, arrayConstructor: T, _type?: DuckDBType) {
    super(vector, itemCount, _type);
    this.arrayConstructor = arrayConstructor;
  }
  protected get array(): T['prototype'] {
    if (!this._array) {
      const pointer = ddb.duckdb_vector_get_data(this.vector);
      const buffer = ddb.copy_buffer(pointer, this.itemCount * this.arrayConstructor.BYTES_PER_ELEMENT);
      if (!buffer) {
        throw new Error('Failed to get buffer');
      }
      this._array = new this.arrayConstructor(buffer);
    }
    return this._array;
  }
}

export class DuckDBInt8Vector extends DuckDBLeafVector<Int8ArrayConstructor> {
  constructor(vector: ddb.duckdb_vector, itemCount: number, _type?: DuckDBType) {
    super(vector, itemCount, Int8Array, _type);
  }
  public getInt8(itemIndex: number): number {
    return this.array[itemIndex];
  }
}

export class DuckDBInt16Vector extends DuckDBLeafVector<Int16ArrayConstructor> {
  constructor(vector: ddb.duckdb_vector, itemCount: number, _type?: DuckDBType) {
    super(vector, itemCount, Int16Array, _type);
  }
  public getInt16(itemIndex: number): number {
    return this.array[itemIndex];
  }
}

export class DuckDBInt32Vector extends DuckDBLeafVector<Int32ArrayConstructor> {
  constructor(vector: ddb.duckdb_vector, itemCount: number, _type?: DuckDBType) {
    super(vector, itemCount, Int32Array, _type);
  }
  public getInt32(itemIndex: number): number {
    return this.array[itemIndex];
  }
}

export class DuckDBInt64Vector extends DuckDBLeafVector<BigInt64ArrayConstructor> {
  constructor(vector: ddb.duckdb_vector, itemCount: number, _type?: DuckDBType) {
    super(vector, itemCount, BigInt64Array, _type);
  }
  public getInt64(itemIndex: number): bigint {
    return this.array[itemIndex];
  }
}

export class DuckDBUint8Vector extends DuckDBLeafVector<Uint8ArrayConstructor> {
  constructor(vector: ddb.duckdb_vector, itemCount: number, _type?: DuckDBType) {
    super(vector, itemCount, Uint8Array, _type);
  }
  public getUint8(itemIndex: number): number {
    return this.array[itemIndex];
  }
}

export class DuckDBUint16Vector extends DuckDBLeafVector<Uint16ArrayConstructor> {
  constructor(vector: ddb.duckdb_vector, itemCount: number, _type?: DuckDBType) {
    super(vector, itemCount, Uint16Array, _type);
  }
  public getUint16(itemIndex: number): number {
    return this.array[itemIndex];
  }
}

export class DuckDBUint32Vector extends DuckDBLeafVector<Uint32ArrayConstructor> {
  constructor(vector: ddb.duckdb_vector, itemCount: number, _type?: DuckDBType) {
    super(vector, itemCount, Uint32Array, _type);
  }
  public getUint32(itemIndex: number): number {
    return this.array[itemIndex];
  }
}

export class DuckDBUint64Vector extends DuckDBLeafVector<BigUint64ArrayConstructor> {
  constructor(vector: ddb.duckdb_vector, itemCount: number, _type?: DuckDBType) {
    super(vector, itemCount, BigUint64Array, _type);
  }
  public getUint64(itemIndex: number): bigint {
    return this.array[itemIndex];
  }
}

export class DuckDBFloat32Vector extends DuckDBLeafVector<Float32ArrayConstructor> {
  constructor(vector: ddb.duckdb_vector, itemCount: number, _type?: DuckDBType) {
    super(vector, itemCount, Float32Array, _type);
  }
  public getFloat32(itemIndex: number): number {
    return this.array[itemIndex];
  }
}

export class DuckDBFloat64Vector extends DuckDBLeafVector<Float64ArrayConstructor> {
  constructor(vector: ddb.duckdb_vector, itemCount: number, _type?: DuckDBType) {
    super(vector, itemCount, Float64Array, _type);
  }
  public getFloat64(itemIndex: number): number {
    return this.array[itemIndex];
  }
}

export class DuckDBListVector extends DuckDBVector {
  // TODO
}

export class DuckDBStructVector extends DuckDBVector {
  // TODO
}

// MAP = LIST(STRUCT(key KEY_TYPE, value VALUE_TYPE))
// TODO: should this contain or extend list vector?
export class DuckDBMapVector extends DuckDBListVector {
  // TODO
}

// TODO: should this contain or extend struct vector?
export class DuckDBUnionVector extends DuckDBStructVector {
  // TODO
}
