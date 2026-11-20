/**
 * Canonical coordinate transformations for GramFrame.
 *
 * This is the single module every screen/SVG/image/data conversion in `src/`
 * routes through (spec 166, FR-002; constitution Principle I), replacing the
 * four parallel implementations that preceded it.
 *
 * Coordinate systems, outermost first:
 *
 * - **Screen** — client pixels, relative to the SVG element's bounding box.
 * - **SVG** — viewBox units. The viewBox is fixed; zoom resizes the image
 *   element inside it (ADR-015).
 * - **Image** — render-pixel space, relative to the image's top-left. Always
 *   expressed against `imageDetails.renderWidth/renderHeight`, so a point keeps
 *   the same image coordinates whatever the element is currently scaled to.
 * - **Data** — time in seconds, frequency divided by `frequencyRate` (which
 *   happens here and nowhere else; see {@link dataFrequencyRange}).
 *
 * Three invariants are worth stating because they are easy to get wrong:
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
 * - {@link imageToData} and {@link dataToSVG} are exact inverses; no caller
 *   scales a frequency to bridge them (#276).
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
 * The frequency range of the gram in *data* scale — `config.freqMin/freqMax`
 * divided by `frequencyRate`, the scale every stored feature, tolerance span,
 * axis label and visible range is in. Comparing a stored frequency against the
 * raw config is the mistake this removes (#276).
 * @param {Viewport} viewport - Current viewport
 * @returns {{freqMin: number, freqMax: number}} Frequency range in data scale
 */
export function dataFrequencyRange(viewport) {
  const { freqMin, freqMax } = viewport.config
  const rate = viewport.frequencyRate || 1
  return { freqMin: freqMin / rate, freqMax: freqMax / rate }
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
  const { timeMin, timeMax } = viewport.config
  // Data scale: compared against stored frequencies, printed on the axis (#276).
  const { freqMin, freqMax } = dataFrequencyRange(viewport)
  const { margins, zoom } = viewport
  // Base render size (defaults to natural; grows when expanded)
  const { renderWidth, renderHeight } = getRenderDimensions(viewport)

  // An audio-sourced gram is drawn time-stretched and scrolled (spec 168, D7),
  // so its visible range is never simply the configured range — not even at
  // zoom 1. The shortcut is for image-backed instances only.
  const stretched = viewport.imageDetails.timeStretch !== undefined
  if (zoom.level === 1.0 && !stretched) {
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

  return {
    freqMin: freqMin + (visibleLeft / imageWidth) * freqRange,
    freqMax: freqMin + (visibleRight / imageWidth) * freqRange,
    timeMin: timeMax - (visibleBottom / imageHeight) * timeRange,
    timeMax: timeMax - (visibleTop / imageHeight) * timeRange
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
 * Frequency is returned in data scale, so SVG and image space carry none of it.
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
 * The exact inverse of {@link imageToData}: `dataPoint.freq` is in data scale,
 * so the frequency rate is undone here rather than by each caller. At the
 * default rate of 1 nothing moves; at any other, this is what keeps a drawn
 * feature under the reading that placed it (#276).
 * @param {DataCoordinates} dataPoint - Data point with time and frequency
 * @param {Viewport} viewport - Current viewport
 * @param {SVGImageElement|null} [spectrogramImage] - Spectrogram image element
 * @returns {SVGCoordinates} SVG coordinates
 */
export function dataToSVG(dataPoint, viewport, spectrogramImage = null) {
  const { timeMin, timeMax } = viewport.config
  const { freqMin, freqMax } = dataFrequencyRange(viewport)
  const bounds = getImageBounds(viewport, spectrogramImage)

  const freqRatio = (dataPoint.freq - freqMin) / (freqMax - freqMin)
  const timeRatio = (dataPoint.time - timeMin) / (timeMax - timeMin)

  return {
    x: bounds.left + freqRatio * bounds.width,
    y: bounds.top + (1 - timeRatio) * bounds.height // Invert Y
  }
}

/**
 * Move a data point by a screen-pixel offset, staying on the image.
 *
 * The arrow-key geometry, in the module that owns both legs: out through
 * {@link dataToSVG}, across by the offset, back through {@link imageToData},
 * pinned at the edge. A caller assembling this itself is where #276 was.
 * @param {DataCoordinates} dataPoint - Starting point, in data scale
 * @param {number} dx - Horizontal offset in rendered pixels
 * @param {number} dy - Vertical offset in rendered pixels
 * @param {Viewport} viewport - Current viewport
 * @param {SVGImageElement|null} [spectrogramImage] - Spectrogram image element
 * @returns {DataCoordinates} The moved point, clamped to the image
 */
export function nudgeData(dataPoint, dx, dy, viewport, spectrogramImage = null) {
  const svgPoint = dataToSVG(dataPoint, viewport, spectrogramImage)
  const image = svgToImage(svgPoint.x + dx, svgPoint.y + dy, viewport, spectrogramImage)
  const clamped = clampToImage(image.x, image.y, viewport)
  return imageToData(clamped.x, clamped.y, viewport)
}

/**
 * Whether an SVG point lies over the spectrogram image.
 *
 * The only place that decision is made (I5). Kept separate from the transforms
 * so a caller that wants to convert an off-image point still can.
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
 * Explicit, so callers that want clamping ({@link nudgeData}, which pins a
 * feature at the edge rather than letting it leave) opt into it, and callers
 * wanting a bounds decision use {@link isWithinImage} instead.
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
 * Converts unconditionally — a point off the image comes back extrapolated, not
 * clamped and not null; the bounds decision stays in {@link isWithinImage} (I5).
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
