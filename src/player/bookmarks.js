/**
 * Time bookmarks: the moments an analyst wants to come back to.
 *
 * A recording is listened to more than once, and the second pass is spent
 * hunting for the thing heard on the first. A bookmark is that hunt written
 * down — a flag on the scrub track, one click to jump back to it.
 *
 * They are playback chrome, not annotation. A marker says what was measured
 * and belongs to the gram; a bookmark says where to listen again and belongs
 * to the sitting. So they are in-memory for the life of the page, they carry
 * no colour or symbol, and they never reach the annotation store — a bookmark
 * arriving in a trainer's saved exercise would be a stray note from someone
 * else's listening.
 */

/// <reference path="../types.js" />

import { dispatch } from '../core/state.js'

/**
 * Flag the playhead's current position.
 *
 * A bookmark within a second of one that already exists is refused rather than
 * duplicated: the button is one key away (B) and a double press is far more
 * likely to be a slip than a deliberate pair of flags a second apart.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {TimeBookmark|null} The new bookmark, or null if it duplicated one
 */
export function addBookmark(instance) {
  const { player, bookmarks } = instance.state
  if (!player.ready) {
    return null
  }
  const time = player.playhead
  if (bookmarks.some(existing => Math.abs(existing.time - time) < 1)) {
    return null
  }

  /** @type {TimeBookmark} */
  const bookmark = {
    id: `bookmark-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    time,
    label: ''
  }
  bookmarks.push(bookmark)
  bookmarks.sort((a, b) => a.time - b.time)
  // Numbered in the order they sit on the track rather than the order they were
  // made: the flags are read left to right, so that is the order the numbers
  // have to run in for the list beside them to be followable.
  renumber(bookmarks)
  dispatch(instance)
  return bookmark
}

/**
 * Remove one bookmark.
 * @param {GramFrame} instance - GramFrame instance
 * @param {string} id - The bookmark's id
 * @returns {void}
 */
export function removeBookmark(instance, id) {
  const { bookmarks } = instance.state
  const index = bookmarks.findIndex(bookmark => bookmark.id === id)
  if (index === -1) {
    return
  }
  bookmarks.splice(index, 1)
  renumber(bookmarks)
  dispatch(instance)
}

/**
 * Give every bookmark its position in the list as its label.
 * @param {TimeBookmark[]} bookmarks - The list, already in time order
 * @returns {void}
 */
function renumber(bookmarks) {
  bookmarks.forEach((bookmark, index) => {
    bookmark.label = String(index + 1)
  })
}
