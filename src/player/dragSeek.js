/**
 * Drag-seek: moving around a recording that is playing (spec 171, US3).
 *
 * Spec 168 made every pointer interaction with a playing gram inert. Spec 171
 * narrows that to annotation interactions (FR-004a, FR-017) and gives the
 * press-and-drag its own meaning: playback pauses under the hand, the view
 * follows the pointer, and releasing resumes from the time the view was
 * released at (FR-015, FR-016) — Raven's behaviour, and the one all six
 * SDR/sonar precedents in the 169 survey share in some form.
 *
 * It is the transport's, not a mode's: the gesture pairs a pan with a pause
 * and a resume time, and a mode that owned it would have to know about
 * playback. `core/events.js` offers each qualifying mousedown here before it
 * considers anything else, exactly as it does for the time-axis seek.
 *
 * The move and release listeners are on `window`, not on the SVG: an analyst
 * who drags off the component and lets go there believes they have finished
 * the gesture, and leaving the recording paused because the mouseup landed
 * somewhere else would be a silent failure (spec edge case).
 *
 * A press that never moves is the same gesture with nothing in the middle, and
 * it means something of its own (FR-028): the recording stays paused. So a
 * click on a playing gram pauses it, in every mode, since a click there has no
 * annotation meaning while playing (FR-017). The other half of the toggle —
 * a click resuming a paused gram — is Pan mode's alone (FR-029), because
 * everywhere else a click on a paused gram places a feature; `PanMode` calls
 * {@link resumeFromClick} for it, so what counts as a click, and what
 * resuming means, are stated here once.
 */

/// <reference path="../types.js" />

import { pixelDeltaToNormalizedPan, panByNormalized } from '../core/viewport.js'

/**
 * How far the pointer may travel and still count as a click rather than a drag.
 *
 * Screen pixels, not data space: this is about what the hand did, not about
 * what is under it, so the hit-test tolerances in `utils/tolerance.js` — which
 * are data-space distances derived from a pixel radius — are the wrong
 * measure. Four pixels is the slop of a firm click on a trackpad.
 * @type {number}
 */
const CLICK_SLOP_PX = 4

/**
 * Whether a release belongs to the press that started at `origin`, close
 * enough to be a click.
 * @param {{x: number, y: number}} origin - Where the press landed
 * @param {MouseEvent} event - The release
 * @returns {boolean} True when the pointer effectively did not move
 */
function isClick(origin, event) {
  return Math.abs(event.clientX - origin.x) <= CLICK_SLOP_PX &&
    Math.abs(event.clientY - origin.y) <= CLICK_SLOP_PX
}

/**
 * The drag in progress on an instance, if any.
 * @type {WeakMap<object, {origin: {x: number, y: number}, last: {x: number, y: number}, onMove: (e: MouseEvent) => void, onUp: (e: MouseEvent) => void}>}
 */
const activeSeeks = new WeakMap()

/**
 * Whether a drag-seek is running on this instance.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {boolean} True while the pointer holds the gram
 */
export function isDragSeeking(instance) {
  return activeSeeks.has(instance)
}

/**
 * Begin a drag-seek if this mousedown qualifies: the left button, on a playing
 * audio-sourced instance whose transport is live.
 * @param {GramFrame} instance - GramFrame instance
 * @param {MouseEvent} event - The mousedown
 * @returns {boolean} True when the gesture was taken over
 */
export function startDragSeek(instance, event) {
  const controller = instance.player
  if (event.button !== 0 || !controller || !controller.isReady() || !controller.playerState.playing) {
    return false
  }
  // Shift is the region-zoom gesture (spec 170), which spec 171 deliberately
  // did not revive for a playing recording: an analyst holding shift is
  // framing a region, not asking to seek, so the press is left inert rather
  // than quietly given a different meaning.
  if (event.shiftKey) {
    return false
  }
  if (activeSeeks.has(instance)) {
    return true
  }

  // Pause first: the follow loop would otherwise pull the view back to the
  // playhead between mouse moves, and the analyst would fight it.
  controller.pause()

  const origin = { x: event.clientX, y: event.clientY }
  const last = { x: event.clientX, y: event.clientY }
  /** @param {MouseEvent} moveEvent - A window mousemove */
  const onMove = (moveEvent) => {
    const { normalizedDeltaX, normalizedDeltaY } = pixelDeltaToNormalizedPan(
      instance, moveEvent.clientX - last.x, moveEvent.clientY - last.y
    )
    panByNormalized(instance, normalizedDeltaX, normalizedDeltaY)
    last.x = moveEvent.clientX
    last.y = moveEvent.clientY
  }
  /** @param {MouseEvent} upEvent - A window mouseup */
  const onUp = (upEvent) => {
    if (upEvent.button !== 0) {
      return
    }
    // A press that never moved is a click: it pauses and stays paused (FR-028).
    endDragSeek(instance, !isClick(origin, upEvent))
  }

  activeSeeks.set(instance, { origin, last, onMove, onUp })
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
  // A class, not an inline cursor: the playing rule in the stylesheet is
  // `!important` (the modes set the cursor inline), so only another rule can
  // say the hand is now holding something.
  instance.ui.container.classList.add('gram-frame-drag-seek')
  event.preventDefault()
  return true
}

/**
 * Finish a drag-seek: seek to the time the view was released at and resume.
 *
 * The seek is to `viewTop`, the time at the top edge — while playing that edge
 * *is* the playhead, so resuming there is what makes the view the analyst
 * released agree with what they then hear (FR-016).
 * @param {GramFrame} instance - GramFrame instance
 * @param {boolean} [resume=true] - Whether to resume playback; false when the gesture was a click (FR-028) or the instance is being torn down
 * @returns {boolean} True when a drag was running
 */
export function endDragSeek(instance, resume = true) {
  const seek = activeSeeks.get(instance)
  if (!seek) {
    return false
  }
  activeSeeks.delete(instance)
  window.removeEventListener('mousemove', seek.onMove)
  window.removeEventListener('mouseup', seek.onUp)
  instance.ui.container.classList.remove('gram-frame-drag-seek')

  const controller = instance.player
  // Not resuming: either a click, which leaves the recording paused exactly
  // where it was, or an abandoned gesture on an instance being torn down. In
  // both cases the view stays put and nothing is seeked — a click did not move
  // it, and a dropped element must not be touched.
  if (!controller || !resume) {
    return true
  }
  controller.seek(controller.playerState.viewTop)
  controller.play().catch(error => {
    console.warn('GramFrame: playback could not resume after the drag:', error instanceof Error ? error.message : String(error))
  })
  return true
}

/**
 * Resume a paused recording because the analyst clicked the gram (FR-029).
 *
 * Only Pan mode calls this. Everywhere else a click on a paused gram places or
 * picks up a feature, and taking that click for the transport would cost the
 * pause-then-annotate workflow the player exists for. Pan is the mode where a
 * click means nothing else, so it is the mode where it can mean this.
 *
 * Declines a press that turned into a drag: that was a pan, and a pan that
 * started playback under the analyst's hand would be its own surprise.
 * @param {GramFrame} instance - GramFrame instance
 * @param {{x: number, y: number}|null} origin - Where the press landed, or null if none was recorded
 * @param {MouseEvent} event - The release
 * @returns {boolean} True when playback was resumed
 */
export function resumeFromClick(instance, origin, event) {
  const controller = instance.player
  if (!controller || !controller.isReady() || controller.playerState.playing) {
    return false
  }
  if (event.button !== 0 || !origin || !isClick(origin, event)) {
    return false
  }
  controller.play().catch(error => {
    console.warn('GramFrame: playback could not start from the click:', error instanceof Error ? error.message : String(error))
  })
  return true
}
