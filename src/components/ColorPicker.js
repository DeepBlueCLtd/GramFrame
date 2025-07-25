/**
 * Color Picker Component for GramFrame
 * 
 * Provides color selection functionality for harmonic overlays
 */

/// <reference path="../types.js" />

/**
 * Standard color palette used for color picker gradient and calculations
 * @type {string[]}
 */
const COLOR_PALETTE = [
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
  
  // Create a rainbow gradient using the standard color palette
  COLOR_PALETTE.forEach((color, index) => {
    gradient.addColorStop(index / (COLOR_PALETTE.length - 1), color)
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
  const position = Math.max(0, Math.min(1, x / width))
  const segmentSize = 1 / (COLOR_PALETTE.length - 1)
  const segmentIndex = position / segmentSize
  const lowerIndex = Math.floor(segmentIndex)
  const upperIndex = Math.min(lowerIndex + 1, COLOR_PALETTE.length - 1)
  const t = segmentIndex - lowerIndex
  
  if (lowerIndex === upperIndex) {
    return COLOR_PALETTE[lowerIndex]
  }
  
  // Interpolate between the two colors
  const color1 = hexToRgb(COLOR_PALETTE[lowerIndex])
  const color2 = hexToRgb(COLOR_PALETTE[upperIndex])
  
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
  const targetRgb = hexToRgb(hexColor)
  let closestIndex = 0
  let minDistance = Infinity
  
  // Find the closest color in our palette
  COLOR_PALETTE.forEach((color, index) => {
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
  const segmentSize = 1 / (COLOR_PALETTE.length - 1)
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