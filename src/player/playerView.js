/**
 * The waterfall view of an audio-sourced gram (spec 168, D7–D11).
 *
 * Owns the one scalar the geometry needs that zoom does not carry: the time at
 * the top edge of the view, `state.player.viewTop`. While playing it follows
 * the playhead every animation frame; paused, the analyst can move it with a
 * pan, but never above the playhead (FR-011, FR-016). The placement itself
 * lives in `components/svgLayout.js`, which reads `viewTop` and
 * `imageDetails.timeStretch`; this module decides what they should be and when
 * to redraw.
 */

/// <reference path="../types.js" />

import { applyZoomTransform } from '../components/svgLayout.js'
import { dispatch } from '../core/state.js'

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
 * Whether audio at a given time has been heard (or sought past), so a feature
 * placed there may be drawn (FR-018).
 *
 * The playhead advances in whole analysis frames, so a feature sitting on the
 * newest row is up to one hop ahead of the sampled `currentTime`; the epsilon
 * keeps it visible rather than blinking on the next frame. Always true on an
 * image-backed instance.
 * @param {GramFrame} instance - GramFrame instance
 * @param {number} time - Seconds into the recording
 * @returns {boolean} True when the time is revealed
 */
export function isTimeRevealed(instance, time) {
  const player = playerOf(instance)
  if (!player || !player.active) {
    return true
  }
  const epsilon = player.sampleRate > 0 ? player.analysis.hopSize / player.sampleRate : 0
  return time <= player.playhead + epsilon
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
 * Keep a candidate top-of-view time inside what may be shown.
 *
 * Upper bound: the playhead — nothing unplayed is ever in view. Lower bound:
 * one window's worth above the start, so the recording's beginning never
 * scrolls above the bottom edge into empty space; when the playhead is nearer
 * than that, the playhead itself (the view holds `[playhead − window,
 * playhead]`, blank below 0).
 * @param {GramFrame} instance - GramFrame instance
 * @param {number} seconds - Candidate view-top time
 * @returns {number} The clamped time
 */
export function clampViewTop(instance, seconds) {
  const { playhead } = playerOf(instance)
  const lower = Math.min(visibleWindowSeconds(instance), playhead)
  return Math.max(lower, Math.min(playhead, seconds))
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
