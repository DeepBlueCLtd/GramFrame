/**
 * Configuration parsing and image loading functionality
 */

/// <reference path="../types.js" />

// Display utilities removed - no rendering

/**
 * Extract configuration data from HTML table and set up image loading
 * @param {GramFrame} instance - GramFrame instance
 */
export function extractConfigData(instance) {
  if (!instance.configTable) {
    console.warn('GramFrame: No config table provided for configuration extraction')
    return
  }
  
  try {
    // Get image URL from the first row
    const imgElement = instance.configTable.querySelector('img')
    if (!imgElement) {
      throw new Error('No image element found in config table')
    }
    
    if (!imgElement.src) {
      throw new Error('Image element has no src attribute')
    }
    
    // Image loading removed - storing URL only for reference
    instance.state.imageDetails.url = imgElement.src
  } catch (error) {
    console.error('GramFrame: Error setting up image:', error instanceof Error ? error.message : String(error))
  }
  
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
          const valueText = cells[1].textContent?.trim() || '0'
          
          const value = parseFloat(valueText)
          
          if (isNaN(value)) {
            console.warn(`GramFrame: Invalid numeric value in row ${index + 1}: value="${valueText}"`)
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