/**
 * The transport bar under an audio-sourced gram (spec 168, Story 5, D13).
 *
 * Restart and play/pause, the elapsed and total times either side of a scrub
 * track, then the bookmark controls, loop, rate, output and the visible time
 * span. Every control drives the `PlayerController`, and the bar is redrawn
 * from `state.player` by a state listener — so a change made through the
 * keyboard, the public API or the browser itself (the recording ending) shows
 * here without the bar being told.
 *
 * It sits BELOW the gram, which is where the scrub track lines up with the time
 * axis it refers to. Docked into the control panel above, the playhead would be
 * some 150px from the axis it points at and scrubbing would mean watching two
 * places at once.
 */

/// <reference path="../types.js" />

import { formatTime } from '../utils/timeFormatter.js'
import { setFocusedInstance } from '../core/FocusManager.js'
import { createIcon } from './icons.js'
import { addBookmark } from '../player/bookmarks.js'
import { renderBookmarks } from './TransportBookmarks.js'

/**
 * Rates offered by the select, as `[value, label]` (spec 171, FR-020).
 *
 * The slow end is where the domain reason is — a click train or a fast
 * transient is what an analyst slows a recording down for — and the platform
 * ceiling measured in the 169 survey's probe (a) was 0.0625–16, so the ladder
 * is a UI choice rather than a limit. It is not researched: five surveyed
 * players ship five incompatible ladders and none of them says why.
 * @type {Array<[number, string]>}
 */
const PLAYBACK_RATES = [[0.25, '0.25×'], [0.5, '0.5×'], [1, '1×'], [1.5, '1.5×'], [2, '2×'], [4, '4×']]

/**
 * How rarely the live region may repeat the elapsed time while playing
 * (spec 171, FR-027). A screen reader that announced every `timeupdate` would
 * talk continuously and drown out everything else on the page.
 * @type {number}
 */
const ANNOUNCE_INTERVAL_MS = 5000

/**
 * Make a button, faced with a glyph or a word.
 * @param {string} className - Class
 * @param {string} title - Tooltip / accessible name
 * @param {string} [icon] - Name of a glyph in `components/icons.js`
 * @param {string} [text] - Text, when the button is not a glyph
 * @returns {HTMLButtonElement} The button
 */
function button(className, title, icon, text) {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = `gram-frame-transport-btn ${className}`
  el.title = title
  el.setAttribute('aria-label', title)
  const glyph = createIcon(icon)
  if (glyph) {
    el.appendChild(glyph)
  } else if (text) {
    el.textContent = text
  }
  return el
}

/**
 * Replace a button's glyph, keeping whatever else it carries.
 * @param {HTMLButtonElement} el - The button
 * @param {string} icon - Name of the new glyph
 * @returns {void}
 */
function setGlyph(el, icon) {
  const glyph = createIcon(icon)
  const existing = el.querySelector('svg')
  if (glyph && existing) {
    existing.replaceWith(glyph)
  }
}

/**
 * Build and mount the bar, and keep it in step with state.
 * @param {GramFrame} instance - GramFrame instance whose `player` exists
 * @returns {HTMLDivElement} The bar
 */
export function createTransportBar(instance) {
  const controller = instance.player
  if (!controller) {
    throw new Error('GramFrame: the transport bar needs a player')
  }
  const state = instance.state
  const player = state.player

  const bar = document.createElement('div')
  bar.className = 'gram-frame-transport'
  bar.setAttribute('role', 'group')
  bar.setAttribute('aria-label', 'Playback controls')

  const restart = button('gram-frame-transport-restart', 'Restart', 'restart')
  const play = button('gram-frame-transport-play gram-frame-transport-primary', 'Play', 'play')

  const elapsed = document.createElement('span')
  elapsed.className = 'gram-frame-transport-time'

  // The scrub track stays a native range input. It is what gives the playhead
  // keyboard control, a drag that keeps tracking off the element, and the
  // browser's own touch handling; the design's rail, played portion and thumb
  // are all reachable from CSS without giving any of that up.
  const seek = document.createElement('input')
  seek.type = 'range'
  seek.className = 'gram-frame-transport-seek'
  seek.min = '0'
  seek.max = String(player.duration)
  seek.step = '0.01'
  seek.value = '0'
  seek.title = 'Seek'
  seek.setAttribute('aria-label', 'Seek')

  // The flags live over the track, not in it: the input is one element and
  // cannot carry children.
  const flags = document.createElement('div')
  flags.className = 'gram-frame-transport-flags'

  const track = document.createElement('div')
  track.className = 'gram-frame-transport-track'
  track.appendChild(seek)
  track.appendChild(flags)

  const duration = document.createElement('span')
  duration.className = 'gram-frame-transport-duration'

  const divider = document.createElement('span')
  divider.className = 'gram-frame-transport-divider'

  const bookmark = button('gram-frame-transport-bookmark', 'Bookmark this moment (B)', 'bookmark')
  const bookmarkWord = document.createElement('span')
  bookmarkWord.textContent = 'Bookmark'
  bookmark.appendChild(bookmarkWord)

  const saved = document.createElement('button')
  saved.type = 'button'
  saved.className = 'gram-frame-transport-saved'
  saved.setAttribute('aria-haspopup', 'true')
  saved.setAttribute('aria-expanded', 'false')

  const savedList = document.createElement('div')
  savedList.className = 'gram-frame-transport-saved-list'
  savedList.hidden = true

  const loop = button('gram-frame-transport-loop', 'Loop', undefined, '⟲')
  loop.setAttribute('aria-pressed', 'false')

  const rateLabel = document.createElement('span')
  rateLabel.className = 'gram-frame-transport-rate-label'
  rateLabel.textContent = 'Rate'

  const playbackRate = document.createElement('select')
  playbackRate.className = 'gram-frame-transport-playback-rate'
  playbackRate.title = 'Playback rate'
  playbackRate.setAttribute('aria-label', 'Playback rate')
  PLAYBACK_RATES.forEach(([value, label]) => {
    const option = document.createElement('option')
    option.value = String(value)
    option.textContent = label
    if (value === 1) option.selected = true
    playbackRate.appendChild(option)
  })

  // The visible time span, stated wherever the zoom can be changed (spec 171,
  // FR-019). The bar is under the gram in every mode, so it is the one place
  // that is always beside both the wheel gesture and the zoom buttons.
  const span = document.createElement('span')
  span.className = 'gram-frame-transport-span'
  span.title = 'Visible time span'

  const mute = button('gram-frame-transport-mute', 'Mute', 'volume')
  mute.setAttribute('aria-pressed', 'false')

  // Kept from the bar the redesign replaced. The design draws mute alone, but
  // volume is a shipped control and dropping it would be a quiet regression;
  // it rides beside mute, which is the control it qualifies.
  const volume = document.createElement('input')
  volume.type = 'range'
  volume.className = 'gram-frame-transport-volume'
  volume.min = '0'
  volume.max = '1'
  volume.step = '0.01'
  volume.value = '1'
  volume.title = 'Volume'
  volume.setAttribute('aria-label', 'Volume')

  // What a screen reader hears (FR-026): polite, so it never interrupts, and
  // never focused, so the announcement does not move the caret.
  const status = document.createElement('span')
  status.className = 'gram-frame-transport-status'
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')

  const transportGroup = document.createElement('div')
  transportGroup.className = 'gram-frame-transport-group'
  transportGroup.appendChild(restart)
  transportGroup.appendChild(play)

  const bookmarkGroup = document.createElement('div')
  bookmarkGroup.className = 'gram-frame-transport-group gram-frame-transport-bookmarks'
  bookmarkGroup.appendChild(bookmark)
  bookmarkGroup.appendChild(saved)
  bookmarkGroup.appendChild(savedList)

  const outputGroup = document.createElement('div')
  outputGroup.className = 'gram-frame-transport-group'
  outputGroup.appendChild(mute)
  outputGroup.appendChild(volume)

  ;[transportGroup, elapsed, track, duration, divider, bookmarkGroup, loop,
    rateLabel, playbackRate, span, outputGroup, status].forEach(el => bar.appendChild(el))

  // --- wiring ---------------------------------------------------------------
  // Using the bar is interacting with the instance: it takes keyboard focus,
  // so the transport keys act on it afterwards.
  bar.addEventListener('mousedown', () => setFocusedInstance(instance))
  play.addEventListener('click', () => {
    controller.toggle().catch(error => {
      console.warn('GramFrame: playback could not start:', error instanceof Error ? error.message : String(error))
    })
  })
  restart.addEventListener('click', () => controller.restart())

  // While the slider is being dragged the state listener must not yank it
  // back to the playhead between events.
  let scrubbing = false
  seek.addEventListener('pointerdown', () => { scrubbing = true })
  seek.addEventListener('pointerup', () => { scrubbing = false })
  seek.addEventListener('pointercancel', () => { scrubbing = false })
  seek.addEventListener('input', () => controller.seek(parseFloat(seek.value)))
  seek.addEventListener('change', () => { scrubbing = false; controller.seek(parseFloat(seek.value)) })

  loop.addEventListener('click', () => controller.setLoop(!player.loop))
  playbackRate.addEventListener('change', () => controller.setPlaybackRate(parseFloat(playbackRate.value)))
  mute.addEventListener('click', () => controller.setMute(!player.muted))
  volume.addEventListener('input', () => controller.setVolume(parseFloat(volume.value)))

  bookmark.addEventListener('click', () => addBookmark(instance))
  saved.addEventListener('click', () => {
    savedList.hidden = !savedList.hidden
    saved.setAttribute('aria-expanded', savedList.hidden ? 'false' : 'true')
  })
  // A press outside dismisses the list, so it never has to be closed by the
  // button that opened it.
  document.addEventListener('mousedown', event => {
    const target = /** @type {Node|null} */ (event.target)
    if (!savedList.hidden && target && !bookmarkGroup.contains(target)) {
      savedList.hidden = true
      saved.setAttribute('aria-expanded', 'false')
    }
  }, true)

  // --- reflect state --------------------------------------------------------
  /** @type {{playing: boolean, at: number}} What the live region last said */
  let announced = { playing: player.playing, at: 0 }

  /**
   * Say what the transport is doing, rate-limited (FR-027).
   *
   * A state change is announced the moment it happens; the elapsed time only
   * every few seconds, and only while playing, so a recording running for a
   * minute produces a dozen announcements rather than hundreds.
   * @param {PlayerState} p - The player slice being reflected
   */
  const announce = (p) => {
    const now = Date.now()
    const changed = p.playing !== announced.playing
    if (!changed && (!p.playing || now - announced.at < ANNOUNCE_INTERVAL_MS)) {
      return
    }
    announced = { playing: p.playing, at: now }
    status.textContent = `${p.playing ? 'Playing' : 'Paused'} at ${formatTime(p.playhead)} of ${formatTime(p.duration)}`
  }

  /**
   * @param {GramFrameState} snapshot - A broadcast (or the live) state
   */
  const reflect = (snapshot) => {
    const p = snapshot.player
    setGlyph(play, p.playing ? 'pause' : 'play')
    play.title = p.playing ? 'Pause' : 'Play'
    play.setAttribute('aria-label', play.title)
    play.setAttribute('aria-pressed', p.playing ? 'true' : 'false')
    if (!scrubbing) {
      seek.max = String(p.duration)
      seek.value = String(p.playhead)
    }
    // The played portion is painted onto the rail itself, so the track is one
    // element rather than a stack of three that have to be kept aligned.
    const played = p.duration > 0 ? (p.playhead / p.duration) * 100 : 0
    seek.style.setProperty('--gf-played', `${played}%`)
    elapsed.textContent = formatTime(p.playhead)
    duration.textContent = formatTime(p.duration)
    const visibleSeconds = p.windowSeconds / snapshot.zoom.level
    span.textContent = `${visibleSeconds.toFixed(1)} s span`
    loop.setAttribute('aria-pressed', p.loop ? 'true' : 'false')
    playbackRate.value = String(p.playbackRate)
    mute.setAttribute('aria-pressed', p.muted ? 'true' : 'false')
    setGlyph(mute, p.muted ? 'muted' : 'volume')
    mute.title = p.muted ? 'Unmute' : 'Mute'
    mute.setAttribute('aria-label', mute.title)
    if (document.activeElement !== volume) {
      volume.value = String(p.volume)
    }
    renderBookmarks(instance, snapshot, flags, savedList, saved)
    announce(p)
  }
  reflect(state)
  instance.stateListeners.push(reflect)

  instance.ui.mainCell.appendChild(bar)
  return bar
}
