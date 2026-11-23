/**
 * Small readers for data of unknown shape (JSON bodies, model replies, storage). Each one narrows
 * with a real runtime check, so callers never need a type assertion.
 */

/** A plain object with string keys: not null, not an array. */
export type JsonRecord = Record<string, unknown>;

export const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The value as a record, or an empty one, so `.field` reads are always safe. */
export const asRecord = (value: unknown): JsonRecord => (isRecord(value) ? value : {});

/** A finite number, or null. */
export const finiteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** The item of `list` equal to `value`, or null: a string from a fixed list, checked without a cast. */
export function oneOf<T extends string>(list: readonly T[], value: unknown): T | null {
  return list.find((item) => item === value) ?? null;
}
