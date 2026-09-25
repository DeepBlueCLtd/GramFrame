/**
 * The colour slider: the one colour control in the panel.
 *
 * A full-hue gradient with a bar thumb, and the arithmetic that turns a
 * position into a colour and back. It is the widest-reaching control in the
 * style panel — it colours analysis markers, harmonic sets, sideband sets AND
 * doppler curves — and, since the redesign, the only one: the second row of
 * fixed swatches is gone, because two ways to set one property meant neither
 * was the one that said what the colour currently was.
 *
 * The strip is a canvas rather than a CSS gradient so the position-to-colour
 * mapping is read from the same pixels the analyst clicked, rather than from a
 * second description of the ramp that could drift from the drawn one.
 *
 * The panel around it — the target tabs, the symbol row, the pin row — is
 * `StylePanel.js`.
 */

/// <reference path="../types.js" />

import { dispatch } from '../core/state.js'

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
 * The slider's handle.
 * @typedef {Object} ColorControl
 * @property {function(string): void} setValue - Move the thumb to this colour, without changing state
 */

/**
 * Create the colour slider.
 *
 * When a feature is selected and the panel is targeting it, clicking restyles
 * that feature in place; otherwise the colour becomes the one the next created
 * feature takes (feature 161).
 * @param {GramFrame} instance - GramFrame instance
 * @param {function(string): void} onPick - Told the colour, after it has been routed
 * @returns {{element: HTMLDivElement, control: ColorControl}} The slider and its handle
 */
export function createColorSlider(instance, onPick) {
  const state = instance.state

  const container = document.createElement('div')
  container.className = 'gram-frame-color-slider'

  const canvas = document.createElement('canvas')
  canvas.width = 140
  canvas.height = 20
  canvas.className = 'gram-frame-color-canvas'
  container.appendChild(canvas)

  if (!state.selectedColor) {
    state.selectedColor = '#ff6b6b'
  }

  drawColorPalette(canvas)

  const indicator = document.createElement('div')
  indicator.className = 'gram-frame-color-indicator'
  container.appendChild(indicator)

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left

    // Scale x coordinate to canvas dimensions if CSS scaling differs
    const scaleX = canvas.width / rect.width
    const canvasX = x * scaleX

    const color = getColorFromPosition(canvasX, canvas.width)

    // Route to the targeted feature when there is one (restyle in place),
    // otherwise set the colour for the next created feature (feature 161).
    const apply = instance.interaction.applyColorToSelectedFeature
    if (!apply || !apply(color)) {
      state.selectedColor = color
      // Dispatch: this is a state change listeners care about, and only the
      // "Large" toggle used to say so (issue #268, BH-30).
      dispatch(instance)
    }

    updateIndicatorPosition(indicator, canvasX, canvas.width)
    onPick(color)
  })

  /** @type {ColorControl} */
  const control = {
    setValue(color) {
      updateIndicatorPosition(indicator, getPositionFromColor(color, canvas.width), canvas.width)
    }
  }
  control.setValue(state.selectedColor)

  return { element: container, control }
}

/**
 * Draw a continuous color palette on canvas
 * @param {HTMLCanvasElement} canvas - Canvas element
 */
function drawColorPalette(canvas) {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    // A refused 2d context means no palette to draw into. Leaving the strip
    // blank degrades rather than throwing during construction; the symbol
    // button still shows what colour is in force.
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
