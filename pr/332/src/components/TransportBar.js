/**
 * The transport bar under an audio-sourced gram (spec 168, Story 5, D13).
 *
 * Play/pause, restart, a seek slider with a time readout, loop, playback rate, mute and
 * volume. Every control drives the `PlayerController`, and the bar is redrawn
 * from `state.player` by a state listener — so a change made through the
 * keyboard, the public API or the browser itself (the recording ending) shows
 * here without the bar being told.
 */

/// <reference path="../types.js" />

import { formatTime } from '../utils/timeFormatter.js'
import { setFocusedInstance } from '../core/FocusManager.js'

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
 * Make a button.
 * @param {string} className - Class
 * @param {string} title - Tooltip / accessible name
 * @param {string} text - Glyph
 * @returns {HTMLButtonElement} The button
 */
function button(className, title, text) {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = `gram-frame-transport-btn ${className}`
  el.title = title
  el.setAttribute('aria-label', title)
  el.textContent = text
  return el
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

  const play = button('gram-frame-transport-play', 'Play', '▶')
  const restart = button('gram-frame-transport-restart', 'Restart', '⏮')

  const seek = document.createElement('input')
  seek.type = 'range'
  seek.className = 'gram-frame-transport-seek'
  seek.min = '0'
  seek.max = String(player.duration)
  seek.step = '0.01'
  seek.value = '0'
  seek.title = 'Seek'
  seek.setAttribute('aria-label', 'Seek')

  const time = document.createElement('span')
  time.className = 'gram-frame-transport-time'
  time.textContent = `${formatTime(0)} / ${formatTime(player.duration)}`

  const loop = button('gram-frame-transport-loop', 'Loop', '🔁')
  loop.setAttribute('aria-pressed', 'false')

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

  const mute = button('gram-frame-transport-mute', 'Mute', '🔊')
  mute.setAttribute('aria-pressed', 'false')

  // The visible time span, stated wherever the zoom can be changed (spec 171,
  // FR-019). The bar is under the gram in every mode, so it is the one place
  // that is always beside both the wheel gesture and the zoom buttons.
  const span = document.createElement('span')
  span.className = 'gram-frame-transport-span'
  span.title = 'Visible time span'

  // What a screen reader hears (FR-026): polite, so it never interrupts, and
  // never focused, so the announcement does not move the caret.
  const status = document.createElement('span')
  status.className = 'gram-frame-transport-status'
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')

  const volume = document.createElement('input')
  volume.type = 'range'
  volume.className = 'gram-frame-transport-volume'
  volume.min = '0'
  volume.max = '1'
  volume.step = '0.01'
  volume.value = '1'
  volume.title = 'Volume'
  volume.setAttribute('aria-label', 'Volume')

  ;[play, restart, seek, time, span, loop, playbackRate, mute, volume, status].forEach(el => bar.appendChild(el))

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
    play.textContent = p.playing ? '❚❚' : '▶'
    play.title = p.playing ? 'Pause' : 'Play'
    play.setAttribute('aria-label', play.title)
    play.setAttribute('aria-pressed', p.playing ? 'true' : 'false')
    if (!scrubbing) {
      seek.max = String(p.duration)
      seek.value = String(p.playhead)
    }
    time.textContent = `${formatTime(p.playhead)} / ${formatTime(p.duration)}`
    const visibleSeconds = p.windowSeconds / snapshot.zoom.level
    span.textContent = `${visibleSeconds.toFixed(1)} s span`
    loop.setAttribute('aria-pressed', p.loop ? 'true' : 'false')
    playbackRate.value = String(p.playbackRate)
    mute.setAttribute('aria-pressed', p.muted ? 'true' : 'false')
    mute.textContent = p.muted ? '🔇' : '🔊'
    mute.title = p.muted ? 'Unmute' : 'Mute'
    mute.setAttribute('aria-label', mute.title)
    if (document.activeElement !== volume) {
      volume.value = String(p.volume)
    }
    announce(p)
  }
  reflect(state)
  instance.stateListeners.push(reflect)

  instance.ui.mainCell.appendChild(bar)
  return bar
}
