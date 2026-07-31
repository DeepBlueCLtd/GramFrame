/**
 * Symbol selector for GramFrame overlays.
 *
 * Renders a compact native drop-down of symbol glyphs. It is embedded in the
 * combined "Symbol" panel (see ColorPicker.js) to the right of the colour
 * slider, and its glyphs are tinted with the currently selected colour.
 *
 * When a marker or harmonic set is selected, changing the symbol restyles that
 * feature in place (feature 161); otherwise the chosen symbol is written to
 * `state.selectedSymbol` and applied to the next created feature. The default
 * option is `cross` — the symbol-less style.
 */

/// <reference path="../types.js" />

import { SYMBOL_CATALOG, SYMBOL_DISPLAY_NAMES, DEFAULT_SYMBOL, LARGE_SYMBOL_SCALE } from '../rendering/symbols.js'
import { notifyStateListeners } from '../core/state.js'

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
 * @returns {HTMLSelectElement} The symbol `<select>` element
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
    if (!instance.applySymbolToSelectedFeature || !instance.applySymbolToSelectedFeature(symbol)) {
      state.selectedSymbol = symbol
    }
  })

  // Expose a control handle so selection changes can reflect the selected
  // feature's symbol back into this drop-down (feature 161, FR-004).
  instance._symbolControl = {
    /** @param {SymbolType} symbol */
    setValue(symbol) {
      select.value = symbol
    },
    /** @param {string} color */
    setTint(color) {
      select.style.color = color
    }
  }

  return select
}

/**
 * Create the temporary "Large symbols" toggle for the Symbol panel.
 *
 * EXPERIMENT: an on/off switch between the current symbol size and
 * {@link LARGE_SYMBOL_SCALE}× that size, so analysts can compare the two on a
 * real gram and tell us which to adopt. Toggling redraws every overlay symbol
 * (harmonic pins and analysis markers) immediately; the table swatches are
 * unaffected. The state is in-memory only and is never persisted.
 *
 * Once a size is agreed, delete this control along with `state.largeSymbols`
 * and fold the winning size into the base constants.
 *
 * @param {GramFrame} instance - GramFrame instance
 * @returns {HTMLLabelElement} The toggle (a label wrapping its checkbox)
 */
export function createLargeSymbolToggle(instance) {
  const label = document.createElement('label')
  label.className = 'gram-frame-large-symbols-toggle'
  label.title = `Trial: draw symbols at ${LARGE_SYMBOL_SCALE}× their normal size`

  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.className = 'gram-frame-large-symbols-checkbox'
  checkbox.checked = !!instance.state.largeSymbols

  checkbox.addEventListener('change', () => {
    instance.state.largeSymbols = checkbox.checked
    // Redraw the overlay so the new size applies to every existing feature.
    if (instance.featureRenderer) {
      instance.featureRenderer.renderAllPersistentFeatures()
    }
    notifyStateListeners(instance.state, instance.stateListeners)
  })

  label.appendChild(checkbox)
  label.appendChild(document.createTextNode('Large symbols'))

  return label
}
