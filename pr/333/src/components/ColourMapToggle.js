/**
 * The colour-map toggle under an audio-sourced gram.
 *
 * One pressed/unpressed button, "Grey", that repaints the gram as grey shades
 * or back to colour. It exists for an analyst comparing the picture with a
 * legacy renderer that only ever drew grey, so the comparison is a click
 * rather than a re-analysis. The choice is `player.analysis.colourMap`, which
 * the `colour-map` config row also sets, so a page can open in grey and the
 * button then shows it that way.
 *
 * Mounted only by `player/audioSetup.js`, beside the contrast controls: an
 * image-backed instance has no levels to repaint from.
 */

/// <reference path="../types.js" />

import { repaintGram } from '../player/gramRepaint.js'
import { dispatch } from '../core/state.js'
import { setFocusedInstance } from '../core/FocusManager.js'

/**
 * Build and mount the toggle inside an existing transport bar.
 * @param {GramFrame} instance - An audio-sourced instance whose gram is painted
 * @param {HTMLElement} bar - The transport bar to mount into
 * @param {AnalysisParams} analysis - The instance's live `player.analysis` slice
 * @returns {HTMLButtonElement} The button
 */
export function createColourMapToggle(instance, bar, analysis) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'gram-frame-transport-btn gram-frame-colour-map'
  button.title = 'Grey shades'
  button.setAttribute('aria-label', 'Grey shades')
  button.textContent = 'Grey'

  const show = () => {
    button.setAttribute('aria-pressed', analysis.colourMap === 'grey' ? 'true' : 'false')
  }
  show()

  button.addEventListener('mousedown', () => setFocusedInstance(instance))
  button.addEventListener('click', () => {
    analysis.colourMap = analysis.colourMap === 'grey' ? 'colour' : 'grey'
    show()
    repaintGram(instance, analysis.colourMap)
    dispatch(instance)
  })

  bar.appendChild(button)
  return button
}
