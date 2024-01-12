import * as ddb from '../..';

export function throwOnFailure(state: ddb.duckdb_state, message: string, getError?: () => string, dispose?: () => void) {
  if (state !== ddb.duckdb_state.DuckDBSuccess) {
    try {
      throw new Error(getError ? `${message}: ${getError()}` : message);
    } finally {
      if (dispose) {
        dispose();
      }
    }
  }
}
