/**
 * Narrow a value the checker treats as nullable but the test knows is present.
 *
 * `expect(x).toBeDefined()` satisfies a reader but not the type checker, which
 * still sees `T | null` on the next line. This asserts and narrows in one step,
 * so a test that brings `tests/` into the type gate (R9-10) does not have to
 * choose between a real check and a silencing cast.
 * @template T
 * @param {T | null | undefined} value - The value under test
 * @param {string} what - What was expected, for the failure message
 * @returns {T} The value, narrowed
 */
export function present(value, what) {
  if (value === null || value === undefined) {
    throw new Error(`Expected ${what} to be present, got ${value}`)
  }
  return value
}
