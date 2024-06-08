import * as ddb from '../..';
import {
  DuckDBArrayType,
  DuckDBBigIntType,
  DuckDBBitType,
  DuckDBBlobType,
  DuckDBBooleanType,
  DuckDBDateType,
  DuckDBDecimalType,
  DuckDBDoubleType,
  DuckDBEnumType,
  DuckDBFloatType,
  DuckDBHugeIntType,
  DuckDBIntegerType,
  DuckDBIntervalType,
  DuckDBListType,
  DuckDBMapType,
  DuckDBSmallIntType,
  DuckDBStructType,
  DuckDBTimeTZType,
  DuckDBTimeType,
  DuckDBTimestampMillisecondsType,
  DuckDBTimestampNanosecondsType,
  DuckDBTimestampSecondsType,
  DuckDBTimestampTZType,
  DuckDBTimestampType,
  DuckDBTinyIntType,
  DuckDBType,
  DuckDBUBigIntType,
  DuckDBUHugeIntType,
  DuckDBUIntegerType,
  DuckDBUSmallIntType,
  DuckDBUTinyIntType,
  DuckDBUUIDType,
  DuckDBUnionType,
  DuckDBVarCharType,
} from './DuckDBType';
import { DuckDBTypeId } from './DuckDBTypeId';

export class DuckDBLogicalType {
  readonly logical_type: ddb.duckdb_logical_type;
  protected constructor(logical_type: ddb.duckdb_logical_type) {
    this.logical_type = logical_type;
  }
  static consumeAsType(logical_type: ddb.duckdb_logical_type): DuckDBType {
    const logicalType = DuckDBLogicalType.create(logical_type);
    const type = logicalType.asType();
    logicalType.dispose();
    return type;
  }
  static create(logical_type: ddb.duckdb_logical_type): DuckDBLogicalType {
    switch (ddb.duckdb_get_type_id(logical_type)) {
      case ddb.duckdb_type.DUCKDB_TYPE_DECIMAL:
        return new DuckDBDecimalLogicalType(logical_type);
      case ddb.duckdb_type.DUCKDB_TYPE_ENUM:
        return new DuckDBEnumLogicalType(logical_type);
      case ddb.duckdb_type.DUCKDB_TYPE_LIST:
        return new DuckDBListLogicalType(logical_type);
      case ddb.duckdb_type.DUCKDB_TYPE_STRUCT:
        return new DuckDBStructLogicalType(logical_type);
      case ddb.duckdb_type.DUCKDB_TYPE_MAP:
        return new DuckDBMapLogicalType(logical_type);
      case ddb.duckdb_type.DUCKDB_TYPE_ARRAY:
        return new DuckDBArrayLogicalType(logical_type);
      case ddb.duckdb_type.DUCKDB_TYPE_UNION:
        return new DuckDBUnionLogicalType(logical_type);
      default:
        return new DuckDBLogicalType(logical_type);
    }
  }
  public static createDecimal(width: number, scale: number): DuckDBDecimalLogicalType {
    return new DuckDBDecimalLogicalType(ddb.duckdb_create_decimal_type(width, scale));
  }
  public static createEnum(values: readonly string[]): DuckDBEnumLogicalType {
    // TODO: missing C API
    throw new Error('not implemented');
  }
  public static createList(valueType: DuckDBLogicalType): DuckDBListLogicalType {
    return new DuckDBListLogicalType(ddb.duckdb_create_list_type(valueType.logical_type));
  }
  public static createStruct(entries: readonly DuckDBLogicalStructEntry[]): DuckDBStructLogicalType {
    // TODO: C API takes raw pointers (lists of names and types)
    throw new Error('not implemented');
  }
  public static createMap(keyType: DuckDBLogicalType, valueType: DuckDBLogicalType): DuckDBMapLogicalType {
    return new DuckDBMapLogicalType(ddb.duckdb_create_map_type(keyType.logical_type, valueType.logical_type));
  }
  public static createArray(valueType: DuckDBLogicalType, length: number): DuckDBArrayLogicalType {
    return new DuckDBArrayLogicalType(ddb.duckdb_create_array_type(valueType.logical_type, length));
  }
  public static createUnion(alternatives: readonly DuckDBLogicalUnionAlternative[]): DuckDBUnionLogicalType {
    // TODO: C API takes raw pointers (lists of tags and types)
    throw new Error('not implemented');
  }
  public dispose() {
    ddb.duckdb_destroy_logical_type(this.logical_type);
  }
  public get typeId(): DuckDBTypeId {
    return ddb.duckdb_get_type_id(this.logical_type) as unknown as DuckDBTypeId;
  }
  public asType(): DuckDBType {
    switch (this.typeId) {
      case DuckDBTypeId.BOOLEAN:
        return DuckDBBooleanType.instance;
      case DuckDBTypeId.TINYINT:
        return DuckDBTinyIntType.instance;
      case DuckDBTypeId.SMALLINT:
        return DuckDBSmallIntType.instance;
      case DuckDBTypeId.INTEGER:
        return DuckDBIntegerType.instance;
      case DuckDBTypeId.BIGINT:
        return DuckDBBigIntType.instance;
      case DuckDBTypeId.UTINYINT:
        return DuckDBUTinyIntType.instance;
      case DuckDBTypeId.USMALLINT:
        return DuckDBUSmallIntType.instance;
      case DuckDBTypeId.UINTEGER:
        return DuckDBUIntegerType.instance;
      case DuckDBTypeId.UBIGINT:
        return DuckDBUBigIntType.instance;
      case DuckDBTypeId.FLOAT:
        return DuckDBFloatType.instance;
      case DuckDBTypeId.DOUBLE:
        return DuckDBDoubleType.instance;
      case DuckDBTypeId.TIMESTAMP:
        return DuckDBTimestampType.instance;
      case DuckDBTypeId.DATE:
        return DuckDBDateType.instance;
      case DuckDBTypeId.TIME:
        return DuckDBTimeType.instance;
      case DuckDBTypeId.INTERVAL:
        return DuckDBIntervalType.instance;
      case DuckDBTypeId.HUGEINT:
        return DuckDBHugeIntType.instance;
      case DuckDBTypeId.UHUGEINT:
        return DuckDBUHugeIntType.instance;
      case DuckDBTypeId.VARCHAR:
        return DuckDBVarCharType.instance;
      case DuckDBTypeId.BLOB:
        return DuckDBBlobType.instance;
      case DuckDBTypeId.DECIMAL:
        throw new Error('Expected override');
      case DuckDBTypeId.TIMESTAMP_S:
        return DuckDBTimestampSecondsType.instance;
      case DuckDBTypeId.TIMESTAMP_MS:
        return DuckDBTimestampMillisecondsType.instance;
      case DuckDBTypeId.TIMESTAMP_NS:
        return DuckDBTimestampNanosecondsType.instance;
      case DuckDBTypeId.ENUM:
        throw new Error('Expected override');
      case DuckDBTypeId.LIST:
        throw new Error('Expected override');
      case DuckDBTypeId.STRUCT:
        throw new Error('Expected override');
      case DuckDBTypeId.MAP:
        throw new Error('Expected override');
      case DuckDBTypeId.UUID:
        return DuckDBUUIDType.instance;
      case DuckDBTypeId.UNION:
        throw new Error('Expected override');
      case DuckDBTypeId.BIT:
        return DuckDBBitType.instance;
      case DuckDBTypeId.TIME_TZ:
        return DuckDBTimeTZType.instance;
      case DuckDBTypeId.TIMESTAMP_TZ:
        return DuckDBTimestampTZType.instance;
      default:
        throw new Error(`Unexpected type id: ${this.typeId}`);
    }
  }
}

export class DuckDBDecimalLogicalType extends DuckDBLogicalType {
  public get width(): number {
    return ddb.duckdb_decimal_width(this.logical_type);
  }
  public get scale(): number {
    return ddb.duckdb_decimal_scale(this.logical_type);
  }
  public get internalTypeId(): DuckDBTypeId {
    return ddb.duckdb_decimal_internal_type(this.logical_type) as unknown as DuckDBTypeId;
  }
  public override asType(): DuckDBDecimalType {
    return new DuckDBDecimalType(this.width, this.scale);
  }
}

export class DuckDBEnumLogicalType extends DuckDBLogicalType {
  public get valueCount(): number {
    return ddb.duckdb_enum_dictionary_size(this.logical_type);
  }
  public value(index: number): string {
    return ddb.duckdb_enum_dictionary_value(this.logical_type, index);
  }
  public values(): readonly string[] {
    const values: string[] = [];
    const count = this.valueCount;
    for (let i = 0; i < count; i++) {
      values.push(this.value(i));
    }
    return values;
  }
  public get internalTypeId(): DuckDBTypeId {
    return ddb.duckdb_enum_internal_type(this.logical_type) as unknown as DuckDBTypeId;
  }
  public override asType(): DuckDBEnumType {
    return new DuckDBEnumType(this.values(), this.internalTypeId);
  }
}

export class DuckDBListLogicalType extends DuckDBLogicalType {
  public get valueType(): DuckDBLogicalType {
    return DuckDBLogicalType.create(ddb.duckdb_list_type_child_type(this.logical_type));
  }
  public override asType(): DuckDBListType {
    return new DuckDBListType(this.valueType.asType());
  }
}

export interface DuckDBLogicalStructEntry {
  readonly name: string;
  readonly valueType: DuckDBLogicalType;
}

export class DuckDBStructLogicalType extends DuckDBLogicalType {
  public get entryCount(): number {
    return ddb.duckdb_struct_type_child_count(this.logical_type);
  }
  public entryName(index: number): string {
    return ddb.duckdb_struct_type_child_name(this.logical_type, index);
  }
  public entryValueType(index: number): DuckDBLogicalType {
    return DuckDBLogicalType.create(ddb.duckdb_struct_type_child_type(this.logical_type, index));
  }
  public entries(): readonly DuckDBLogicalStructEntry[] {
    const entries: DuckDBLogicalStructEntry[] = [];
    const count = this.entryCount;
    for (let i = 0; i < count; i++) {
      const name = this.entryName(i);
      const valueType = this.entryValueType(i);
      entries.push({ name, valueType });
    }
    return entries;
  }
  public override asType(): DuckDBStructType {
    return new DuckDBStructType(this.entries().map(({ name, valueType }) => ({
      name,
      valueType: valueType.asType(),
    })));
  }
}

export class DuckDBMapLogicalType extends DuckDBLogicalType {
  public get keyType(): DuckDBLogicalType {
    return DuckDBLogicalType.create(ddb.duckdb_map_type_key_type(this.logical_type));
  }
  public get valueType(): DuckDBLogicalType {
    return DuckDBLogicalType.create(ddb.duckdb_map_type_value_type(this.logical_type));
  }
  public override asType(): DuckDBMapType {
    return new DuckDBMapType(this.keyType.asType(), this.valueType.asType());
  }
}

export class DuckDBArrayLogicalType extends DuckDBLogicalType {
  public get valueType(): DuckDBLogicalType {
    return DuckDBLogicalType.create(ddb.duckdb_array_type_child_type(this.logical_type));
  }
  public get length(): number {
    return ddb.duckdb_array_type_array_size(this.logical_type);
  }
  public override asType(): DuckDBListType {
    return new DuckDBArrayType(this.valueType.asType(), this.length);
  }
}

export interface DuckDBLogicalUnionAlternative {
  readonly tag: string;
  readonly valueType: DuckDBLogicalType;
}

export class DuckDBUnionLogicalType extends DuckDBLogicalType {
  public get alternativeCount(): number {
    return ddb.duckdb_union_type_member_count(this.logical_type);
  }
  public alternativeTag(index: number): string {
    return ddb.duckdb_union_type_member_name(this.logical_type, index);
  }
  public alternativeValueType(index: number): DuckDBLogicalType {
    return DuckDBLogicalType.create(ddb.duckdb_union_type_member_type(this.logical_type, index));
  }
  public alternatives(): readonly DuckDBLogicalUnionAlternative[] {
    const alternatives: DuckDBLogicalUnionAlternative[] = [];
    const count = this.alternativeCount;
    for (let i = 0; i < count; i++) {
      const tag = this.alternativeTag(i);
      const valueType = this.alternativeValueType(i);
      alternatives.push({ tag, valueType });
    }
    return alternatives;
  }
  public override asType(): DuckDBUnionType {
    return new DuckDBUnionType(this.alternatives().map(({ tag, valueType }) => ({
      tag,
      valueType: valueType.asType(),
    })));
  }
}
