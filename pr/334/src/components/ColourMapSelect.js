/**
 * The colour-map selector under an audio-sourced gram.
 *
 * One select on the transport bar — Colour, Grey, Inferno — that repaints the
 * gram with the chosen map. It exists for an analyst comparing the picture
 * with a legacy renderer that only ever drew grey, and then comparing that
 * with a map whose brightness rises strictly with level, so each comparison is
 * a click rather than a re-analysis. The choice is `player.analysis.colourMap`,
 * which the `colour-map` config row also sets, so a page can open in any of
 * them and the selector then shows it.
 *
 * Mounted only by `player/audioSetup.js`, beside the contrast controls: an
 * image-backed instance has no levels to repaint from.
 */

/// <reference path="../types.js" />

import { COLOUR_MAPS } from '../audio/colourMap.js'
import { repaintGram } from '../player/gramRepaint.js'
import { dispatch } from '../core/state.js'
import { setFocusedInstance } from '../core/FocusManager.js'

/**
 * What each map is called on the bar.
 * @type {Record<import('../audio/colourMap.js').ColourMapName, string>}
 */
const LABELS = { colour: 'Colour', grey: 'Grey', inferno: 'Inferno' }

/**
 * Build and mount the selector inside an existing transport bar.
 * @param {GramFrame} instance - An audio-sourced instance whose gram is painted
 * @param {HTMLElement} bar - The transport bar to mount into
 * @param {AnalysisParams} analysis - The instance's live `player.analysis` slice
 * @returns {HTMLSelectElement} The select
 */
export function createColourMapSelect(instance, bar, analysis) {
  const select = document.createElement('select')
  select.className = 'gram-frame-colour-map'
  select.title = 'Colour map'
  select.setAttribute('aria-label', 'Colour map')
  COLOUR_MAPS.forEach(map => {
    const option = document.createElement('option')
    option.value = map
    option.textContent = LABELS[map]
    option.selected = map === analysis.colourMap
    select.appendChild(option)
  })

  select.addEventListener('mousedown', () => setFocusedInstance(instance))
  select.addEventListener('change', () => {
    const chosen = /** @type {import('../audio/colourMap.js').ColourMapName} */ (select.value)
    if (!COLOUR_MAPS.includes(chosen)) {
      return
    }
    analysis.colourMap = chosen
    repaintGram(instance, chosen)
    dispatch(instance)
  })

  bar.appendChild(select)
  return select
}
