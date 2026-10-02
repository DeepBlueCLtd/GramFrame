/**
 * Reading one config cell as a value (split from `configuration.js`, which
 * owns the *table*: which rows a kind of table needs and where they go).
 *
 * Strict throughout, because a loose reading produces a plausible gram with
 * the wrong axes and nothing on screen to say so (R9-03, BH-20): an empty
 * cell is not 0, `1,5` is not 1 and `10 Hz` is not 10. A rejected value is
 * never replaced by a guess — the caller sees null, and a required row then
 * fails on the page rather than drawing an axis nobody asked for.
 */

/**
 * A parameter row as read from the table: its raw text and where it sat.
 * @typedef {Object} ParameterCell
 * @property {string} text - The value cell's trimmed text
 * @property {number} row - 1-based row number, for the console message
 */

/**
 * Parse a configuration cell's text as a number, strictly.
 *
 * Strict because both loose readings produce a plausible gram with the wrong
 * axes and nothing on screen to say so (R9-03, BH-20). Every marker and every
 * harmonic ratio the analyst then reads is wrong by a factor they cannot see:
 *
 * - An **empty cell** used to fall back to `'0'`, so a missing `time-start`
 *   silently validated as 0 and drew a normal-looking axis.
 * - `parseFloat` stops at the first character it cannot use, so a
 *   European-locale `1,5` became `1` and `10 Hz` became `10`. `Number` consumes
 *   the whole string or nothing.
 *
 * `Number('')` is 0 and `Number(' ')` is 0, so the blank check must come first.
 * `Infinity` and `NaN` are rejected by the finiteness check.
 * @param {string | null | undefined} text - Raw cell text
 * @returns {number | null} The value, or null if the cell does not hold one number
 */
function parseConfigValue(text) {
  if (typeof text !== 'string') {
    return null
  }
  const trimmed = text.trim()
  if (trimmed === '') {
    return null
  }
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

/**
 * Read a numeric parameter, or null when the row is absent or does not hold
 * a single number.
 *
 * A rejected value is never replaced by a guess: the caller sees null, and
 * for a required row the "must be present with valid numeric values" error
 * then reports it on the page instead of drawing an axis nobody asked for.
 * @param {Map<string, ParameterCell>} params - Parameter rows
 * @param {string} name - Parameter name
 * @returns {number|null} The value, or null when absent or non-numeric
 */
export function numberParam(params, name) {
  const cell = params.get(name)
  if (!cell) {
    return null
  }
  const value = parseConfigValue(cell.text)
  if (value === null) {
    console.warn(`GramFrame: Ignoring ${name} in row ${cell.row} — "${cell.text}" is not a single numeric value`)
    return null
  }
  return value
}

/**
 * A parameter that must be one of a fixed set of words, lower-cased.
 * @param {Map<string, ParameterCell>} params - Parameter rows
 * @param {string} name - Parameter name
 * @param {ReadonlyArray<string>} choices - The words allowed
 * @returns {string|null} The chosen word, or null when the row is absent
 * @throws {Error} When the row names something outside the set
 */
export function choiceParam(params, name, choices) {
  const cell = params.get(name)
  if (!cell) return null
  const value = cell.text.trim().toLowerCase()
  if (!choices.includes(value)) {
    throw new Error(`Invalid ${name}: "${cell.text}" — must be one of ${choices.join(', ')}`)
  }
  return value
}

/**
 * A parameter that must be a number above zero.
 * @param {Map<string, ParameterCell>} params - Parameter rows
 * @param {string} name - Parameter name
 * @param {string} unit - What the number counts, for the message
 * @returns {number|null} The number, or null when the row is absent
 * @throws {Error} When the row is not a positive number
 */
export function positiveParam(params, name, unit) {
  const value = numberParam(params, name)
  if (value !== null && !(value > 0)) {
    throw new Error(`Invalid ${name}: ${value} — must be a number of ${unit} above zero`)
  }
  return value
}
