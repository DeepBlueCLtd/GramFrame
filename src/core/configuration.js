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
 * Read the two-column parameter rows into a map of name → raw text.
 *
 * Every row is read, including any that also holds the image or audio (those
 * have one cell and are skipped by the two-cell test). Duplicates: last wins,
 * as they always have.
 * @param {HTMLTableElement} configTable - The table
 * @returns {Map<string, string>} Parameter text by name
 */
function readParameterRows(configTable) {
  /** @type {Map<string, string>} */
  const params = new Map()
  configTable.querySelectorAll('tr').forEach((row, index) => {
    try {
      const cells = row.querySelectorAll('td')
      if (cells.length === 2) {
        const name = cells[0].textContent?.trim() || ''
        const value = cells[1].textContent?.trim() || ''
        if (name) {
          params.set(name, value)
        }
      }
    } catch (error) {
      console.warn(`GramFrame: Error parsing row ${index + 1}:`, error instanceof Error ? error.message : String(error))
    }
  })
  return params
}

/**
 * Parse a numeric parameter, warning and returning null when it is not a number.
 * @param {Map<string, string>} params - Parameter rows
 * @param {string} name - Parameter name
 * @returns {number|null} The value, or null when absent or non-numeric
 */
function numberParam(params, name) {
  if (!params.has(name)) {
    return null
  }
  const text = params.get(name) || ''
  const value = parseFloat(text)
  if (Number.isNaN(value)) {
    console.warn(`GramFrame: Invalid numeric value for ${name}: value="${text}"`)
    return null
  }
  return value
}

/**
 * Read an image-backed table (the original contract) into state.
 * @param {GramFrame} instance - GramFrame instance
 * @param {HTMLImageElement} imgElement - The first row's image
 * @param {Map<string, string>} params - Parameter rows
 */
function extractImageConfig(instance, imgElement, params) {
  if (!imgElement.src) {
    // Logged rather than thrown, as before: the missing image surfaces as the
    // loading caption never clearing, while a bad axis row is the hard error.
    console.error('GramFrame: Error setting up image:', 'Image element has no src attribute')
  } else {
    instance.state.imageDetails.url = imgElement.src
  }

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
 * @param {Map<string, string>} params - Parameter rows
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

  if (!imgElement) {
    throw new Error('No image element found in config table')
  }
  extractImageConfig(instance, imgElement, params)
}
