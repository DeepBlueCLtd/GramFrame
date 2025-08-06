/**
 * Cursor and visual indicator rendering
 */

/// <reference path="../types.js" />

import { createSVGLine, createSVGCircle } from '../utils/svg.js'

/**
 * Update cursor indicators based on current mode and state
 * @param {GramFrame} instance - GramFrame instance
 */
export function updateCursorIndicators(instance) {
  // Clear any existing cursor visuals
  if (instance.cursorGroup) {
    instance.cursorGroup.innerHTML = ''
  }
  
  // Only render persistent features and mode-specific elements (no cursor crosshairs)
  if (instance.featureRenderer) {
    instance.featureRenderer.renderAllPersistentFeatures()
  }
}










/**
 * Draw preview of Doppler curve during initial drag
 * @param {GramFrame} instance - GramFrame instance
 * @param {DataCoordinates} startPoint - Starting drag point
 * @param {DataCoordinates} endPoint - Current drag end point
 */
export function drawDopplerPreview(instance, startPoint, endPoint) {
  const margins = instance.state.axes.margins
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  const { timeMin, timeMax, freqMin, freqMax } = instance.state.config
  
  // For previews, always use the current selectedColor (what the curve will be when created)
  const color = instance.state.selectedColor || '#ff0000'
  
  // Determine which point is f- and f+ based on time
  let fMinus, fPlus
  if (startPoint.time < endPoint.time) {
    fMinus = startPoint
    fPlus = endPoint
  } else {
    fMinus = endPoint
    fPlus = startPoint
  }
  
  // Calculate preview f₀ as midpoint
  const fZero = {
    time: (fMinus.time + fPlus.time) / 2,
    freq: (fMinus.freq + fPlus.freq) / 2
  }
  
  // Convert points to SVG coordinates
  const convertToSVG = (point) => {
    const timeRatio = (point.time - timeMin) / (timeMax - timeMin)
    const freqRatio = (point.freq - freqMin) / (freqMax - freqMin)
    return {
      x: margins.left + freqRatio * naturalWidth,
      y: margins.top + (1 - timeRatio) * naturalHeight
    }
  }
  
  const minusSVG = convertToSVG(fMinus)
  const plusSVG = convertToSVG(fPlus)
  const zeroSVG = convertToSVG(fZero)
  
  // Draw preview markers (no labels needed)
  drawPreviewMarker(instance, minusSVG, 'fMinus', color)
  drawPreviewMarker(instance, plusSVG, 'fPlus', color)
  drawPreviewMarker(instance, zeroSVG, 'fZero', color)
  
  // Draw preview curve (semi-transparent)
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  
  // Simple S-curve with vertical tangents
  const controlPoint1X = minusSVG.x
  const controlPoint1Y = minusSVG.y + (zeroSVG.y - minusSVG.y) * 0.7
  const controlPoint2X = plusSVG.x  
  const controlPoint2Y = plusSVG.y + (zeroSVG.y - plusSVG.y) * 0.7
  
  const pathData = `
    M ${minusSVG.x} ${minusSVG.y}
    C ${controlPoint1X} ${controlPoint1Y} ${controlPoint2X} ${controlPoint2Y} ${plusSVG.x} ${plusSVG.y}
  `
  
  path.setAttribute('d', pathData.replace(/\s+/g, ' ').trim())
  path.setAttribute('stroke', color)
  path.setAttribute('stroke-width', '2')
  path.setAttribute('fill', 'none')
  path.setAttribute('opacity', '1.0')
  path.setAttribute('class', 'gram-frame-doppler-preview')
  
  instance.cursorGroup.appendChild(path)
}

/**
 * Draw a preview marker during drag
 * @param {GramFrame} instance - GramFrame instance
 * @param {SVGCoordinates} svgPos - SVG position {x, y}
 * @param {string} type - Marker type ('fZero', 'fPlus', 'fMinus')
 * @param {string} color - Color to use for the marker
 */
function drawPreviewMarker(instance, svgPos, type, color) {
  if (type === 'fZero') {
    // Draw cross-hair for f₀ preview
    const horizontalLine = createSVGLine(
      svgPos.x - 6, svgPos.y, svgPos.x + 6, svgPos.y, 
      'gram-frame-doppler-preview'
    )
    const verticalLine = createSVGLine(
      svgPos.x, svgPos.y - 6, svgPos.x, svgPos.y + 6, 
      'gram-frame-doppler-preview'
    )
    // Keep f0 marker green as it's the midpoint indicator
    horizontalLine.setAttribute('stroke', '#00ff00')
    verticalLine.setAttribute('stroke', '#00ff00')
    horizontalLine.setAttribute('stroke-width', '1')
    verticalLine.setAttribute('stroke-width', '1')
    horizontalLine.setAttribute('opacity', '1.0')
    verticalLine.setAttribute('opacity', '1.0')
    instance.cursorGroup.appendChild(horizontalLine)
    instance.cursorGroup.appendChild(verticalLine)
  } else {
    // Draw dot for f+ and f- preview
    const circle = createSVGCircle(svgPos.x, svgPos.y, 3, 'gram-frame-doppler-preview')
    circle.setAttribute('fill', color)
    circle.setAttribute('opacity', '1.0')
    instance.cursorGroup.appendChild(circle)
  }
}


