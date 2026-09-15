/**
 * Symbol selector for GramFrame overlays.
 *
 * Renders a compact native drop-down of symbol glyphs. It heads the Symbol band
 * of the style panel (see ColorPicker.js), below the colour slider, and its
 * glyphs are tinted with the currently selected colour.
 *
 * When a marker or harmonic set is selected, changing the symbol restyles that
 * feature in place (feature 161); otherwise the chosen symbol is written to
 * `state.selectedSymbol` and applied to the next created feature. The default
 * option is `cross` — the symbol-less style.
 */

/// <reference path="../types.js" />

import { SYMBOL_CATALOG, SYMBOL_DISPLAY_NAMES, DEFAULT_SYMBOL, LARGE_SYMBOL_SCALE } from '../rendering/symbols.js'
import { dispatch } from '../core/state.js'

/**
 * The drop-down's handle: set its value, and tint its glyphs.
 * @typedef {Object} SymbolControl
 * @property {function(SymbolType): void} setValue - Show this symbol as selected
 * @property {function(string): void} setTint - Tint the glyphs with this colour
 */

/**
 * The "Large" checkbox's handle (feature 161 experiment).
 * @typedef {Object} LargeSymbolsControl
 * @property {function(boolean): void} setValue - Show large symbols as on or off
 */

/**
 * Unicode glyph shown for each symbol id in the drop-down. The list is a
 * compact "drop-down of symbols" (glyph only) so it fits beside the colour
 * slider; the full name is kept on each option's tooltip for accessibility.
 * `cross` uses a small cross glyph to signal the symbol-less style.
 * @type {Record<SymbolType, string>}
 */
const SYMBOL_GLYPHS = {
  'cross': '✕',
  'circle': '●',
  'square': '■',
  'diamond': '◆',
  'triangle': '▲',
  'triangle-down': '▼',
  'star': '★'
}

/**
 * Create the symbol selector drop-down.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {{element: HTMLSelectElement, control: SymbolControl}} The drop-down and its handle
 */
export function createSymbolSelect(instance) {
  const state = instance.state

  // Initialise default symbol if unset
  if (!state.selectedSymbol) {
    state.selectedSymbol = DEFAULT_SYMBOL
  }

  const select = document.createElement('select')
  select.className = 'gram-frame-symbol-select'
  select.title = 'Symbol'
  select.setAttribute('aria-label', 'Symbol')
  // Tint the glyphs with the currently selected colour
  select.style.color = state.selectedColor

  SYMBOL_CATALOG.forEach(symbolId => {
    const option = document.createElement('option')
    option.value = symbolId
    option.textContent = SYMBOL_GLYPHS[symbolId]
    option.title = SYMBOL_DISPLAY_NAMES[symbolId]
    if (symbolId === state.selectedSymbol) {
      option.selected = true
    }
    select.appendChild(option)
  })

  select.addEventListener('change', () => {
    const symbol = /** @type {SymbolType} */ (select.value)
    // Route to the selected feature when one is selected (restyle in place),
    // otherwise set the style for the next created feature.
    if (!instance.interaction.applySymbolToSelectedFeature || !instance.interaction.applySymbolToSelectedFeature(symbol)) {
      state.selectedSymbol = symbol
      // Dispatch: this is a state change listeners care about, and only the
      // "Large" toggle used to say so (issue #268, BH-30).
      dispatch(instance)
    }
  })

  // The handle is returned, not written onto `instance.interaction`. Its only
  // reader is `createColorPicker`, which builds this control -- so it can close
  // over the handle directly, and construction order stops being an invisible
  // contract nothing can check (issue #267).
  /** @type {SymbolControl} */
  const control = {
    setValue(symbol) {
      select.value = symbol
    },
    setTint(color) {
      select.style.color = color
    }
  }

  return { element: select, control }
}

/**
 * Create the temporary "Large" toggle for the style panel's Symbol band.
 *
 * EXPERIMENT: an on/off switch between the current symbol size and
 * {@link LARGE_SYMBOL_SCALE}× that size, so analysts can compare the two on a
 * real gram and tell us which to adopt. The size is a per-feature property and
 * the toggle follows the same routing as the colour slider and symbol
 * drop-down: with a marker or harmonic set selected it resizes THAT feature
 * only — so both sizes can be on screen at once — and with nothing selected it
 * sets the size for the next created feature. Table swatches are unaffected,
 * and the flag is never persisted.
 *
 * Once a size is agreed, delete this control along with the per-feature flag
 * and fold the winning size into the base constants.
 *
 * @param {GramFrame} instance - GramFrame instance
 * @returns {{element: HTMLLabelElement, control: LargeSymbolsControl}} The toggle and its handle
 */
export function createLargeSymbolToggle(instance) {
  const label = document.createElement('label')
  label.className = 'gram-frame-large-symbols-toggle'
  label.title = `Trial: draw the selected feature's symbols at ${LARGE_SYMBOL_SCALE}× their normal size`

  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.className = 'gram-frame-large-symbols-checkbox'
  checkbox.checked = !!instance.state.largeSymbols

  checkbox.addEventListener('change', () => {
    // Resize the selected feature when one is selected, otherwise set the size
    // for the next created feature.
    if (!instance.interaction.applyLargeSymbolsToSelectedFeature ||
        !instance.interaction.applyLargeSymbolsToSelectedFeature(checkbox.checked)) {
      instance.state.largeSymbols = checkbox.checked
      dispatch(instance)
    }
  })

  /** @type {LargeSymbolsControl} */
  const control = {
    setValue(large) {
      checkbox.checked = large
    }
  }

  const text = document.createElement('span')
  text.className = 'gram-frame-large-symbols-label'
  // Short label: the control sits inline beside the symbol drop-down it
  // modifies, so "Symbols" would be redundant as well as too wide.
  text.textContent = 'Large'

  label.appendChild(checkbox)
  label.appendChild(text)

  return { element: label, control }
}
