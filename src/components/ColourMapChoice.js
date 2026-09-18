/**
 * The colour-map choice under an audio-sourced gram.
 *
 * A row of radio buttons on the transport bar — Colour, Grey, Inferno, Magma,
 * Viridis, Plasma — that repaints the gram with the chosen map. Radios rather
 * than a select while the maps are under trial: every choice is visible at
 * once, and switching between two of them is one click each way, which is
 * what comparing them on a recording consists of. The choice is
 * `player.analysis.colourMap`, which the `colour-map` config row also sets, so
 * a page can open in any of them and the row then shows it.
 *
 * Mounted only by `player/audioSetup.js`, beside the contrast controls: an
 * image-backed instance has no levels to repaint from.
 */

/// <reference path="../types.js" />

import { COLOUR_MAPS } from '../audio/colourMap.js'
import { repaintGram } from '../player/gramRepaint.js'
import { applyDisplayRange } from '../rendering/displayFilter.js'
import { dispatch } from '../core/state.js'
import { setFocusedInstance } from '../core/FocusManager.js'

/**
 * What each map is called on the bar.
 * @type {Record<import('../audio/colourMap.js').ColourMapName, string>}
 */
const LABELS = {
  colour: 'Colour',
  grey: 'Grey',
  inferno: 'Inferno',
  magma: 'Magma',
  viridis: 'Viridis',
  plasma: 'Plasma'
}

/** Radio groups are per instance, so two grams on a page never share one. */
let groupCounter = 0

/**
 * Build and mount the radio row inside an existing transport bar.
 * @param {GramFrame} instance - An audio-sourced instance whose gram is painted
 * @param {HTMLElement} bar - The transport bar to mount into
 * @param {AnalysisParams} analysis - The instance's live `player.analysis` slice
 * @param {import('../utils/displayRange.js').DisplayRange} display - The instance's live `player.display` slice
 * @returns {HTMLDivElement} The group
 */
export function createColourMapChoice(instance, bar, analysis, display) {
  const group = document.createElement('div')
  group.className = 'gram-frame-colour-map'
  group.setAttribute('role', 'radiogroup')
  group.setAttribute('aria-label', 'Colour map')
  const name = `gram-frame-colour-map-${++groupCounter}`

  COLOUR_MAPS.forEach(map => {
    const label = document.createElement('label')
    label.className = 'gram-frame-colour-map-option'
    const input = document.createElement('input')
    input.type = 'radio'
    input.name = name
    input.value = map
    input.checked = map === analysis.colourMap
    const text = document.createElement('span')
    text.textContent = LABELS[map]
    label.appendChild(input)
    label.appendChild(text)
    group.appendChild(label)

    input.addEventListener('change', () => {
      if (!input.checked || analysis.colourMap === map) {
        return
      }
      analysis.colourMap = map
      repaintGram(instance, map)
      // The contrast transfer depends on which way up the map is, so a
      // change of map re-applies it at the controls' current positions.
      applyDisplayRange(instance, display)
      dispatch(instance)
    })
  })

  group.addEventListener('mousedown', () => setFocusedInstance(instance))
  bar.appendChild(group)
  return group
}
