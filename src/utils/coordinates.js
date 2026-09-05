/**
 * Canonical coordinate transformations for GramFrame.
 *
 * This is the single module every screen/SVG/image/data conversion in `src/`
 * routes through (spec 166, FR-002; constitution Principle I). It replaces the
 * four parallel implementations that preceded it: this file's original
 * screen/image pair, `utils/coordinateTransformations.js`, the private pair in
 * `core/keyboardControl.js`, and the inline `screenToDataWithZoom` in
 * `core/events.js`.
 *
 * Coordinate systems, outermost first:
 *
 * - **Screen** — client pixels, relative to the SVG element's bounding box.
 * - **SVG** — viewBox units. The viewBox is fixed; zoom resizes the image
 *   element inside it (ADR-015).
 * - **Image** — render-pixel space, relative to the image's top-left. Always
 *   expressed against `imageDetails.renderWidth/renderHeight`, so a point keeps
 *   the same image coordinates whatever the element is currently scaled to.
 * - **Data** — time in seconds and frequency in Hz.
 *
 * Two invariants are worth stating because they are easy to get wrong:
 *
 * - Where a spectrogram image element is supplied, its live `x`/`y`/`width`/
 *   `height` attributes are the source of truth: they already encode expand ×
 *   zoom. `renderWidth`/`renderHeight` (defaulting to natural size) are the
 *   fallback when no element is present. Callers therefore do **not**
 *   compensate for zoom externally.
 * - Bounds handling is separate from transformation. The transforms never clamp
 *   and never return null; a caller that needs a bounds decision asks
 *   {@link isWithinImage} for it, and one that needs clamping asks
 *   {@link clampToImage}.
 */

/// <reference path="../types.js" />

/**
 * The viewport bundle every transform takes.
 * @typedef {Object} Viewport
 * @property {AxesMargins} margins - Axes margins
 * @property {ImageDetails} imageDetails - Image dimensions
 * @property {Config} config - Time/frequency configuration
 * @property {number} frequencyRate - Frequency divider
 * @property {ZoomState} zoom - Current zoom state
 */

/**
 * Base render size, falling back to the image's natural size.
 * @param {ImageDetails} imageDetails - Image dimensions
 * @returns {{width: number, height: number}} Base render size in image pixels
 */
function renderSize(imageDetails) {
  return {
    width: imageDetails.renderWidth || imageDetails.naturalWidth,
    height: imageDetails.renderHeight || imageDetails.naturalHeight
  }
}

/**
 * Live image bounds in SVG space.
 *
 * The element's attributes win when it is present, because they already reflect
 * expand × zoom. Without an element the base render size at the margin origin
 * is the best available answer.
 *
 * @param {Viewport} viewport - Current viewport
 * @param {SVGImageElement|null} [spectrogramImage] - Spectrogram image element
 * @returns {{left: number, top: number, width: number, height: number}} Bounds in SVG units
 */
export function getImageBounds(viewport, spectrogramImage = null) {
  const { margins, imageDetails } = viewport
  const { width, height } = renderSize(imageDetails)

  if (spectrogramImage) {
    return {
      left: parseFloat(spectrogramImage.getAttribute('x') || String(margins.left)),
      top: parseFloat(spectrogramImage.getAttribute('y') || String(margins.top)),
      width: parseFloat(spectrogramImage.getAttribute('width') || String(width)),
      height: parseFloat(spectrogramImage.getAttribute('height') || String(height))
    }
  }

  return { left: margins.left, top: margins.top, width, height }
}

/**
 * Base render dimensions for a viewport, falling back to the image's natural
 * size when render dimensions have not been set (e.g. before image load).
 *
 * Render dims default to natural, so this is a no-op until the image is
 * expanded. Moved here from `components/table.js` in the Story 3 split: it is
 * render-size awareness, which this module already owns privately as
 * `renderSize`, and keeping it in a component would have forced `rendering/`,
 * `core/viewport.js` and `components/svgLayout.js` to import a component to get
 * it — the cycle that made the split impossible (spec 167, US3).
 * @param {Viewport} viewport - Current viewport
 * @returns {{renderWidth: number, renderHeight: number}} Base render dimensions
 */
export function getRenderDimensions(viewport) {
  const { width, height } = renderSize(viewport.imageDetails)
  return { renderWidth: width, renderHeight: height }
}

/**
 * The data range currently visible, given the zoom level and pan position.
 *
 * At 1× the full configured range is visible and returned unchanged. Zoomed in,
 * the image is larger than its axes area and clipped to it, so the visible
 * range is the portion of the image the axes window still covers.
 * @param {Viewport} viewport - Current viewport
 * @param {SVGImageElement|null} [spectrogramImage] - Spectrogram image element
 * @returns {DataRange} Visible data range
 */
export function calculateVisibleDataRange(viewport, spectrogramImage = null) {
  const { timeMin, timeMax, freqMin, freqMax } = viewport.config
  const margins = viewport.margins
  const zoomLevel = viewport.zoom.level
  // Base render size (defaults to natural; grows when expanded)
  const { renderWidth, renderHeight } = getRenderDimensions(viewport)

  // An audio-sourced gram is drawn time-stretched and scrolled (spec 168, D7),
  // so its visible range is never simply the configured range — not even at
  // zoom 1. The shortcut is for image-backed instances only.
  const stretched = viewport.imageDetails.timeStretch !== undefined
  if (zoomLevel === 1.0 && !stretched) {
    // No zoom - return full range
    return { timeMin, timeMax, freqMin, freqMax }
  }

  // Current image position and dimensions (base render size × zoom), from the
  // canonical bounds helper rather than re-read from the element here.
  const {
    left: imageLeft,
    top: imageTop,
    width: imageWidth,
    height: imageHeight
  } = getImageBounds(viewport, spectrogramImage)

  // Calculate visible bounds in image coordinates (full image extent = render size)
  const visibleLeft = Math.max(0, margins.left - imageLeft)
  const visibleRight = Math.min(imageWidth, margins.left + renderWidth - imageLeft)
  // Vertically, a stretched gram's axes area can extend past the image — the
  // blank time before the recording began, or below its end when the file is
  // shorter than the window — and the axis must label that span too, so the
  // time range is extrapolated rather than clamped to the image.
  const visibleTop = stretched ? margins.top - imageTop : Math.max(0, margins.top - imageTop)
  const visibleBottom = stretched
    ? margins.top + renderHeight - imageTop
    : Math.min(imageHeight, margins.top + renderHeight - imageTop)

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
 * Convert screen coordinates to SVG coordinates.
 * @param {number} screenX - X relative to the SVG element's bounding box
 * @param {number} screenY - Y relative to the SVG element's bounding box
 * @param {SVGSVGElement} svg - SVG element reference
 * @returns {SVGCoordinates} SVG coordinates
 */
export function screenToSVG(screenX, screenY, svg) {
  const svgRect = svg.getBoundingClientRect()
  const viewBox = svg.viewBox.baseVal

  // Use viewBox if available, otherwise assume SVG units match screen pixels
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
 * Convert an SVG point to image-relative coordinates, in render-pixel space.
 * @param {number} svgX - SVG X coordinate
 * @param {number} svgY - SVG Y coordinate
 * @param {Viewport} viewport - Current viewport
 * @param {SVGImageElement|null} [spectrogramImage] - Spectrogram image element
 * @returns {ImageCoordinates} Image-relative coordinates
 */
export function svgToImage(svgX, svgY, viewport, spectrogramImage = null) {
  const bounds = getImageBounds(viewport, spectrogramImage)
  const { width, height } = renderSize(viewport.imageDetails)

  return {
    x: (svgX - bounds.left) * (width / bounds.width),
    y: (svgY - bounds.top) * (height / bounds.height)
  }
}

/**
 * Convert image-relative coordinates to data coordinates.
 *
 * `frequencyRate` is applied here and only here — it divides frequency, so SVG
 * and image space carry no frequency scaling at all.
 *
 * @param {number} imageX - Image X coordinate, in render pixels
 * @param {number} imageY - Image Y coordinate, in render pixels
 * @param {Viewport} viewport - Current viewport
 * @returns {DataCoordinates} Data coordinates
 */
export function imageToData(imageX, imageY, viewport) {
  const { config, imageDetails, frequencyRate } = viewport
  const { freqMin, freqMax, timeMin, timeMax } = config
  const { width, height } = renderSize(imageDetails)

  // X-axis = frequency (horizontal)
  const rawFreq = freqMin + (imageX / width) * (freqMax - freqMin)
  // Y-axis = time (vertical), increasing upward with Y=0 at the top
  const time = timeMax - (imageY / height) * (timeMax - timeMin)

  return { freq: rawFreq / frequencyRate, time }
}

/**
 * Convert data coordinates to SVG coordinates.
 *
 * Note the deliberate asymmetry with {@link imageToData}: this takes frequency
 * in the raw configured scale and does not re-apply `frequencyRate`. That
 * matches every caller — features store the frequency they were created with —
 * and matches the behaviour pinned before consolidation. With the frequency-rate
 * control removed from the UI it is 1 in practice; the asymmetry is recorded
 * here rather than
 * silently "fixed", because changing it would move rendered features.
 *
 * @param {DataCoordinates} dataPoint - Data point with time and frequency
 * @param {Viewport} viewport - Current viewport
 * @param {SVGImageElement|null} [spectrogramImage] - Spectrogram image element
 * @returns {SVGCoordinates} SVG coordinates
 */
export function dataToSVG(dataPoint, viewport, spectrogramImage = null) {
  const { config } = viewport
  const { timeMin, timeMax, freqMin, freqMax } = config
  const bounds = getImageBounds(viewport, spectrogramImage)

  const freqRatio = (dataPoint.freq - freqMin) / (freqMax - freqMin)
  const timeRatio = (dataPoint.time - timeMin) / (timeMax - timeMin)

  return {
    x: bounds.left + freqRatio * bounds.width,
    y: bounds.top + (1 - timeRatio) * bounds.height // Invert Y
  }
}

/**
 * Whether an SVG point lies over the spectrogram image.
 *
 * The only place that decision is made (I5). Kept separate from the transforms
 * so a caller that wants to convert an off-image point still can.
 *
 * @param {SVGCoordinates} svgPoint - Point in SVG space
 * @param {Viewport} viewport - Current viewport
 * @param {SVGImageElement|null} [spectrogramImage] - Spectrogram image element
 * @returns {boolean} True when the point is over the image
 */
export function isWithinImage(svgPoint, viewport, spectrogramImage = null) {
  const bounds = getImageBounds(viewport, spectrogramImage)
  const { width, height } = renderSize(viewport.imageDetails)
  const image = svgToImage(svgPoint.x, svgPoint.y, viewport, spectrogramImage)

  return svgPoint.x >= bounds.left && svgPoint.x <= bounds.left + bounds.width &&
         svgPoint.y >= bounds.top && svgPoint.y <= bounds.top + bounds.height &&
         image.x >= 0 && image.x <= width &&
         image.y >= 0 && image.y <= height
}

/**
 * Clamp an image-space point to the image's extent.
 *
 * Explicit, so callers that want clamping (the keyboard mover, which pins a
 * feature at the edge rather than letting it leave the image) opt into it, and
 * callers that want a bounds decision use {@link isWithinImage} instead.
 *
 * @param {number} imageX - Image X coordinate, in render pixels
 * @param {number} imageY - Image Y coordinate, in render pixels
 * @param {Viewport} viewport - Current viewport
 * @returns {ImageCoordinates} Clamped image coordinates
 */
export function clampToImage(imageX, imageY, viewport) {
  const { width, height } = renderSize(viewport.imageDetails)
  return {
    x: Math.max(0, Math.min(imageX, width)),
    y: Math.max(0, Math.min(imageY, height))
  }
}

/**
 * Convenience composition used by the pointer and wheel handlers: screen point
 * to data, carrying the intermediate SVG and image points the callers also need.
 *
 * Converts unconditionally — a point off the image comes back extrapolated, not
 * clamped and not null. A caller that needs the bounds decision asks
 * {@link isWithinImage} for it, which keeps that decision in one place (I5).
 *
 * @param {number} clientX - Client X coordinate
 * @param {number} clientY - Client Y coordinate
 * @param {SVGSVGElement} svg - SVG element reference
 * @param {Viewport} viewport - Current viewport
 * @param {SVGImageElement|null} [spectrogramImage] - Spectrogram image element
 * @returns {{data: DataCoordinates, image: ImageCoordinates, svg: SVGCoordinates}} Converted point
 */
export function screenToData(clientX, clientY, svg, viewport, spectrogramImage = null) {
  const svgRect = svg.getBoundingClientRect()
  const svgPoint = screenToSVG(clientX - svgRect.left, clientY - svgRect.top, svg)
  const image = svgToImage(svgPoint.x, svgPoint.y, viewport, spectrogramImage)

  return {
    svg: svgPoint,
    image,
    data: imageToData(image.x, image.y, viewport)
  }
}
