import { describe, test, expect } from 'vitest'
import {
  screenToSVG,
  svgToImage,
  imageToData,
  dataToSVG,
  screenToData,
  getImageBounds,
  isWithinImage,
  clampToImage,
  dataFrequencyRange,
  calculateVisibleDataRange,
  nudgeData
} from '../../src/utils/coordinates.js'
import { getUniformTolerance } from '../../src/utils/tolerance.js'

/**
 * @fileoverview Coordinate-pipeline equivalence grid (spec 166, US2).
 *
 * Before consolidation this file pinned GramFrame's four parallel coordinate
 * implementations against each other (FR-001, AS-2.1). They are now one module,
 * and the grid has become its regression suite: the reference implementations
 * below are the *frozen, pre-consolidation behaviour*, transcribed verbatim
 * from the code that has since been deleted, and every cell asserts that
 * `src/utils/coordinates.js` reproduces them.
 *
 * Where each reference came from:
 *
 *  - `referenceScreenToSVG`, `referenceImageToData` — `utils/coordinates.js`
 *    as it stood before this feature.
 *  - `referenceDataToSVG`, `referenceImageBounds` — `utils/coordinateTransformations.js`
 *    (deleted).
 *  - `referenceKeyboardDataToSVG`, `referenceKeyboardSVGToData` — the private
 *    pair in `core/keyboardControl.js` (deleted).
 *  - `referenceEventsScreenToData` — the inline `screenToDataWithZoom` in
 *    `core/events.js` (deleted).
 *
 * They are deliberately kept as literal copies rather than re-expressed in
 * terms of the canonical module: a reference that called the code under test
 * would assert nothing. The grid walks every cell of research.md §R2 and checks
 * E1-E6 from contracts/coordinates.md at 1e-9 relative tolerance.
 */

// ──────────────────────────────────────────────────────────────
// Frozen reference implementations (verbatim, pre-consolidation)
// ──────────────────────────────────────────────────────────────

/**
 * Was `screenToSVGCoordinates` in `src/utils/coordinates.js`.
 * @param {number} screenX
 * @param {number} screenY
 * @param {any} svg
 * @returns {{x: number, y: number}}
 */
function referenceScreenToSVG(screenX, screenY, svg) {
  const svgRect = svg.getBoundingClientRect()
  const viewBox = svg.viewBox.baseVal

  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    const scaleX = viewBox.width / svgRect.width
    const scaleY = viewBox.height / svgRect.height

    return {
      x: (screenX * scaleX) + viewBox.x,
      y: (screenY * scaleY) + viewBox.y
    }
  }

  return { x: screenX, y: screenY }
}

/**
 * Was `imageToDataCoordinates` in `src/utils/coordinates.js`. Note that it
 * clamped; the canonical `imageToData` does not, and clamping is now an
 * explicit opt-in via `clampToImage` (I5). The grid checks both halves of that
 * split below.
 * @param {number} imageX
 * @param {number} imageY
 * @param {any} config
 * @param {any} imageDetails
 * @param {number} frequencyRate
 * @returns {{freq: number, time: number}}
 */
function referenceImageToData(imageX, imageY, config, imageDetails, frequencyRate) {
  const { freqMin, freqMax, timeMin, timeMax } = config
  const { naturalWidth, naturalHeight } = imageDetails
  const renderWidth = imageDetails.renderWidth || naturalWidth
  const renderHeight = imageDetails.renderHeight || naturalHeight

  const boundedX = Math.max(0, Math.min(imageX, renderWidth))
  const boundedY = Math.max(0, Math.min(imageY, renderHeight))

  const rawFreq = freqMin + (boundedX / renderWidth) * (freqMax - freqMin)
  const time = timeMax - (boundedY / renderHeight) * (timeMax - timeMin)

  return { freq: rawFreq / frequencyRate, time }
}

/**
 * Was `dataToSVG` in `src/utils/coordinateTransformations.js`.
 * @param {{freq: number, time: number}} dataPoint
 * @param {any} viewport
 * @param {any} spectrogramImage
 * @returns {{x: number, y: number}}
 */
function referenceDataToSVG(dataPoint, viewport, spectrogramImage = null) {
  const { margins, imageDetails, config } = viewport
  const { naturalWidth, naturalHeight } = imageDetails
  const renderWidth = imageDetails.renderWidth || naturalWidth
  const renderHeight = imageDetails.renderHeight || naturalHeight
  const { timeMin, timeMax, freqMin, freqMax } = config

  const timeRatio = (dataPoint.time - timeMin) / (timeMax - timeMin)
  const freqRatio = (dataPoint.freq - freqMin) / (freqMax - freqMin)

  let imageLeft = margins.left
  let imageTop = margins.top
  let imageWidth = renderWidth
  let imageHeight = renderHeight

  if (spectrogramImage) {
    imageLeft = parseFloat(spectrogramImage.getAttribute('x') || String(margins.left))
    imageTop = parseFloat(spectrogramImage.getAttribute('y') || String(margins.top))
    imageWidth = parseFloat(spectrogramImage.getAttribute('width') || String(renderWidth))
    imageHeight = parseFloat(spectrogramImage.getAttribute('height') || String(renderHeight))
  }

  return {
    x: imageLeft + freqRatio * imageWidth,
    y: imageTop + (1 - timeRatio) * imageHeight
  }
}

/**
 * Was `getImageBounds` in `src/utils/coordinateTransformations.js`.
 * @param {any} viewport
 * @param {any} spectrogramImage
 * @returns {{left: number, top: number, width: number, height: number}}
 */
function referenceImageBounds(viewport, spectrogramImage = null) {
  const { margins, imageDetails } = viewport
  const { naturalWidth, naturalHeight } = imageDetails
  const renderWidth = imageDetails.renderWidth || naturalWidth
  const renderHeight = imageDetails.renderHeight || naturalHeight

  if (spectrogramImage) {
    return {
      left: parseFloat(spectrogramImage.getAttribute('x') || String(margins.left)),
      top: parseFloat(spectrogramImage.getAttribute('y') || String(margins.top)),
      width: parseFloat(spectrogramImage.getAttribute('width') || String(renderWidth)),
      height: parseFloat(spectrogramImage.getAttribute('height') || String(renderHeight))
    }
  }

  return {
    left: margins.left,
    top: margins.top,
    width: renderWidth,
    height: renderHeight
  }
}

/**
 * Was the private `dataToSVGCoordinates` in `src/core/keyboardControl.js`.
 * It positioned against the base render size, ignoring the image element's
 * live x/width — which is why E3 holds only at zoom 1 (GF-01ᴿ).
 * @param {number} freq
 * @param {number} time
 * @param {any} config
 * @param {any} imageDetails
 * @param {number} frequencyRate
 * @param {any} margins
 * @returns {{x: number, y: number}}
 */
function referenceKeyboardDataToSVG(freq, time, config, imageDetails, frequencyRate, margins) {
  const { freqMin, freqMax, timeMin, timeMax } = config
  const { naturalWidth, naturalHeight } = imageDetails
  const renderWidth = imageDetails.renderWidth || naturalWidth
  const renderHeight = imageDetails.renderHeight || naturalHeight

  const rawFreq = freq * frequencyRate

  const normalizedX = (rawFreq - freqMin) / (freqMax - freqMin)
  const normalizedY = 1.0 - (time - timeMin) / (timeMax - timeMin)

  return {
    x: margins.left + normalizedX * renderWidth,
    y: margins.top + normalizedY * renderHeight
  }
}

/**
 * Was the private `svgToDataCoordinates` in `src/core/keyboardControl.js`.
 * @param {number} svgX
 * @param {number} svgY
 * @param {any} config
 * @param {any} imageDetails
 * @param {number} frequencyRate
 * @param {any} margins
 * @returns {{freq: number, time: number}}
 */
function referenceKeyboardSVGToData(svgX, svgY, config, imageDetails, frequencyRate, margins) {
  const { freqMin, freqMax, timeMin, timeMax } = config
  const { naturalWidth, naturalHeight } = imageDetails
  const renderWidth = imageDetails.renderWidth || naturalWidth
  const renderHeight = imageDetails.renderHeight || naturalHeight

  const imageX = svgX - margins.left
  const imageY = svgY - margins.top

  const boundedX = Math.max(0, Math.min(imageX, renderWidth))
  const boundedY = Math.max(0, Math.min(imageY, renderHeight))

  const rawFreq = freqMin + (boundedX / renderWidth) * (freqMax - freqMin)
  const time = timeMax - (boundedY / renderHeight) * (timeMax - timeMin)

  return { freq: rawFreq / frequencyRate, time }
}

/**
 * Was the private `screenToDataWithZoom` in `src/core/events.js`, with the
 * `instance` dependency reduced to the three fields it read.
 * @param {{state: any, svg: any, spectrogramImage: any}} instance
 * @param {{clientX: number, clientY: number}} event
 * @returns {{svgCoords: {x: number, y: number}, imageX: number, imageY: number, dataCoords: {freq: number, time: number}}|null}
 */
function referenceEventsScreenToData(instance, event) {
  const svgRect = instance.svg.getBoundingClientRect()
  const screenX = event.clientX - svgRect.left
  const screenY = event.clientY - svgRect.top

  const svgCoords = referenceScreenToSVG(screenX, screenY, instance.svg)

  const margins = instance.state.margins
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  const renderWidth = instance.state.imageDetails.renderWidth || naturalWidth
  const renderHeight = instance.state.imageDetails.renderHeight || naturalHeight

  let imageLeft = margins.left
  let imageTop = margins.top
  let imageWidth = renderWidth
  let imageHeight = renderHeight

  if (instance.spectrogramImage) {
    imageLeft = parseFloat(instance.spectrogramImage.getAttribute('x') || String(margins.left))
    imageTop = parseFloat(instance.spectrogramImage.getAttribute('y') || String(margins.top))
    imageWidth = parseFloat(instance.spectrogramImage.getAttribute('width') || String(renderWidth))
    imageHeight = parseFloat(instance.spectrogramImage.getAttribute('height') || String(renderHeight))
  }

  const imageX = (svgCoords.x - imageLeft) * (renderWidth / imageWidth)
  const imageY = (svgCoords.y - imageTop) * (renderHeight / imageHeight)

  const withinBounds = svgCoords.x >= imageLeft && svgCoords.x <= imageLeft + imageWidth &&
                      svgCoords.y >= imageTop && svgCoords.y <= imageTop + imageHeight &&
                      imageX >= 0 && imageX <= renderWidth &&
                      imageY >= 0 && imageY <= renderHeight

  if (!withinBounds) {
    return null
  }

  const dataCoords = referenceImageToData(
    imageX, imageY,
    instance.state.config,
    instance.state.imageDetails,
    instance.state.frequencyRate
  )

  return { svgCoords, imageX, imageY, dataCoords }
}

// ──────────────────────────────────────────────────────────────
// Grid axes (research.md §R2)
// ──────────────────────────────────────────────────────────────

/** Natural image size used throughout the grid */
const NATURAL = { width: 1000, height: 400 }

/** Zoom levels */
const ZOOM_LEVELS = [1, 1.5, 2, 4]

/**
 * Render sizes. `natural` is the un-expanded case; the other two stand for a
 * base render size that differs from natural — which happens both on expand
 * and on the automatic down-scaling of images wider than 1200px.
 */
const RENDER_VARIANTS = {
  natural: { renderWidth: NATURAL.width, renderHeight: NATURAL.height },
  twice: { renderWidth: NATURAL.width * 2, renderHeight: NATURAL.height * 2 },
  nonUniform: { renderWidth: NATURAL.width * 2, renderHeight: NATURAL.height * 1.5 }
}

/**
 * Whether the spectrogram image element is present. Every implementation
 * branches on this, and it is how "expand" is observable at all: the element's
 * live x/y/width/height already encode expand × zoom.
 */
const ELEMENT_PRESENCE = [true, false]

/** Margin configurations */
const MARGIN_VARIANTS = {
  default: { left: 60, bottom: 50, right: 15, top: 15 },
  zero: { left: 0, bottom: 0, right: 0, top: 0 },
  asymmetric: { left: 90, bottom: 20, right: 40, top: 35 }
}

/** Frequency-rate values — a divider applied on the data side only (I4) */
const FREQUENCY_RATES = [1, 2]

/** Time/frequency configuration */
const CONFIG = { timeMin: 0, timeMax: 60, freqMin: 100, freqMax: 2100 }

/** Relative tolerance for float comparisons */
const TOL = 1e-9

/**
 * Build one grid cell: the viewport bundle plus the element and SVG stubs the
 * implementations read.
 * @param {{zoom: number, renderVariant: string, hasElement: boolean, marginVariant: string, frequencyRate: number}} axes
 * @returns {any} Cell fixtures
 */
function buildCell({ zoom, renderVariant, hasElement, marginVariant, frequencyRate }) {
  const margins = /** @type {Record<string, {left: number, bottom: number, right: number, top: number}>} */ (MARGIN_VARIANTS)[marginVariant]
  const { renderWidth, renderHeight } = /** @type {Record<string, {renderWidth: number, renderHeight: number}>} */ (RENDER_VARIANTS)[renderVariant]
  const imageDetails = {
    url: '',
    naturalWidth: NATURAL.width,
    naturalHeight: NATURAL.height,
    renderWidth,
    renderHeight
  }

  // Zoom resizes the image element and shifts it so the centre stays put
  // (ADR-015); the viewBox is unchanged.
  const elementWidth = renderWidth * zoom
  const elementHeight = renderHeight * zoom
  const elementX = margins.left - (elementWidth - renderWidth) / 2
  const elementY = margins.top - (elementHeight - renderHeight) / 2

  const attributes = {
    x: String(elementX),
    y: String(elementY),
    width: String(elementWidth),
    height: String(elementHeight)
  }

  const spectrogramImage = hasElement
    ? { getAttribute: (/** @type {string} */ name) => /** @type {Record<string, string>} */ (attributes)[name] ?? null }
    : null

  const viewBoxWidth = margins.left + renderWidth + margins.right
  const viewBoxHeight = margins.top + renderHeight + margins.bottom

  // A deliberately non-unit screen scale, so screen->SVG scaling is exercised
  // rather than accidentally being the identity.
  const svgRect = { left: 37, top: 21, width: viewBoxWidth / 1.25, height: viewBoxHeight / 1.25 }
  const svg = {
    getBoundingClientRect: () => svgRect,
    viewBox: { baseVal: { x: 0, y: 0, width: viewBoxWidth, height: viewBoxHeight } }
  }

  const viewport = { margins, imageDetails, config: CONFIG, frequencyRate, zoom: { level: zoom } }
  const instance = { state: viewport, svg, spectrogramImage }

  return {
    axes: { zoom, renderVariant, hasElement, marginVariant, frequencyRate },
    margins,
    imageDetails,
    viewport,
    instance,
    svg,
    svgRect,
    spectrogramImage,
    elementX,
    elementY,
    elementWidth,
    elementHeight,
    renderWidth,
    renderHeight
  }
}

/**
 * Every cell of the grid.
 * @type {any[]}
 */
const CELLS = []
for (const zoom of ZOOM_LEVELS) {
  for (const renderVariant of Object.keys(RENDER_VARIANTS)) {
    for (const hasElement of ELEMENT_PRESENCE) {
      for (const marginVariant of Object.keys(MARGIN_VARIANTS)) {
        for (const frequencyRate of FREQUENCY_RATES) {
          CELLS.push(buildCell({ zoom, renderVariant, hasElement, marginVariant, frequencyRate }))
        }
      }
    }
  }
}

/**
 * Sample points for a cell, in image (render-pixel) space: the four corners,
 * the centre, and points just outside each edge.
 * @param {any} cell
 * @returns {{name: string, imageX: number, imageY: number, inBounds: boolean}[]}
 */
function imageSamplePoints(cell) {
  const { renderWidth: w, renderHeight: h } = cell
  return [
    { name: 'top-left', imageX: 0, imageY: 0, inBounds: true },
    { name: 'top-right', imageX: w, imageY: 0, inBounds: true },
    { name: 'bottom-left', imageX: 0, imageY: h, inBounds: true },
    { name: 'bottom-right', imageX: w, imageY: h, inBounds: true },
    { name: 'centre', imageX: w / 2, imageY: h / 2, inBounds: true },
    { name: 'outside-left', imageX: -5, imageY: h / 2, inBounds: false },
    { name: 'outside-right', imageX: w + 5, imageY: h / 2, inBounds: false },
    { name: 'outside-top', imageX: w / 2, imageY: -5, inBounds: false },
    { name: 'outside-bottom', imageX: w / 2, imageY: h + 5, inBounds: false }
  ]
}

/**
 * Convert an image-space point to the client coordinates that would produce it.
 * @param {any} cell
 * @param {number} imageX
 * @param {number} imageY
 * @returns {{clientX: number, clientY: number}}
 */
function imagePointToClient(cell, imageX, imageY) {
  const bounds = referenceImageBounds(cell.viewport, cell.spectrogramImage)

  const svgX = bounds.left + imageX * (bounds.width / cell.renderWidth)
  const svgY = bounds.top + imageY * (bounds.height / cell.renderHeight)

  const viewBox = cell.svg.viewBox.baseVal
  const scaleX = viewBox.width / cell.svgRect.width
  const scaleY = viewBox.height / cell.svgRect.height

  return {
    clientX: cell.svgRect.left + (svgX - viewBox.x) / scaleX,
    clientY: cell.svgRect.top + (svgY - viewBox.y) / scaleY
  }
}

/**
 * Compact label for a cell, so a failure names the exact configuration.
 * @param {any} cell
 * @returns {string}
 */
function label(cell) {
  const a = cell.axes
  return `zoom=${a.zoom} render=${a.renderVariant} element=${a.hasElement} margins=${a.marginVariant} frequencyRate=${a.frequencyRate}`
}

/**
 * Assert two numbers agree to the grid's relative tolerance.
 * @param {number} actual
 * @param {number} expected
 * @param {string} what
 */
function expectClose(actual, expected, what) {
  const scale = Math.max(1, Math.abs(expected))
  expect(Math.abs(actual - expected) / scale, what).toBeLessThan(TOL)
}

describe('canonical coordinate module vs the pre-consolidation reference', () => {
  test('the grid covers every documented cell', () => {
    // 4 zoom x 3 render x 2 element x 3 margins x 2 frequency rates
    expect(CELLS.length).toBe(4 * 3 * 2 * 3 * 2)
  })

  test('getImageBounds reproduces the reference bounds', () => {
    for (const cell of CELLS) {
      const actual = getImageBounds(cell.viewport, cell.spectrogramImage)
      const expected = referenceImageBounds(cell.viewport, cell.spectrogramImage)
      expectClose(actual.left, expected.left, `${label(cell)} left`)
      expectClose(actual.top, expected.top, `${label(cell)} top`)
      expectClose(actual.width, expected.width, `${label(cell)} width`)
      expectClose(actual.height, expected.height, `${label(cell)} height`)
    }
  })

  test('screenToSVG reproduces the reference screen->SVG transform', () => {
    for (const cell of CELLS) {
      for (const point of imageSamplePoints(cell)) {
        const client = imagePointToClient(cell, point.imageX, point.imageY)
        const screenX = client.clientX - cell.svgRect.left
        const screenY = client.clientY - cell.svgRect.top

        const actual = screenToSVG(screenX, screenY, cell.svg)
        const expected = referenceScreenToSVG(screenX, screenY, cell.svg)
        expectClose(actual.x, expected.x, `${label(cell)} ${point.name} x`)
        expectClose(actual.y, expected.y, `${label(cell)} ${point.name} y`)
      }
    }
  })

  // E4
  test('E4: imageToData reproduces the reference for in-bounds points', () => {
    for (const cell of CELLS) {
      for (const point of imageSamplePoints(cell)) {
        if (!point.inBounds) continue
        const actual = imageToData(point.imageX, point.imageY, cell.viewport)
        const expected = referenceImageToData(
          point.imageX, point.imageY, CONFIG, cell.imageDetails, cell.axes.frequencyRate
        )
        expectClose(actual.freq, expected.freq, `${label(cell)} ${point.name} freq`)
        expectClose(actual.time, expected.time, `${label(cell)} ${point.name} time`)
      }
    }
  })

  test('imageToData no longer clamps, and clampToImage restores the old behaviour (I5)', () => {
    for (const cell of CELLS) {
      for (const point of imageSamplePoints(cell)) {
        if (point.inBounds) continue

        // The reference clamped inside the transform; the canonical split does
        // the clamping first and then transforms, reaching the same answer.
        const clamped = clampToImage(point.imageX, point.imageY, cell.viewport)
        const viaSplit = imageToData(clamped.x, clamped.y, cell.viewport)
        const expected = referenceImageToData(
          point.imageX, point.imageY, CONFIG, cell.imageDetails, cell.axes.frequencyRate
        )
        expectClose(viaSplit.freq, expected.freq, `${label(cell)} ${point.name} clamped freq`)
        expectClose(viaSplit.time, expected.time, `${label(cell)} ${point.name} clamped time`)

        // ...and without the clamp the transform extrapolates rather than pinning
        const unclamped = imageToData(point.imageX, point.imageY, cell.viewport)
        const differs = Math.abs(unclamped.freq - expected.freq) > 1e-9 ||
                        Math.abs(unclamped.time - expected.time) > 1e-9
        expect(differs, `${label(cell)} ${point.name} should extrapolate`).toBe(true)
      }
    }
  })

  // E1
  test('E1: screenToData reproduces the reference pointer path', () => {
    for (const cell of CELLS) {
      for (const point of imageSamplePoints(cell)) {
        const client = imagePointToClient(cell, point.imageX, point.imageY)
        const actual = screenToData(
          client.clientX, client.clientY, cell.svg, cell.viewport, cell.spectrogramImage
        )
        const expected = referenceEventsScreenToData(cell.instance, client)

        const within = isWithinImage(actual.svg, cell.viewport, cell.spectrogramImage)
        if (expected === null) {
          expect(within, `${label(cell)} ${point.name} should be out of bounds`).toBe(false)
          continue
        }

        expect(within, `${label(cell)} ${point.name} should be in bounds`).toBe(true)
        expectClose(actual.svg.x, expected.svgCoords.x, `${label(cell)} ${point.name} svgX`)
        expectClose(actual.svg.y, expected.svgCoords.y, `${label(cell)} ${point.name} svgY`)
        expectClose(actual.image.x, expected.imageX, `${label(cell)} ${point.name} imageX`)
        expectClose(actual.image.y, expected.imageY, `${label(cell)} ${point.name} imageY`)
        expectClose(actual.data.freq, expected.dataCoords.freq, `${label(cell)} ${point.name} freq`)
        expectClose(actual.data.time, expected.dataCoords.time, `${label(cell)} ${point.name} time`)
      }
    }
  })

  // E2
  test('E2: dataToSVG reproduces the reference zoom-aware transform', () => {
    for (const cell of CELLS) {
      for (const point of imageSamplePoints(cell)) {
        const data = imageToData(point.imageX, point.imageY, cell.viewport)
        // The deleted `coordinateTransformations.js` took raw configured hertz;
        // the canonical module takes data scale (issue #276). Stating the scale
        // at the call is the whole difference between them.
        const rawData = { freq: data.freq * cell.axes.frequencyRate, time: data.time }

        const actual = dataToSVG(data, cell.viewport, cell.spectrogramImage)
        const expected = referenceDataToSVG(rawData, cell.viewport, cell.spectrogramImage)

        expectClose(actual.x, expected.x, `${label(cell)} ${point.name} x`)
        expectClose(actual.y, expected.y, `${label(cell)} ${point.name} y`)
      }
    }
  })

  // E3
  test('E3: dataToSVG matches the old keyboard transform at zoom 1', () => {
    const cells = CELLS.filter((c) => c.axes.zoom === 1)
    expect(cells.length).toBeGreaterThan(0)

    for (const cell of cells) {
      for (const point of imageSamplePoints(cell)) {
        const data = imageToData(point.imageX, point.imageY, cell.viewport)

        // No compensation on either side: the pre-consolidation keyboard pair
        // was already symmetric in data scale, and the canonical module now
        // matches it (issue #276).
        const actual = dataToSVG(data, cell.viewport, cell.spectrogramImage)
        const expected = referenceKeyboardDataToSVG(
          data.freq, data.time, CONFIG, cell.imageDetails, cell.axes.frequencyRate, cell.margins
        )

        expectClose(actual.x, expected.x, `${label(cell)} ${point.name} x`)
        expectClose(actual.y, expected.y, `${label(cell)} ${point.name} y`)
      }
    }
  })

  test('E3 (rendered-pixels equivalence): one keypress moves one rendered pixel at every zoom', () => {
    // Before consolidation the keyboard path positioned against the base render
    // size, so it moved `zoom` rendered pixels per keypress and compensated by
    // dividing the increment by the zoom level. The canonical module positions
    // against the live element, so an uncompensated increment now moves exactly
    // one rendered pixel — which is what let that division be deleted
    // (FR-003, I2). Both routes must agree on what the analyst sees.
    for (const cell of CELLS.filter((c) => c.axes.hasElement)) {
      const step = 1
      // Image top-left, in data scale — the scale `dataToSVG` now takes.
      const origin = { freq: CONFIG.freqMin / cell.axes.frequencyRate, time: CONFIG.timeMax }

      // Canonical: move one pixel in SVG space, with no zoom compensation
      const canonicalOrigin = dataToSVG(origin, cell.viewport, cell.spectrogramImage)
      const canonicalMovedImage = svgToImage(
        canonicalOrigin.x + step, canonicalOrigin.y, cell.viewport, cell.spectrogramImage
      )
      const canonicalMoved = dataToSVG(
        { freq: imageToData(canonicalMovedImage.x, canonicalMovedImage.y, cell.viewport).freq,
          time: origin.time },
        cell.viewport,
        cell.spectrogramImage
      )
      expectClose(canonicalMoved.x - canonicalOrigin.x, step, `${label(cell)} canonical rendered pixels`)

      // Reference: the same rendered movement, but only once the increment is
      // divided by the zoom level, as the deleted code did.
      const compensated = step / cell.axes.zoom
      const refOrigin = referenceKeyboardDataToSVG(
        origin.freq, origin.time, CONFIG, cell.imageDetails, cell.axes.frequencyRate, cell.margins
      )
      const refMovedData = referenceKeyboardSVGToData(
        refOrigin.x + compensated, refOrigin.y, CONFIG, cell.imageDetails, cell.axes.frequencyRate, cell.margins
      )
      const refMoved = referenceDataToSVG(
        { freq: refMovedData.freq * cell.axes.frequencyRate, time: refMovedData.time },
        cell.viewport,
        cell.spectrogramImage
      )
      expectClose(refMoved.x - canonicalOrigin.x, step, `${label(cell)} reference rendered pixels`)
    }
  })

  // E5
  test('E5: dataToSVG(imageToData(p)) round-trips back to p for in-bounds points', () => {
    for (const cell of CELLS) {
      for (const point of imageSamplePoints(cell)) {
        if (!point.inBounds) continue

        const data = imageToData(point.imageX, point.imageY, cell.viewport)
        const svgPoint = dataToSVG(data, cell.viewport, cell.spectrogramImage)
        const back = svgToImage(svgPoint.x, svgPoint.y, cell.viewport, cell.spectrogramImage)

        expectClose(back.x, point.imageX, `${label(cell)} ${point.name} round-trip x`)
        expectClose(back.y, point.imageY, `${label(cell)} ${point.name} round-trip y`)
      }
    }
  })

  // E6
  test('E6: isWithinImage agrees exactly with the reference bounds decision', () => {
    for (const cell of CELLS) {
      for (const point of imageSamplePoints(cell)) {
        const client = imagePointToClient(cell, point.imageX, point.imageY)
        const svgRect = cell.svgRect
        const svgPoint = screenToSVG(
          client.clientX - svgRect.left, client.clientY - svgRect.top, cell.svg
        )

        const actual = isWithinImage(svgPoint, cell.viewport, cell.spectrogramImage)
        const expected = referenceEventsScreenToData(cell.instance, client) !== null

        expect(actual, `${label(cell)} ${point.name} bounds agreement`).toBe(expected)
        expect(actual, `${label(cell)} ${point.name} expected in-bounds`).toBe(point.inBounds)
      }
    }
  })

  test('the frequency rate is applied on the data side only — SVG and image space carry none of it (I4)', () => {
    for (const cell of CELLS.filter((c) => c.axes.frequencyRate === 2)) {
      const rateOne = buildCell({ ...cell.axes, frequencyRate: 1 })
      for (const point of imageSamplePoints(cell)) {
        const withRate = imageToData(point.imageX, point.imageY, cell.viewport)
        const withoutRate = imageToData(point.imageX, point.imageY, rateOne.viewport)
        expectClose(withRate.freq * 2, withoutRate.freq, `${label(cell)} ${point.name} freq scales with the frequency rate`)
        expectClose(withRate.time, withoutRate.time, `${label(cell)} ${point.name} time ignores the frequency rate`)

        // The rate lives in the *reading*, not in the geometry: the two
        // readings differ by the rate, and each maps back to the same pixel.
        // This is the invariant that replaced "dataToSVG carries no rate at
        // all" — which was true of the code and false of the component, and
        // was the defect (issue #276).
        const svgWith = dataToSVG(withRate, cell.viewport, cell.spectrogramImage)
        const svgWithout = dataToSVG(withoutRate, rateOne.viewport, rateOne.spectrogramImage)
        expectClose(svgWith.x, svgWithout.x, `${label(cell)} ${point.name} SVG x is the same pixel at either rate`)
        expectClose(svgWith.y, svgWithout.y, `${label(cell)} ${point.name} SVG y is the same pixel at either rate`)
      }
    }
  })
})

/**
 * Issue #276 — the rate was applied on one leg of the pipeline and undone by
 * hand on some of the others. These pin every leg at `frequencyRate = 2`,
 * where the factor is visible; at the default rate of 1 all of them pass
 * against the old code too, which is exactly why it went unnoticed.
 */
describe('a frequency rate other than 1 is internally consistent (issue #276)', () => {
  /** The grid cells where the rate is not 1. @type {any[]} */
  const RATE_CELLS = CELLS.filter((c) => c.axes.frequencyRate === 2 && c.axes.hasElement)

  test('the grid actually contains rate-2 cells', () => {
    expect(RATE_CELLS.length).toBeGreaterThan(0)
  })

  test('imageToData and dataToSVG are inverses, so a feature is drawn where it was read', () => {
    for (const cell of RATE_CELLS) {
      for (const point of imageSamplePoints(cell)) {
        if (!point.inBounds) continue

        // What a click stores, and where the renderer then puts it. Was: the
        // stored (divided) frequency went into `dataToSVG` unscaled, so a
        // marker drew at half its own frequency's position.
        const stored = imageToData(point.imageX, point.imageY, cell.viewport)
        const drawn = svgToImage(
          dataToSVG(stored, cell.viewport, cell.spectrogramImage).x,
          dataToSVG(stored, cell.viewport, cell.spectrogramImage).y,
          cell.viewport,
          cell.spectrogramImage
        )

        expectClose(drawn.x, point.imageX, `${label(cell)} ${point.name} drawn x`)
        expectClose(drawn.y, point.imageY, `${label(cell)} ${point.name} drawn y`)
      }
    }
  })

  test('the keyboard path moves a marker by the frequency one pixel is worth', () => {
    for (const cell of RATE_CELLS) {
      // `nudgeData` is the arrow-key geometry itself — the function
      // `moveSelectedMarker` calls, not a copy of it — so a compensation
      // creeping back into that path fails here.
      const start = imageToData(cell.renderWidth / 2, cell.renderHeight / 2, cell.viewport)
      const moved = nudgeData(start, 1, 0, cell.viewport, cell.spectrogramImage)

      // One rendered pixel is one rendered pixel at any rate; what changes is
      // how much frequency it is worth, and that is the rate's whole job.
      const perPixel = (CONFIG.freqMax - CONFIG.freqMin) /
        cell.axes.frequencyRate / (cell.renderWidth * cell.axes.zoom)
      expectClose(moved.freq - start.freq, perPixel, `${label(cell)} keyboard step in data scale`)
      expectClose(moved.time, start.time, `${label(cell)} keyboard step leaves time alone`)
    }
  })

  test('dataFrequencyRange is the visible range and the axis labels, in one scale', () => {
    for (const cell of RATE_CELLS) {
      const range = dataFrequencyRange(cell.viewport)
      expectClose(range.freqMin, CONFIG.freqMin / 2, `${label(cell)} data-scale freqMin`)
      expectClose(range.freqMax, CONFIG.freqMax / 2, `${label(cell)} data-scale freqMax`)

      // `calculateVisibleDataRange` feeds both the axis labels and the pin-set
      // modes' "which members are on screen" test, and those compare it
      // against stored frequencies. Was: it returned raw hertz, and `axes.js`
      // divided a second time while the modes did not divide at all.
      const visible = calculateVisibleDataRange(cell.viewport, cell.spectrogramImage)
      const edges = [
        imageToData(0, 0, cell.viewport).freq,
        imageToData(cell.renderWidth, 0, cell.viewport).freq
      ]
      if (cell.axes.zoom === 1) {
        expectClose(visible.freqMin, edges[0], `${label(cell)} visible freqMin at zoom 1`)
        expectClose(visible.freqMax, edges[1], `${label(cell)} visible freqMax at zoom 1`)
      } else {
        // Zoomed in, the visible span is a strict subset of the whole gram —
        // still in data scale, which is the part that was wrong.
        expect(visible.freqMin).toBeGreaterThan(edges[0])
        expect(visible.freqMax).toBeLessThan(edges[1])
        expect(visible.freqMax).toBeLessThanOrEqual(range.freqMax)
      }
    }
  })

  test('the hit-test tolerance is a data-scale span, so the grab radius stays 8 rendered pixels', () => {
    for (const cell of RATE_CELLS) {
      const rateOne = buildCell({ ...cell.axes, frequencyRate: 1 })
      const withRate = getUniformTolerance(cell.viewport, cell.spectrogramImage)
      const withoutRate = getUniformTolerance(rateOne.viewport, rateOne.spectrogramImage)

      // Halving the numbers halves the tolerance that expresses them. Was: the
      // tolerance stayed in raw hertz and the grab region became twice the
      // drawn glyph.
      expectClose(withRate.freq * 2, withoutRate.freq, `${label(cell)} tolerance scales with the rate`)
      expectClose(withRate.time, withoutRate.time, `${label(cell)} time tolerance ignores the rate`)
    }
  })
})
