/**
 * Cursor and visual indicator rendering
 */

/// <reference path="../types.js" />

import { dataToSVGCoordinates } from '../utils/coordinates.js'
import { createSVGLine, createSVGText } from '../utils/svg.js'

/**
 * Update cursor indicators based on current mode and state
 * @param {Object} instance - GramFrame instance
 */
export function updateCursorIndicators(instance) {
  // Clear existing cursor indicators
  instance.cursorGroup.innerHTML = ''
  
  // Check if we have valid image dimensions
  if (!instance.state.imageDetails.naturalWidth || !instance.state.imageDetails.naturalHeight) {
    return
  }
  
  // Handle different modes
  if (instance.state.mode === 'analysis') {
    // Only draw analysis crosshairs if cursor position is available
    if (instance.state.cursorPosition) {
      drawAnalysisMode(instance)
    }
  } else if (instance.state.mode === 'harmonics') {
    drawHarmonicsMode(instance)
  } else if (instance.state.mode === 'doppler') {
    drawDopplerMode(instance)
  }
}

/**
 * Draw cursor indicators for analysis mode
 * @param {Object} instance - GramFrame instance
 */
export function drawAnalysisMode(instance) {
  if (!instance.state.cursorPosition) return
  
  const margins = instance.state.axes.margins
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  
  // Calculate cursor position in SVG coordinates (accounting for margins)
  const cursorSVGX = margins.left + instance.state.cursorPosition.imageX
  const cursorSVGY = margins.top + instance.state.cursorPosition.imageY
  
  // Create vertical crosshair lines (time indicator) - shadow first, then main line
  const verticalShadow = createSVGLine(
    cursorSVGX,
    margins.top,
    cursorSVGX,
    margins.top + naturalHeight,
    'gram-frame-cursor-shadow'
  )
  instance.cursorGroup.appendChild(verticalShadow)
  
  const verticalLine = createSVGLine(
    cursorSVGX,
    margins.top,
    cursorSVGX,
    margins.top + naturalHeight,
    'gram-frame-cursor-vertical'
  )
  instance.cursorGroup.appendChild(verticalLine)
  
  // Create horizontal crosshair lines (frequency indicator) - shadow first, then main line
  const horizontalShadow = createSVGLine(
    margins.left,
    cursorSVGY,
    margins.left + naturalWidth,
    cursorSVGY,
    'gram-frame-cursor-shadow'
  )
  instance.cursorGroup.appendChild(horizontalShadow)
  
  const horizontalLine = createSVGLine(
    margins.left,
    cursorSVGY,
    margins.left + naturalWidth,
    cursorSVGY,
    'gram-frame-cursor-horizontal'
  )
  instance.cursorGroup.appendChild(horizontalLine)
  
  // Create center point indicator
  const centerPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  centerPoint.setAttribute('cx', String(cursorSVGX))
  centerPoint.setAttribute('cy', String(cursorSVGY))
  centerPoint.setAttribute('r', '3')
  centerPoint.setAttribute('class', 'gram-frame-cursor-point')
  instance.cursorGroup.appendChild(centerPoint)
}

/**
 * Draw harmonic indicators
 * @param {Object} instance - GramFrame instance
 */
export function drawHarmonicsMode(instance) {
  // Draw cross-hairs if cursor position is available, but not when dragging harmonics
  // (dragging harmonics would obscure the harmonic sets with the cross-hairs)
  if (instance.state.cursorPosition && !instance.state.dragState.isDragging) {
    drawAnalysisMode(instance)
  }
  
  // Draw persistent harmonic sets (always visible)
  instance.state.harmonics.harmonicSets.forEach(harmonicSet => {
    drawHarmonicSetLines(instance, harmonicSet)
  })
  
  // Old harmonics system disabled - now using harmonic sets exclusively
}

/**
 * Draw harmonic set lines
 * @param {Object} instance - GramFrame instance  
 * @param {HarmonicSet} harmonicSet - Harmonic set to render
 */
export function drawHarmonicSetLines(instance, harmonicSet) {
  const margins = instance.state.axes.margins
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  const { freqMin, freqMax } = instance.state.config
  
  // Calculate visible harmonic lines
  const minHarmonic = Math.max(1, Math.ceil(freqMin / harmonicSet.spacing))
  const maxHarmonic = Math.floor(freqMax / harmonicSet.spacing)
  
  // Calculate vertical extent (20% of SVG height, centered on anchor time)
  const lineHeight = naturalHeight * 0.2
  const timeRange = instance.state.config.timeMax - instance.state.config.timeMin
  const timeRatio = (harmonicSet.anchorTime - instance.state.config.timeMin) / timeRange
  // Invert the Y coordinate since Y=0 is at top but timeMin should be at bottom
  const anchorSVGY = margins.top + (1 - timeRatio) * naturalHeight
  const lineStartY = anchorSVGY - lineHeight / 2
  const lineEndY = anchorSVGY + lineHeight / 2
  
  // Draw harmonic lines
  for (let harmonic = minHarmonic; harmonic <= maxHarmonic; harmonic++) {
    const freq = harmonic * harmonicSet.spacing
    
    // Convert frequency to SVG x coordinate
    const freqRatio = (freq - freqMin) / (freqMax - freqMin)
    const svgX = margins.left + freqRatio * naturalWidth
    
    // Draw shadow line for visibility
    const shadowLine = createSVGLine(
      svgX,
      lineStartY,
      svgX,
      lineEndY,
      'gram-frame-harmonic-set-shadow'
    )
    instance.cursorGroup.appendChild(shadowLine)
    
    // Draw main line with harmonic set color
    const mainLine = createSVGLine(
      svgX,
      lineStartY,
      svgX,
      lineEndY,
      'gram-frame-harmonic-set-line'
    )
    mainLine.setAttribute('stroke', harmonicSet.color)
    mainLine.setAttribute('stroke-width', '2')
    instance.cursorGroup.appendChild(mainLine)
    
    // Add harmonic number label at the top of the line
    const label = createSVGText(
      svgX + 3, // Slight offset to the right of the line
      lineStartY - 3, // Slightly above the line
      String(harmonic),
      'gram-frame-harmonic-label',
      'start'
    )
    label.setAttribute('fill', harmonicSet.color)
    label.setAttribute('font-size', '12')
    label.setAttribute('font-weight', 'bold')
    instance.cursorGroup.appendChild(label)
  }
}

/**
 * Draw a single harmonic line
 * @param {Object} instance - GramFrame instance
 * @param {HarmonicData} harmonic - Harmonic data
 * @param {boolean} isMainLine - Whether this is the main (1x) line
 */
export function drawHarmonicLine(instance, harmonic, isMainLine) {
  const margins = instance.state.axes.margins
  const { naturalHeight } = instance.state.imageDetails
  
  // Draw shadow line first for visibility
  const shadowLine = createSVGLine(
    harmonic.svgX,
    margins.top,
    harmonic.svgX,
    margins.top + naturalHeight,
    'gram-frame-harmonic-shadow'
  )
  instance.cursorGroup.appendChild(shadowLine)
  
  // Draw main line
  const mainLine = createSVGLine(
    harmonic.svgX,
    margins.top,
    harmonic.svgX,
    margins.top + naturalHeight,
    isMainLine ? 'gram-frame-harmonic-main' : 'gram-frame-harmonic-line'
  )
  
  instance.cursorGroup.appendChild(mainLine)
}

/**
 * Draw labels for a harmonic line
 * @param {Object} instance - GramFrame instance
 * @param {HarmonicData} harmonic - Harmonic data
 * @param {boolean} isMainLine - Whether this is the main (1x) line
 */
export function drawHarmonicLabels(instance, harmonic, isMainLine) {
  const margins = instance.state.axes.margins
  const labelY = margins.top + 15 // Position labels near the top
  
  // Create harmonic number label (left side of line)
  const numberLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  numberLabel.setAttribute('x', String(harmonic.svgX - 5))
  numberLabel.setAttribute('y', String(labelY))
  numberLabel.setAttribute('text-anchor', 'end')
  numberLabel.setAttribute('class', 'gram-frame-harmonic-label')
  numberLabel.setAttribute('font-size', '10')
  numberLabel.textContent = `${harmonic.number}×`
  instance.cursorGroup.appendChild(numberLabel)
  
  // Create frequency label (right side of line)
  const frequencyLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  frequencyLabel.setAttribute('x', String(harmonic.svgX + 5))
  frequencyLabel.setAttribute('y', String(labelY))
  frequencyLabel.setAttribute('text-anchor', 'start')
  frequencyLabel.setAttribute('class', 'gram-frame-harmonic-label')
  frequencyLabel.setAttribute('font-size', '10')
  frequencyLabel.textContent = `${Math.round(harmonic.frequency)} Hz`
  instance.cursorGroup.appendChild(frequencyLabel)
}

/**
 * Draw Doppler mode indicators and curve
 * @param {Object} instance - GramFrame instance
 */
export function drawDopplerMode(instance) {
  const doppler = instance.state.doppler
  
  // Draw markers if they exist
  if (doppler.fMinus) {
    drawDopplerMarker(instance, doppler.fMinus, 'fMinus')
  }
  if (doppler.fPlus) {
    drawDopplerMarker(instance, doppler.fPlus, 'fPlus')
  }
  if (doppler.fZero) {
    drawDopplerMarker(instance, doppler.fZero, 'fZero')
  }
  
  // Draw the curve if both f+ and f- exist
  if (doppler.fPlus && doppler.fMinus) {
    drawDopplerCurve(instance, doppler.fPlus, doppler.fMinus, doppler.fZero)
    drawDopplerVerticalExtension(instance, doppler.fPlus)
  }
}

/**
 * Draw a Doppler marker
 * @param {Object} instance - GramFrame instance
 * @param {Object} point - DopplerPoint with time and frequency
 * @param {string} type - Marker type ('fPlus', 'fMinus', 'fZero')
 */
export function drawDopplerMarker(instance, point, type) {
  const margins = instance.state.axes.margins
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  const { timeMin, timeMax, freqMin, freqMax } = instance.state.config
  
  // Convert data coordinates to SVG coordinates
  const timeRatio = (point.time - timeMin) / (timeMax - timeMin)
  const freqRatio = (point.frequency - freqMin) / (freqMax - freqMin)
  
  // Invert Y coordinate since Y=0 is at top but timeMin should be at bottom
  const svgX = margins.left + freqRatio * naturalWidth
  const svgY = margins.top + (1 - timeRatio) * naturalHeight
  
  if (type === 'fZero') {
    // Draw cross-hair for f₀
    const horizontalLine = createSVGLine(
      svgX - 8, svgY, svgX + 8, svgY, 
      'gram-frame-doppler-crosshair'
    )
    const verticalLine = createSVGLine(
      svgX, svgY - 8, svgX, svgY + 8, 
      'gram-frame-doppler-crosshair'
    )
    horizontalLine.setAttribute('stroke', '#00ff00')
    verticalLine.setAttribute('stroke', '#00ff00')
    horizontalLine.setAttribute('stroke-width', '2')
    verticalLine.setAttribute('stroke-width', '2')
    instance.cursorGroup.appendChild(horizontalLine)
    instance.cursorGroup.appendChild(verticalLine)
    
    // Add f₀ label
    const label = createSVGText(
      svgX + 12, svgY - 5,
      'f₀',
      'gram-frame-doppler-label',
      'start'
    )
    label.setAttribute('fill', '#00ff00')
    label.setAttribute('font-size', '14')
    label.setAttribute('font-weight', 'bold')
    instance.cursorGroup.appendChild(label)
  } else {
    // Draw dot for f+ and f-
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', String(svgX))
    circle.setAttribute('cy', String(svgY))
    circle.setAttribute('r', '4')
    circle.setAttribute('class', `gram-frame-doppler-${type}`)
    
    let color = '#000000'
    let labelText = ''
    
    if (type === 'fPlus') {
      color = '#ff0000'
      labelText = 'f+'
    } else if (type === 'fMinus') {
      color = '#ff0000'
      labelText = 'f−'
    }
    
    circle.setAttribute('fill', color)
    instance.cursorGroup.appendChild(circle)
    
    // Add label
    const label = createSVGText(
      svgX + 8, svgY - 5,
      labelText,
      'gram-frame-doppler-label',
      'start'
    )
    label.setAttribute('fill', color)
    label.setAttribute('font-size', '14')
    label.setAttribute('font-weight', 'bold')
    instance.cursorGroup.appendChild(label)
  }
}

/**
 * Draw the S-curve between f+ and f- markers
 * @param {Object} instance - GramFrame instance
 * @param {Object} fPlus - f+ point
 * @param {Object} fMinus - f- point
 * @param {Object} fZero - f₀ point (optional)
 */
export function drawDopplerCurve(instance, fPlus, fMinus, fZero) {
  const margins = instance.state.axes.margins
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  const { timeMin, timeMax, freqMin, freqMax } = instance.state.config
  
  // Convert points to SVG coordinates
  const convertToSVG = (point) => {
    const timeRatio = (point.time - timeMin) / (timeMax - timeMin)
    const freqRatio = (point.frequency - freqMin) / (freqMax - freqMin)
    return {
      x: margins.left + freqRatio * naturalWidth,
      y: margins.top + (1 - timeRatio) * naturalHeight
    }
  }
  
  const plusSVG = convertToSVG(fPlus)
  const minusSVG = convertToSVG(fMinus)
  
  // Use fZero if provided, otherwise use midpoint
  let zeroSVG
  if (fZero) {
    zeroSVG = convertToSVG(fZero)
  } else {
    zeroSVG = {
      x: (plusSVG.x + minusSVG.x) / 2,
      y: (plusSVG.y + minusSVG.y) / 2
    }
  }
  
  // Create simple S-curve (curved portion only, no vertical extensions)
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  
  // Draw simple S-curve with only 2 bends using single cubic Bézier
  // Control points positioned to start/end with vertical tangents (zero frequency rate)
  const controlPoint1X = minusSVG.x
  const controlPoint1Y = minusSVG.y + (zeroSVG.y - minusSVG.y) * 0.7
  const controlPoint2X = plusSVG.x  
  const controlPoint2Y = plusSVG.y + (zeroSVG.y - plusSVG.y) * 0.7
  
  const pathData = `
    M ${minusSVG.x} ${minusSVG.y}
    C ${controlPoint1X} ${controlPoint1Y} ${controlPoint2X} ${controlPoint2Y} ${plusSVG.x} ${plusSVG.y}
  `
  
  path.setAttribute('d', pathData.replace(/\s+/g, ' ').trim())
  path.setAttribute('stroke', '#ff0000')
  path.setAttribute('stroke-width', '2')
  path.setAttribute('fill', 'none')
  path.setAttribute('class', 'gram-frame-doppler-curve')
  
  instance.cursorGroup.appendChild(path)
}

/**
 * Draw vertical extension from f+ marker to top of spectrogram
 * @param {Object} instance - GramFrame instance
 * @param {Object} fPlus - f+ point
 */
export function drawDopplerVerticalExtension(instance, fPlus) {
  const margins = instance.state.axes.margins
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  const { timeMin, timeMax, freqMin, freqMax } = instance.state.config
  
  // Convert f+ to SVG coordinates
  const timeRatio = (fPlus.time - timeMin) / (timeMax - timeMin)
  const freqRatio = (fPlus.frequency - freqMin) / (freqMax - freqMin)
  const plusX = margins.left + freqRatio * naturalWidth
  const plusY = margins.top + (1 - timeRatio) * naturalHeight
  
  // Draw vertical line from f+ to top of spectrogram (highest time value)
  const verticalLine = createSVGLine(
    plusX, plusY,
    plusX, margins.top,
    'gram-frame-doppler-extension'
  )
  verticalLine.setAttribute('stroke', '#ff0000')
  verticalLine.setAttribute('stroke-width', '2')
  verticalLine.setAttribute('fill', 'none')
  
  instance.cursorGroup.appendChild(verticalLine)
}


