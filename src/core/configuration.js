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
    console.error('GramFrame: Error setting up image:', error.message)
  }
  
  // Extract min/max values from the table rows with error handling
  try {
    const rows = instance.configTable.querySelectorAll('tr')
    let foundTimeConfig = false
    let foundFreqConfig = false
    
    rows.forEach((row, index) => {
      try {
        const cells = row.querySelectorAll('td')
        if (cells.length >= 3) {
          const param = cells[0].textContent?.trim() || ''
          const minText = cells[1].textContent?.trim() || '0'
          const maxText = cells[2].textContent?.trim() || '0'
          
          const min = parseFloat(minText)
          const max = parseFloat(maxText)
          
          if (isNaN(min) || isNaN(max)) {
            console.warn(`GramFrame: Invalid numeric values in row ${index + 1}: min="${minText}", max="${maxText}"`)
            return
          }
          
          if (min >= max) {
            console.warn(`GramFrame: Invalid range in row ${index + 1}: min (${min}) >= max (${max})`)
            return
          }
          
          if (param === 'time') {
            instance.state.config.timeMin = min
            instance.state.config.timeMax = max
            foundTimeConfig = true

          } else if (param === 'freq') {
            instance.state.config.freqMin = min
            instance.state.config.freqMax = max
            foundFreqConfig = true

          }
        }
      } catch (error) {
        console.warn(`GramFrame: Error parsing row ${index + 1}:`, error.message)
      }
    })
    
    // Validate that we found required configuration
    if (!foundTimeConfig) {
      console.warn('GramFrame: No valid time configuration found, using defaults (0-60s)')
      instance.state.config.timeMin = 0
      instance.state.config.timeMax = 60
    }
    
    if (!foundFreqConfig) {
      console.warn('GramFrame: No valid frequency configuration found, using defaults (0-100Hz)')
      instance.state.config.freqMin = 0
      instance.state.config.freqMax = 100
    }
    
  } catch (error) {
    console.error('GramFrame: Error extracting configuration data:', error.message)
    // Set safe defaults
    instance.state.config = {
      timeMin: 0,
      timeMax: 60,
      freqMin: 0,
      freqMax: 100
    }
  }
}