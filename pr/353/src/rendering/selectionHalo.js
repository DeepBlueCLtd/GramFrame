/**
 * What a selected feature looks like on the gram.
 *
 * Selection used to be visible only in the control row — the table row inverted,
 * the readouts retargeted, the style panel re-armed — and not at all on the plot
 * the analyst is looking at. So the panel said "Selected: Marker 3" while three
 * identical crosses sat on the gram with nothing to tell them apart.
 *
 * The treatment is a **halo**: the feature's own geometry, redrawn underneath
 * itself in a wider, semi-transparent white stroke. It was chosen because it is
 * the only one that generalises — a crosshair, a shaped symbol and a stack of
 * forty pin lines all get the same cue from the same code, and it is
 * independent of the feature's colour, which the tables learnt the hard way
 * (an accent border collided with the colours the rows themselves carry).
 *
 * Labels are treated differently, and deliberately: a white glow behind a white
 * plate says nothing. A selected feature's plate is **inverted** instead — dark
 * plate, light text — which is exactly what its table row does, so selection
 * reads as one idea in both places.
 *
 * That applies to a pin set's number labels as much as to a marker's single one.
 * A set's are a per-member index drawn a dozen or more times, so inverting all
 * of them is a heavier change than inverting one plate — but it is the same
 * change, it is reversed the moment the set is deselected, and issue #243's
 * guarantee is about contrast rather than about white specifically: dark text on
 * a light plate and light text on a dark one both clear a contiguous rectangle,
 * which is the whole point of a plate over a halo.
 *
 * A separate pass rather than a flag threaded through every renderer: selection
 * changes far more often than the features do, and this way a click adds and
 * removes a few elements instead of rebuilding the overlay.
 */

/// <reference path="../types.js" />

/**
 * Class on every element this module adds. Also how they are found again and
 * removed, so the halo never accumulates across passes.
 * @type {string}
 */
const HALO_CLASS = 'gram-frame-selection-halo'

/**
 * Class on the plated label of a selected feature, which the stylesheet inverts.
 * @type {string}
 */
const SELECTED_LABEL_CLASS = 'gram-frame-selected-label'

/**
 * The halo's ink. White, and translucent so the gram beneath stays readable —
 * this marks a feature, it does not mask the data the feature is pointing at.
 * @type {string}
 */
const HALO_COLOR = 'rgba(255, 255, 255, 0.6)'

/**
 * How much wider than the feature the halo is drawn, in SVG pixels. Enough to
 * be unmistakable beside an unselected twin, not enough to swallow a pin set
 * whose members sit a few pixels apart.
 * @type {number}
 */
const HALO_GROWTH = 5

/**
 * The attribute each family of feature stamps its id on.
 * @type {Record<string, string>}
 */
const ID_ATTRIBUTES = {
  marker: 'data-marker-id',
  harmonicSet: 'data-harmonic-set-id',
  sidebandSet: 'data-sideband-set-id'
}

/**
 * Draw (or redraw) the halo for whatever is selected.
 *
 * Total: with nothing selected it removes the last one and returns, so callers
 * never have to know which case they are in.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {void}
 */
export function applySelectionHalo(instance) {
  const group = instance.ui.cursorGroup
  if (!group) {
    return
  }
  clearSelectionHalo(group)

  const selection = instance.state.selection
  const attribute = selection && selection.selectedType ? ID_ATTRIBUTES[selection.selectedType] : undefined
  if (!attribute || !selection.selectedId) {
    return
  }

  // Ask for the feature's own elements and walk each up to the child of the
  // overlay it belongs to — a marker's group, a pin line, or the plated label
  // group whose text carries the id while the group itself does not. Testing
  // every child of the overlay instead would cost a query per drawn pin, on
  // every frame of a drag.
  const targets = new Set()
  group.querySelectorAll(`[${attribute}="${selection.selectedId}"]`).forEach(element => {
    const target = topLevel(group, element)
    if (target) {
      targets.add(target)
    }
  })
  targets.forEach(target => decorate(group, target))
}

/**
 * The child of the overlay an element sits under, which may be the element.
 * @param {SVGGElement} group - The overlay group
 * @param {Element} element - An element inside it
 * @returns {Element|null} Its top-level ancestor, or null if it is not inside
 */
function topLevel(group, element) {
  let node = element
  while (node.parentNode instanceof Element && node.parentNode !== group) {
    node = node.parentNode
  }
  return node.parentNode === group ? node : null
}

/**
 * Remove every element and class this module added.
 * @param {SVGGElement} group - The overlay group features are drawn into
 * @returns {void}
 */
function clearSelectionHalo(group) {
  group.querySelectorAll(`.${HALO_CLASS}`).forEach(halo => halo.remove())
  group.querySelectorAll(`.${SELECTED_LABEL_CLASS}`).forEach(label => {
    label.classList.remove(SELECTED_LABEL_CLASS)
  })
}

/**
 * Mark one of a selected feature's elements: invert its labels, halo the rest.
 * @param {SVGGElement} group - The overlay group
 * @param {Element} target - A top-level element belonging to the feature
 * @returns {void}
 */
function decorate(group, target) {
  plates(target).forEach(plate => plate.classList.add(SELECTED_LABEL_CLASS))

  const halo = buildHalo(target)
  if (halo) {
    // Before the element it copies, so it paints beneath it.
    group.insertBefore(halo, target)
  }
}

/**
 * The plated labels at or below an element.
 * @param {Element} target - The element
 * @returns {Element[]} Its plated-label groups, including itself if it is one
 */
function plates(target) {
  const found = Array.from(target.querySelectorAll('.gram-frame-label-plated'))
  return target.classList.contains('gram-frame-label-plated') ? [target, ...found] : found
}

/**
 * Build the halo copy of one element, or null when there is nothing to halo.
 * @param {Element} target - The element to copy
 * @returns {Element|null} The detached halo, or null
 */
function buildHalo(target) {
  if (target.classList.contains('gram-frame-label-plated')) {
    return null
  }
  const halo = /** @type {Element} */ (target.cloneNode(true))
  // A label already has the plate for contrast, and inverting it is its cue.
  plates(halo).forEach(plate => plate.remove())

  const parts = [halo, ...Array.from(halo.querySelectorAll('*'))]
  if (parts.length === 1 && halo.tagName === 'g' && halo.children.length === 0) {
    return null
  }
  parts.forEach(recolour)
  halo.setAttribute('class', HALO_CLASS)
  return halo
}

/**
 * Turn one copied element into part of the halo: white, wider, and inert.
 *
 * Every id attribute goes with it. A halo that answered `[data-marker-id]`
 * would be found by the next pass's own selector and by anything else that
 * looks a feature up in the DOM.
 * @param {Element} element - The copied element
 * @returns {void}
 */
function recolour(element) {
  Array.from(element.attributes)
    .filter(attribute => attribute.name.startsWith('data-'))
    .forEach(attribute => element.removeAttribute(attribute.name))
  element.removeAttribute('class')
  // Never the thing under the pointer: the feature it copies is.
  element.setAttribute('pointer-events', 'none')

  const stroke = element.getAttribute('stroke')
  const fill = element.getAttribute('fill')
  const width = Number(element.getAttribute('stroke-width') || 0)
  if (fill && fill !== 'none') {
    element.setAttribute('fill', HALO_COLOR)
  }
  // A filled shape with no stroke of its own grows outward by gaining one.
  if (stroke === null && fill && fill !== 'none') {
    element.setAttribute('stroke', HALO_COLOR)
    element.setAttribute('stroke-width', String(HALO_GROWTH))
  } else if (stroke && stroke !== 'none') {
    element.setAttribute('stroke', HALO_COLOR)
    element.setAttribute('stroke-width', String(width + HALO_GROWTH))
  }
  element.setAttribute('opacity', '1')
}
