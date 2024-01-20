import * as ddb from '../..';
import { DuckDBLogicalType } from './DuckDBLogicalType';
import { DuckDBListType, DuckDBSmallIntType, DuckDBTinyIntType, DuckDBType } from './DuckDBType';
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
      case DuckDBTypeId.TINYINT:
        return DuckDBTinyIntVector.fromRawVector(vector, itemCount);
      // case DuckDBTypeId.SMALLINT:
      //   return new DuckDBInt16Vector(vector, itemCount, itemOffset, type);
      // case DuckDBTypeId.INTEGER:
      // case DuckDBTypeId.DATE:
      //   return new DuckDBInt32Vector(vector, itemCount, type);
      // case DuckDBTypeId.BIGINT:
      // case DuckDBTypeId.TIME:
      // case DuckDBTypeId.TIMESTAMP:
      // case DuckDBTypeId.TIMESTAMP_S:
      // case DuckDBTypeId.TIMESTAMP_MS:
      // case DuckDBTypeId.TIMESTAMP_NS:
      //   return new DuckDBInt64Vector(vector, itemCount, type);
      // case DuckDBTypeId.UTINYINT:
      //   return new DuckDBUint8Vector(vector, itemCount, type);
      // case DuckDBTypeId.USMALLINT:
      //   return new DuckDBUint16Vector(vector, itemCount, type);
      // case DuckDBTypeId.UINTEGER:
      //   return new DuckDBUint32Vector(vector, itemCount, type);
      // case DuckDBTypeId.UBIGINT:
      //   return new DuckDBUint64Vector(vector, itemCount, type);
      // case DuckDBTypeId.FLOAT:
      //   return new DuckDBFloat32Vector(vector, itemCount, type);
      // case DuckDBTypeId.DOUBLE:
      //   return new DuckDBFloat64Vector(vector, itemCount, type);
      // case DuckDBTypeId.BOOLEAN: // TODO: sizeof(bool) is not guaranteed to be 1
      // case DuckDBTypeId.INTERVAL: // Int32, Int32, Int64
      // case DuckDBTypeId.HUGEINT: // Int128
      // case DuckDBTypeId.UUID: // Int128
      // case DuckDBTypeId.VARCHAR: // string
      // case DuckDBTypeId.BLOB: // binary
      // case DuckDBTypeId.BIT: // binary
      // case DuckDBTypeId.DECIMAL: // variable: Int8, Int16, Int32, Int64
      // case DuckDBTypeId.ENUM: // variable: Uint8, Uint16, Uint32, Uint64
      //   throw new Error('not yet implemented');
      case DuckDBTypeId.LIST:
        if (vectorType instanceof DuckDBListType) {
          return DuckDBListVector.fromRawVector(vectorType, vector, itemCount);
        }
        throw new Error('DuckDBType has LIST type id but is not an instance of DuckDBListType');
      // case DuckDBTypeId.MAP:
      //   return new DuckDBMapVector(vector, itemCount, type);
      // case DuckDBTypeId.STRUCT:
      //   return new DuckDBStructVector(vector, itemCount, type);
      // case DuckDBTypeId.UNION:
      //   return new DuckDBUnionVector(vector, itemCount, type);
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
  public override get type(): DuckDBType {
    return DuckDBTinyIntType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): number | null {
    return this.validity.itemValid(itemIndex) ? this.items[itemIndex] : null;
  }
  public override slice(offset: number, length: number): DuckDBVector<number> {
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
  public override get type(): DuckDBType {
    return DuckDBSmallIntType.instance;
  }
  public override get itemCount(): number {
    return this.items.length;
  }
  public override getItem(itemIndex: number): number | null {
    return this.validity.itemValid(itemIndex) ? this.items[itemIndex] : null;
  }
  public override slice(offset: number, length: number): DuckDBVector<number> {
    return new DuckDBSmallIntVector(this.items.slice(offset, offset + length), this.validity.slice(offset));
  }
}

// export class DuckDBInt16Vector extends DuckDBVector<Int16ArrayConstructor> {
//   protected override get arrayConstructor() { return Int16Array; }
//   public getInt16(itemIndex: number): number | null {
//     return this.itemValid(itemIndex) ? this.array[itemIndex] : null;
//   }
// }

// export class DuckDBInt32Vector extends DuckDBVector<Int32ArrayConstructor> {
//   protected override get arrayConstructor() { return Int32Array; }
//   public getInt32(itemIndex: number): number | null {
//     return this.itemValid(itemIndex) ? this.array[itemIndex] : null;
//   }
// }

// export class DuckDBInt64Vector extends DuckDBVector<BigInt64ArrayConstructor> {
//   protected override get arrayConstructor() { return BigInt64Array; }
//   public getInt64(itemIndex: number): bigint | null {
//     return this.itemValid(itemIndex) ? this.array[itemIndex] : null;
//   }
// }

// export class DuckDBUint8Vector extends DuckDBVector<Uint8ArrayConstructor> {
//   protected override get arrayConstructor() { return Uint8Array; }
//   public getUint8(itemIndex: number): number | null {
//     return this.itemValid(itemIndex) ? this.array[itemIndex] : null;
//   }
// }

// export class DuckDBUint16Vector extends DuckDBVector<Uint16ArrayConstructor> {
//   protected override get arrayConstructor() { return Uint16Array; }
//   public getUint16(itemIndex: number): number | null {
//     return this.itemValid(itemIndex) ? this.array[itemIndex] : null;
//   }
// }

// export class DuckDBUint32Vector extends DuckDBVector<Uint32ArrayConstructor> {
//   protected override get arrayConstructor() { return Uint32Array; }
//   public getUint32(itemIndex: number): number | null {
//     return this.itemValid(itemIndex) ? this.array[itemIndex] : null;
//   }
// }

// export class DuckDBUint64Vector extends DuckDBVector<BigUint64ArrayConstructor> {
//   protected override get arrayConstructor() { return BigUint64Array; }
//   public getUint64(itemIndex: number): bigint | null {
//     return this.itemValid(itemIndex) ? this.array[itemIndex] : null;
//   }
// }

// export class DuckDBFloat32Vector extends DuckDBVector<Float32ArrayConstructor> {
//   protected override get arrayConstructor() { return Float32Array; }
//   public getFloat32(itemIndex: number): number | null {
//     return this.itemValid(itemIndex) ? this.array[itemIndex] : null;
//   }
// }

// export class DuckDBFloat64Vector extends DuckDBVector<Float64ArrayConstructor> {
//   protected override get arrayConstructor() { return Float64Array; }
//   public getFloat64(itemIndex: number): number | null {
//     return this.itemValid(itemIndex) ? this.array[itemIndex] : null;
//   }
// }

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
