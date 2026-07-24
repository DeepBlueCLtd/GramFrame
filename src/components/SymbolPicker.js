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

import { SYMBOL_CATALOG, SYMBOL_DISPLAY_NAMES, DEFAULT_SYMBOL } from '../rendering/symbols.js'

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
