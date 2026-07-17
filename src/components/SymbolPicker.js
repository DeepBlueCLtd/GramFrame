/**
 * Symbol Picker Component for GramFrame
 *
 * Provides symbol selection for harmonic overlays as a native drop-down list,
 * mirroring the ColorPicker pattern. The chosen symbol is written to
 * `state.selectedSymbol` and applied to the next created harmonic set.
 */

/// <reference path="../types.js" />

import { SYMBOL_CATALOG, SYMBOL_DISPLAY_NAMES } from '../rendering/symbols.js'

/**
 * Unicode glyph previews shown alongside each option name in the drop-down, so
 * the shape is recognisable without rendering inline SVG inside <option>.
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
 * Create a symbol picker component for harmonic selection.
 * @param {GramFrameState} state - Current state object
 * @returns {HTMLDivElement} The symbol picker element
 */
export function createSymbolPicker(state) {
  const container = document.createElement('div')
  container.className = 'gram-frame-symbol-picker'
  container.style.display = 'block'

  // Label
  const label = document.createElement('div')
  label.className = 'gram-frame-symbol-picker-label'
  label.textContent = 'Symbol'
  container.appendChild(label)

  // Initialise default symbol if unset
  if (!state.selectedSymbol) {
    state.selectedSymbol = 'circle'
  }

  // Native drop-down of catalogue shapes
  const select = document.createElement('select')
  select.className = 'gram-frame-symbol-select'

  SYMBOL_CATALOG.forEach(symbolId => {
    const option = document.createElement('option')
    option.value = symbolId
    option.textContent = `${SYMBOL_GLYPHS[symbolId]}  ${SYMBOL_DISPLAY_NAMES[symbolId]}`
    if (symbolId === state.selectedSymbol) {
      option.selected = true
    }
    select.appendChild(option)
  })

  select.addEventListener('change', () => {
    state.selectedSymbol = /** @type {SymbolType} */ (select.value)
  })

  container.appendChild(select)

  return container
}
