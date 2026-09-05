/**
 * The axis engine for GramFrame.
 *
 * Draws the time (vertical) and frequency (horizontal) axes for the currently
 * visible data range. Extracted from `components/table.js` in the Story 3 split
 * (spec 167, FR-004) into the `rendering/` family beside `symbols.js`, where
 * CLAUDE.md had documented it living for some time and where GF-38 recorded it
 * as a phantom module.
 *
 * `renderAxes` is the sole entry point; everything else here is private.
 *
 * This module draws — it does not dispatch. It must not import
 * `components/table.js` (the point of the split) or `core/state.js`.
 */

/// <reference path="../types.js" />

import { formatAxisTime } from '../utils/timeFormatter.js'
import { calculateVisibleDataRange, getRenderDimensions } from '../utils/coordinates.js'

/**
 * A nice-number tick layout for one axis.
 * @typedef {Object} AxisTicks
 * @property {number} majorInterval - Spacing between labelled ticks, in data units
 * @property {number} minorInterval - Spacing between unlabelled ticks
 * @property {number} majorStart - First major tick, aligned to the interval
 * @property {number} minorStart - First minor tick, aligned to the interval
 * @property {number} expectedMajorTicks - Major ticks the range should produce
 * @property {number} expectedMinorTicks - Minor ticks the range should produce
 * @property {number} maxTicks - Safety limit on the drawing loops
 */

/**
 * Where one axis line sits, in SVG units.
 * @typedef {Object} AxisConfig
 * @property {number} startX - Line start
 * @property {number} endX - Line end
 * @property {number} y - Line offset along the other axis
 */

/**
 * One tick to draw.
 * @typedef {Object} AxisTick
 * @property {number} x - Position along the axis
 * @property {number} height - Tick length
 * @property {string} className - CSS class distinguishing major from minor
 */

/**
 * One label to draw.
 * @typedef {Object} AxisLabel
 * @property {number} x - Position along the axis
 * @property {string} text - Rendered label
 * @property {string} className - CSS class
 */

/**
 * Render time and frequency axes
 * @param {GramFrame} instance - GramFrame instance
 */
export function renderAxes(instance) {
  if (!instance.ui.axesGroup) {
    return
  }
  
  // Clear existing axes
  instance.ui.axesGroup.innerHTML = ''
  
  const viewport = instance.state
  const { naturalWidth, naturalHeight } = viewport.imageDetails
  const margins = viewport.margins

  if (!naturalWidth || !naturalHeight) {
    return
  }

  // Axes span the base render size (defaults to natural; grows when expanded)
  const { renderWidth, renderHeight } = getRenderDimensions(viewport)

  // Calculate visible data range based on zoom
  const visibleRange = calculateVisibleDataRange(viewport, instance.ui.spectrogramImage)

  // Render frequency axis (bottom/horizontal - x-axis)
  renderFrequencyAxis(instance, margins, renderWidth, renderHeight, visibleRange.freqMin, visibleRange.freqMax)

  // Render time axis (left/vertical - y-axis)
  renderTimeAxis(instance, margins, renderWidth, renderHeight, visibleRange.timeMin, visibleRange.timeMax)
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
  const timeRange = timeMax - timeMin

  // Draw main axis line (vertical)
  const axisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  axisLine.setAttribute('x1', String(axisX))
  axisLine.setAttribute('y1', String(axisStartY))
  axisLine.setAttribute('x2', String(axisX))
  axisLine.setAttribute('y2', String(axisEndY))
  axisLine.setAttribute('class', 'gram-frame-axis-line')
  instance.ui.axesGroup.appendChild(axisLine)

  if (!(timeRange > 0)) {
    return
  }

  // The same nice-number engine the frequency axis uses (R9-07). A fixed five
  // ticks put labels wherever the range happened to divide -- 2.5 s apart on a
  // 0-10 s gram, and at 10x zoom five ticks inside one second, which all
  // printed the same `mm:ss`. Nice intervals land on round times and change
  // count with the span instead.
  //
  // 40 px between labels rather than the frequency axis's 80: these are
  // stacked vertically, where the constraint is the height of a line of text,
  // not the width of "3000Hz". At 80 a 200 px axis got two labels, which is
  // sparser than the five it is replacing.
  const { majorInterval, minorInterval, majorStart, minorStart, maxTicks } =
    calculateAxisTicks(timeMin, timeMax, naturalHeight, 40)

  /**
   * Where a time sits on the axis. Y is inverted: later times are higher up.
   * @param {number} time - Time in seconds
   * @returns {number} SVG y coordinate
   */
  const yFor = (time) => axisEndY - ((time - timeMin) / timeRange) * naturalHeight

  // Minor ticks: unlabelled, and skipped where they coincide with a major one.
  const minorCount = Math.floor((timeMax - minorStart) / minorInterval) + 1
  if (minorCount > 0 && minorCount <= maxTicks) {
    for (let i = 0; i < minorCount; i++) {
      const time = minorStart + (i * minorInterval)
      if (time > timeMax) break
      const offsetFromMajor = Math.abs(((time - majorStart) % majorInterval) / majorInterval)
      if (offsetFromMajor < 0.001 || offsetFromMajor > 0.999) continue

      const y = yFor(time)
      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      tick.setAttribute('x1', String(axisX - 4))
      tick.setAttribute('y1', String(y))
      tick.setAttribute('x2', String(axisX))
      tick.setAttribute('y2', String(y))
      tick.setAttribute('class', 'gram-frame-axis-tick-minor')
      instance.ui.axesGroup.appendChild(tick)
    }
  }

  // Major ticks, each labelled at a precision its own interval justifies.
  const majorCount = Math.floor((timeMax - majorStart) / majorInterval) + 1
  if (majorCount <= 0 || majorCount > maxTicks) {
    return
  }
  for (let i = 0; i < majorCount; i++) {
    const time = majorStart + (i * majorInterval)
    if (time > timeMax) break
    const y = yFor(time)

    const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    tick.setAttribute('x1', String(axisX - 8))
    tick.setAttribute('y1', String(y))
    tick.setAttribute('x2', String(axisX))
    tick.setAttribute('y2', String(y))
    tick.setAttribute('class', 'gram-frame-axis-tick')
    instance.ui.axesGroup.appendChild(tick)

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    label.setAttribute('x', String(axisX - 12))
    label.setAttribute('y', String(y + 4)) // Slight vertical offset for better alignment
    label.setAttribute('text-anchor', 'end')
    label.setAttribute('class', 'gram-frame-axis-label')
    label.textContent = formatAxisTime(time, majorInterval)
    instance.ui.axesGroup.appendChild(label)
  }
}

/**
 * Calculate axis ticks using "nice numbers" algorithm
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} containerSize - Container size in pixels
 * @param {number} targetSpacing - Target spacing between major ticks in pixels
 * @returns {AxisTicks} Tick calculation results with major and minor intervals, starts, and tick counts
 */
function calculateAxisTicks(min, max, containerSize, targetSpacing = 80) {
  const range = max - min
  
  // Calculate how many major ticks would fit with target spacing
  const targetMajorTicks = Math.max(2, Math.floor(containerSize / targetSpacing))
  const rawMajorInterval = range / (targetMajorTicks - 1)
  
  // Nice numbers algorithm: find the "nicest" interval near the raw interval
  /**
   * @param {number} value - Raw interval to round
   * @param {boolean} round - Round to the nearest nice number rather than up
   * @returns {number} The nice number
   */
  function niceNum(value, round) {
    const exponent = Math.floor(Math.log10(value))
    const fraction = value / Math.pow(10, exponent)
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
 * Format a frequency-axis label at a precision the tick interval justifies.
 *
 * Rounding to whole hertz duplicated labels on a narrow band: a gram spanning
 * a few hertz gets sub-hertz tick intervals, and every tick then printed the
 * same integer (R9-07). As on the time axis, the interval decides the
 * precision, so a label is never finer than the tick it names.
 * @param {number} frequency - Frequency value
 * @param {number} [interval] - Spacing between major ticks in Hz
 * @returns {string} Formatted label
 */
function formatFrequencyLabels(frequency, interval = 1) {
  return formatAtInterval(frequency, interval) + 'Hz'
}

/**
 * Render a value at the smallest precision that writes its tick interval
 * exactly, capped at three decimals.
 *
 * Shared by the frequency axis and, through `formatAxisTime`, by the time
 * axis: both had the same defect for the same reason, a fixed precision
 * chosen without reference to the tick spacing.
 * @param {number} value - Value to render
 * @param {number} interval - Spacing between ticks, in the same unit
 * @returns {string} The value, at a precision the interval justifies
 */
function formatAtInterval(value, interval) {
  if (!Number.isFinite(interval) || interval <= 0) {
    return String(Math.round(value))
  }
  for (let decimals = 0; decimals < 3; decimals++) {
    const scaled = interval * Math.pow(10, decimals)
    if (Math.abs(scaled - Math.round(scaled)) < 1e-9) {
      return value.toFixed(decimals)
    }
  }
  return value.toFixed(3)
}

/**
 * Render main axis line
 * @param {GramFrame} instance - Component instance
 * @param {AxisConfig} axisConfig - Axis configuration with start/end positions
 */
function renderAxisLine(instance, axisConfig) {
  const axisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  axisLine.setAttribute('x1', String(axisConfig.startX))
  axisLine.setAttribute('y1', String(axisConfig.y))
  axisLine.setAttribute('x2', String(axisConfig.endX))
  axisLine.setAttribute('y2', String(axisConfig.y))
  axisLine.setAttribute('class', 'gram-frame-axis-line')
  instance.ui.axesGroup.appendChild(axisLine)
}

/**
 * Render axis tick marks
 * @param {GramFrame} instance - Component instance
 * @param {AxisTick[]} tickData - Array of tick positions and types
 * @param {AxisConfig} axisConfig - Axis configuration
 */
function renderAxisTicks(instance, tickData, axisConfig) {
  tickData.forEach(tickInfo => {
    const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    tick.setAttribute('x1', String(tickInfo.x))
    tick.setAttribute('y1', String(axisConfig.y))
    tick.setAttribute('x2', String(tickInfo.x))
    tick.setAttribute('y2', String(axisConfig.y + tickInfo.height))
    tick.setAttribute('class', tickInfo.className)
    instance.ui.axesGroup.appendChild(tick)
  })
}

/**
 * Render axis labels
 * @param {GramFrame} instance - Component instance
 * @param {AxisLabel[]} labelData - Array of label positions and text
 * @param {AxisConfig} axisConfig - Axis configuration
 */
function renderAxisLabels(instance, labelData, axisConfig) {
  labelData.forEach(labelInfo => {
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    label.setAttribute('x', String(labelInfo.x))
    label.setAttribute('y', String(axisConfig.y + 25))
    label.setAttribute('text-anchor', 'middle')
    label.setAttribute('class', labelInfo.className)
    label.textContent = labelInfo.text
    instance.ui.axesGroup.appendChild(label)
  })
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
        text: formatFrequencyLabels(freq, tickCalculation.majorInterval),
        className: 'gram-frame-axis-label-major'
      })
    }
  } else {
    // Fallback to simple tick spacing for extremely dense cases
    const tickCount = 5
    const fallbackInterval = freqRange / (tickCount - 1)
    for (let i = 0; i < tickCount; i++) {
      const freq = displayFreqMin + (i * fallbackInterval)
      const x = axisStartX + (i / (tickCount - 1)) * naturalWidth
      
      majorTickData.push({ x, height: 8, className: 'gram-frame-axis-tick' })
      labelData.push({
        x,
        text: formatFrequencyLabels(freq, fallbackInterval),
        className: 'gram-frame-axis-label'
      })
    }
  }
  
  // Render all ticks and labels
  renderAxisTicks(instance, minorTickData, axisConfig)
  renderAxisTicks(instance, majorTickData, axisConfig)
  renderAxisLabels(instance, labelData, axisConfig)
}
