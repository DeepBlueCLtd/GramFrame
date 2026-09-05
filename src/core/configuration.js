/**
 * Configuration parsing and image loading functionality
 */

/// <reference path="../types.js" />

// Display utilities removed - no rendering

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
 * Extract configuration data from HTML table and set up image loading
 * @param {GramFrame} instance - GramFrame instance
 */
export function extractConfigData(instance) {
  if (!instance.configTable) {
    console.warn('GramFrame: No config table provided for configuration extraction')
    return
  }
  
  // Image configuration. These errors PROPAGATE, exactly like the range errors
  // below: `createGramFrameAPI` catches them, restores the config table and
  // renders the red error indicator with the message (R9-02).
  //
  // They used to be caught and logged here. That produced the component's worst
  // failure mode: construction completed with `imageDetails.url = ''`, nothing
  // ever asked the browser for an image, and the CSS loading caption sat on a
  // complete, working-looking component saying "Loading spectrogram" forever —
  // with only a console line to say why. A missing `<img>` (wrong row order) and
  // an empty `src` (a template left unfilled) are the two mistakes an author is
  // most likely to make while assembling a lesson, and were the only two config
  // mistakes the component did not report on the page.
  const imgElement = instance.configTable.querySelector('img')
  if (!imgElement) {
    throw new Error('No image element found in config table: the first row must contain an <img> with the spectrogram')
  }

  // `getAttribute`, not the `src` property: for `<img src="">` the property
  // resolves the empty string against the document URL and comes back truthy,
  // so the property check passed and the component went on to request the page
  // itself as its spectrogram.
  const srcAttribute = imgElement.getAttribute('src')
  if (!srcAttribute || !srcAttribute.trim()) {
    throw new Error('Image element has no src attribute: the spectrogram <img> must point at an image')
  }

  // Image loading removed - storing URL only for reference
  instance.state.imageDetails.url = imgElement.src
  
  // Extract min/max values from the table rows with error handling
  try {
    const rows = instance.configTable.querySelectorAll('tr')
    /** @type {number | null} */
    let timeStart = null
    /** @type {number | null} */
    let timeEnd = null
    /** @type {number | null} */
    let freqStart = null
    /** @type {number | null} */
    let freqEnd = null
    
    rows.forEach((row, index) => {
      try {
        const cells = row.querySelectorAll('td')
        if (cells.length === 2) {
          const param = cells[0].textContent?.trim() || ''
          if (param !== 'time-start' && param !== 'time-end' && param !== 'freq-start' && param !== 'freq-end') {
            // Not one of the four parameters. A config table may carry rows of
            // its own; only the recognised ones are required to hold numbers.
            return
          }

          const valueText = cells[1].textContent?.trim() || ''
          const value = parseConfigValue(valueText)

          if (value === null) {
            // Left unset on purpose. A rejected value must not be replaced by a
            // guess: falling through leaves the parameter null, and the
            // "must be present with valid numeric values" error below reports it
            // on the page instead of drawing an axis nobody asked for.
            console.warn(`GramFrame: Ignoring ${param} in row ${index + 1} — "${valueText}" is not a single numeric value`)
            return
          }

          if (param === 'time-start') {
            timeStart = value
          } else if (param === 'time-end') {
            timeEnd = value
          } else if (param === 'freq-start') {
            freqStart = value
          } else if (param === 'freq-end') {
            freqEnd = value
          }
        }
      } catch (error) {
        console.warn(`GramFrame: Error parsing row ${index + 1}:`, error instanceof Error ? error.message : String(error))
      }
    })
    
    // Set time configuration - require both start and end
    if (timeStart === null || timeEnd === null) {
      throw new Error('Missing required time configuration: both time-start and time-end must be present with valid numeric values')
    }
    
    if (timeStart >= timeEnd) {
      throw new Error(`Invalid time range: start (${timeStart}) must be less than end (${timeEnd})`)
    }
    
    instance.state.config.timeMin = timeStart
    instance.state.config.timeMax = timeEnd
    
    // Set frequency configuration - require both start and end
    if (freqStart === null || freqEnd === null) {
      throw new Error('Missing required frequency configuration: both freq-start and freq-end must be present with valid numeric values')
    }
    
    if (freqStart >= freqEnd) {
      throw new Error(`Invalid frequency range: start (${freqStart}) must be less than end (${freqEnd})`)
    }
    
    instance.state.config.freqMin = freqStart
    instance.state.config.freqMax = freqEnd
    
  } catch (error) {
    // Re-throw the error so createGramFrameAPI can handle it and show error to user
    throw error
  }
}