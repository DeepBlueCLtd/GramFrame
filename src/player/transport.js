/**
 * The transport: an `<audio>` element and the controller around it
 * (spec 168, D8, D14; contracts/player-api.md).
 *
 * Playback is the element's — not Web Audio's — so it works over `file://`
 * (research.md §3.1) and needs no user-gesture handshake beyond the one the
 * browser already imposes on `play()`. Every mutation goes through the element
 * and is mirrored back into `state.player` from the element's own events, so a
 * change made by the browser (`ended`, a loop wrapping, a backgrounded tab
 * catching up) is broadcast exactly like one made through the API.
 */

/// <reference path="../types.js" />

import { dispatch } from '../core/state.js'
import { syncViewToPlayhead, startFollow, stopFollow, updatePlayingClass } from './playerView.js'

/**
 * What `instance.player` is on an audio-sourced instance.
 */
class PlayerController {
  /**
   * @param {GramFrame} instance - The owning instance
   * @param {HTMLAudioElement} audio - The element to drive
   */
  constructor(instance, audio) {
    this.instance = instance
    /** @type {HTMLAudioElement} */
    this.audio = audio
    /**
     * The player slice, held once: `state` is never reassigned on an
     * instance, so this reference stays live for the controller's lifetime.
     * @type {PlayerState}
     */
    this.playerState = instance.state.player
    /** @type {Array<{type: string, handler: EventListener}>} */
    this._listeners = []
    /** @type {(function(): void)|null} */
    this._onVisibility = null
    this._bind()
  }

  /**
   * Mirror the element's events into state.
   */
  _bind() {
    const { audio } = this
    /**
     * @param {string} type - Event name
     * @param {EventListener} handler - Listener
     */
    const on = (type, handler) => {
      audio.addEventListener(type, handler)
      this._listeners.push({ type, handler })
    }

    on('play', () => {
      const player = this.playerState
      player.playing = true
      player.ended = false
      updatePlayingClass(this.instance)
      startFollow(this.instance)
      dispatch(this.instance)
    })
    on('pause', () => {
      this.playerState.playing = false
      updatePlayingClass(this.instance)
      stopFollow(this.instance)
      dispatch(this.instance)
    })
    on('ended', () => {
      // With `loop` the element never reports `ended`; without it the view
      // stays on the final window (AS-3.3).
      const player = this.playerState
      player.playing = false
      player.ended = true
      updatePlayingClass(this.instance)
      stopFollow(this.instance)
      dispatch(this.instance)
    })
    on('seeked', () => syncViewToPlayhead(this.instance))
    // ~4 Hz even in a background tab, where requestAnimationFrame is paused:
    // the cheap insurance that the view is never more than a quarter-second
    // stale when the tab comes back (spec edge case).
    on('timeupdate', () => {
      if (this.playerState.playing) {
        syncViewToPlayhead(this.instance)
      }
    })
    on('volumechange', () => {
      const player = this.playerState
      player.volume = audio.volume
      player.muted = audio.muted
      dispatch(this.instance)
    })
    on('ratechange', () => {
      this.playerState.playbackRate = audio.playbackRate
      dispatch(this.instance)
    })

    if (typeof document !== 'undefined') {
      this._onVisibility = () => {
        if (document.visibilityState === 'visible' && this.playerState.playing) {
          syncViewToPlayhead(this.instance)
        }
      }
      document.addEventListener('visibilitychange', this._onVisibility)
    }
  }

  /**
   * Whether the gram is analysed and the transport may be used.
   * @returns {boolean} True once ready
   */
  isReady() {
    return this.playerState.ready
  }

  /**
   * Start playback from the playhead.
   *
   * The view snaps to the playhead first (Story 4, AS-4): a paused analyst who
   * panned away resumes where the audio is, not where they were looking. The
   * element's promise is returned as-is, so an autoplay refusal
   * (`NotAllowedError`) rejects rather than failing silently (FR-023).
   * @returns {Promise<void>} Resolves when playback starts
   */
  play() {
    if (!this.isReady()) {
      return Promise.reject(new Error('GramFrame: the recording is still being analysed'))
    }
    this.playerState.ended = false
    syncViewToPlayhead(this.instance)
    const result = this.audio.play()
    // Older engines return undefined from play(); normalise to a promise.
    return result && typeof result.then === 'function' ? result : Promise.resolve()
  }

  /**
   * Pause playback. The follow loop ends after one final sync.
   */
  pause() {
    this.audio.pause()
  }

  /**
   * Play if paused, pause if playing.
   * @returns {Promise<void>} The `play()` promise, or resolved when pausing
   */
  toggle() {
    if (this.audio.paused) {
      return this.play()
    }
    this.pause()
    return Promise.resolve()
  }

  /**
   * Move the playhead. Reveals rows up to the target and puts the view there,
   * without starting playback (spec edge case "seek while paused").
   * @param {number} seconds - Target time; clamped to the recording
   */
  seek(seconds) {
    if (!this.isReady()) {
      return
    }
    const duration = this.playerState.duration
    const target = Math.max(0, Math.min(duration, Number.isFinite(seconds) ? seconds : 0))
    this.playerState.ended = false
    this.audio.currentTime = target
    // `seeked` will fire too, but that is asynchronous; the state and the view
    // reflect the seek immediately so a caller reading straight back sees it.
    const player = this.playerState
    player.playhead = target
    syncViewToPlayhead(this.instance)
  }

  /**
   * Return to the start. Keeps playing if it was playing.
   */
  restart() {
    this.seek(0)
  }

  /**
   * @param {boolean} loop - Whether to restart at the end
   */
  setLoop(loop) {
    this.audio.loop = !!loop
    this.playerState.loop = !!loop
    dispatch(this.instance)
  }

  /**
   * @param {number} playbackRate - Playback speed; the gram is never re-analysed (FR-022)
   */
  setPlaybackRate(playbackRate) {
    if (Number.isFinite(playbackRate) && playbackRate > 0) {
      this.audio.playbackRate = playbackRate
      this.playerState.playbackRate = playbackRate
      dispatch(this.instance)
    }
  }

  /**
   * @param {number} volume - 0..1
   */
  setVolume(volume) {
    if (Number.isFinite(volume)) {
      const clamped = Math.max(0, Math.min(1, volume))
      this.audio.volume = clamped
      this.playerState.volume = clamped
      dispatch(this.instance)
    }
  }

  /**
   * @param {boolean} muted - Whether to silence output; the gram still scrolls (AS-5.5)
   */
  setMute(muted) {
    this.audio.muted = !!muted
    this.playerState.muted = !!muted
    dispatch(this.instance)
  }

  /**
   * Pause, detach every listener and drop the element.
   */
  destroy() {
    try {
      this.audio.pause()
    } catch (_e) {
      // A detached element may refuse; nothing to do
    }
    stopFollow(this.instance)
    this._listeners.forEach(({ type, handler }) => this.audio.removeEventListener(type, handler))
    this._listeners = []
    if (this._onVisibility) {
      document.removeEventListener('visibilitychange', this._onVisibility)
      this._onVisibility = null
    }
    this.audio.removeAttribute('src')
    if (this.audio.parentNode) {
      this.audio.parentNode.removeChild(this.audio)
    }
  }
}

/**
 * Create the element and its controller for an instance.
 * @param {GramFrame} instance - The instance
 * @returns {PlayerController} The controller, also assigned to `instance.player`
 */
export function createTransport(instance) {
  const audio = document.createElement('audio')
  audio.className = 'gram-frame-audio-element'
  audio.preload = 'auto'
  audio.src = instance.state.player.source
  // Present in the DOM (some engines only advance a connected element) but
  // never visible: the component's own bar is the UI.
  audio.style.display = 'none'
  instance.ui.container.appendChild(audio)
  const controller = new PlayerController(instance, audio)
  instance.player = controller
  return controller
}
