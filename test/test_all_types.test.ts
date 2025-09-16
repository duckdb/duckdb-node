import { expect } from "chai";
import duckdb, { DuckDbError, TableData } from "..";

function get_all_types(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const conn = new duckdb.Database(":memory:");
    conn.all(
      "describe select * EXCLUDE(fixed_int_array, fixed_varchar_array, fixed_nested_int_array, fixed_nested_varchar_array, fixed_struct_array, struct_of_fixed_array, fixed_array_of_int_list, list_of_fixed_int_array, bignum) from test_all_types()",
      (error: DuckDbError | null, data: TableData) => {
        if (error) reject(error);
        resolve(data.map((row) => row.column_name));
      }
    );
  });
}

function timedelta(obj: { days: number; micros: number; months: number }) {
  return obj;
}

// We replace these values since the extreme ranges are not supported in native-node.
const replacement_values: Record<string, string> = {
  timestamp:
    "'1990-01-01 00:00:00'::TIMESTAMP, '9999-12-31 23:59:59'::TIMESTAMP, NULL::TIMESTAMP",
  timestamp_s:
    "'1990-01-01 00:00:00'::TIMESTAMP_S, '9999-12-31 23:59:59'::TIMESTAMP_S, NULL::TIMESTAMP_S",
  // note: timestamp_ns does not support extreme values
  timestamp_ns: "'1990-01-01 00:00:00'::TIMESTAMP_NS,  NULL::TIMESTAMP_NS",
  timestamp_ms:
    "'1990-01-01 00:00:00'::TIMESTAMP_MS,  '9999-12-31 23:59:59'::TIMESTAMP_MS, NULL::TIMESTAMP_MS",
  timestamp_tz:
    "'1990-01-01 00:00:00Z'::TIMESTAMPTZ, '9999-12-31 23:59:59.999999Z'::TIMESTAMPTZ, NULL::TIMESTAMPTZ",
  date: "'1990-01-01'::DATE, '9999-12-31'::DATE, NULL::DATE",
  date_array:
    "[], ['1970-01-01'::DATE, NULL, '0001-01-01'::DATE, '9999-12-31'::DATE,], [NULL::DATE,]",
  timestamp_array:
    "[], ['1970-01-01'::TIMESTAMP, NULL, '0001-01-01'::TIMESTAMP, '9999-12-31 23:59:59.999999'::TIMESTAMP,], [NULL::TIMESTAMP,]",
  timestamptz_array:
    "[], ['1970-01-01 00:00:00Z'::TIMESTAMPTZ, NULL, '0001-01-01 00:00:00Z'::TIMESTAMPTZ, '9999-12-31 23:59:59.999999Z'::TIMESTAMPTZ,], [NULL::TIMESTAMPTZ,]",
};

const correct_answer_map: Record<string, any[]> = {
  bool: [false, true, null],

  tinyint: [-128, 127, null],
  smallint: [-32768, 32767, null],

  int: [-2147483648, 2147483647, null],
  bigint: [BigInt("-9223372036854775808"), BigInt("9223372036854775807"), null],

  uhugeint: [
    BigInt("0"),
    BigInt("340282366920938463463374607431768211455"),
    null,
  ],
  hugeint: [
    BigInt("-170141183460469231731687303715884105728"),
    BigInt("170141183460469231731687303715884105727"),
    null,
  ],

  utinyint: [0, 255, null],
  usmallint: [0, 65535, null],

  uint: [0, 4294967295, null],
  ubigint: [BigInt(0), BigInt("18446744073709551615"), null],

  time: ["00:00:00", "24:00:00", null],

  float: [-3.4028234663852886e38, 3.4028234663852886e38, null],
  double: [-1.7976931348623157e308, 1.7976931348623157e308, null],

  dec_4_1: [-999.9, 999.9, null],
  dec_9_4: [-99999.9999, 99999.9999, null],
  dec_18_6: ["-999999999999.999999", "999999999999.999999", null],
  dec38_10: [
    "-9999999999999999999999999999.9999999999",
    "9999999999999999999999999999.9999999999",
    null,
  ],
  uuid: [
    "00000000-0000-0000-0000-000000000000",
    "ffffffff-ffff-ffff-ffff-ffffffffffff",
    null,
  ],
  varchar: ["🦆🦆🦆🦆🦆🦆", "goo\0se", null],
  json: ["🦆🦆🦆🦆🦆🦆", "goose", null],
  blob: [
    Buffer.from("thisisalongblob\x00withnullbytes"),
    Buffer.from("\x00\x00\x00a"),
    null,
  ],
  bit: ["0010001001011100010101011010111", "10101", null],
  small_enum: ["DUCK_DUCK_ENUM", "GOOSE", null],
  medium_enum: ["enum_0", "enum_299", null],
  large_enum: ["enum_0", "enum_69999", null],
  date_array: [
    [],
    [
      new Date(Date.UTC(1970, 0, 1)),
      null,
      new Date("0001-01-01T00:00:00.000Z"),
      new Date("9999-12-31T00:00:00.000Z"),
    ],
    [null],
  ],
  timestamp_array: [
    [],
    [
      new Date(Date.UTC(1970, 0, 1)),
      null,
      new Date("0001-01-01T00:00:00.000Z"),
      new Date("9999-12-31T23:59:59.999Z"),
    ],
    [null],
  ],

  timestamptz_array: [
    [],
    [
      new Date(Date.UTC(1970, 0, 1)),
      null,
      new Date("0001-01-01T00:00:00.000Z"),
      new Date("9999-12-31T23:59:59.999Z"),
    ],
    [null],
  ],

  int_array: [[], [42, 999, null, null, -42], null],
  varchar_array: [[], ["🦆🦆🦆🦆🦆🦆", "goose", null, ""], null],

  double_array: [
    [],
    [
      42.0,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      null,
      -42.0,
    ],
    null,
  ],

  nested_int_array: [
    [],
    [[], [42, 999, null, null, -42], null, [], [42, 999, null, null, -42]],
    null,
  ],
  struct: [{ a: null, b: null }, { a: 42, b: "🦆🦆🦆🦆🦆🦆" }, null],

  struct_of_arrays: [
    { a: null, b: null },
    {
      a: [42, 999, null, null, -42],
      b: ["🦆🦆🦆🦆🦆🦆", "goose", null, ""],
    },
    null,
  ],

  array_of_structs: [
    [],
    [{ a: null, b: null }, { a: 42, b: "🦆🦆🦆🦆🦆🦆" }, null],
    null,
  ],
  map: ["{}", "{key1=🦆🦆🦆🦆🦆🦆, key2=goose}", null],
  union: ["Frank", "5", null],

  time_tz: ["00:00:00+15:59:59", "24:00:00-15:59:59", null],
  interval: [
    timedelta({
      days: 0,
      months: 0,
      micros: 0,
    }),
    timedelta({ days: 999, months: 999, micros: 999999999 }),
    null,
  ],

  timestamp: [
    new Date(Date.UTC(1990, 0, 1)),
    new Date("9999-12-31T23:59:59.000Z"),
    null,
  ],
  date: [new Date("1990-01-01"), new Date("9999-12-31"), null],
  timestamp_s: [
    new Date(Date.UTC(1990, 0, 1)),
    new Date("9999-12-31T23:59:59.000Z"),
    null,
  ],
  timestamp_ns: [new Date(Date.UTC(1990, 0, 1)), null],
  timestamp_ms: [
    new Date(Date.UTC(1990, 0, 1)),
    new Date("9999-12-31T23:59:59.000Z"),
    null,
  ],
  timestamp_tz: [
    new Date("1990-01-01T00:00:00.000Z"),
    new Date("9999-12-31T23:59:59.999Z"),
    null,
  ],
};

const suite = describe("test_all_types", () => {
  before(async function () {
    const all_types = await get_all_types();

    for (const cur_type of all_types) {
      // FIXME: these currently have too high a precision to be tested
      if (["dec_18_6", "dec38_10"].includes(cur_type)) continue;

      suite.addTest(
        it(cur_type, async () => {
          const conn = new duckdb.Database(":memory:");

          let query: string;
          if (cur_type in replacement_values) {
            query = `select UNNEST([${replacement_values[cur_type]}]) AS ${cur_type}`;
          } else {
            query = `select "${cur_type}" from test_all_types()`;
          }

          let result = await new Promise<any[]>((resolve, reject) =>
            conn.all(query, (err: DuckDbError | null, data: TableData) =>
              err ? reject(err) : resolve(data)
            )
          );

          result = result.map((row) => row[cur_type]); // pluck values

          const correct_result = correct_answer_map[cur_type];

          expect(result).deep.eq(correct_result);
        })
      );
    }
  });

  it("dummy", () => {});
});
