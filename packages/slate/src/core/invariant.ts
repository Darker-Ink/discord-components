import tinyInvariant from 'tiny-invariant';

/** `tiny-invariant` (what the client bundles), typed as an assertion. */
export const invariant: (condition: unknown, message?: string) => asserts condition = tinyInvariant;
