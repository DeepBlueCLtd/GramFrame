/**
 * The transport bar under an audio-sourced gram (spec 168, Story 5, D13).
 *
 * Play/pause, restart, a seek slider with a time readout, loop, rate, mute and
 * volume. Every control drives the `PlayerController`, and the bar is redrawn
 * from `state.player` by a state listener — so a change made through the
 * keyboard, the public API or the browser itself (the recording ending) shows
 * here without the bar being told.
 */

/// <reference path="../types.js" />

import { formatTime } from '../utils/timeFormatter.js'
import { setFocusedInstance } from '../core/FocusManager.js'

/**
 * Rates offered by the select, as `[value, label]`.
 * @type {Array<[number, string]>}
 */
const RATES = [[0.5, '0.5×'], [1, '1×'], [1.5, '1.5×'], [2, '2×']]

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

  const rate = document.createElement('select')
  rate.className = 'gram-frame-transport-rate'
  rate.title = 'Playback rate'
  rate.setAttribute('aria-label', 'Playback rate')
  RATES.forEach(([value, label]) => {
    const option = document.createElement('option')
    option.value = String(value)
    option.textContent = label
    if (value === 1) option.selected = true
    rate.appendChild(option)
  })

  const mute = button('gram-frame-transport-mute', 'Mute', '🔊')
  mute.setAttribute('aria-pressed', 'false')

  const volume = document.createElement('input')
  volume.type = 'range'
  volume.className = 'gram-frame-transport-volume'
  volume.min = '0'
  volume.max = '1'
  volume.step = '0.01'
  volume.value = '1'
  volume.title = 'Volume'
  volume.setAttribute('aria-label', 'Volume')

  ;[play, restart, seek, time, loop, rate, mute, volume].forEach(el => bar.appendChild(el))

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
  rate.addEventListener('change', () => controller.setRate(parseFloat(rate.value)))
  mute.addEventListener('click', () => controller.setMute(!player.muted))
  volume.addEventListener('input', () => controller.setVolume(parseFloat(volume.value)))

  // --- reflect state --------------------------------------------------------
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
    loop.setAttribute('aria-pressed', p.loop ? 'true' : 'false')
    rate.value = String(p.rate)
    mute.setAttribute('aria-pressed', p.muted ? 'true' : 'false')
    mute.textContent = p.muted ? '🔇' : '🔊'
    mute.title = p.muted ? 'Unmute' : 'Mute'
    mute.setAttribute('aria-label', mute.title)
    if (document.activeElement !== volume) {
      volume.value = String(p.volume)
    }
  }
  reflect(state)
  instance.stateListeners.push(reflect)

  instance.ui.mainCell.appendChild(bar)
  return bar
}
