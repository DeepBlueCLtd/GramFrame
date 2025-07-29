/**
 * Axes rendering and layout management
 */

/// <reference path="../types.js" />

import { 
  createSVGLine,
  createSVGText,
  calculateLayoutDimensions
} from '../utils/svg.js'

import { formatTime } from '../utils/timeFormatter.js'

import { notifyStateListeners } from '../core/state.js'

/**
 * Calculate the visible data range based on zoom level and center
 * @param {number} min - Minimum data value
 * @param {number} max - Maximum data value  
 * @param {number} zoomLevel - Current zoom level
 * @param {number} center - Center position (0-1)
 * @returns {{visibleMin: number, visibleMax: number}} Visible range
 */
function calculateVisibleRange(min, max, zoomLevel, center) {
  const fullRange = max - min
  const visibleRange = fullRange / zoomLevel
  
  // Calculate offset from center
  const centerValue = min + fullRange * center
  const halfVisible = visibleRange / 2
  
  // Calculate visible bounds
  let visibleMin = centerValue - halfVisible
  let visibleMax = centerValue + halfVisible
  
  // Clamp to actual data bounds
  if (visibleMin < min) {
    visibleMin = min
    visibleMax = min + visibleRange
  } else if (visibleMax > max) {
    visibleMax = max
    visibleMin = max - visibleRange
  }
  
  return { visibleMin, visibleMax }
}

/**
 * Draw axes with tick marks and labels
 * @param {Object} instance - GramFrame instance
 */
export function drawAxes(instance) {
  if (!instance.state.imageDetails.naturalWidth || !instance.state.imageDetails.naturalHeight) return
  
  clearAxes(instance)
  drawFrequencyAxis(instance) // Horizontal axis (bottom)
  drawTimeAxis(instance)      // Vertical axis (left)
}

/**
 * Clear existing axes
 * @param {Object} instance - GramFrame instance
 */
export function clearAxes(instance) {
  instance.timeAxisGroup.innerHTML = ''
  instance.freqAxisGroup.innerHTML = ''
}

/**
 * Calculate a font size that remains visually consistent across different scales
 * @param {Object} instance - GramFrame instance
 * @returns {number} Font size adjusted for current scale
 */
function calculateScaleAdjustedFontSize(instance) {
  // Base font size that looks good at 1:1 scale
  const baseFontSize = 10
  
  // Get the viewBox dimensions from the SVG
  const viewBox = instance.svg.getAttribute('viewBox')
  if (!viewBox) return baseFontSize
  
  const [, , viewBoxWidth] = viewBox.split(' ').map(Number)
  
  // Get the actual display width
  const displayWidth = parseFloat(instance.svg.getAttribute('width') || '0')
  
  if (displayWidth === 0 || viewBoxWidth === 0) return baseFontSize
  
  // Calculate scale factor: if viewBox is larger than display, text would be smaller
  // So we need to increase font-size proportionally
  const scaleFactor = viewBoxWidth / displayWidth
  
  // Adjust font size inversely to the scale factor to maintain visual consistency
  return baseFontSize * scaleFactor
}

/**
 * Draw time axis (vertical, left)
 * @param {Object} instance - GramFrame instance
 */
export function drawTimeAxis(instance) {
  const { timeMin, timeMax } = instance.state.config
  const { naturalHeight } = instance.state.imageDetails
  const margins = instance.state.axes.margins
  const zoom = instance.state.zoom || { level: 1, centerX: 0.5, centerY: 0.5 }
  
  // Calculate visible range based on zoom
  const { visibleMin, visibleMax } = calculateVisibleRange(timeMin, timeMax, zoom.level, zoom.centerY)
  
  // Calculate tick marks for visible range
  const range = visibleMax - visibleMin
  const targetTickCount = Math.floor(naturalHeight / 50) // Aim for ticks every ~50px
  const tickCount = Math.max(2, Math.min(targetTickCount, 8))
  const tickInterval = range / (tickCount - 1)
  
  // Calculate font size that remains visually consistent
  const fontSize = calculateScaleAdjustedFontSize(instance)
  
  // Draw main axis line (along the left edge of the image)
  const axisLine = createSVGLine(
    margins.left,
    margins.top,
    margins.left,
    margins.top + naturalHeight,
    'gram-frame-axis-line'
  )
  instance.timeAxisGroup.appendChild(axisLine)
  
  // Draw tick marks and labels
  for (let i = 0; i < tickCount; i++) {
    const timeValue = visibleMin + (i * tickInterval)
    // Map visible value to visible range position
    const normalizedPos = (timeValue - visibleMin) / (visibleMax - visibleMin)
    // Y position: visibleMin at bottom, visibleMax at top (inverted because SVG y=0 is at top)
    const yPos = margins.top + naturalHeight - (normalizedPos * naturalHeight)
    
    // Tick mark (extends into the left margin)
    const tick = createSVGLine(
      margins.left - 5,
      yPos,
      margins.left,
      yPos,
      'gram-frame-axis-tick'
    )
    instance.timeAxisGroup.appendChild(tick)
    
    // Label (in the left margin)
    const label = createSVGText(
      margins.left - 8,
      yPos - 5, // Align with tick mark position
      formatTime(timeValue),
      'gram-frame-axis-label',
      'end'
    )
    label.setAttribute('font-size', String(fontSize))
    instance.timeAxisGroup.appendChild(label)
  }
}

/**
 * Draw frequency axis (horizontal, bottom)
 * @param {Object} instance - GramFrame instance
 */
export function drawFrequencyAxis(instance) {
  const { freqMin, freqMax } = instance.state.config
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  const margins = instance.state.axes.margins
  const zoom = instance.state.zoom || { level: 1, centerX: 0.5, centerY: 0.5 }
  
  // Calculate visible range based on zoom
  const { visibleMin, visibleMax } = calculateVisibleRange(freqMin, freqMax, zoom.level, zoom.centerX)
  
  // Calculate nice tick marks using tidy algorithm for visible range
  const range = visibleMax - visibleMin
  const targetTickCount = Math.floor(naturalWidth / 80) // Aim for ticks every ~80px
  const roughInterval = range / Math.max(1, targetTickCount - 1)
  
  // Find nice interval from standard set
  const niceIntervals = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]
  let tickInterval = niceIntervals[0]
  
  for (const interval of niceIntervals) {
    if (interval >= roughInterval) {
      tickInterval = interval
      break
    }
  }
  
  // Calculate actual tick positions within visible range
  const startTick = Math.ceil(visibleMin / tickInterval) * tickInterval
  const endTick = Math.floor(visibleMax / tickInterval) * tickInterval
  const tickCount = Math.floor((endTick - startTick) / tickInterval) + 1
  
  // Calculate font size that remains visually consistent
  const fontSize = calculateScaleAdjustedFontSize(instance)
  
  // Draw main axis line (along the bottom edge of the image)
  const axisLineY = margins.top + naturalHeight
  const axisLine = createSVGLine(
    margins.left,
    axisLineY,
    margins.left + naturalWidth,
    axisLineY,
    'gram-frame-axis-line'
  )
  instance.freqAxisGroup.appendChild(axisLine)
  
  // Draw tick marks and labels
  for (let i = 0; i < tickCount; i++) {
    const freqValue = startTick + (i * tickInterval)
    // Convert frequency value to pixel position relative to visible range
    const normalizedX = (freqValue - visibleMin) / (visibleMax - visibleMin)
    const xPos = margins.left + normalizedX * naturalWidth
    
    // Tick mark (extends into the bottom margin)
    const tick = createSVGLine(
      xPos,
      axisLineY,
      xPos,
      axisLineY + 5,
      'gram-frame-axis-tick'
    )
    instance.freqAxisGroup.appendChild(tick)
    
    // Label (in the bottom margin)
    const label = createSVGText(
      xPos,
      axisLineY + 18,
      freqValue.toFixed(0) + 'Hz',
      'gram-frame-axis-label',
      'middle'
    )
    label.setAttribute('font-size', String(fontSize))
    instance.freqAxisGroup.appendChild(label)
  }
}

/**
 * Handle resize events
 * @param {Object} instance - GramFrame instance
 */
export function handleResize(instance) {
  // Delegate to SVG resize handler
  const containerRect = instance.container.getBoundingClientRect()
  handleSVGResize(instance, containerRect)
}

/**
 * Handles SVG container resize
 * @param {Object} instance - GramFrame instance
 * @param {DOMRect} containerRect - Container dimensions
 */
export function handleSVGResize(instance, containerRect) {
  // Only handle resize if we have a valid image
  if (!instance.spectrogramImage) return
  
  // Calculate new dimensions while maintaining aspect ratio
  const originalWidth = instance.spectrogramImage.naturalWidth
  const originalHeight = instance.spectrogramImage.naturalHeight
  const aspectRatio = originalWidth / originalHeight
  
  // Calculate layout dimensions with margins
  const margins = instance.state.axes.margins
  const layout = calculateLayoutDimensions(
    containerRect.width,
    aspectRatio,
    originalWidth,
    originalHeight,
    margins
  )
  
  // Set new SVG dimensions (include margins)
  let newWidth = layout.newWidth
  let newHeight = layout.newHeight
  
  // Create viewBox that includes margin space
  const viewBoxWidth = layout.viewBoxWidth
  const viewBoxHeight = layout.viewBoxHeight
  
  // Only update viewBox if no zoom is active (zoom level 1.0)
  const zoom = instance.state.zoom || { level: 1 }
  if (zoom.level === 1) {
    instance.svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
  }
  instance.svg.setAttribute('width', String(newWidth))
  instance.svg.setAttribute('height', String(newHeight))
  
  // Position image directly in SVG coordinate space (no mainGroup translation)
  instance.mainGroup.setAttribute('transform', '')
  
  // Update image element within SVG - position it in the margin area
  instance.svgImage.setAttribute('width', String(originalWidth))
  instance.svgImage.setAttribute('height', String(originalHeight))
  instance.svgImage.setAttribute('x', String(margins.left))
  instance.svgImage.setAttribute('y', String(margins.top))
  
  // Update state with new dimensions
  instance.state.displayDimensions = {
    width: Math.round(newWidth),
    height: Math.round(newHeight)
  }
  
  // Redraw axes
  drawAxes(instance)
  
  // Notify listeners
  notifyStateListeners(instance.state, instance.stateListeners)
  
  // Log resize event for debugging

}