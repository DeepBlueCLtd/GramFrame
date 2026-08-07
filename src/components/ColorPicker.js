/**
 * Style panel for GramFrame overlays.
 *
 * One panel, three bands, grouped by what each control actually affects:
 *
 * - **Colour** — the gradient slider. The widest-reaching control there is: it
 *   styles analysis markers, harmonic sets AND doppler curves.
 * - **Symbol** — the symbol drop-down and the (temporary) large-symbol toggle.
 *   Both apply to markers and harmonic sets; neither applies to doppler.
 * - **Harmonics** — the pin toggle, fenced off below a rule because it is the
 *   one control here that harmonic sets alone understand.
 *
 * The panel used to be headed "Symbol" with all four controls stacked
 * undifferentiated, which named the narrowest scope in the panel and left the
 * rest to guesswork.
 */

/// <reference path="../types.js" />

import { createSymbolSelect, createLargeSymbolToggle } from './SymbolPicker.js'
import { createPinToggle } from './PinToggle.js'
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
 * Create a band caption ("Colour", "Symbol", "Harmonics") for the style panel.
 * @param {string} text - Caption text
 * @returns {HTMLDivElement} The caption element
 */
function createGroupLabel(text) {
  const label = document.createElement('div')
  label.className = 'gram-frame-style-group-label'
  label.textContent = text
  return label
}

/**
 * Create the "Style" panel: a colour band, a symbol band and a harmonics band.
 *
 * When a marker or harmonic set is selected, this panel restyles that feature
 * in place; otherwise it sets the colour/symbol for the next created feature
 * (feature 161). The panel also syncs its displayed colour/symbol to whichever
 * feature is selected via `instance.interaction.syncStyleControls`.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {HTMLDivElement} The style panel element
 */
export function createColorPicker(instance) {
  const state = instance.state
  const container = document.createElement('div')
  container.className = 'gram-frame-color-picker'
  container.style.display = 'block'

  // No panel heading: each band already labels itself ("Colour", "Symbol",
  // "Harmonics"), so a "Style" caption above them only cost the control row
  // height that the host's pages need elsewhere.

  // --- Colour band: applies to markers, harmonic sets and doppler curves ---
  const colorGroup = document.createElement('div')
  colorGroup.className = 'gram-frame-style-group'
  colorGroup.appendChild(createGroupLabel('Colour'))
  container.appendChild(colorGroup)

  // Palette container - holds the full-width colour slider
  const paletteContainer = document.createElement('div')
  paletteContainer.className = 'gram-frame-color-palette'
  colorGroup.appendChild(paletteContainer)

  // Slider container for canvas and indicator
  const sliderContainer = document.createElement('div')
  sliderContainer.className = 'gram-frame-color-slider'
  sliderContainer.style.position = 'relative'
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

  // --- Symbol band: applies to markers and harmonic sets, not to doppler ---
  const symbolGroup = document.createElement('div')
  symbolGroup.className = 'gram-frame-style-group'
  container.appendChild(symbolGroup)

  const symbolRow = document.createElement('div')
  symbolRow.className = 'gram-frame-style-row'
  symbolGroup.appendChild(symbolRow)

  symbolRow.appendChild(createGroupLabel('Symbol'))

  // The drop-down's glyphs are tinted with the currently selected colour, so it
  // doubles as the colour readout.
  const symbolSelect = createSymbolSelect(instance)
  symbolRow.appendChild(symbolSelect)

  // TEMPORARY (size experiment): the size toggle sits alongside the drop-down
  // it modifies, for feedback on whether larger symbols read better on a real
  // gram.
  symbolRow.appendChild(createLargeSymbolToggle(instance))

  // --- Harmonics band: the pin toggle is the one harmonics-only control ---
  const divider = document.createElement('div')
  divider.className = 'gram-frame-style-divider'
  container.appendChild(divider)

  const harmonicsGroup = document.createElement('div')
  harmonicsGroup.className = 'gram-frame-style-group'
  container.appendChild(harmonicsGroup)

  // Caption and control share a row, as in the Symbol band above.
  const harmonicsRow = document.createElement('div')
  harmonicsRow.className = 'gram-frame-style-row'
  harmonicsGroup.appendChild(harmonicsRow)

  harmonicsRow.appendChild(createGroupLabel('Harmonics'))
  harmonicsRow.appendChild(createPinToggle(instance))

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
    if (!instance.interaction.applyColorToSelectedFeature || !instance.interaction.applyColorToSelectedFeature(color)) {
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
  instance.interaction.syncStyleControls = () => {
    const { color, symbol, showPin, pinApplies, largeSymbols } = getActiveStyle(instance)
    showColor(color)
    if (instance.interaction._symbolControl) {
      instance.interaction._symbolControl.setValue(symbol)
      instance.interaction._symbolControl.setTint(color)
    }
    if (instance.interaction._pinControl) {
      instance.interaction._pinControl.setValue(showPin)
      // Markers have no pin, so the toggle is disabled while one is selected.
      instance.interaction._pinControl.setEnabled(pinApplies)
    }
    // TEMPORARY (size experiment): keep the size toggle in step with selection.
    if (instance.interaction._largeSymbolsControl) {
      instance.interaction._largeSymbolsControl.setValue(largeSymbols)
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
  if (!ctx) {
    // A refused 2d context means no palette to draw into. The swatch row above
    // it is the primary control, so leaving the strip blank degrades rather
    // than throwing during construction.
    return
  }
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