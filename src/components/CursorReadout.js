/**
 * The instrument face: the numbers the panel is anchored on.
 *
 * Three readouts in a recessed column, in two ranks. Frequency is the one
 * large, lit reading: in use it is by far the most important number in the
 * panel, and giving time the same size made the two compete for the eye.
 * Time sits immediately beneath it at half the size in the label grey, and
 * the doppler speed is pinned to the foot at the same rank. All three are
 * monospaced and tabular so a digit never shifts sideways as it changes.
 * Everything else in the control row is a control; this is the measurement,
 * and it is styled to look like one.
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
import { describeSelection } from '../core/selectionTarget.js'

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

  const freqLED = createLEDDisplay('Frequency (Hz)', '0.0', 'HZ')
  freqLED.classList.add('gram-frame-led-accent')
  column.appendChild(freqLED)

  // Time is the second-rank reading: directly under the frequency, at half its
  // size and in the label grey, with its own caption since it no longer has
  // the size to name itself. It is not fenced like doppler — it belongs with
  // the frequency, as the other half of the pointer's coordinate.
  const timeLED = createLEDDisplay('Time (mm:ss)', formatTime(0), 'MM:SS', 'Time')
  timeLED.classList.add('gram-frame-led-secondary')
  column.appendChild(timeLED)

  const spacer = document.createElement('div')
  spacer.className = 'gram-frame-readout-spacer'
  column.appendChild(spacer)

  // Doppler is a derived quantity rather than a coordinate, so it is fenced off
  // at the foot between two rules, at the same second rank as time — present,
  // but not competing with the reading the column exists for.
  //
  // Its accessible name stays the full "Doppler Speed (kts)" while the caption
  // beside the number is the one word there is room for. The gap in that name
  // is a non-breaking space, written as a \u00a0 escape so it stays visible in
  // the source; Playwright normalises it to a plain space, so the
  // `:text-is("Doppler Speed (kts)")` locators in tests/helpers still match.
  const speedLED = createLEDDisplay('Doppler\u00a0Speed (kts)', '0.0', 'KTS', 'Doppler')
  speedLED.classList.add('gram-frame-led-secondary', 'gram-frame-led-inline')
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
