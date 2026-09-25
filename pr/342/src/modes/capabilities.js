/**
 * Mode capabilities.
 *
 * How a cross-module collaborator discovers what a mode can do: by asking the
 * mode, not by naming it (spec 167, FR-006, ADR-017).
 *
 * Capabilities are **duck-typed** — a mode opts in by implementing the methods.
 * There is no roster to keep in sync, no registration call and no inheritance,
 * which matters in a JSDoc-typed codebase with no compilation step: a declared
 * `capabilities` array would be a second source of truth free to drift from the
 * methods it describes.
 *
 * A capability with zero implementors is deleted, not kept for symmetry.
 */

/// <reference path="../types.js" />

/**
 * A mode that owns features surviving a mode switch.
 *
 * Implemented by Analysis, Harmonics and Doppler. Not Pan.
 * @typedef {Object} PersistentFeatureProvider
 * @property {function(): boolean} hasPersistentFeatures - True iff at least one
 *   such feature currently exists. Reads this mode's own state slice.
 * @property {function(): void} renderPersistentFeatures - Draws them into
 *   `instance.ui.cursorGroup`. Called only when `hasPersistentFeatures()` is true,
 *   and safe to call repeatedly.
 */

/**
 * A mode that owns a persistent panel in the unified layout.
 *
 * Implemented by Analysis (the markers table) and Harmonics (the harmonics
 * panel).
 * @typedef {Object} PanelOwner
 * @property {function(): void} refreshPanel - Re-renders the panel from current
 *   state. Idempotent, and safe when the panel is empty or its container absent.
 */

/**
 * A mode that owns a family of pin sets — equally-spaced vertical pins the
 * analyst can select, nudge with the arrow keys, restyle and delete.
 *
 * Implemented by Harmonics and Sidebands, both through `PinSetMode`. The
 * capability is what lets the keyboard/selection layer find "the mode that owns
 * a `harmonicSet`/`sidebandSet`" without naming either of them — it used to
 * read `state.harmonics.harmonicSets` directly and had no way to grow.
 * @typedef {Object} PinSetOwner
 * @property {SelectedFeatureType} selectionType - What `state.selection.selectedType` reads while one of this mode's sets is selected
 * @property {PinSet[]} sets - This mode's sets, live
 * @property {function(string, Partial<PinSet>): void} updateSet - Apply updates to one set by id, re-rendering and notifying
 * @property {function(string): void} removeSet - Delete one set by id
 * @property {function(PinSet, number): Partial<PinSet>} nudgeFreqUpdates - What a horizontal keyboard nudge changes
 */

/**
 * A mode that owns free-standing markers — features placed one at a time, each
 * with its own position and optional label.
 *
 * Implemented by Analysis alone today. It exists for the same reason
 * {@link PinSetOwner} does: the style panel's Delete button has to remove
 * whatever is selected, and "whatever is selected" must not be a switch on mode
 * names in a component (ADR-017).
 * @typedef {Object} MarkerOwner
 * @property {AnalysisMarker[]} markers - This mode's markers, live
 * @property {function(string): void} removeMarker - Delete one marker by id
 * @property {function(string, string|undefined): void} setMarkerLabel - Set or clear one marker's label
 */

/**
 * The mode owning markers, if any.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {MarkerOwner|null} The owning mode, or null
 */
export function findMarkerOwner(instance) {
  const owner = Object.values(instance.modes || {}).find(mode => {
    const candidate = /** @type {Partial<MarkerOwner>} */ (mode)
    return Array.isArray(candidate?.markers)
      && typeof candidate?.removeMarker === 'function'
      && typeof candidate?.setMarkerLabel === 'function'
  })
  return /** @type {MarkerOwner|null} */ (owner || null)
}

/**
 * Whether a mode owns a family of pin sets.
 *
 * Not exported: unlike the other two predicates, every caller wants the *one*
 * owner of a selection type rather than the whole filtered list, so
 * {@link findPinSetOwner} is the seam and this is its implementation detail.
 * @template T
 * @param {T} mode - Mode instance
 * @returns {mode is T & PinSetOwner} True if the mode implements PinSetOwner
 */
function isPinSetOwner(mode) {
  const candidate = /** @type {Partial<PinSetOwner>} */ (mode)
  return typeof candidate?.updateSet === 'function'
      && typeof candidate?.removeSet === 'function'
      && typeof candidate?.nudgeFreqUpdates === 'function'
      && Array.isArray(candidate?.sets)
}

/**
 * The mode owning a given selection type, if any.
 * @param {GramFrame} instance - GramFrame instance
 * @param {string|null} selectionType - A `state.selection.selectedType` value
 * @returns {PinSetOwner|null} The owning mode, or null
 */
export function findPinSetOwner(instance, selectionType) {
  if (!selectionType) {
    return null
  }
  const owner = Object.values(instance.modes || {})
    .filter(isPinSetOwner)
    .find(mode => mode.selectionType === selectionType)
  return owner || null
}

/**
 * Whether a mode provides persistent features.
 *
 * A type guard, not a boolean check: the point of a capability is that the
 * caller may then use the members, and only a guard makes that checkable.
 * @template T
 * @param {T} mode - Mode instance
 * @returns {mode is T & PersistentFeatureProvider} True if the mode implements PersistentFeatureProvider
 */
export function isPersistentFeatureProvider(mode) {
  const candidate = /** @type {Partial<PersistentFeatureProvider>} */ (mode)
  return typeof candidate?.hasPersistentFeatures === 'function'
      && typeof candidate?.renderPersistentFeatures === 'function'
}

/**
 * Whether a mode owns a persistent panel.
 * @template T
 * @param {T} mode - Mode instance
 * @returns {mode is T & PanelOwner} True if the mode implements PanelOwner
 */
export function isPanelOwner(mode) {
  const candidate = /** @type {Partial<PanelOwner>} */ (mode)
  return typeof candidate?.refreshPanel === 'function'
}
