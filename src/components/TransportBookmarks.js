/**
 * The bookmark flags on the scrub track, and the list behind the count.
 *
 * Split from the bar itself: the bar is a fixed row of controls wired once,
 * while this is a small list rebuilt from state whenever it changes, and the
 * two have nothing to say to each other beyond the two elements they share.
 */

/// <reference path="../types.js" />

import { formatTime } from '../utils/timeFormatter.js'
import { removeBookmark } from '../player/bookmarks.js'

/**
 * Draw the bookmark flags on the track, and the list behind the count.
 *
 * Rebuilt outright on each notification rather than diffed: there are a handful
 * of bookmarks at most, and they change only when a person adds or removes one.
 * @param {GramFrame} instance - GramFrame instance
 * @param {GramFrameState} snapshot - The state being reflected
 * @param {HTMLElement} flags - The overlay the flags are drawn into
 * @param {HTMLElement} list - The saved-bookmarks popover
 * @param {HTMLButtonElement} count - The button that opens it
 * @returns {void}
 */
export function renderBookmarks(instance, snapshot, flags, list, count) {
  const bookmarks = snapshot.bookmarks || []
  const duration = snapshot.player.duration

  count.textContent = `${bookmarks.length} saved`
  count.disabled = bookmarks.length === 0
  if (bookmarks.length === 0) {
    list.hidden = true
    count.setAttribute('aria-expanded', 'false')
  }

  flags.replaceChildren()
  list.replaceChildren()

  bookmarks.forEach(mark => {
    const at = duration > 0 ? (mark.time / duration) * 100 : 0

    const flag = document.createElement('button')
    flag.type = 'button'
    flag.className = 'gram-frame-transport-flag'
    flag.style.left = `${at}%`
    flag.title = `Jump to ${formatTime(mark.time)}`
    const plate = document.createElement('span')
    plate.className = 'gram-frame-transport-flag-plate'
    plate.textContent = mark.label
    const stem = document.createElement('span')
    stem.className = 'gram-frame-transport-flag-stem'
    flag.appendChild(plate)
    flag.appendChild(stem)
    flag.addEventListener('click', () => instance.player?.seek(mark.time))
    flags.appendChild(flag)

    const row = document.createElement('div')
    row.className = 'gram-frame-transport-saved-row'
    const jump = document.createElement('button')
    jump.type = 'button'
    jump.className = 'gram-frame-transport-saved-jump'
    jump.textContent = `${mark.label} · ${formatTime(mark.time)}`
    jump.addEventListener('click', () => instance.player?.seek(mark.time))
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'gram-frame-transport-saved-remove'
    remove.textContent = '×'
    remove.title = 'Remove this bookmark'
    remove.addEventListener('click', () => removeBookmark(instance, mark.id))
    row.appendChild(jump)
    row.appendChild(remove)
    list.appendChild(row)
  })
}
