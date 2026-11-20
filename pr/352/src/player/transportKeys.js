/**
 * The transport's keyboard shortcuts.
 *
 * Space/K toggle, J/L seek, Home restarts, M mutes, B bookmarks — the ladder a
 * player is expected to answer to. None of them is an arrow key, so nudging an
 * annotation is untouched, and none is bound on an image-backed instance, so
 * nothing there changes (spec 168, FR-021).
 *
 * Split out of `core/keyboardControl.js`, which owns the arrow keys, the
 * selection and the focus: those are about the gram, these are about the
 * recording, and only the first are the reason that module exists.
 */

/// <reference path="../types.js" />

import { addBookmark } from './bookmarks.js'

/**
 * Seconds a transport seek key moves by, plain and with Shift.
 */
const SEEK_STEP_SECONDS = 5
const SEEK_STEP_SHIFT_SECONDS = 30

/**
 * Act on a transport key. Space/K toggle, J/L seek, Home restarts, M mutes,
 * B bookmarks.
 *
 * A Space or Enter on a focused button is left to the button — the transport
 * bar's own play button would otherwise be toggled twice.
 * @param {GramFrame} instance - The focused audio-sourced instance
 * @param {KeyboardEvent} event - The keydown
 * @returns {boolean} True when the key was a transport key and was handled
 */
export function handleTransportKey(instance, event) {
  const controller = instance.player
  if (!controller || !controller.isReady()) {
    return false
  }
  const target = event.target
  const onButton = target instanceof Element && target.tagName === 'BUTTON'
  const step = event.shiftKey ? SEEK_STEP_SHIFT_SECONDS : SEEK_STEP_SECONDS
  const player = instance.state.player
  const playhead = player.playhead
  switch (event.key) {
    case ' ':
    case 'Enter':
      if (onButton) return false
      controller.toggle().catch(error => {
        console.warn('GramFrame: playback could not start:', error instanceof Error ? error.message : String(error))
      })
      return true
    case 'k':
    case 'K':
      controller.toggle().catch(error => {
        console.warn('GramFrame: playback could not start:', error instanceof Error ? error.message : String(error))
      })
      return true
    case 'j':
    case 'J':
      controller.seek(playhead - step)
      return true
    case 'l':
    case 'L':
      controller.seek(playhead + step)
      return true
    case 'Home':
      controller.restart()
      return true
    case 'm':
    case 'M':
      controller.setMute(!player.muted)
      return true
    case 'b':
    case 'B':
      // Flag this moment. One key, because the point of a bookmark is that it
      // is made while listening rather than instead of listening.
      addBookmark(instance)
      return true
    default:
      return false
  }
}
