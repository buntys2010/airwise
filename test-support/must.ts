/**
 * Narrows a value that a test knows is present, and fails with a readable message when it is not.
 * Used instead of the non-null assertion operator (`!`), so a wrong assumption names itself in the failure.
 */
export function must<T>(value: T | null | undefined, what = "value"): T {
  if (value === null || value === undefined) throw new Error(`Expected ${what} to be present`);
  return value;
}
