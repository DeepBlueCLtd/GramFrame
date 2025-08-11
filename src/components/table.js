/**
 * Table and DOM structure creation for GramFrame component
 */

/// <reference path="../types.js" />

import { formatTime } from '../utils/timeFormatter.js'
import { notifyStateListeners } from '../core/state.js'

/**
 * Create the complete DOM structure for the GramFrame component
 * @param {GramFrame} instance - GramFrame instance to populate with DOM elements
 * @returns {TableElements} Object containing all created DOM elements
 */
export function createComponentStructure(instance) {
  // Create a container to replace the table
  instance.container = document.createElement('div')
  instance.container.className = 'gram-frame-container'
  
  // Create table structure for proper resizing
  instance.table = document.createElement('div')
  instance.table.className = 'gram-frame-table'
  instance.container.appendChild(instance.table)
  
  // Create mode header row
  instance.modeRow = document.createElement('div')
  instance.modeRow.className = 'gram-frame-row'
  instance.table.appendChild(instance.modeRow)
  
  instance.modeCell = document.createElement('div')
  instance.modeCell.className = 'gram-frame-cell gram-frame-mode-header'
  instance.modeRow.appendChild(instance.modeCell)
  
  // Create main panel row (stretches)
  instance.mainRow = document.createElement('div')
  instance.mainRow.className = 'gram-frame-row'
  instance.mainRow.style.height = '100%'
  instance.table.appendChild(instance.mainRow)
  
  instance.mainCell = document.createElement('div')
  instance.mainCell.className = 'gram-frame-cell gram-frame-main-panel'
  instance.mainRow.appendChild(instance.mainCell)
  
  // Create SVG container for spectrogram display
  instance.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  instance.svg.setAttribute('class', 'gram-frame-svg')
  instance.svg.style.width = '100%'
  instance.svg.style.height = '100%'
  instance.svg.style.display = 'block'
  instance.mainCell.appendChild(instance.svg)
  
  // Create clipping paths for both image and cursor group with unique IDs
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  instance.svg.appendChild(defs)
  
  const clipPathId = `imageClip-${instance.instanceId || Date.now()}`
  const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
  clipPath.setAttribute('id', clipPathId)
  defs.appendChild(clipPath)
  
  instance.imageClipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  clipPath.appendChild(instance.imageClipRect)
  
  // Create second clipping path for cursor group features
  const cursorClipPathId = `cursorClip-${instance.instanceId || Date.now()}`
  const cursorClipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
  cursorClipPath.setAttribute('id', cursorClipPathId)
  defs.appendChild(cursorClipPath)
  
  instance.cursorClipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  cursorClipPath.appendChild(instance.cursorClipRect)
  
  // Create image element within SVG
  instance.spectrogramImage = document.createElementNS('http://www.w3.org/2000/svg', 'image')
  instance.spectrogramImage.setAttribute('class', 'gram-frame-spectrogram-image')
  instance.spectrogramImage.setAttribute('clip-path', `url(#${clipPathId})`)
  instance.svg.appendChild(instance.spectrogramImage)
  
  // Create cursor group for overlays with clipping applied
  instance.cursorGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  instance.cursorGroup.setAttribute('class', 'gram-frame-cursors')
  instance.cursorGroup.setAttribute('clip-path', `url(#${cursorClipPathId})`)
  instance.svg.appendChild(instance.cursorGroup)
  
  // Create axes group
  instance.axesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  instance.axesGroup.setAttribute('class', 'gram-frame-axes')
  instance.svg.appendChild(instance.axesGroup)
  
  instance.readoutPanel = document.createElement('div')
  instance.readoutPanel.className = 'gram-frame-readout'
  // Will be appended to modeCell in UIComponents.js
  
  return {
    container: instance.container,
    table: instance.table,
    modeRow: instance.modeRow,
    modeCell: instance.modeCell,
    mainRow: instance.mainRow,
    mainCell: instance.mainCell,
    readoutPanel: instance.readoutPanel,
    svg: instance.svg,
    spectrogramImage: instance.spectrogramImage,
    cursorGroup: instance.cursorGroup,
    axesGroup: instance.axesGroup,
    imageClipRect: instance.imageClipRect,
    cursorClipRect: instance.cursorClipRect
  }
}

/**
 * Set up spectrogram image display within SVG container
 * @param {GramFrame} instance - GramFrame instance
 * @param {string} imageUrl - URL of the spectrogram image
 */
export function setupSpectrogramImage(instance, imageUrl) {
  if (!instance.spectrogramImage || !imageUrl) {
    return
  }
  
  // Set image source
  instance.spectrogramImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imageUrl)
  
  // Store URL in state
  instance.state.imageDetails.url = imageUrl
  
  // Load image to get natural dimensions
  const tempImg = new Image()
  tempImg.onload = function() {
    // Store natural dimensions
    instance.state.imageDetails.naturalWidth = tempImg.naturalWidth
    instance.state.imageDetails.naturalHeight = tempImg.naturalHeight
    
    // Update SVG layout
    updateSVGLayout(instance)
    
    // Render axes
    renderAxes(instance)
    
    // Notify listeners of updated dimensions
    notifyStateListeners(instance.state, instance.stateListeners)
  }
  tempImg.src = imageUrl
}

/**
 * Update SVG layout and viewBox based on image dimensions and margins
 * @param {GramFrame} instance - GramFrame instance
 */
export function updateSVGLayout(instance) {
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  const margins = instance.state.margins
  
  if (!naturalWidth || !naturalHeight) {
    return
  }
  
  // Use the image's natural dimensions as the axes area
  // This way each image fills its axes completely
  const axesWidth = naturalWidth
  const axesHeight = naturalHeight
  
  // Calculate total container dimensions = image + decorations (margins)
  const totalWidth = axesWidth + margins.left + margins.right
  const totalHeight = axesHeight + margins.top + margins.bottom
  
  // Let the container size naturally, but ensure SVG is properly sized
  instance.container.style.width = 'auto'
  instance.container.style.height = 'auto'
  instance.container.style.aspectRatio = 'unset' // Remove aspect ratio constraint
  
  // Set SVG to explicit dimensions so container wraps around it naturally
  instance.svg.style.width = `${totalWidth}px`
  instance.svg.style.height = `${totalHeight}px`
  instance.svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
  instance.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  
  // Position image to fill the axes area completely
  instance.spectrogramImage.setAttribute('x', String(margins.left))
  instance.spectrogramImage.setAttribute('y', String(margins.top))
  instance.spectrogramImage.setAttribute('width', String(axesWidth))
  instance.spectrogramImage.setAttribute('height', String(axesHeight))
  
  // Set up clipping rectangle to match axes area
  if (instance.imageClipRect) {
    instance.imageClipRect.setAttribute('x', String(margins.left))
    instance.imageClipRect.setAttribute('y', String(margins.top))
    instance.imageClipRect.setAttribute('width', String(axesWidth))
    instance.imageClipRect.setAttribute('height', String(axesHeight))
  }
  
  // Update cursor clipping rectangle with identical dimensions
  if (instance.cursorClipRect) {
    instance.cursorClipRect.setAttribute('x', String(margins.left))
    instance.cursorClipRect.setAttribute('y', String(margins.top))
    instance.cursorClipRect.setAttribute('width', String(axesWidth))
    instance.cursorClipRect.setAttribute('height', String(axesHeight))
  }
  
  // Apply zoom if needed
  applyZoomTransform(instance)
}

/**
 * Apply zoom transformation to spectrogram image only
 * @param {GramFrame} instance - GramFrame instance
 */
export function applyZoomTransform(instance) {
  const { level, centerX, centerY } = instance.state.zoom
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  const margins = instance.state.margins
  
  if (!instance.spectrogramImage) {
    return
  }
  
  if (level === 1.0) {
    // No zoom - reset to axes position and size
    instance.spectrogramImage.setAttribute('x', String(margins.left))
    instance.spectrogramImage.setAttribute('y', String(margins.top))
    instance.spectrogramImage.setAttribute('width', String(naturalWidth))
    instance.spectrogramImage.setAttribute('height', String(naturalHeight))
    instance.spectrogramImage.removeAttribute('transform')
    
    // Update axes to show full data range
    renderAxes(instance)
    
    // Re-render all persistent features to update positions for reset zoom
    if (instance.featureRenderer) {
      instance.featureRenderer.renderAllPersistentFeatures()
    }
    
    return
  }
  
  // Calculate zoom center in image coordinates (0-1 normalized to image pixels)
  const centerImageX = centerX * naturalWidth
  const centerImageY = centerY * naturalHeight
  
  // Calculate new image dimensions
  const zoomedWidth = naturalWidth * level
  const zoomedHeight = naturalHeight * level
  
  // Calculate new position to keep zoom center in the same place
  const newX = margins.left + centerImageX - (centerImageX * level)
  const newY = margins.top + centerImageY - (centerImageY * level)
  
  // Apply zoom to image only
  instance.spectrogramImage.setAttribute('x', String(newX))
  instance.spectrogramImage.setAttribute('y', String(newY))
  instance.spectrogramImage.setAttribute('width', String(zoomedWidth))
  instance.spectrogramImage.setAttribute('height', String(zoomedHeight))
  
  // Update axes to reflect the new visible data range
  renderAxes(instance)
  
  // Re-render all persistent features to update positions for zoom/pan
  if (instance.featureRenderer) {
    instance.featureRenderer.renderAllPersistentFeatures()
  }
}

/**
 * Render time and frequency axes
 * @param {GramFrame} instance - GramFrame instance
 */
export function renderAxes(instance) {
  if (!instance.axesGroup) {
    return
  }
  
  // Clear existing axes
  instance.axesGroup.innerHTML = ''
  
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  const margins = instance.state.margins
  
  if (!naturalWidth || !naturalHeight) {
    return
  }
  
  // Calculate visible data range based on zoom
  const visibleRange = calculateVisibleDataRange(instance)
  
  // Render frequency axis (bottom/horizontal - x-axis)
  renderFrequencyAxis(instance, margins, naturalWidth, naturalHeight, visibleRange.freqMin, visibleRange.freqMax)
  
  // Render time axis (left/vertical - y-axis)
  renderTimeAxis(instance, margins, naturalWidth, naturalHeight, visibleRange.timeMin, visibleRange.timeMax)
}

/**
 * Calculate the visible data range based on current zoom level and position
 * @param {GramFrame} instance - GramFrame instance
 * @returns {DataRange} Visible data range
 */
export function calculateVisibleDataRange(instance) {
  const { timeMin, timeMax, freqMin, freqMax } = instance.state.config
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  const margins = instance.state.margins
  const zoomLevel = instance.state.zoom.level
  
  if (zoomLevel === 1.0) {
    // No zoom - return full range
    return { timeMin, timeMax, freqMin, freqMax }
  }
  
  // Get current image position and dimensions
  let imageLeft = margins.left
  let imageTop = margins.top
  let imageWidth = naturalWidth
  let imageHeight = naturalHeight
  
  if (instance.spectrogramImage) {
    imageLeft = parseFloat(instance.spectrogramImage.getAttribute('x') || String(margins.left))
    imageTop = parseFloat(instance.spectrogramImage.getAttribute('y') || String(margins.top))
    imageWidth = parseFloat(instance.spectrogramImage.getAttribute('width') || String(naturalWidth))
    imageHeight = parseFloat(instance.spectrogramImage.getAttribute('height') || String(naturalHeight))
  }
  
  // Calculate visible bounds in image coordinates
  const visibleLeft = Math.max(0, margins.left - imageLeft)
  const visibleRight = Math.min(imageWidth, margins.left + naturalWidth - imageLeft)
  const visibleTop = Math.max(0, margins.top - imageTop)
  const visibleBottom = Math.min(imageHeight, margins.top + naturalHeight - imageTop)
  
  // Convert to data coordinates
  const freqRange = freqMax - freqMin
  const timeRange = timeMax - timeMin
  
  const visibleFreqMin = freqMin + (visibleLeft / imageWidth) * freqRange
  const visibleFreqMax = freqMin + (visibleRight / imageWidth) * freqRange
  const visibleTimeMax = timeMax - (visibleTop / imageHeight) * timeRange
  const visibleTimeMin = timeMax - (visibleBottom / imageHeight) * timeRange
  
  return {
    freqMin: visibleFreqMin,
    freqMax: visibleFreqMax,
    timeMin: visibleTimeMin,
    timeMax: visibleTimeMax
  }
}

/**
 * Render time axis with ticks and labels (vertical - y-axis)
 * @param {GramFrame} instance - GramFrame instance
 * @param {AxesMargins} margins - Margin configuration
 * @param {number} _naturalWidth - Image natural width (unused)
 * @param {number} naturalHeight - Image natural height
 * @param {number} timeMin - Minimum time value
 * @param {number} timeMax - Maximum time value
 */
function renderTimeAxis(instance, margins, _naturalWidth, naturalHeight, timeMin, timeMax) {
  const axisX = margins.left
  const axisStartY = margins.top
  const axisEndY = margins.top + naturalHeight
  
  // Draw main axis line (vertical)
  const axisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  axisLine.setAttribute('x1', String(axisX))
  axisLine.setAttribute('y1', String(axisStartY))
  axisLine.setAttribute('x2', String(axisX))
  axisLine.setAttribute('y2', String(axisEndY))
  axisLine.setAttribute('class', 'gram-frame-axis-line')
  instance.axesGroup.appendChild(axisLine)
  
  // Calculate tick positions
  const timeRange = timeMax - timeMin
  const tickCount = 5 // Reasonable number of ticks
  const tickInterval = timeRange / (tickCount - 1)
  
  for (let i = 0; i < tickCount; i++) {
    const time = timeMin + (i * tickInterval)
    // Note: Y coordinates are inverted (higher times at top)
    const y = axisEndY - (i / (tickCount - 1)) * naturalHeight
    
    // Draw tick mark (horizontal extending left)
    const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    tick.setAttribute('x1', String(axisX - 8))
    tick.setAttribute('y1', String(y))
    tick.setAttribute('x2', String(axisX))
    tick.setAttribute('y2', String(y))
    tick.setAttribute('class', 'gram-frame-axis-tick')
    instance.axesGroup.appendChild(tick)
    
    // Draw label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    label.setAttribute('x', String(axisX - 12))
    label.setAttribute('y', String(y + 4)) // Slight vertical offset for better alignment
    label.setAttribute('text-anchor', 'end')
    label.setAttribute('class', 'gram-frame-axis-label')
    label.textContent = formatTime(time)
    instance.axesGroup.appendChild(label)
  }
  
}

/**
 * Render frequency axis with ticks and labels (horizontal - x-axis)
 * Enhanced with dense markers and labels for better granularity
 * @param {GramFrame} instance - GramFrame instance
 * @param {AxesMargins} margins - Margin configuration
 * @param {number} naturalWidth - Image natural width
 * @param {number} _naturalHeight - Image natural height (unused)
 * @param {number} freqMin - Minimum frequency value
 * @param {number} freqMax - Maximum frequency value
 */
/**
 * Calculate axis ticks using "nice numbers" algorithm
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} containerSize - Container size in pixels
 * @param {number} targetSpacing - Target spacing between major ticks in pixels
 * @returns {Object} Tick calculation results with major and minor intervals, starts, and tick counts
 */
function calculateAxisTicks(min, max, containerSize, targetSpacing = 80) {
  const range = max - min
  
  // Calculate how many major ticks would fit with target spacing
  const targetMajorTicks = Math.max(2, Math.floor(containerSize / targetSpacing))
  const rawMajorInterval = range / (targetMajorTicks - 1)
  
  // Nice numbers algorithm: find the "nicest" interval near the raw interval
  function niceNum(range, round) {
    const exponent = Math.floor(Math.log10(range))
    const fraction = range / Math.pow(10, exponent)
    let niceFraction
    
    if (round) {
      if (fraction < 1.5) niceFraction = 1
      else if (fraction < 3) niceFraction = 2
      else if (fraction < 7) niceFraction = 5
      else niceFraction = 10
    } else {
      if (fraction <= 1) niceFraction = 1
      else if (fraction <= 2) niceFraction = 2
      else if (fraction <= 5) niceFraction = 5
      else niceFraction = 10
    }
    
    return niceFraction * Math.pow(10, exponent)
  }
  
  // Calculate nice major interval
  const majorInterval = niceNum(rawMajorInterval, false)
  
  // Minor interval is typically 1/2 or 1/5 of major interval
  let minorInterval
  const majorFraction = majorInterval / Math.pow(10, Math.floor(Math.log10(majorInterval)))
  if (majorFraction === 1) {
    minorInterval = majorInterval / 5 // 1 -> 0.2
  } else if (majorFraction === 2) {
    minorInterval = majorInterval / 2 // 2 -> 1
  } else if (majorFraction === 5) {
    minorInterval = majorInterval / 5 // 5 -> 1
  } else {
    minorInterval = majorInterval / 2 // fallback
  }
  
  // Calculate starting points aligned to intervals
  const majorStart = Math.ceil(min / majorInterval) * majorInterval
  const minorStart = Math.ceil(min / minorInterval) * minorInterval
  
  // Calculate expected number of ticks for safety limits
  const expectedMajorTicks = Math.ceil(range / majorInterval) + 2
  const expectedMinorTicks = Math.ceil(range / minorInterval) + 2
  const maxTicks = Math.max(200, expectedMajorTicks + expectedMinorTicks)
  
  return {
    majorInterval,
    minorInterval,
    majorStart,
    minorStart,
    expectedMajorTicks,
    expectedMinorTicks,
    maxTicks
  }
}

/**
 * Format frequency labels with appropriate units
 * @param {number} frequency - Frequency value
 * @returns {string} Formatted label
 */
function formatFrequencyLabels(frequency) {
  return Math.round(frequency) + 'Hz'
}

/**
 * Render main axis line
 * @param {Object} instance - Component instance
 * @param {Object} axisConfig - Axis configuration with start/end positions
 */
function renderAxisLine(instance, axisConfig) {
  const axisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  axisLine.setAttribute('x1', String(axisConfig.startX))
  axisLine.setAttribute('y1', String(axisConfig.y))
  axisLine.setAttribute('x2', String(axisConfig.endX))
  axisLine.setAttribute('y2', String(axisConfig.y))
  axisLine.setAttribute('class', 'gram-frame-axis-line')
  instance.axesGroup.appendChild(axisLine)
}

/**
 * Render axis tick marks
 * @param {Object} instance - Component instance
 * @param {Array} tickData - Array of tick positions and types
 * @param {Object} axisConfig - Axis configuration
 */
function renderAxisTicks(instance, tickData, axisConfig) {
  tickData.forEach(tickInfo => {
    const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    tick.setAttribute('x1', String(tickInfo.x))
    tick.setAttribute('y1', String(axisConfig.y))
    tick.setAttribute('x2', String(tickInfo.x))
    tick.setAttribute('y2', String(axisConfig.y + tickInfo.height))
    tick.setAttribute('class', tickInfo.className)
    instance.axesGroup.appendChild(tick)
  })
}

/**
 * Render axis labels
 * @param {Object} instance - Component instance
 * @param {Array} labelData - Array of label positions and text
 * @param {Object} axisConfig - Axis configuration
 */
function renderAxisLabels(instance, labelData, axisConfig) {
  labelData.forEach(labelInfo => {
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    label.setAttribute('x', String(labelInfo.x))
    label.setAttribute('y', String(axisConfig.y + 25))
    label.setAttribute('text-anchor', 'middle')
    label.setAttribute('class', labelInfo.className)
    label.textContent = labelInfo.text
    instance.axesGroup.appendChild(label)
  })
}

function renderFrequencyAxis(instance, margins, naturalWidth, _naturalHeight, freqMin, freqMax) {
  const axisY = margins.top + _naturalHeight
  const axisStartX = margins.left
  const axisEndX = margins.left + naturalWidth
  
  // Calculate display frequency range (scaled by rate)
  const rate = instance.state.rate
  const displayFreqMin = freqMin / rate
  const displayFreqMax = freqMax / rate
  const freqRange = displayFreqMax - displayFreqMin
  
  // Prepare axis configuration
  const axisConfig = { y: axisY, startX: axisStartX, endX: axisEndX }
  
  // Render main axis line
  renderAxisLine(instance, axisConfig)
  
  // Calculate tick positions using nice numbers algorithm
  const tickCalculation = calculateAxisTicks(displayFreqMin, displayFreqMax, naturalWidth)
  
  // Prepare tick and label data
  const minorTickData = []
  const majorTickData = []
  const labelData = []
  
  // Generate minor ticks
  const numMinorTicks = Math.floor((displayFreqMax - tickCalculation.minorStart) / tickCalculation.minorInterval) + 1
  if (numMinorTicks <= tickCalculation.maxTicks) {
    for (let i = 0; i < numMinorTicks; i++) {
      const freq = tickCalculation.minorStart + (i * tickCalculation.minorInterval)
      if (freq > displayFreqMax) break
      
      // Skip minor ticks that coincide with major ticks
      if (Math.abs(freq % tickCalculation.majorInterval) < 0.01) continue
      
      const x = axisStartX + ((freq - displayFreqMin) / freqRange) * naturalWidth
      minorTickData.push({ x, height: 4, className: 'gram-frame-axis-tick-minor' })
    }
  }
  
  // Generate major ticks and labels
  const numMajorTicks = Math.floor((displayFreqMax - tickCalculation.majorStart) / tickCalculation.majorInterval) + 1
  if (numMajorTicks <= tickCalculation.maxTicks) {
    for (let i = 0; i < numMajorTicks; i++) {
      const freq = tickCalculation.majorStart + (i * tickCalculation.majorInterval)
      if (freq > displayFreqMax) break
      
      const x = axisStartX + ((freq - displayFreqMin) / freqRange) * naturalWidth
      
      majorTickData.push({ x, height: 8, className: 'gram-frame-axis-tick-major' })
      labelData.push({
        x,
        text: formatFrequencyLabels(freq),
        className: 'gram-frame-axis-label-major'
      })
    }
  } else {
    // Fallback to simple tick spacing for extremely dense cases
    const tickCount = 5
    for (let i = 0; i < tickCount; i++) {
      const freq = displayFreqMin + (i * freqRange / (tickCount - 1))
      const x = axisStartX + (i / (tickCount - 1)) * naturalWidth
      
      majorTickData.push({ x, height: 8, className: 'gram-frame-axis-tick' })
      labelData.push({
        x,
        text: formatFrequencyLabels(freq),
        className: 'gram-frame-axis-label'
      })
    }
  }
  
  // Render all ticks and labels
  renderAxisTicks(instance, minorTickData, axisConfig)
  renderAxisTicks(instance, majorTickData, axisConfig)
  renderAxisLabels(instance, labelData, axisConfig)
}







/**
 * Replace the original config table with the new component structure
 * @param {GramFrame} instance - GramFrame instance with created DOM structure
 * @param {HTMLTableElement} configTable - Original table to replace
 */
export function replaceConfigTable(instance, configTable) {
  // Replace the table with our container
  if (configTable && configTable.parentNode) {
    configTable.parentNode.replaceChild(instance.container, configTable)
    
    // Store a reference to this instance on the container element
    // This allows the state listener mechanism to access the instance
    // @ts-ignore - Adding custom property to DOM element
    instance.container.__gramFrameInstance = instance
  }
}

/**
 * Create minimal component table structure
 * @param {GramFrame} instance - GramFrame instance
 * @param {HTMLTableElement} configTable - Original table to replace
 * @returns {TableElements} Object containing all created elements
 */
export function setupComponentTable(instance, configTable) {
  // Create DOM structure only
  const domElements = createComponentStructure(instance)
  
  // Replace original table
  replaceConfigTable(instance, configTable)
  
  return domElements
}