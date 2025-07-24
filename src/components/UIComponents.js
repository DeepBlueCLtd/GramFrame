/**
 * UI Components for GramFrame
 * 
 * This module provides functions for creating and managing UI elements
 * including LED displays, mode switching buttons, and rate input controls.
 */

/// <reference path="../types.js" />

import { capitalizeFirstLetter } from '../utils/calculations.js'

/**
 * Create LED display elements for showing measurement values
 * @param {HTMLElement} readoutPanel - Container element for LED displays
 * @param {GramFrameState} state - Current state object
 * @returns {Object} Object containing references to all LED elements
 */
export function createLEDDisplays(readoutPanel, state) {
  const ledElements = {}
  
  // Time display
  ledElements.timeLED = createLEDDisplay('Time (s)', '0.00')
  readoutPanel.appendChild(ledElements.timeLED)
  
  // Frequency display
  ledElements.freqLED = createLEDDisplay('Frequency (Hz)', '0.00')
  readoutPanel.appendChild(ledElements.freqLED)
  
  // Mode display
  ledElements.modeLED = createLEDDisplay('Mode', capitalizeFirstLetter(state.mode))
  ledElements.modeLED.style.display = 'none'
  readoutPanel.appendChild(ledElements.modeLED)
  
  // Rate display
  ledElements.rateLED = createLEDDisplay('Rate (Hz/s)', `${state.rate}`)
  ledElements.rateLED.style.display = 'none'
  readoutPanel.appendChild(ledElements.rateLED)
  
  // Color picker is now created by individual modes (harmonics and analysis)
  
  return ledElements
}




/**
 * Create mode switching UI with buttons and guidance panel
 * @param {HTMLElement} modeCell - Container element for mode UI
 * @param {GramFrameState} state - Current state object
 * @param {Function} modeSwitchCallback - Callback function for mode changes
 * @returns {Object} Object containing references to mode UI elements
 */
export function createModeSwitchingUI(modeCell, state, modeSwitchCallback) {
  // Create mode buttons container
  const modesContainer = document.createElement('div')
  modesContainer.className = 'gram-frame-modes'
  
  // Create mode buttons
  const modes = ['analysis', 'harmonics', 'doppler']
  const modeButtons = {}
  
  modes.forEach(mode => {
    const button = document.createElement('button')
    button.className = 'gram-frame-mode-btn'
    button.textContent = capitalizeFirstLetter(mode)
    button.dataset.mode = mode
    
    // Set active state for current mode
    if (mode === state.mode) {
      button.classList.add('active')
    }
    
    // Add click handler
    button.addEventListener('click', (event) => {
      event.preventDefault()
      modeSwitchCallback(mode)
    })
    
    modeButtons[mode] = button
    modesContainer.appendChild(button)
  })
  
  // Create guidance panel (content will be set by current mode)
  const guidancePanel = document.createElement('div')
  guidancePanel.className = 'gram-frame-guidance'
  
  // Append all to mode header
  modeCell.appendChild(modesContainer)
  modeCell.appendChild(guidancePanel)
  
  return {
    modesContainer,
    modeButtons,
    guidancePanel
  }
}

/**
 * Updates guidance content based on current mode
 * @param {HTMLElement} guidancePanel - The guidance panel element
 * @param {string} mode - Current mode ('analysis', 'harmonics', 'doppler')
 */
export function updateGuidanceContent(guidancePanel, mode) {
  if (mode === 'analysis') {
    guidancePanel.innerHTML = `
      <h4>Analysis Mode</h4>
      <p>• Hover to view exact frequency/time values</p>
    `
  } else if (mode === 'harmonics') {
    guidancePanel.innerHTML = `
      <h4>Harmonics Mode</h4>
      <p>• Click & drag to generate harmonic lines</p>
      <p>• Drag existing harmonic lines to adjust spacing</p>
      <p>• Manually add harmonic lines using [+ Manual] button</p>
    `
  } else if (mode === 'doppler') {
    guidancePanel.innerHTML = `
      <h4>Doppler Mode</h4>
      <p>• Drag line to give overall doppler curve</p>
      <p>• Drag markers to adjust curve</p>
      <p>• Right-click to reset</p>
    `
  }
}

/**
 * Creates rate input control
 * @param {HTMLElement} container - Container element for rate input
 * @param {GramFrameState} state - Current state object
 * @param {Function} rateChangeCallback - Callback function for rate changes
 * @returns {HTMLInputElement} The rate input element
 */
export function createRateInput(container, state, rateChangeCallback) {
  // Create rate input container
  const rateContainer = document.createElement('div')
  rateContainer.className = 'gram-frame-rate'
  
  // Create label
  const label = document.createElement('label')
  label.textContent = 'Rate:'
  rateContainer.appendChild(label)
  
  // Create input
  const rateInput = document.createElement('input')
  rateInput.type = 'number'
  rateInput.min = '0.1'
  rateInput.step = '0.1'
  rateInput.value = String(state.rate)
  rateInput.title = 'Rate value affects frequency calculations'
  
  // Add change handler
  rateInput.addEventListener('change', () => {
    const rate = parseFloat(rateInput.value)
    if (!isNaN(rate) && rate >= 0.1) {
      rateChangeCallback(rate)
    } else {
      // Reset to previous valid value if invalid input
      rateInput.value = String(state.rate)
    }
  })
  
  rateContainer.appendChild(rateInput)
  
  // Create unit indicator
  const unit = document.createElement('span')
  unit.textContent = 'Hz/s'
  unit.className = 'gram-frame-rate-unit'
  rateContainer.appendChild(unit)
  
  // Hide rate input for now (not in mockup design)
  rateContainer.style.display = 'none'
  container.appendChild(rateContainer)
  
  return rateInput
}

/**
 * Creates a single LED display element
 * @param {string} label - Display label
 * @param {string} value - Initial display value
 * @returns {HTMLDivElement} The LED display element
 */
export function createLEDDisplay(label, value) {
  const led = document.createElement('div')
  led.className = 'gram-frame-led'
  led.innerHTML = `
    <div class="gram-frame-led-label">${label}</div>
    <div class="gram-frame-led-value">${value}</div>
  `
  return led
}

/**
 * Update global LED displays (mode and rate only)
 * Mode-specific LEDs are now managed by individual modes
 * @param {Object} instance - GramFrame instance with global LEDs
 * @param {GramFrameState} state - Current state object
 */
export function updateLEDDisplays(instance, state) {
  // Update global mode LED display
  if (instance.modeLED) {
    instance.modeLED.querySelector('.gram-frame-led-value').textContent = capitalizeFirstLetter(state.mode)
  }
  
  // Update global rate LED display
  if (instance.rateLED) {
    instance.rateLED.querySelector('.gram-frame-led-value').textContent = `${state.rate}`
  }
  
  // Color picker visibility is now managed by individual modes
}

/**
 * Create a color picker component for harmonic selection
 * @param {GramFrameState} state - Current state object
 * @returns {HTMLDivElement} The color picker element
 */
export function createColorPicker(state) {
  const container = document.createElement('div')
  container.className = 'gram-frame-color-picker'
  container.style.display = (state.mode === 'harmonics' || state.mode === 'analysis') ? 'block' : 'none'
  
  // Label
  const label = document.createElement('div')
  label.className = 'gram-frame-color-picker-label'
  label.textContent = 'Harmonic Color'
  container.appendChild(label)
  
  // Color palette container
  const paletteContainer = document.createElement('div')
  paletteContainer.className = 'gram-frame-color-palette'
  container.appendChild(paletteContainer)
  
  // Create continuous color palette using canvas
  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 20
  canvas.className = 'gram-frame-color-canvas'
  paletteContainer.appendChild(canvas)
  
  // Initialize default color
  if (!state.harmonics) {
    state.harmonics = {
      baseFrequency: null,
      harmonicData: [],
      harmonicSets: [],
      selectedColor: '#ff6b6b' // Default first color
    }
  }
  if (!state.harmonics.selectedColor) {
    state.harmonics.selectedColor = '#ff6b6b' // Default first color
  }
  
  // Draw the color palette
  drawColorPalette(canvas, state.harmonics.selectedColor)
  
  // Color selection indicator
  const indicator = document.createElement('div')
  indicator.className = 'gram-frame-color-indicator'
  paletteContainer.appendChild(indicator)
  
  // Current color display
  const currentColor = document.createElement('div')
  currentColor.className = 'gram-frame-current-color'
  currentColor.style.backgroundColor = state.harmonics.selectedColor
  container.appendChild(currentColor)
  
  // Add click handler for color selection
  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    
    // Scale x coordinate to canvas dimensions if CSS scaling differs
    const scaleX = canvas.width / rect.width
    const canvasX = x * scaleX
    
    const color = getColorFromPosition(canvasX, canvas.width)
    
    // Update state
    state.harmonics.selectedColor = color
    
    // Update current color display
    currentColor.style.backgroundColor = color
    
    // Update indicator position using the same canvasX coordinate for consistency
    updateIndicatorPosition(indicator, canvasX, canvas.width)
  })
  
  // Initialize indicator position (use canvas coordinates directly)
  const initialPosition = getPositionFromColor(state.harmonics.selectedColor, canvas.width)
  updateIndicatorPosition(indicator, initialPosition, canvas.width)
  
  return container
}

/**
 * Draw a continuous color palette on canvas
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {string} selectedColor - Currently selected color
 */
function drawColorPalette(canvas, selectedColor) {
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  
  // Create gradient with HSV color space for better color distribution
  const gradient = ctx.createLinearGradient(0, 0, width, 0)
  
  // Create a rainbow gradient
  const colors = [
    '#ff0000', // Red
    '#ff8000', // Orange
    '#ffff00', // Yellow
    '#80ff00', // Yellow-green
    '#00ff00', // Green
    '#00ff80', // Green-cyan
    '#00ffff', // Cyan
    '#0080ff', // Cyan-blue
    '#0000ff', // Blue
    '#8000ff', // Blue-purple
    '#ff00ff', // Purple
    '#ff0080'  // Purple-red
  ]
  
  colors.forEach((color, index) => {
    gradient.addColorStop(index / (colors.length - 1), color)
  })
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

/**
 * Get color from position on the palette
 * @param {number} x - X position on canvas
 * @param {number} width - Canvas width
 * @returns {string} Hex color string
 */
function getColorFromPosition(x, width) {
  // Use the same color array as drawColorPalette for consistency
  const colors = [
    '#ff0000', // Red
    '#ff8000', // Orange
    '#ffff00', // Yellow
    '#80ff00', // Yellow-green
    '#00ff00', // Green
    '#00ff80', // Green-cyan
    '#00ffff', // Cyan
    '#0080ff', // Cyan-blue
    '#0000ff', // Blue
    '#8000ff', // Blue-purple
    '#ff00ff', // Purple
    '#ff0080'  // Purple-red
  ]
  
  const position = Math.max(0, Math.min(1, x / width))
  const segmentSize = 1 / (colors.length - 1)
  const segmentIndex = position / segmentSize
  const lowerIndex = Math.floor(segmentIndex)
  const upperIndex = Math.min(lowerIndex + 1, colors.length - 1)
  const t = segmentIndex - lowerIndex
  
  if (lowerIndex === upperIndex) {
    return colors[lowerIndex]
  }
  
  // Interpolate between the two colors
  const color1 = hexToRgb(colors[lowerIndex])
  const color2 = hexToRgb(colors[upperIndex])
  
  const r = Math.round(color1.r * (1 - t) + color2.r * t)
  const g = Math.round(color1.g * (1 - t) + color2.g * t)
  const b = Math.round(color1.b * (1 - t) + color2.b * t)
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color string
 * @returns {Object} RGB object with r, g, b properties
 */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

/**
 * Get position from color
 * @param {string} hexColor - Hex color string
 * @param {number} width - Canvas width
 * @returns {number} X position
 */
function getPositionFromColor(hexColor, width) {
  const colors = [
    '#ff0000', // Red
    '#ff8000', // Orange
    '#ffff00', // Yellow
    '#80ff00', // Yellow-green
    '#00ff00', // Green
    '#00ff80', // Green-cyan
    '#00ffff', // Cyan
    '#0080ff', // Cyan-blue
    '#0000ff', // Blue
    '#8000ff', // Blue-purple
    '#ff00ff', // Purple
    '#ff0080'  // Purple-red
  ]
  
  const targetRgb = hexToRgb(hexColor)
  let closestIndex = 0
  let minDistance = Infinity
  
  // Find the closest color in our palette
  colors.forEach((color, index) => {
    const colorRgb = hexToRgb(color)
    const distance = Math.sqrt(
      Math.pow(targetRgb.r - colorRgb.r, 2) +
      Math.pow(targetRgb.g - colorRgb.g, 2) +
      Math.pow(targetRgb.b - colorRgb.b, 2)
    )
    
    if (distance < minDistance) {
      minDistance = distance
      closestIndex = index
    }
  })
  
  // Convert index to position
  const segmentSize = 1 / (colors.length - 1)
  const position = closestIndex * segmentSize
  return position * width
}

/**
 * Update indicator position
 * @param {HTMLElement} indicator - Indicator element
 * @param {number} x - X position
 * @param {number} width - Canvas width
 */
function updateIndicatorPosition(indicator, x, width) {
  const percentage = (x / width) * 100
  indicator.style.left = `${Math.max(0, Math.min(100, percentage))}%`
}

/**
 * Convert HSL to hex color
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} Hex color string
 */
function hslToHex(h, s, l) {
  const hslToRgb = (h, s, l) => {
    h /= 360
    s /= 100
    l /= 100
    
    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs((h * 6) % 2 - 1))
    const m = l - c / 2
    
    let r, g, b
    
    if (h < 1/6) {
      r = c; g = x; b = 0
    } else if (h < 2/6) {
      r = x; g = c; b = 0
    } else if (h < 3/6) {
      r = 0; g = c; b = x
    } else if (h < 4/6) {
      r = 0; g = x; b = c
    } else if (h < 5/6) {
      r = x; g = 0; b = c
    } else {
      r = c; g = 0; b = x
    }
    
    r = Math.round((r + m) * 255)
    g = Math.round((g + m) * 255)
    b = Math.round((b + m) * 255)
    
    return { r, g, b }
  }
  
  const { r, g, b } = hslToRgb(h, s, l)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Convert hex color to HSL
 * @param {string} hex - Hex color string
 * @returns {Object} HSL object with h, s, l properties
 */
function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min
  const sum = max + min
  
  const l = sum / 2
  
  if (diff === 0) {
    return { h: 0, s: 0, l: l * 100 }
  }
  
  const s = l > 0.5 ? diff / (2 - sum) : diff / sum
  
  let h
  if (max === r) {
    h = ((g - b) / diff + (g < b ? 6 : 0)) / 6
  } else if (max === g) {
    h = ((b - r) / diff + 2) / 6
  } else {
    h = ((r - g) / diff + 4) / 6
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 }
}


