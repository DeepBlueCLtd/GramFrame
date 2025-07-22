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
    
    // Draw a 1px dashed harmonic line using two overlapping lines:
    // 1) White dashes
    // 2) Colored dashes offset to fill the gaps
    // This achieves a two-color dashed effect while keeping overall thickness to 1px

    // White dash line
    const whiteDash = createSVGLine(
      svgX,
      lineStartY,
      svgX,
      lineEndY,
      'gram-frame-harmonic-dash-white'
    )
    whiteDash.setAttribute('stroke', '#ffffff')
    whiteDash.setAttribute('stroke-width', '1')
    whiteDash.setAttribute('stroke-dasharray', '4 4')
    instance.cursorGroup.appendChild(whiteDash)

    // Colored dash line (offset so dashes appear between white segments)
    const colorDash = createSVGLine(
      svgX,
      lineStartY,
      svgX,
      lineEndY,
      'gram-frame-harmonic-dash-color'
    )
    colorDash.setAttribute('stroke', harmonicSet.color)
    colorDash.setAttribute('stroke-width', '1')
    colorDash.setAttribute('stroke-dasharray', '4 4')
    colorDash.setAttribute('stroke-dashoffset', '4')
    instance.cursorGroup.appendChild(colorDash)
    
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
 * Draw Doppler mode indicators
 * @param {Object} instance - GramFrame instance
 */
export function drawDopplerMode(instance) {
  // Draw normal crosshairs for current cursor position
  if (instance.state.cursorPosition) {
    drawAnalysisMode(instance)
  }
  
  // Draw start point marker if set
  if (instance.state.doppler.startPoint) {
    drawDopplerPoint(instance, instance.state.doppler.startPoint, 'start')
  }
  
  // Draw end point marker and line if both points are set
  if (instance.state.doppler.endPoint) {
    drawDopplerPoint(instance, instance.state.doppler.endPoint, 'end')
    drawDopplerLine(instance)
  }
}

/**
 * Draw a Doppler measurement point
 * @param {Object} instance - GramFrame instance
 * @param {DopplerPoint} point - Point data
 * @param {'start'|'end'} type - Point type
 */
export function drawDopplerPoint(instance, point, type) {
  const margins = instance.state.axes.margins
  
  // Convert data coordinates to SVG coordinates
  const dataCoords = dataToSVGCoordinates(point.freq, point.time, instance.state.config, instance.state.imageDetails, instance.state.rate)
  const svgX = margins.left + dataCoords.x
  const svgY = margins.top + dataCoords.y
  
  // Draw point marker
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  marker.setAttribute('cx', String(svgX))
  marker.setAttribute('cy', String(svgY))
  marker.setAttribute('r', '5')
  marker.setAttribute('class', `gram-frame-doppler-${type}-point`)
  instance.cursorGroup.appendChild(marker)
  
  // Draw point label
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  label.setAttribute('x', String(svgX + 8))
  label.setAttribute('y', String(svgY - 8))
  label.setAttribute('class', 'gram-frame-doppler-label')
  label.setAttribute('font-size', '12')
  label.textContent = type === 'start' ? '1' : '2'
  instance.cursorGroup.appendChild(label)
}

/**
 * Draw line between Doppler measurement points
 * @param {Object} instance - GramFrame instance
 */
export function drawDopplerLine(instance) {
  if (!instance.state.doppler.startPoint || !instance.state.doppler.endPoint) {
    return
  }
  
  const margins = instance.state.axes.margins
  
  // Convert data coordinates to SVG coordinates
  const startCoords = dataToSVGCoordinates(instance.state.doppler.startPoint.freq, instance.state.doppler.startPoint.time, instance.state.config, instance.state.imageDetails, instance.state.rate)
  const endCoords = dataToSVGCoordinates(instance.state.doppler.endPoint.freq, instance.state.doppler.endPoint.time, instance.state.config, instance.state.imageDetails, instance.state.rate)
  
  const startX = margins.left + startCoords.x
  const startY = margins.top + startCoords.y
  const endX = margins.left + endCoords.x
  const endY = margins.top + endCoords.y
  
  // Draw shadow line for visibility
  const shadowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  shadowLine.setAttribute('x1', String(startX))
  shadowLine.setAttribute('y1', String(startY))
  shadowLine.setAttribute('x2', String(endX))
  shadowLine.setAttribute('y2', String(endY))
  shadowLine.setAttribute('stroke-width', '4')
  shadowLine.setAttribute('class', 'gram-frame-doppler-line-shadow')
  instance.cursorGroup.appendChild(shadowLine)
  
  // Draw main line
  const mainLine = createSVGLine(
    startX,
    startY,
    endX,
    endY,
    'gram-frame-doppler-line'
  )
  mainLine.setAttribute('stroke-width', '2')
  instance.cursorGroup.appendChild(mainLine)
}