/**
 * Applying the contrast controls to the drawn gram (spec 171, FR-010).
 *
 * One `feComponentTransfer` with a linear function per channel, built into the
 * SVG's existing `<defs>` the first time it is needed and updated in place
 * afterwards. Nothing is re-analysed and no pixel is touched in JavaScript:
 * the filter is part of the same paint the browser was doing anyway, which is
 * why moving a control stays at full frame rate (SC-002).
 *
 * At the resting positions the filter is removed rather than set to identity,
 * so the default really is the image as it loaded rather than a round trip
 * through a filter that ought to be a no-op (FR-013).
 *
 * This module draws; it does not dispatch.
 */

/// <reference path="../types.js" />

import { displayTransfer, isDefaultDisplayRange } from '../utils/displayRange.js'

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Apply a display range to an instance's spectrogram image.
 * @param {GramFrame} instance - GramFrame instance
 * @param {import('../utils/displayRange.js').DisplayRange} range - The control positions to draw at
 */
export function applyDisplayRange(instance, range) {
  const image = instance.ui.spectrogramImage
  if (!image) {
    return
  }

  if (isDefaultDisplayRange(range)) {
    image.removeAttribute('filter')
    return
  }

  const { slope, intercept } = displayTransfer(range)
  const filter = ensureFilter(instance)
  // Selected structurally rather than by tag name: `feFuncR` is a
  // case-sensitive XML name and a CSS type selector for it is easy to get
  // wrong across engines.
  filter.querySelectorAll('feComponentTransfer > *').forEach(func => {
    func.setAttribute('slope', String(slope))
    func.setAttribute('intercept', String(intercept))
  })
  image.setAttribute('filter', `url(#${filter.getAttribute('id')})`)
}

/**
 * The instance's filter element, created on first use.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {SVGFilterElement} The filter, already in the SVG's defs
 */
function ensureFilter(instance) {
  const svg = instance.ui.svg
  const existing = svg.querySelector('filter.gram-frame-display-filter')
  if (existing) {
    return /** @type {SVGFilterElement} */ (existing)
  }

  const filter = document.createElementNS(SVG_NS, 'filter')
  filter.setAttribute('class', 'gram-frame-display-filter')
  filter.setAttribute('id', `gramDisplay-${instance.instanceId}`)
  // The gram fills the region it is drawn in exactly; the default -10%/+10%
  // bleed would only ask the browser for a larger surface than any of it can
  // be seen through.
  filter.setAttribute('x', '0%')
  filter.setAttribute('y', '0%')
  filter.setAttribute('width', '100%')
  filter.setAttribute('height', '100%')
  filter.setAttribute('color-interpolation-filters', 'sRGB')

  const transfer = document.createElementNS(SVG_NS, 'feComponentTransfer')
  ;['feFuncR', 'feFuncG', 'feFuncB'].forEach(name => {
    const func = document.createElementNS(SVG_NS, name)
    func.setAttribute('type', 'linear')
    func.setAttribute('slope', '1')
    func.setAttribute('intercept', '0')
    transfer.appendChild(func)
  })
  filter.appendChild(transfer)

  const defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS(SVG_NS, 'defs'), svg.firstChild)
  defs.appendChild(filter)
  return filter
}
