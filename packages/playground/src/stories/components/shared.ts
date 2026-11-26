import type { SelectOption } from '../../types';

export const noop = () => {};

/** Select options whose labels are the values themselves. */
export const valueOptions = <T extends string | number>(values: readonly T[]): SelectOption[] =>
  values.map((value) => ({ label: String(value), value }));

/** Select options for the keys of a constants object (e.g. `ButtonLooks`), so links carry readable values. */
export const keyOptions = (constants: Record<string, unknown>): SelectOption[] =>
  Object.keys(constants).map((key) => ({ label: key, value: key }));

export const LOREM =
  'Wumpus is a friendly creature who lives in the Discord servers, keeping an eye on every channel and greeting new members as they join.';
