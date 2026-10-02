/**
 * Symbol selector for GramFrame overlays.
 *
 * A button showing the current symbol, its name and a caret; clicking it opens
 * a popup holding the seven shipped symbols as a grid, plus the size trial.
 *
 * It replaced a native `<select>` of bare glyphs. A drop-down of ✕ ● ■ ◆ ▲ ▼ ★
 * is a list of characters an analyst has to decode one at a time; a grid shows
 * all seven at once, at the size and in the colour they will actually be drawn
 * in, which is the comparison being made. It also gave the size trial somewhere
 * to live other than the main panel, where it was a permanent control for a
 * temporary question.
 *
 * When a marker or pin set is selected and the panel is targeting it, choosing
 * a symbol restyles that feature in place (feature 161); otherwise the choice is
 * written to `state.selectedSymbol` and applied to the next created feature. The
 * default is `cross` — the symbol-less style.
 */

/// <reference path="../types.js" />

import { SYMBOL_CATALOG, SYMBOL_DISPLAY_NAMES, DEFAULT_SYMBOL } from '../rendering/symbols.js'
import { dispatch } from '../core/state.js'
import { createSymbolSizeTrial } from './SymbolSizeTrial.js'

/**
 * The button's handle: set its value, and tint its glyph.
 * @typedef {Object} SymbolControl
 * @property {function(SymbolType): void} setValue - Show this symbol as selected
 * @property {function(string): void} setTint - Tint the glyph with this colour
 */

/**
 * Unicode glyph shown for each symbol id. `cross` uses a small cross glyph to
 * signal the symbol-less style.
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
 * Create the symbol button and the popup behind it.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {{element: HTMLButtonElement, control: SymbolControl}} The button and its handle
 */
export function createSymbolSelect(instance) {
  const state = instance.state

  if (!state.selectedSymbol) {
    state.selectedSymbol = DEFAULT_SYMBOL
  }

  // `gram-frame-symbol-select` is kept as the button's class: it is what
  // addresses "the symbol control" throughout the stylesheet and the tests, and
  // that is still what this is.
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'gram-frame-symbol-select'
  button.title = 'Symbol'
  button.setAttribute('aria-label', 'Symbol')
  button.setAttribute('aria-haspopup', 'true')
  button.setAttribute('aria-expanded', 'false')

  const glyph = document.createElement('span')
  glyph.className = 'gram-frame-symbol-glyph'
  glyph.style.color = state.selectedColor

  const name = document.createElement('span')
  name.className = 'gram-frame-symbol-name'

  const caret = document.createElement('span')
  caret.className = 'gram-frame-symbol-caret'
  caret.textContent = '▾'

  button.appendChild(glyph)
  button.appendChild(name)
  button.appendChild(caret)

  /** @type {HTMLDivElement|null} */
  let popup = null

  /**
   * Close the popup and give focus back to the button that opened it, so the
   * keyboard is where the analyst left it.
   * @returns {void}
   */
  const close = () => {
    if (!popup) {
      return
    }
    popup.remove()
    popup = null
    button.setAttribute('aria-expanded', 'false')
    document.removeEventListener('keydown', onKeyDown, true)
    document.removeEventListener('mousedown', onOutsideDown, true)
    button.focus()
  }

  /**
   * Escape closes, wherever the focus happens to be.
   * @param {KeyboardEvent} event - Key event
   * @returns {void}
   */
  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      close()
    }
  }

  /**
   * A press anywhere but inside the popup, or on the button that owns it,
   * dismisses it.
   * @param {MouseEvent} event - Press event
   * @returns {void}
   */
  const onOutsideDown = (event) => {
    const target = /** @type {Node|null} */ (event.target)
    if (popup && target && !popup.contains(target) && !button.contains(target)) {
      close()
    }
  }

  button.addEventListener('click', event => {
    event.preventDefault()
    if (popup) {
      close()
      return
    }
    popup = buildPopup(instance, state, chosen => {
      applySymbol(instance, chosen)
      close()
    })
    // Mounted on the component, not on the row that opens it: the style column
    // scrolls and both it and the frame clip, so a popup parented to the row is
    // a popup with three chances to be cut in half.
    instance.ui.container.appendChild(popup)
    placePopup(popup, button, instance.ui.container)
    button.setAttribute('aria-expanded', 'true')
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('mousedown', onOutsideDown, true)
  })

  /** @type {SymbolControl} */
  const control = {
    setValue(symbol) {
      const resolved = SYMBOL_GLYPHS[symbol] ? symbol : DEFAULT_SYMBOL
      glyph.textContent = SYMBOL_GLYPHS[resolved]
      // The bare name on the button, its full form on the tooltip: the row is
      // 46px of caption and whatever is left, and "Cross (no symbol)" spends
      // all of it on a parenthesis the glyph beside it already makes.
      name.textContent = shortSymbolName(resolved)
      button.title = SYMBOL_DISPLAY_NAMES[resolved]
      button.dataset.symbol = resolved
      if (popup) {
        markChosen(popup, resolved)
      }
    },
    setTint(color) {
      glyph.style.color = color
      if (popup) {
        popup.style.setProperty('--gf-symbol-tint', color)
      }
    }
  }
  control.setValue(/** @type {SymbolType} */ (state.selectedSymbol))

  return { element: button, control }
}

/**
 * Put the popup under the button that opened it, kept inside the component.
 *
 * Measured rather than declared, because the button's position depends on which
 * rows the panel is currently showing — the label and nudge rows come and go
 * with the target — and on whether the guidance column is collapsed.
 * @param {HTMLElement} popup - The popup, already mounted
 * @param {HTMLElement} button - The button it belongs to
 * @param {HTMLElement} container - The component, the popup's offset parent
 * @returns {void}
 */
function placePopup(popup, button, container) {
  const anchor = button.getBoundingClientRect()
  const frame = container.getBoundingClientRect()
  const width = popup.offsetWidth
  const left = Math.max(0, Math.min(anchor.left - frame.left, frame.width - width))
  popup.style.left = `${left}px`
  popup.style.top = `${anchor.bottom - frame.top + 6}px`
}

/**
 * The glyph standing for a symbol, wherever one has to be drawn as text.
 *
 * Exported so the style panel can put the targeted feature's own mark on its
 * tab and in its footer, rather than always showing a cross and quietly lying
 * about what is being changed.
 * @param {SymbolType|string|undefined} symbol - The symbol
 * @returns {string} Its glyph, defaulting to the cross
 */
export function symbolGlyph(symbol) {
  return SYMBOL_GLYPHS[/** @type {SymbolType} */ (symbol)] || SYMBOL_GLYPHS[DEFAULT_SYMBOL]
}

/**
 * A symbol's name without its parenthesised aside.
 * @param {SymbolType} symbol - The symbol
 * @returns {string} Its short name
 */
function shortSymbolName(symbol) {
  return SYMBOL_DISPLAY_NAMES[symbol].split(' (')[0]
}

/**
 * Route a chosen symbol: to the selected feature when the panel is targeting
 * one, otherwise to the defaults for the next created feature.
 * @param {GramFrame} instance - GramFrame instance
 * @param {SymbolType} symbol - The chosen symbol
 * @returns {void}
 */
function applySymbol(instance, symbol) {
  const state = instance.state
  const apply = instance.interaction.applySymbolToSelectedFeature
  if (!apply || !apply(symbol)) {
    state.selectedSymbol = symbol
    dispatch(instance)
  }
  if (instance.interaction.syncStyleControls) {
    instance.interaction.syncStyleControls()
  }
}

/**
 * Build the popup: the seven symbols, then the size trial.
 * @param {GramFrame} instance - GramFrame instance
 * @param {GramFrameState} state - The instance's live state
 * @param {function(SymbolType): void} onChoose - Called with the chosen symbol
 * @returns {HTMLDivElement} The popup
 */
function buildPopup(instance, state, onChoose) {
  const popup = document.createElement('div')
  popup.className = 'gram-frame-symbol-popup'
  popup.style.setProperty('--gf-symbol-tint', state.selectedColor)

  const header = document.createElement('div')
  header.className = 'gram-frame-symbol-popup-header'
  const kicker = document.createElement('div')
  kicker.className = 'gram-frame-kicker'
  kicker.textContent = 'Symbol'
  header.appendChild(kicker)
  popup.appendChild(header)

  const grid = document.createElement('div')
  grid.className = 'gram-frame-symbol-grid'
  SYMBOL_CATALOG.forEach(symbolId => {
    const cell = document.createElement('button')
    cell.type = 'button'
    cell.className = 'gram-frame-symbol-cell'
    cell.dataset.symbol = symbolId
    cell.title = SYMBOL_DISPLAY_NAMES[symbolId]
    cell.setAttribute('aria-label', SYMBOL_DISPLAY_NAMES[symbolId])
    cell.textContent = SYMBOL_GLYPHS[symbolId]
    cell.addEventListener('click', event => {
      event.preventDefault()
      onChoose(symbolId)
    })
    grid.appendChild(cell)
  })
  popup.appendChild(grid)

  const footer = document.createElement('div')
  footer.className = 'gram-frame-symbol-popup-footer'
  const sizeLabel = document.createElement('div')
  sizeLabel.className = 'gram-frame-style-group-label'
  sizeLabel.textContent = 'Size'
  footer.appendChild(sizeLabel)
  footer.appendChild(createSymbolSizeTrial(instance))
  popup.appendChild(footer)

  markChosen(popup, /** @type {SymbolType} */ (state.selectedSymbol))
  return popup
}

/**
 * Mark one cell of an open popup as the chosen symbol.
 * @param {HTMLElement} popup - The popup
 * @param {SymbolType} symbol - The chosen symbol
 * @returns {void}
 */
function markChosen(popup, symbol) {
  popup.querySelectorAll('.gram-frame-symbol-cell').forEach(cell => {
    cell.classList.toggle('gram-frame-symbol-cell-selected',
      /** @type {HTMLElement} */ (cell).dataset.symbol === symbol)
  })
}
