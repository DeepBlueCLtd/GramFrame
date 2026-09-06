/**
 * The contrast controls under a gram (spec 171, US2; extended to image-backed
 * grams by #324).
 *
 * A floor and a ceiling over the painted level scale, plus the way back to
 * where they started. They are called "contrast" in everything an analyst
 * reads, deliberately: what they re-map is the 8-bit image, so calling them a
 * display range would promise decibels the painted PNG no longer carries
 * (spec 171, Risks). `state.display` holds the same pair as fractions.
 *
 * Two hosts, one control group. A player already has a transport bar and the
 * controls join it; an image gram has no bar, so {@link mountDisplayRangeBar}
 * gives them one of their own under the gram. What differs is what else is on
 * the row, not what the controls are.
 */

/// <reference path="../types.js" />

import { settleDisplayRange, DEFAULT_DISPLAY_RANGE } from '../utils/displayRange.js'
import { applyDisplayRange } from '../rendering/displayFilter.js'
import { dispatch } from '../core/state.js'
import { setFocusedInstance } from '../core/FocusManager.js'

/**
 * Build one labelled slider.
 * @param {string} className - Modifier class
 * @param {string} label - Accessible name and visible text
 * @param {number} value - Initial position, 0..1
 * @returns {{wrap: HTMLLabelElement, input: HTMLInputElement}} The control
 */
function slider(className, label, value) {
  const wrap = document.createElement('label')
  wrap.className = `gram-frame-display-control ${className}`
  const text = document.createElement('span')
  text.className = 'gram-frame-display-label'
  text.textContent = label
  const input = document.createElement('input')
  input.type = 'range'
  input.min = '0'
  input.max = '1'
  input.step = '0.01'
  input.value = String(value)
  input.className = 'gram-frame-display-slider'
  input.setAttribute('aria-label', `Contrast ${label.toLowerCase()}`)
  wrap.appendChild(text)
  wrap.appendChild(input)
  return { wrap, input }
}

/**
 * Build and mount the controls inside an existing transport bar.
 * @param {GramFrame} instance - An audio-sourced instance whose bar exists
 * @param {HTMLElement} bar - The transport bar to mount into
 * @param {import('../utils/displayRange.js').DisplayRange} display - The instance's live `player.display` slice
 * @returns {HTMLDivElement} The control group
 */
export function createDisplayRangeControls(instance, bar, display) {
  const group = document.createElement('div')
  group.className = 'gram-frame-display-range'
  group.setAttribute('role', 'group')
  group.setAttribute('aria-label', 'Contrast')

  const floor = slider('gram-frame-display-floor', 'Floor', display.floor)
  const ceiling = slider('gram-frame-display-ceiling', 'Ceiling', display.ceiling)

  const reset = document.createElement('button')
  reset.type = 'button'
  reset.className = 'gram-frame-transport-btn gram-frame-display-reset'
  reset.title = 'Reset contrast'
  reset.setAttribute('aria-label', 'Reset contrast')
  reset.textContent = 'Reset'

  ;[floor.wrap, ceiling.wrap, reset].forEach(el => group.appendChild(el))
  bar.appendChild(group)

  /**
   * Adopt a proposed pair, redraw and broadcast.
   * @param {number} nextFloor - Proposed floor
   * @param {number} nextCeiling - Proposed ceiling
   * @param {'floor'|'ceiling'} moved - Which control the analyst moved
   */
  const setRange = (nextFloor, nextCeiling, moved) => {
    const settled = settleDisplayRange(nextFloor, nextCeiling, moved)
    display.floor = settled.floor
    display.ceiling = settled.ceiling
    floor.input.value = String(settled.floor)
    ceiling.input.value = String(settled.ceiling)
    applyDisplayRange(instance, display)
    // A frame-cadence dispatch: this is a drag, and nothing an analyst reads
    // off the gram changes with it (FR-011) — only what the picture looks like.
    dispatch(instance, { frame: true })
  }

  group.addEventListener('mousedown', () => setFocusedInstance(instance))
  floor.input.addEventListener('input', () => {
    setRange(parseFloat(floor.input.value), display.ceiling, 'floor')
  })
  ceiling.input.addEventListener('input', () => {
    setRange(display.floor, parseFloat(ceiling.input.value), 'ceiling')
  })
  reset.addEventListener('click', () => {
    setRange(DEFAULT_DISPLAY_RANGE.floor, DEFAULT_DISPLAY_RANGE.ceiling, 'floor')
  })

  return group
}

/**
 * Mount the controls on an instance that has no transport bar to join — an
 * image-backed gram (#324).
 *
 * The bar goes under the SVG, where a player's transport bar sits, so the
 * control is in the same place on both kinds of gram. `ExpandToggle` measures
 * whatever chrome is under the SVG, so the expanded image leaves room for this
 * without knowing what it is.
 * @param {GramFrame} instance - GramFrame instance
 * @param {import('../utils/displayRange.js').DisplayRange} display - The instance's live `state.display` slice
 * @returns {HTMLDivElement|null} The bar, or null if there is nowhere to mount it
 */
export function mountDisplayRangeBar(instance, display) {
  const cell = instance.ui.mainCell
  if (!cell || cell.querySelector('.gram-frame-display-bar')) {
    return null
  }
  const bar = document.createElement('div')
  bar.className = 'gram-frame-display-bar'
  cell.appendChild(bar)
  createDisplayRangeControls(instance, bar, display)
  return bar
}
