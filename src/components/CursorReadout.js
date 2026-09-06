/**
 * The instrument face: the numbers the panel is anchored on.
 *
 * Three readouts in a recessed column — time, frequency, and the doppler speed
 * pinned to the foot — set large, monospaced and tabular so a digit never
 * shifts sideways as it changes. Everything else in the control row is a
 * control; this is the measurement, and it is styled to look like one.
 *
 * The column has two targets, named by its kicker. With nothing selected it
 * follows the pointer over the gram ("CURSOR"). With a feature selected it
 * shows that feature's own values instead ("SELECTED", plus what it is called),
 * so a marker's numbers can be read without hovering it and losing them again
 * on the way to the panel.
 */

/// <reference path="../types.js" />

import { createLEDDisplay, setLEDValue } from './LEDDisplay.js'
import { formatTime } from '../utils/timeFormatter.js'
import { normalizeMarkerLabel } from '../utils/markerLabel.js'

/**
 * The readout column's elements, for the layout that mounts them.
 * @typedef {Object} ReadoutElements
 * @property {HTMLDivElement} column - The column itself
 * @property {HTMLElement} timeLED - Time readout
 * @property {HTMLElement} freqLED - Frequency readout
 * @property {HTMLElement} speedLED - Doppler speed readout
 * @property {HTMLDivElement} kicker - What the column is currently reading
 */

/**
 * Build the readout column.
 * @returns {ReadoutElements} The column and its readouts
 */
export function createCursorReadout() {
  const column = document.createElement('div')
  column.className = 'gram-frame-readout-column'

  const kicker = document.createElement('div')
  kicker.className = 'gram-frame-kicker gram-frame-readout-kicker'
  kicker.textContent = 'Cursor'
  column.appendChild(kicker)

  const timeLED = createLEDDisplay('Time (mm:ss)', formatTime(0), 'MM:SS')
  column.appendChild(timeLED)

  // A hairline fading out to the right, rather than a full rule: it separates
  // the two readings without drawing a box around either.
  const separator = document.createElement('div')
  separator.className = 'gram-frame-readout-separator'
  column.appendChild(separator)

  const freqLED = createLEDDisplay('Frequency (Hz)', '0.0', 'HZ')
  freqLED.classList.add('gram-frame-led-accent')
  column.appendChild(freqLED)

  const spacer = document.createElement('div')
  spacer.className = 'gram-frame-readout-spacer'
  column.appendChild(spacer)

  // Doppler is a derived quantity rather than a coordinate, so it is fenced off
  // at the foot between two rules and set at half the size — present, but not
  // competing with the two readings the pointer actually produces.
  //
  // Its accessible name stays the full "Doppler Speed (kts)" while the caption
  // beside the number is the one word there is room for. The gap in that name
  // is a non-breaking space, written as a \u00a0 escape so it stays visible in
  // the source; Playwright normalises it to a plain space, so the
  // `:text-is("Doppler Speed (kts)")` locators in tests/helpers still match.
  const speedLED = createLEDDisplay('Doppler\u00a0Speed (kts)', '0.0', 'KTS', 'Doppler')
  speedLED.classList.add('gram-frame-led-inline')
  column.appendChild(speedLED)

  return { column, timeLED, freqLED, speedLED, kicker }
}

/**
 * Point the column at the pointer, or at the selected feature, and write
 * whichever one's values.
 *
 * Called on every selection change rather than on every pointer move: while
 * something is selected the pointer is not what the column is reading, and
 * `updateUniversalCursorReadouts` stands aside for exactly that reason.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {void}
 */
export function refreshReadoutTarget(instance) {
  const { kicker, timeLED, freqLED } = instance.ui
  if (!kicker) {
    return
  }

  const selected = describeSelection(instance)
  kicker.replaceChildren()

  if (!selected) {
    kicker.textContent = 'Cursor'
    return
  }

  const word = document.createElement('span')
  word.textContent = 'Selected'
  kicker.appendChild(word)

  const name = document.createElement('span')
  name.className = 'gram-frame-readout-target'
  name.textContent = selected.label
  kicker.appendChild(name)

  if (timeLED) {
    setLEDValue(timeLED, formatTime(selected.time))
  }
  if (freqLED) {
    setLEDValue(freqLED, selected.freq.toFixed(2))
  }
}

/**
 * What the selected feature is called, and the two numbers standing for it.
 *
 * A marker has a time and a frequency outright. A pin set has an anchor time
 * and, for its frequency, the number that set is *about*: the fundamental an
 * analyst placed for a sideband set, the spacing that defines a harmonic one.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {{label: string, time: number, freq: number}|null} The selection, or null
 */
function describeSelection(instance) {
  const { selection, analysis, harmonics, sidebands } = instance.state
  if (!selection || !selection.selectedType || !selection.selectedId) {
    return null
  }
  const ordinal = (selection.selectedIndex ?? 0) + 1

  if (selection.selectedType === 'marker') {
    const marker = (analysis ? analysis.markers : []).find(candidate => candidate.id === selection.selectedId)
    if (!marker) {
      return null
    }
    return {
      label: normalizeMarkerLabel(marker.label) || `Marker ${ordinal}`,
      time: marker.time,
      freq: marker.freq
    }
  }

  if (selection.selectedType === 'harmonicSet') {
    const set = (harmonics ? harmonics.harmonicSets : []).find(candidate => candidate.id === selection.selectedId)
    return set ? { label: `Harmonics ${ordinal}`, time: set.anchorTime, freq: set.spacing } : null
  }

  const set = (sidebands ? sidebands.sidebandSets : []).find(candidate => candidate.id === selection.selectedId)
  return set ? { label: `Sidebands ${ordinal}`, time: set.anchorTime, freq: set.fundamentalFreq } : null
}
