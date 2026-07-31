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
 *   `instance.cursorGroup`. Called only when `hasPersistentFeatures()` is true,
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
