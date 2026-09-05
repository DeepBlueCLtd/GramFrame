/**
 * Configuration parsing: reads the `gram-config` table into state.
 *
 * Two kinds of table are accepted (spec 168, FR-003): an image-backed one,
 * whose first row holds an `<img>` and which needs all four `time-*`/`freq-*`
 * rows, and an audio-sourced one, whose first row holds an `<audio>` and whose
 * remaining rows are optional analysis parameters. The audio table's time
 * range comes from the recording, so `time-start`/`time-end` on it are ignored
 * with a warning (FR-004).
 */

/// <reference path="../types.js" />

import { isPowerOfTwo } from '../audio/fft.js'

/**
 * A parameter row as read from the table: its raw text and where it sat.
 * @typedef {Object} ParameterCell
 * @property {string} text - The value cell's trimmed text
 * @property {number} row - 1-based row number, for the console message
 */

/**
 * Read the two-column parameter rows into a map of name → cell.
 *
 * Every row is read, including any that also holds the image or audio (those
 * have one cell and are skipped by the two-cell test). Duplicates: last wins,
 * as they always have. Rows the component does not recognise are kept too —
 * a config table may carry rows of its own — and are simply never asked for.
 * @param {HTMLTableElement} configTable - The table
 * @returns {Map<string, ParameterCell>} Parameter cells by name
 */
function readParameterRows(configTable) {
  /** @type {Map<string, ParameterCell>} */
  const params = new Map()
  configTable.querySelectorAll('tr').forEach((row, index) => {
    try {
      const cells = row.querySelectorAll('td')
      if (cells.length === 2) {
        const name = cells[0].textContent?.trim() || ''
        const text = cells[1].textContent?.trim() || ''
        if (name) {
          params.set(name, { text, row: index + 1 })
        }
      }
    } catch (error) {
      console.warn(`GramFrame: Error parsing row ${index + 1}:`, error instanceof Error ? error.message : String(error))
    }
  })
  return params
}

/**
 * Parse a configuration cell's text as a number, strictly.
 *
 * Strict because both loose readings produce a plausible gram with the wrong
 * axes and nothing on screen to say so (R9-03, BH-20). Every marker and every
 * harmonic ratio the analyst then reads is wrong by a factor they cannot see:
 *
 * - An **empty cell** used to fall back to `'0'`, so a missing `time-start`
 *   silently validated as 0 and drew a normal-looking axis.
 * - `parseFloat` stops at the first character it cannot use, so a
 *   European-locale `1,5` became `1` and `10 Hz` became `10`. `Number` consumes
 *   the whole string or nothing.
 *
 * `Number('')` is 0 and `Number(' ')` is 0, so the blank check must come first.
 * `Infinity` and `NaN` are rejected by the finiteness check.
 * @param {string | null | undefined} text - Raw cell text
 * @returns {number | null} The value, or null if the cell does not hold one number
 */
function parseConfigValue(text) {
  if (typeof text !== 'string') {
    return null
  }
  const trimmed = text.trim()
  if (trimmed === '') {
    return null
  }
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

/**
 * Read a numeric parameter, or null when the row is absent or does not hold
 * a single number.
 *
 * A rejected value is never replaced by a guess: the caller sees null, and
 * for a required row the "must be present with valid numeric values" error
 * then reports it on the page instead of drawing an axis nobody asked for.
 * @param {Map<string, ParameterCell>} params - Parameter rows
 * @param {string} name - Parameter name
 * @returns {number|null} The value, or null when absent or non-numeric
 */
function numberParam(params, name) {
  const cell = params.get(name)
  if (!cell) {
    return null
  }
  const value = parseConfigValue(cell.text)
  if (value === null) {
    console.warn(`GramFrame: Ignoring ${name} in row ${cell.row} — "${cell.text}" is not a single numeric value`)
    return null
  }
  return value
}

/**
 * Read an image-backed table (the original contract) into state.
 * @param {GramFrame} instance - GramFrame instance
 * @param {HTMLImageElement} imgElement - The first row's image
 * @param {Map<string, ParameterCell>} params - Parameter rows
 */
function extractImageConfig(instance, imgElement, params) {
  // `getAttribute`, not the `src` property: for `<img src="">` the property
  // resolves the empty string against the document URL and comes back truthy,
  // so a property check passed and the component went on to request the page
  // itself as its spectrogram. An empty src (a template left unfilled) is
  // reported on the page like every other config mistake (R9-02).
  const srcAttribute = imgElement.getAttribute('src')
  if (!srcAttribute || !srcAttribute.trim()) {
    throw new Error('Image element has no src attribute: the spectrogram <img> must point at an image')
  }
  instance.state.imageDetails.url = imgElement.src

  const timeStart = numberParam(params, 'time-start')
  const timeEnd = numberParam(params, 'time-end')
  const freqStart = numberParam(params, 'freq-start')
  const freqEnd = numberParam(params, 'freq-end')
  const config = instance.state.config

  // Set time configuration - require both start and end
  if (timeStart === null || timeEnd === null) {
    throw new Error('Missing required time configuration: both time-start and time-end must be present with valid numeric values')
  }
  if (timeStart >= timeEnd) {
    throw new Error(`Invalid time range: start (${timeStart}) must be less than end (${timeEnd})`)
  }
  config.timeMin = timeStart
  config.timeMax = timeEnd

  // Set frequency configuration - require both start and end
  if (freqStart === null || freqEnd === null) {
    throw new Error('Missing required frequency configuration: both freq-start and freq-end must be present with valid numeric values')
  }
  if (freqStart >= freqEnd) {
    throw new Error(`Invalid frequency range: start (${freqStart}) must be less than end (${freqEnd})`)
  }
  config.freqMin = freqStart
  config.freqMax = freqEnd
}

/**
 * Read an audio-sourced table into `state.player` (spec 168, FR-003, FR-004).
 *
 * The time range and the frequency ceiling are unknown until the file is
 * decoded, so `config` is left at zero here and filled in by
 * `player/audioSetup.js` when the analysis is ready. Everything that *can* be
 * validated before any DOM is built is validated here, so a bad table fails
 * exactly as an image table does: error indicator, table restored.
 * @param {GramFrame} instance - GramFrame instance
 * @param {HTMLAudioElement} audioElement - The first row's audio element
 * @param {Map<string, ParameterCell>} params - Parameter rows
 */
function extractAudioConfig(instance, audioElement, params) {
  const src = audioElement.getAttribute('src') ? audioElement.src : ''
  if (!src) {
    throw new Error('Audio element has no src attribute')
  }

  const state = instance.state
  const player = state.player
  player.active = true
  player.source = src
  // The audio's URL stands in for the image's: it names the source in state
  // and is what the storage fingerprint identifies the gram by.
  state.imageDetails.url = src

  if (params.has('time-start') || params.has('time-end')) {
    console.warn('GramFrame: time-start/time-end are ignored on an audio-sourced gram — the recording defines the time range')
  }

  const fftSize = numberParam(params, 'fft-size')
  if (fftSize !== null) {
    if (!isPowerOfTwo(fftSize) || fftSize < 64 || fftSize > 8192) {
      throw new Error(`Invalid fft-size: ${fftSize} — must be a power of two between 64 and 8192`)
    }
    player.analysis.fftSize = fftSize
  }

  const hopSize = numberParam(params, 'hop-size')
  if (hopSize !== null) {
    if (!Number.isInteger(hopSize) || hopSize < 1) {
      throw new Error(`Invalid hop-size: ${hopSize} — must be a whole number of samples, 1 or more`)
    }
    player.analysis.hopSize = hopSize
  } else {
    player.analysis.hopSize = player.analysis.fftSize / 2
  }

  const freqStart = numberParam(params, 'freq-start')
  if (freqStart !== null) {
    if (freqStart < 0) {
      throw new Error(`Invalid freq-start: ${freqStart} — must not be negative`)
    }
    player.analysis.freqStart = freqStart
  }

  const freqEnd = numberParam(params, 'freq-end')
  if (freqEnd !== null) {
    if (freqEnd <= player.analysis.freqStart) {
      throw new Error(`Invalid frequency range: freq-end (${freqEnd}) must be greater than freq-start (${player.analysis.freqStart})`)
    }
    player.analysis.freqEnd = freqEnd
  }

  const windowSeconds = numberParam(params, 'window-seconds')
  if (windowSeconds !== null) {
    if (!(windowSeconds > 0)) {
      throw new Error(`Invalid window-seconds: ${windowSeconds} — must be greater than 0`)
    }
    player.windowSeconds = windowSeconds
  }
}

/**
 * Extract configuration data from the HTML table into state.
 * @param {GramFrame} instance - GramFrame instance
 * @throws {Error} When the table is missing required rows or holds invalid values
 */
export function extractConfigData(instance) {
  if (!instance.configTable) {
    console.warn('GramFrame: No config table provided for configuration extraction')
    return
  }

  const params = readParameterRows(instance.configTable)
  const audioElement = instance.configTable.querySelector('audio')
  const imgElement = instance.configTable.querySelector('img')

  if (audioElement) {
    if (imgElement) {
      console.warn('GramFrame: the config table holds both an <audio> and an <img>; the audio is used and the image ignored')
    }
    extractAudioConfig(instance, audioElement, params)
    return
  }

  // These errors PROPAGATE, exactly like the range errors: `createGramFrameAPI`
  // catches them, restores the config table and renders the red error
  // indicator with the message (R9-02). A missing <img> (wrong row order) is
  // one of the two mistakes an author is most likely to make while assembling
  // a lesson, and used to leave a working-looking component saying "Loading
  // spectrogram" forever.
  if (!imgElement) {
    throw new Error('No image element found in config table: the first row must contain an <img> with the spectrogram')
  }
  extractImageConfig(instance, imgElement, params)
}
