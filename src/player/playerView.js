/**
 * The waterfall view of an audio-sourced gram (spec 168, D7–D11).
 *
 * Owns the one scalar the geometry needs that zoom does not carry: the time at
 * the top edge of the view, `state.player.viewTop`. While playing it follows
 * the playhead every animation frame; paused, the analyst can move it with a
 * pan anywhere in the recording (FR-016). The placement itself
 * lives in `components/svgLayout.js`, which reads `viewTop` and
 * `imageDetails.timeStretch`; this module decides what they should be and when
 * to redraw.
 *
 * Spec 171 withdrew spec 168's reveal rule: the gram is drawn for the whole
 * recording from the moment it is analysed, so `viewTop` is bounded by the
 * duration rather than by the playhead, and no module asks whether a time has
 * been played before drawing something at it.
 */

/// <reference path="../types.js" />

import { applyZoomTransform } from '../components/svgLayout.js'
import { dispatch } from '../core/state.js'
import { screenToSVG, calculateVisibleDataRange, getRenderDimensions } from '../utils/coordinates.js'

/**
 * The size an audio-sourced gram is drawn at before any expand or zoom.
 *
 * An analysed gram's natural size (bins × frames) is a poor display size — a
 * few hundred pixels wide and thousands tall — so, unlike an image, it is
 * always rendered at a fixed landscape axes area. Everything that treats the
 * natural size as a floor or a resting size (the expand toggle) uses this on
 * a player instead.
 */
export const PLAYER_RENDER_WIDTH = 900
export const PLAYER_RENDER_HEIGHT = 400

/**
 * The size the gram rests at: the image's natural size, or on an audio-sourced
 * instance the fixed player axes area.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {{width: number, height: number}} Base render size
 */
export function baseRenderSize(instance) {
  if (isPlayerActive(instance)) {
    return { width: PLAYER_RENDER_WIDTH, height: PLAYER_RENDER_HEIGHT }
  }
  const { naturalWidth, naturalHeight } = instance.state.imageDetails
  return { width: naturalWidth, height: naturalHeight }
}

/**
 * Per-instance follow-loop handles.
 * @type {WeakMap<object, number>}
 */
const followHandles = new WeakMap()

/**
 * The player slice of an instance's state.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {PlayerState} The slice
 */
function playerOf(instance) {
  return instance.state.player
}

/**
 * Whether the instance is built on audio.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {boolean} True for an audio-sourced instance
 */
export function isPlayerActive(instance) {
  const player = playerOf(instance)
  return !!(player && player.active)
}

/**
 * Whether audio is playing right now.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {boolean} True while playing
 */
export function isPlaying(instance) {
  return isPlayerActive(instance) && playerOf(instance).playing
}

/**
 * Seconds the axes area spans at the current zoom.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {number} Visible window in seconds
 */
export function visibleWindowSeconds(instance) {
  const { player, zoom } = instance.state
  return player.windowSeconds / zoom.level
}

/**
 * Keep a candidate top-of-view time inside the recording.
 *
 * Upper bound: the recording's duration (spec 171, FR-007). It was the
 * playhead until spec 168's reveal rule was withdrawn — the whole gram is
 * drawn from load, so a paused analyst may scroll to the last second of a file
 * they have never played.
 *
 * Lower bound: the start of the recording. It used to be one window's worth
 * *above* the start, so the beginning never scrolled above the bottom edge into
 * empty space — but the top edge is the playhead, and drag-seek resumes from
 * whatever time the top edge is showing. That bound therefore made the opening
 * window of every recording impossible to put under the playhead, and so
 * impossible to replay by dragging: the furthest back an analyst could get was
 * the first sound sitting on the bottom edge.
 *
 * The blank it was avoiding is blank the view already shows and already
 * accepts. In the opening seconds the bound resolved to the playhead — the
 * newest row at the top edge with nothing yet beneath it — so the old rule
 * forbade at second thirty exactly what it permitted at second three. Zero
 * keeps `clampViewTop(playhead)` the identity for any playhead in the
 * recording, which is what {@link syncViewToPlayhead} relies on.
 * @param {GramFrame} instance - GramFrame instance
 * @param {number} seconds - Candidate view-top time
 * @returns {number} The clamped time
 */
export function clampViewTop(instance, seconds) {
  const { duration } = playerOf(instance)
  return Math.max(0, Math.min(duration, seconds))
}

/**
 * Bring a time into view, if it is not already there.
 *
 * A recording is one tall gram scrolled through a window a few tens of seconds
 * high, so a feature placed ten minutes in is, most of the time, simply not on
 * screen. Selecting its row in the annotation table then lit up a row, wrote
 * two readouts and pointed the style panel at something the analyst could not
 * see. This is the missing half of that: the view goes where the selection is.
 *
 * Only when paused. While playing, the follow loop owns `viewTop` and would
 * undo this on the next frame — and annotation is inert anyway, so there is no
 * selection being made to follow.
 *
 * Only when the time is off screen. Scrolling a feature that is already visible
 * into the middle of the view would move the gram under the analyst's eye every
 * time they clicked a row, which is the opposite of what looking at a row is
 * for.
 *
 * It moves the view, never the playhead: this is a pan, and pressing play after
 * it resumes from where the audio actually is. Dragging the gram is the gesture
 * that means "play from here".
 * @param {GramFrame} instance - GramFrame instance
 * @param {number} seconds - The time to show
 * @returns {boolean} True when the view moved
 */
export function revealTime(instance, seconds) {
  if (!isPlayerActive(instance) || isPlaying(instance) || !Number.isFinite(seconds)) {
    return false
  }
  const player = playerOf(instance)
  const window = visibleWindowSeconds(instance)
  // The top edge is the newest time, so the view spans backwards from it.
  if (seconds <= player.viewTop && seconds >= player.viewTop - window) {
    return false
  }
  const target = clampViewTop(instance, seconds + window / 2)
  if (target === player.viewTop) {
    return false
  }
  player.viewTop = target
  applyView(instance)
  dispatch(instance)
  return true
}

/**
 * Redraw the gram, axes and features for the current `viewTop`/`playhead`.
 * @param {GramFrame} instance - GramFrame instance
 */
function applyView(instance) {
  if (instance.ui.svg) {
    applyZoomTransform(instance)
  }
}

/**
 * Bring the view to the playhead: sample `currentTime`, put it at the top edge
 * and redraw. The follow loop's body, and what every transport event calls so
 * a change the browser made on its own (a backgrounded tab catching up, a
 * loop wrapping) is reflected in one jump (D8).
 * @param {GramFrame} instance - GramFrame instance
 */
export function syncViewToPlayhead(instance) {
  const controller = instance.player
  if (!controller) {
    return
  }
  const player = playerOf(instance)
  const duration = player.duration
  const current = controller.audio.currentTime
  player.playhead = Math.max(0, Math.min(duration, Number.isFinite(current) ? current : 0))
  player.viewTop = clampViewTop(instance, player.playhead)
  applyView(instance)
  dispatch(instance, { frame: true })
}

/**
 * Start following the playhead once per animation frame.
 * @param {GramFrame} instance - GramFrame instance
 */
export function startFollow(instance) {
  if (followHandles.has(instance) || typeof requestAnimationFrame !== 'function') {
    return
  }
  /** @returns {void} */
  const step = () => {
    if (!isPlaying(instance)) {
      followHandles.delete(instance)
      return
    }
    syncViewToPlayhead(instance)
    followHandles.set(instance, requestAnimationFrame(step))
  }
  followHandles.set(instance, requestAnimationFrame(step))
}

/**
 * Stop the follow loop, with one final sync so the view rests exactly where
 * the audio stopped.
 * @param {GramFrame} instance - GramFrame instance
 */
export function stopFollow(instance) {
  const handle = followHandles.get(instance)
  if (handle !== undefined && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(handle)
  }
  followHandles.delete(instance)
  syncViewToPlayhead(instance)
}

/**
 * Reflect the playing flag on the container, for the cursor and any styling
 * that follows it (D9).
 * @param {GramFrame} instance - GramFrame instance
 */
export function updatePlayingClass(instance) {
  if (instance.ui.container) {
    instance.ui.container.classList.toggle('gram-frame-playing', isPlaying(instance))
  }
}

/**
 * Seek an audio-sourced gram to the time under a click on its time axis
 * (spec 168, FR-020).
 *
 * The axis band is the left margin beside the axes area. The time is read off
 * the visible range the axis is drawn from, so it agrees with the labels.
 * Lives here rather than in `core/events.js`, which called it: reading a time
 * off the axis is this module's geometry, and it is the transport half of the
 * same question `viewTop` answers.
 * @param {GramFrame} instance - GramFrame instance
 * @param {MouseEvent} event - The mousedown
 * @returns {boolean} True when the click was on the axis and a seek was made
 */
export function seekFromTimeAxisClick(instance, event) {
  if (!instance.player || !instance.player.isReady()) {
    return false
  }
  const state = instance.state
  const svgRect = instance.ui.svg.getBoundingClientRect()
  const point = screenToSVG(event.clientX - svgRect.left, event.clientY - svgRect.top, instance.ui.svg)
  const { renderHeight } = getRenderDimensions(state)
  const { margins } = state
  const onAxisBand = point.x >= 0 && point.x < margins.left &&
    point.y >= margins.top && point.y <= margins.top + renderHeight
  if (!onAxisBand) {
    return false
  }
  const visible = calculateVisibleDataRange(state, instance.ui.spectrogramImage)
  const fraction = (point.y - margins.top) / renderHeight
  instance.player.seek(visible.timeMax - fraction * (visible.timeMax - visible.timeMin))
  return true
}
