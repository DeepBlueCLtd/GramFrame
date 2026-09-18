/**
 * TEMPORARY: the symbol-size trial.
 *
 * A choice between the current symbol size and {@link LARGE_SYMBOL_SCALE}× that
 * size, so analysts can compare the two on a real gram and tell us which to
 * adopt. It lives in the symbol popup rather than the main panel, where a
 * permanent control was answering a temporary question.
 *
 * The size is a per-feature property and follows the same routing as the colour
 * slider and the symbol grid: with a feature targeted it resizes THAT feature
 * only — so both sizes can be on screen at once — and otherwise it sets the
 * size for the next created feature. Table swatches are unaffected, and the
 * flag is never persisted.
 *
 * Its own module so that, once a size is agreed, the trial is deleted by
 * deleting a file: this, the per-feature flag, and the one line in
 * `SymbolPicker.js` that mounts it.
 */

/// <reference path="../types.js" />

import { LARGE_SYMBOL_SCALE } from '../rendering/symbols.js'
import { dispatch } from '../core/state.js'
import { createSegmented } from './Segmented.js'

/**
 * Build the Normal/Large trial control.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {HTMLElement} The control, ready to mount
 */
export function createSymbolSizeTrial(instance) {
  const state = instance.state
  const segmented = createSegmented(
    [{ value: false, label: 'Normal' }, { value: true, label: 'Large' }],
    'Symbol size',
    (large) => {
      const apply = instance.interaction.applyLargeSymbolsToSelectedFeature
      if (!apply || !apply(large)) {
        state.largeSymbols = large
        dispatch(instance)
      }
      segmented.setValue(large)
      if (instance.interaction.syncStyleControls) {
        instance.interaction.syncStyleControls()
      }
    }
  )
  segmented.element.classList.add('gram-frame-large-symbols-toggle')
  segmented.element.title = `Trial: draw symbols at ${LARGE_SYMBOL_SCALE}× their normal size`
  segmented.setValue(!!state.largeSymbols)

  return segmented.element
}
