/**
 * Symbol selector for GramFrame harmonic overlays.
 *
 * Renders a compact native drop-down of symbol glyphs. It is embedded in the
 * combined "Symbol" panel (see ColorPicker.js) to the right of the colour
 * slider, where the selected-colour swatch used to sit, and its glyphs are
 * tinted with the currently selected colour. The chosen symbol is written to
 * `state.selectedSymbol` and applied to the next created harmonic set.
 */

/// <reference path="../types.js" />

import { SYMBOL_CATALOG, SYMBOL_DISPLAY_NAMES } from '../rendering/symbols.js'

/**
 * Unicode glyph shown for each symbol id in the drop-down. The list is a
 * compact "drop-down of symbols" (glyph only) so it fits beside the colour
 * slider; the full name is kept on each option's tooltip for accessibility.
 * @type {Record<SymbolType, string>}
 */
const SYMBOL_GLYPHS = {
  'circle': '●',
  'square': '■',
  'diamond': '◆',
  'triangle': '▲',
  'triangle-down': '▼',
  'star': '★'
}

/**
 * Create the symbol selector drop-down.
 * @param {GramFrameState} state - Current state object
 * @returns {HTMLSelectElement} The symbol `<select>` element
 */
export function createSymbolSelect(state) {
  // Initialise default symbol if unset
  if (!state.selectedSymbol) {
    state.selectedSymbol = 'circle'
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
    state.selectedSymbol = /** @type {SymbolType} */ (select.value)
  })

  return select
}
