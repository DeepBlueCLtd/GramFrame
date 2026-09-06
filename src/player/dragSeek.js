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
 */

/// <reference path="../types.js" />

import { pixelDeltaToNormalizedPan, panByNormalized } from '../core/viewport.js'

/**
 * The drag in progress on an instance, if any.
 * @type {WeakMap<object, {last: {x: number, y: number}, onMove: (e: MouseEvent) => void, onUp: (e: MouseEvent) => void}>}
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
    endDragSeek(instance, true)
  }

  activeSeeks.set(instance, { last, onMove, onUp })
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
 * @param {boolean} [resume=true] - Whether to resume playback; false when the drag is abandoned
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
  // Abandoned rather than released — the instance is being torn down — so the
  // view is left exactly where it is and nothing is seeked on an element that
  // is about to be dropped.
  if (!controller || !resume) {
    return true
  }
  controller.seek(controller.playerState.viewTop)
  controller.play().catch(error => {
    console.warn('GramFrame: playback could not resume after the drag:', error instanceof Error ? error.message : String(error))
  })
  return true
}
