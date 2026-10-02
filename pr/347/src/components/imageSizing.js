/**
 * How big an image-backed gram is drawn (issue #345).
 *
 * `screen` is the default; the `image-sizing` config row can choose another
 * per gram, `legacy` being the way back to what every gram did before.
 *
 * - `legacy`: one image pixel per CSS pixel, with anything wider than 1200 CSS
 *   pixels scaled down to 1200 — whatever room the page actually has.
 * - `native`: one image pixel per CSS pixel, scaled down (aspect kept) only
 *   when that would not fit the width the component has.
 * - `screen` (the default): one image pixel per *screen* pixel — the CSS size divided by
 *   `devicePixelRatio` — under the same fit. On a display scaled to 150% a CSS
 *   pixel is 1.5 screen pixels, so `native` draws a small snippet half as big
 *   again as the image itself, its axis labels with it; `screen` does not.
 *
 * The chosen size becomes the gram's base size (`naturalWidth/Height`), exactly
 * as the legacy down-scale always did, so zoom, expand and every coordinate
 * transform are unchanged. The two fitting strategies refit on resize; legacy
 * never did and still does not.
 */

/// <reference path="../types.js" />

import { fitImageSize } from '../utils/imageFit.js'

/** The values the `image-sizing` row accepts. */
export const IMAGE_SIZINGS = ['legacy', 'native', 'screen']

/** The sizing of a gram whose table has no `image-sizing` row. */
export const DEFAULT_IMAGE_SIZING = 'screen'

/**
 * @typedef {Object} SizingRecord
 * @property {string} sizing - One of IMAGE_SIZINGS
 * @property {number} sourceWidth - The image file's own width, 0 until loaded
 * @property {number} sourceHeight - The image file's own height
 */

/** @type {WeakMap<object, SizingRecord>} */
const records = new WeakMap()

/**
 * Record the sizing a gram's config table asked for.
 * @param {GramFrame} instance - GramFrame instance
 * @param {string} sizing - One of IMAGE_SIZINGS
 */
export function setImageSizing(instance, sizing) {
  records.set(instance, { sizing, sourceWidth: 0, sourceHeight: 0 })
}

/**
 * Whether this gram's sizing gives every shape the expand toggle. The fitting
 * sizings do, so a portrait snippet can be expanded too (issue #345); legacy
 * keeps the toggle for landscape grams only.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {boolean} True under `native` or `screen`
 */
export function expandsAnyShape(instance) {
  const record = records.get(instance)
  return (record ? record.sizing : DEFAULT_IMAGE_SIZING) !== 'legacy'
}

/**
 * The width the image area can take without overflowing the component: the
 * main panel's content width less the SVG border and the axis margins. The SVG
 * is taken out of the flow while measuring, so its current size cannot feed
 * back into the width it is about to be given.
 * @param {GramFrame} instance - GramFrame instance
 * @param {{left: number, right: number}} margins - The axis margins
 * @returns {number} Available width in CSS pixels, 0 when it cannot be measured
 */
function measureAvailableWidth(instance, margins) {
  const { mainCell, svg } = instance.ui
  if (!mainCell || !svg) return 0
  const cellStyle = window.getComputedStyle(mainCell)
  const svgStyle = window.getComputedStyle(svg)
  const previousDisplay = svg.style.display
  svg.style.display = 'none'
  const inner = mainCell.clientWidth -
    (parseFloat(cellStyle.paddingLeft) || 0) - (parseFloat(cellStyle.paddingRight) || 0)
  svg.style.display = previousDisplay
  const border = (parseFloat(svgStyle.borderLeftWidth) || 0) + (parseFloat(svgStyle.borderRightWidth) || 0)
  return Math.max(0, Math.floor(inner - border - margins.left - margins.right))
}

/**
 * Work out the base size for this gram's image and write it into the image
 * details, as the natural size and (unless expanded) the render size.
 * @param {GramFrame} instance - GramFrame instance
 * @param {GramFrameState} viewport - The instance's state
 * @returns {boolean} Whether the base size changed
 */
function applySize(instance, viewport) {
  const record = records.get(instance)
  if (!record || !record.sourceWidth) return false
  const size = fitImageSize(
    { width: record.sourceWidth, height: record.sourceHeight },
    record.sizing,
    { availableWidth: measureAvailableWidth(instance, viewport.margins), pixelRatio: window.devicePixelRatio || 1 }
  )
  const details = viewport.imageDetails
  if (size.width === details.naturalWidth && size.height === details.naturalHeight) return false
  details.naturalWidth = size.width
  details.naturalHeight = size.height
  if (!viewport.imageExpanded) {
    details.renderWidth = size.width
    details.renderHeight = size.height
  }
  return true
}

/**
 * Size a freshly loaded image. Sets the natural and render size.
 * @param {GramFrame} instance - GramFrame instance
 * @param {GramFrameState} viewport - The instance's state
 * @param {{width: number, height: number}} source - The image file's pixel size
 */
export function sizeLoadedImage(instance, viewport, source) {
  const record = records.get(instance) || { sizing: DEFAULT_IMAGE_SIZING, sourceWidth: 0, sourceHeight: 0 }
  record.sourceWidth = source.width
  record.sourceHeight = source.height
  records.set(instance, record)
  applySize(instance, viewport)
  const { naturalWidth, naturalHeight } = viewport.imageDetails
  if (naturalWidth !== source.width) {
    const verb = naturalWidth < source.width ? 'Scaling down large image' : 'Scaling image'
    const sizing = record.sizing === 'legacy' ? '' : `, image-sizing: ${record.sizing}`
    console.log(`GramFrame: ${verb} from ${source.width}x${source.height} to ${naturalWidth}x${naturalHeight} (scale factor: ${(naturalWidth / source.width).toFixed(3)}${sizing})`)
  }
}

/**
 * Refit after the component is resized. A no-op under `legacy`, which never
 * followed the page's width.
 * @param {GramFrame} instance - GramFrame instance
 * @param {GramFrameState} viewport - The instance's state
 */
export function refitImage(instance, viewport) {
  const record = records.get(instance)
  if (!record || record.sizing === 'legacy') return
  applySize(instance, viewport)
}
