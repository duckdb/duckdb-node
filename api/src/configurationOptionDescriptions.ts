import * as ddb from '../..';
import { throwOnFailure } from './throwOnFailure';

export function configurationOptionDescriptions(): Readonly<Record<string, string>> {
  const descriptions: Record<string, string> = {};
  const count = ddb.duckdb_config_count();
  for (let i = 0; i < count; i++) {
    const nameWrapper = new ddb.out_string_wrapper;
    const descriptionWrapper = new ddb.out_string_wrapper;
    throwOnFailure(ddb.duckdb_get_config_flag(i, nameWrapper, descriptionWrapper), 'Failed to get config option description');
    const name = ddb.out_get_string(nameWrapper);
    const description = ddb.out_get_string(descriptionWrapper);
    descriptions[name] = description;
  }
  return descriptions;
}
