/**
 * Configuration parsing and image loading functionality
 */

/// <reference path="../types.js" />

import { calculateLayoutDimensions } from '../utils/svg.js'
import { notifyStateListeners } from './state.js'
import { drawAxes } from '../rendering/axes.js'

/**
 * Extract configuration data from HTML table and set up image loading
 * @param {Object} instance - GramFrame instance
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
    
    instance.state.imageDetails.url = imgElement.src
    
    // We'll get actual dimensions when the image loads
    instance.spectrogramImage = new Image()
    
    instance.spectrogramImage.onerror = () => {
      console.error('GramFrame: Failed to load spectrogram image:', imgElement.src)
      // Set error state but don't throw - allow component to continue
      instance.state.imageDetails.url = ''
    }
    
    instance.spectrogramImage.onload = () => {
      try {
        // Store original image dimensions in imageDetails
        if (instance.spectrogramImage) {
          instance.state.imageDetails.naturalWidth = instance.spectrogramImage.naturalWidth
          instance.state.imageDetails.naturalHeight = instance.spectrogramImage.naturalHeight
          

        
          // Calculate initial dimensions based on container size and margins
          const containerWidth = instance.container.clientWidth
          const aspectRatio = instance.spectrogramImage.naturalWidth / instance.spectrogramImage.naturalHeight
        
        // Calculate layout dimensions with margins
        const margins = instance.state.axes.margins
        const layout = calculateLayoutDimensions(
          containerWidth,
          aspectRatio,
          instance.spectrogramImage.naturalWidth,
          instance.spectrogramImage.naturalHeight,
          margins
        )
        
        // Set initial SVG dimensions (include margins)
        const initialWidth = layout.newWidth
        const initialHeight = layout.newHeight
        
        // Update the displayDimensions property for diagnostics
        instance.state.displayDimensions = {
          width: Math.round(initialWidth),
          height: Math.round(initialHeight)
        }
        
          // Create viewBox that includes margin space
          const viewBoxWidth = layout.viewBoxWidth
          const viewBoxHeight = layout.viewBoxHeight
        
        // Set SVG dimensions and viewBox
        instance.svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
        instance.svg.setAttribute('width', String(initialWidth))
        instance.svg.setAttribute('height', String(initialHeight))
        
        // Position image directly in SVG coordinate space (no mainGroup translation)
        instance.mainGroup.setAttribute('transform', '')
        
          // Set the image source in SVG - position it in the margin area
          instance.svgImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imgElement.src)
          instance.svgImage.setAttribute('width', String(instance.spectrogramImage.naturalWidth))
          instance.svgImage.setAttribute('height', String(instance.spectrogramImage.naturalHeight))
        instance.svgImage.setAttribute('x', String(margins.left))
        instance.svgImage.setAttribute('y', String(margins.top))
        
          
          // Draw initial axes
          drawAxes(instance)
          
          // Notify listeners of updated state
          notifyStateListeners(instance.state, instance.stateListeners)
        }
      } catch (error) {
        console.error('GramFrame: Error during image setup:', error)
      }
    }
    instance.spectrogramImage.src = imgElement.src
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
        if (cells.length == 2) {
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