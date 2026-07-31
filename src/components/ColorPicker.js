/**
 * Combined colour + symbol picker for GramFrame
 *
 * Provides colour selection (gradient slider) and, alongside it, the symbol
 * drop-down for harmonic overlays, under a single "Symbol" panel.
 */

/// <reference path="../types.js" />

import { createSymbolSelect, createLargeSymbolToggle } from './SymbolPicker.js'
import { getActiveStyle } from '../core/keyboardControl.js'

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
 * Create the combined "Symbol" control: a colour slider on the left and a
 * symbol drop-down (tinted with the selected colour) on the right.
 *
 * When a marker or harmonic set is selected, this panel restyles that feature
 * in place; otherwise it sets the colour/symbol for the next created feature
 * (feature 161). The panel also syncs its displayed colour/symbol to whichever
 * feature is selected via `instance.syncStyleControls`.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {HTMLDivElement} The combined colour/symbol picker element
 */
export function createColorPicker(instance) {
  const state = instance.state
  const container = document.createElement('div')
  container.className = 'gram-frame-color-picker'
  container.style.display = 'block'

  // Label
  const label = document.createElement('div')
  label.className = 'gram-frame-color-picker-label'
  label.textContent = 'Symbol'
  container.appendChild(label)

  // Palette container - horizontal row with the colour slider and symbol select
  const paletteContainer = document.createElement('div')
  paletteContainer.className = 'gram-frame-color-palette'
  paletteContainer.style.display = 'flex'
  paletteContainer.style.alignItems = 'center'
  paletteContainer.style.gap = '8px'
  container.appendChild(paletteContainer)

  // Slider container for canvas and indicator
  const sliderContainer = document.createElement('div')
  sliderContainer.className = 'gram-frame-color-slider'
  sliderContainer.style.position = 'relative'
  sliderContainer.style.flex = '1'
  paletteContainer.appendChild(sliderContainer)

  // Create continuous color palette using canvas
  const canvas = document.createElement('canvas')
  canvas.width = 140
  canvas.height = 20
  canvas.className = 'gram-frame-color-canvas'
  sliderContainer.appendChild(canvas)

  // Initialize default color
  if (!state.selectedColor) {
    state.selectedColor = '#ff6b6b' // Default first color
  }

  // Draw the color palette
  drawColorPalette(canvas)

  // Color selection indicator
  const indicator = document.createElement('div')
  indicator.className = 'gram-frame-color-indicator'
  sliderContainer.appendChild(indicator)

  // Symbol drop-down on the right (where the colour swatch used to be); its
  // glyphs are tinted with the currently selected colour, so it doubles as the
  // colour readout.
  const symbolSelect = createSymbolSelect(instance)
  paletteContainer.appendChild(symbolSelect)

  // TEMPORARY (size experiment): size toggle beneath the slider/drop-down row,
  // for feedback on whether the larger symbols read better on a real gram.
  container.appendChild(createLargeSymbolToggle(instance))

  // Add click handler for color selection
  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left

    // Scale x coordinate to canvas dimensions if CSS scaling differs
    const scaleX = canvas.width / rect.width
    const canvasX = x * scaleX

    const color = getColorFromPosition(canvasX, canvas.width)

    // Route to the selected feature when one is selected (restyle in place),
    // otherwise set the colour for the next created feature (feature 161).
    if (!instance.applyColorToSelectedFeature || !instance.applyColorToSelectedFeature(color)) {
      state.selectedColor = color
    }

    // Tint the symbol drop-down with the newly selected colour
    symbolSelect.style.color = color

    // Update indicator position using the same canvasX coordinate for consistency
    updateIndicatorPosition(indicator, canvasX, canvas.width)
  })

  /**
   * Move the colour indicator/tint to reflect a given colour (without mutating
   * state) — used when selection changes to show the selected feature's colour.
   * @param {string} color - Hex colour to display
   */
  const showColor = (color) => {
    const position = getPositionFromColor(color, canvas.width)
    updateIndicatorPosition(indicator, position, canvas.width)
    symbolSelect.style.color = color
  }

  // Sync both controls (colour indicator + symbol drop-down) to whatever is
  // currently selected, or to the next-feature defaults when nothing is
  // selected (feature 161, FR-004/FR-013).
  instance.syncStyleControls = () => {
    const { color, symbol, largeSymbols } = getActiveStyle(instance)
    showColor(color)
    if (instance._symbolControl) {
      instance._symbolControl.setValue(symbol)
      instance._symbolControl.setTint(color)
    }
    // TEMPORARY (size experiment): keep the size toggle in step with selection.
    if (instance._largeSymbolsControl) {
      instance._largeSymbolsControl.setValue(largeSymbols)
    }
  }

  // Initialize indicator position (use canvas coordinates directly)
  const initialPosition = getPositionFromColor(state.selectedColor, canvas.width)
  updateIndicatorPosition(indicator, initialPosition, canvas.width)

  return container
}

/**
 * Draw a continuous color palette on canvas
 * @param {HTMLCanvasElement} canvas - Canvas element
 */
function drawColorPalette(canvas) {
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
 * @returns {RGBColor} RGB object with r, g, b properties
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