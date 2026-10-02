import { dispatch, markAnnotationsChanged } from './state.js'

/*
 * Its own module rather than a function in `state.js`, because `state.js` sits
 * on its line cap (`hygiene-baseline.json`) and the ratchet's rule is that a
 * module over its cap is a regression to fix, not a number to raise. The split
 * is a fair one either way: this composes `state.js`'s primitives with the
 * feature renderer, it does not own state. Nothing in `state.js` imports back,
 * so no cycle.
 */

/**
 * Commit an annotation mutation: mark it, refresh what shows it, broadcast it.
 *
 * The cadence every annotation change has to perform -- bump the revision so
 * the storage listener notices, refresh the owning panel or table, re-render
 * the persistent overlay, dispatch -- was copy-pasted at sixteen call sites
 * (R9-13). Four steps repeated by hand is four chances to forget one, and the
 * one that goes missing silently is the revision bump: everything still looks
 * right on screen and nothing is saved.
 *
 * The caller supplies its own panel refresh because that is the only part that
 * genuinely differs -- a markers table, a pin-set panel, or every panel at
 * once. Everything else is fixed.
 *
 * Call it *after* any selection change the mutation implies: panels render the
 * selection, so refreshing before it is set draws the row unselected.
 * @param {GramFrame} instance - GramFrame instance
 * @param {(() => void)|null} [refreshPanel] - Refresh the panel or table showing this feature
 * @param {DispatchOptions} [dispatchOptions] - Passed through to `dispatch`; `{ frame: true }` for a continuous gesture
 * @returns {void}
 */
export function commitAnnotationChange(instance, refreshPanel = null, dispatchOptions = undefined) {
  markAnnotationsChanged(instance)

  if (typeof refreshPanel === 'function') {
    refreshPanel()
  }

  if (instance.featureRenderer) {
    instance.featureRenderer.renderAllPersistentFeatures()
  }

  dispatch(instance, dispatchOptions)
}
