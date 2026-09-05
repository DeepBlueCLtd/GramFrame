/**
 * The mode roster: the one list of which modes exist and what each is called.
 *
 * It used to be written out by hand in three places — the button order in
 * `ModeButtons.js`, the display-name map in `utils/calculations.js`, and
 * `ModeFactory.getAvailableModes()` — plus twice more inside `ModeFactory`
 * itself (the `createMode` switch and its error message). CLAUDE.md and ADR-017
 * promise that adding a mode touches `src/modes/` and `ModeFactory`; landing
 * Sidebands (#241) required editing a component and a utility module too, which
 * is exactly what R9-12 predicted and then observed.
 *
 * Deliberately a leaf module with no imports at all. The obvious alternative —
 * putting this on `ModeFactory` — would make `LEDDisplay.js` import
 * `ModeFactory`, which imports `DopplerMode`, which imports `LEDDisplay`: an
 * import cycle, and the hygiene ratchet holds those at zero.
 */

/// <reference path="../types.js" />

/**
 * One mode's entry in the roster.
 * @typedef {Object} ModeRosterEntry
 * @property {ModeType} name - The internal mode name, used in state and the DOM
 * @property {string} displayName - What the analyst sees on the button and the LED
 * @property {string} [icon] - Name of the glyph the button shows in place of the
 *   word (see `components/icons.js`). The display name is still the mode's
 *   accessible name and is still what the Mode readout says.
 */

/**
 * Every mode, in the order its button appears.
 *
 * Pan is first because it is the default: a first click never places anything.
 *
 * Not exported: the two derived views below are what callers need, and a third
 * export nothing imports would sit in the unused-export ratchet.
 * @type {ModeRosterEntry[]}
 */
const MODE_ROSTER = [
  // Pan alone takes a glyph, because Pan's row alone is crowded: it is the only
  // mode carrying command buttons (zoom out, zoom in, fit), and four controls
  // do not fit across the column with a word among them (issue #310).
  { name: 'pan', displayName: 'Pan', icon: 'hand' },
  // "Cross Cursor" on screen, `analysis` in the code and in stored records.
  // The two names have coexisted since before this review; renaming the button
  // is issue #271, not this one.
  { name: 'analysis', displayName: 'Cross Cursor' },
  { name: 'harmonics', displayName: 'Harmonics' },
  { name: 'sideband', displayName: 'Sidebands' },
  { name: 'doppler', displayName: 'Doppler' }
]

/**
 * Every mode name, in roster order.
 * @type {ModeType[]}
 */
export const MODE_NAMES = MODE_ROSTER.map(entry => entry.name)

/**
 * The label a mode shows to the analyst.
 * @param {string} mode - Internal mode name
 * @returns {string} Display name, or the capitalised mode name if unknown
 */
export function getModeDisplayName(mode) {
  const entry = MODE_ROSTER.find(candidate => candidate.name === mode)
  if (entry) {
    return entry.displayName
  }
  return typeof mode === 'string' && mode.length > 0
    ? mode.charAt(0).toUpperCase() + mode.slice(1)
    : String(mode)
}

/**
 * The glyph a mode's button shows instead of its word, if it has one.
 *
 * Deliberately separate from {@link getModeDisplayName}: the word is still the
 * mode's name everywhere it is spoken or read out — the accessible name of the
 * button, and the Mode readout — and only the button's own face changes.
 * @param {string} mode - Internal mode name
 * @returns {string|undefined} Icon name, or undefined for a mode shown as a word
 */
export function getModeIcon(mode) {
  return MODE_ROSTER.find(candidate => candidate.name === mode)?.icon
}
