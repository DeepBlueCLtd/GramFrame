import { describe, test, expect } from 'vitest'
import {
  screenToSVGCoordinates,
  imageToDataCoordinates
} from '../../src/utils/coordinates.js'
import {
  dataToSVG as dataToSVGZoomAware,
  calculateZoomAwarePosition,
  getImageBounds as getImageBoundsZoomAware
} from '../../src/utils/coordinateTransformations.js'

/**
 * @fileoverview Coordinate-pipeline equivalence grid (spec 166, US2).
 *
 * Pins the behaviour of GramFrame's four parallel coordinate implementations
 * BEFORE any of them is deleted (FR-001, AS-2.1). Every cell of the grid in
 * research.md §R2 is exercised, and the equivalences E1-E6 from
 * contracts/coordinates.md are asserted at 1e-9 relative tolerance.
 *
 * If a cell fails here *before* consolidation, the pin is not faithful: the
 * four paths already disagree, and that is a bug to triage in its own right
 * rather than something to route around.
 *
 * ## Why two of the four are transcribed rather than imported
 *
 * `utils/coordinates.js` and `utils/coordinateTransformations.js` are imported
 * live. The other two are not importable as they stand:
 *
 *  - `dataToSVGCoordinates` / `svgToDataCoordinates` are private to
 *    `core/keyboardControl.js`;
 *  - `screenToDataWithZoom` is private to `core/events.js`, which pulls in the
 *    rendering and DOM graph this pure-Node lane deliberately excludes.
 *
 * Exporting them for the test would be a source change in the pin commit —
 * which this group forbids — and would raise the `unusedExportModules` ratchet
 * that FR-011 says must only ever fall. They are therefore transcribed below
 * VERBATIM from the live code, with their source location recorded. The
 * transcription and the deletion of the originals land one commit apart, and
 * this grid is precisely the check that the canonical module reproduces them.
 */

// ──────────────────────────────────────────────────────────────
// Recorded implementations (verbatim transcriptions)
// ──────────────────────────────────────────────────────────────

/**
 * Verbatim from `src/core/keyboardControl.js` — private `dataToSVGCoordinates`.
 * Note what it does NOT do: it positions against `margins.left + normalized *
 * renderWidth`, ignoring the image element's live x/width. That is why E3 is
 * asserted only at zoom 1 with the element at its base size (GF-01ᴿ).
 * @param {number} freq
 * @param {number} time
 * @param {Config} config
 * @param {ImageDetails} imageDetails
 * @param {number} rate
 * @param {AxesMargins} margins
 * @returns {{x: number, y: number}}
 */
function recordedKeyboardDataToSVG(freq, time, config, imageDetails, rate, margins) {
  const { freqMin, freqMax, timeMin, timeMax } = config
  const { naturalWidth, naturalHeight } = imageDetails
  const renderWidth = imageDetails.renderWidth || naturalWidth
  const renderHeight = imageDetails.renderHeight || naturalHeight

  const rawFreq = freq * rate

  const normalizedX = (rawFreq - freqMin) / (freqMax - freqMin)
  const normalizedY = 1.0 - (time - timeMin) / (timeMax - timeMin)

  return {
    x: margins.left + normalizedX * renderWidth,
    y: margins.top + normalizedY * renderHeight
  }
}

/**
 * Verbatim from `src/core/keyboardControl.js` — private `svgToDataCoordinates`.
 * Clamps to the image bounds rather than reporting out-of-bounds, which is the
 * documented difference from the events.js path (research.md §R2).
 * @param {number} svgX
 * @param {number} svgY
 * @param {Config} config
 * @param {ImageDetails} imageDetails
 * @param {number} rate
 * @param {AxesMargins} margins
 * @returns {{freq: number, time: number}}
 */
function recordedKeyboardSVGToData(svgX, svgY, config, imageDetails, rate, margins) {
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

  const freq = rawFreq / rate

  return { freq, time }
}

/**
 * Verbatim from `src/core/events.js` — private `screenToDataWithZoom`, with the
 * `instance` dependency reduced to the three fields it reads (state, svg,
 * spectrogramImage) so it runs outside a browser.
 * @param {{state: any, svg: any, spectrogramImage: any}} instance
 * @param {{clientX: number, clientY: number}} event
 * @returns {{svgCoords: {x: number, y: number}, imageX: number, imageY: number, dataCoords: {freq: number, time: number}}|null}
 */
function recordedEventsScreenToData(instance, event) {
  const svgRect = instance.svg.getBoundingClientRect()
  const screenX = event.clientX - svgRect.left
  const screenY = event.clientY - svgRect.top

  const svgCoords = screenToSVGCoordinates(screenX, screenY, instance.svg, instance.state.imageDetails)

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

  const dataCoords = imageToDataCoordinates(
    imageX, imageY,
    instance.state.config,
    instance.state.imageDetails,
    instance.state.rate
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

/** Rate values — a frequency divider applied on the data side only (I4) */
const RATES = [1, 2]

/** Time/frequency configuration */
const CONFIG = { timeMin: 0, timeMax: 60, freqMin: 100, freqMax: 2100 }

/** Relative tolerance for float comparisons */
const TOL = 1e-9

/**
 * Build one grid cell: the viewport bundle plus the element and SVG stubs the
 * implementations read.
 * @param {{zoom: number, renderVariant: string, hasElement: boolean, marginVariant: string, rate: number}} axes
 * @returns {any} Cell fixtures
 */
function buildCell({ zoom, renderVariant, hasElement, marginVariant, rate }) {
  const margins = MARGIN_VARIANTS[marginVariant]
  const { renderWidth, renderHeight } = RENDER_VARIANTS[renderVariant]
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
    ? { getAttribute: (name) => attributes[name] ?? null }
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

  const viewport = { margins, imageDetails, config: CONFIG, rate, zoom: { level: zoom } }
  const instance = { state: { margins, imageDetails, config: CONFIG, rate }, svg, spectrogramImage }

  return {
    axes: { zoom, renderVariant, hasElement, marginVariant, rate },
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

/** Every cell of the grid */
const CELLS = []
for (const zoom of ZOOM_LEVELS) {
  for (const renderVariant of Object.keys(RENDER_VARIANTS)) {
    for (const hasElement of ELEMENT_PRESENCE) {
      for (const marginVariant of Object.keys(MARGIN_VARIANTS)) {
        for (const rate of RATES) {
          CELLS.push(buildCell({ zoom, renderVariant, hasElement, marginVariant, rate }))
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
 * Convert an image-space point to the client coordinates that would produce it,
 * inverting the transforms under test so a sample point can be fed in as a real
 * pointer position.
 * @param {any} cell
 * @param {number} imageX
 * @param {number} imageY
 * @returns {{clientX: number, clientY: number}}
 */
function imagePointToClient(cell, imageX, imageY) {
  const left = cell.spectrogramImage ? cell.elementX : cell.margins.left
  const top = cell.spectrogramImage ? cell.elementY : cell.margins.top
  const width = cell.spectrogramImage ? cell.elementWidth : cell.renderWidth
  const height = cell.spectrogramImage ? cell.elementHeight : cell.renderHeight

  const svgX = left + imageX * (width / cell.renderWidth)
  const svgY = top + imageY * (height / cell.renderHeight)

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
  return `zoom=${a.zoom} render=${a.renderVariant} element=${a.hasElement} margins=${a.marginVariant} rate=${a.rate}`
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

describe('coordinate pipeline equivalence grid', () => {
  test('the grid covers every documented cell', () => {
    // 4 zoom x 3 render x 2 element x 3 margins x 2 rate
    expect(CELLS.length).toBe(4 * 3 * 2 * 3 * 2)
  })

  // E4 — imageToData is the shared leaf every path bottoms out in
  test('E4: imageToData is consistent with the keyboard path\'s inverse', () => {
    for (const cell of CELLS) {
      for (const point of imageSamplePoints(cell)) {
        if (!point.inBounds) continue
        const viaCoordinates = imageToDataCoordinates(
          point.imageX, point.imageY, CONFIG, cell.imageDetails, cell.axes.rate
        )
        // The keyboard path reaches the same data values from SVG space, and
        // at its own positioning origin (margins + render size).
        const viaKeyboard = recordedKeyboardSVGToData(
          cell.margins.left + point.imageX,
          cell.margins.top + point.imageY,
          CONFIG, cell.imageDetails, cell.axes.rate, cell.margins
        )
        expectClose(viaKeyboard.freq, viaCoordinates.freq, `${label(cell)} ${point.name} freq`)
        expectClose(viaKeyboard.time, viaCoordinates.time, `${label(cell)} ${point.name} time`)
      }
    }
  })

  // E1 — the pointer path agrees with the composed transforms
  test('E1: screenToDataWithZoom agrees with screenToSVG + imageToData for in-bounds points', () => {
    for (const cell of CELLS) {
      for (const point of imageSamplePoints(cell)) {
        if (!point.inBounds) continue
        const client = imagePointToClient(cell, point.imageX, point.imageY)
        const result = recordedEventsScreenToData(cell.instance, client)

        expect(result, `${label(cell)} ${point.name} should be in bounds`).not.toBeNull()
        expectClose(result.imageX, point.imageX, `${label(cell)} ${point.name} imageX`)
        expectClose(result.imageY, point.imageY, `${label(cell)} ${point.name} imageY`)

        const expected = imageToDataCoordinates(
          point.imageX, point.imageY, CONFIG, cell.imageDetails, cell.axes.rate
        )
        expectClose(result.dataCoords.freq, expected.freq, `${label(cell)} ${point.name} freq`)
        expectClose(result.dataCoords.time, expected.time, `${label(cell)} ${point.name} time`)
      }
    }
  })

  // E2 — the zoom-aware data->SVG pair agree with each other
  test('E2: dataToSVG and calculateZoomAwarePosition agree everywhere', () => {
    for (const cell of CELLS) {
      for (const point of imageSamplePoints(cell)) {
        const data = imageToDataCoordinates(
          point.imageX, point.imageY, CONFIG, cell.imageDetails, cell.axes.rate
        )
        // Both take raw (un-rated) data on the way back, matching their callers
        const rawData = { freq: data.freq * cell.axes.rate, time: data.time }

        const viaDataToSVG = dataToSVGZoomAware(rawData, cell.viewport, cell.spectrogramImage)
        const viaZoomAware = calculateZoomAwarePosition(rawData, cell.viewport, cell.spectrogramImage)

        expectClose(viaZoomAware.x, viaDataToSVG.x, `${label(cell)} ${point.name} x`)
        expectClose(viaZoomAware.y, viaDataToSVG.y, `${label(cell)} ${point.name} y`)
      }
    }
  })

  // E3 — the keyboard path agrees only where it is currently correct
  test('E3: the keyboard data->SVG matches the zoom-aware one at zoom 1 with the element at base size', () => {
    const cells = CELLS.filter((c) => c.axes.zoom === 1)
    expect(cells.length).toBeGreaterThan(0)

    for (const cell of cells) {
      for (const point of imageSamplePoints(cell)) {
        const data = imageToDataCoordinates(
          point.imageX, point.imageY, CONFIG, cell.imageDetails, cell.axes.rate
        )
        const rawData = { freq: data.freq * cell.axes.rate, time: data.time }

        const viaZoomAware = dataToSVGZoomAware(rawData, cell.viewport, cell.spectrogramImage)
        const viaKeyboard = recordedKeyboardDataToSVG(
          data.freq, data.time, CONFIG, cell.imageDetails, cell.axes.rate, cell.margins
        )

        expectClose(viaKeyboard.x, viaZoomAware.x, `${label(cell)} ${point.name} x`)
        expectClose(viaKeyboard.y, viaZoomAware.y, `${label(cell)} ${point.name} y`)
      }
    }
  })

  test('E3 (rendered-pixels equivalence): outside zoom 1 the keyboard path needs its external compensation', () => {
    // The keyboard path positions against the BASE render size, so one keypress
    // always moves a fixed fraction of the base image. The zoom-aware path
    // positions against the live element, which is `zoom` times larger. The
    // ratio between the two is exactly the zoom level — which is what the
    // `increment / zoomLevel` division in keyboardControl.js compensates for,
    // and what the canonical module must make unnecessary (FR-003, I2).
    for (const cell of CELLS.filter((c) => c.axes.zoom !== 1 && c.axes.hasElement)) {
      const step = 1 // one pixel of keyboard movement
      const origin = { freq: CONFIG.freqMin, time: CONFIG.timeMax } // image top-left

      const keyboardOrigin = recordedKeyboardDataToSVG(
        origin.freq / cell.axes.rate, origin.time, CONFIG, cell.imageDetails, cell.axes.rate, cell.margins
      )
      const movedData = recordedKeyboardSVGToData(
        keyboardOrigin.x + step, keyboardOrigin.y, CONFIG, cell.imageDetails, cell.axes.rate, cell.margins
      )

      const svgOrigin = dataToSVGZoomAware(origin, cell.viewport, cell.spectrogramImage)
      const svgMoved = dataToSVGZoomAware(
        { freq: movedData.freq * cell.axes.rate, time: movedData.time },
        cell.viewport,
        cell.spectrogramImage
      )

      // One un-compensated keypress moves `zoom` rendered pixels; dividing the
      // increment by the zoom level is what brings it back to one.
      expectClose(svgMoved.x - svgOrigin.x, step * cell.axes.zoom, `${label(cell)} rendered pixels per keypress`)
    }
  })

  // E5 — round trip
  test('E5: dataToSVG(imageToData(p)) round-trips back to p for in-bounds points', () => {
    for (const cell of CELLS) {
      for (const point of imageSamplePoints(cell)) {
        if (!point.inBounds) continue

        const data = imageToDataCoordinates(
          point.imageX, point.imageY, CONFIG, cell.imageDetails, cell.axes.rate
        )
        const rawData = { freq: data.freq * cell.axes.rate, time: data.time }
        const svgPoint = dataToSVGZoomAware(rawData, cell.viewport, cell.spectrogramImage)

        // Back to image space the way the pointer path does it
        const bounds = getImageBoundsZoomAware(cell.viewport, cell.spectrogramImage)
        const backX = (svgPoint.x - bounds.left) * (cell.renderWidth / bounds.width)
        const backY = (svgPoint.y - bounds.top) * (cell.renderHeight / bounds.height)

        expectClose(backX, point.imageX, `${label(cell)} ${point.name} round-trip x`)
        expectClose(backY, point.imageY, `${label(cell)} ${point.name} round-trip y`)
      }
    }
  })

  // E6 — the bounds predicate
  test('E6: getImageBounds agrees exactly with the bounds decision inside screenToDataWithZoom', () => {
    for (const cell of CELLS) {
      for (const point of imageSamplePoints(cell)) {
        const client = imagePointToClient(cell, point.imageX, point.imageY)
        const result = recordedEventsScreenToData(cell.instance, client)

        const bounds = getImageBoundsZoomAware(cell.viewport, cell.spectrogramImage)
        const svgX = bounds.left + point.imageX * (bounds.width / cell.renderWidth)
        const svgY = bounds.top + point.imageY * (bounds.height / cell.renderHeight)
        const withinByBounds =
          svgX >= bounds.left && svgX <= bounds.left + bounds.width &&
          svgY >= bounds.top && svgY <= bounds.top + bounds.height

        expect(result !== null, `${label(cell)} ${point.name} bounds agreement`).toBe(withinByBounds)
        expect(withinByBounds, `${label(cell)} ${point.name} expected in-bounds`).toBe(point.inBounds)
      }
    }
  })

  test('rate is applied on the data side only — SVG and image space are rate-free (I4)', () => {
    for (const cell of CELLS.filter((c) => c.axes.rate === 2)) {
      const rateOne = buildCell({ ...cell.axes, rate: 1 })
      for (const point of imageSamplePoints(cell)) {
        const withRate = imageToDataCoordinates(
          point.imageX, point.imageY, CONFIG, cell.imageDetails, 2
        )
        const withoutRate = imageToDataCoordinates(
          point.imageX, point.imageY, CONFIG, rateOne.imageDetails, 1
        )
        expectClose(withRate.freq * 2, withoutRate.freq, `${label(cell)} ${point.name} freq scales with rate`)
        expectClose(withRate.time, withoutRate.time, `${label(cell)} ${point.name} time ignores rate`)
      }
    }
  })
})
