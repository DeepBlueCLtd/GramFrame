/**
 * The audio-sourced instance's initialisation step (spec 168, Story 2).
 *
 * The audio twin of `components/spectrogramImage.js`: where that module loads
 * a PNG, reads its size and triggers the first layout, this one loads a WAV,
 * analyses it into a PNG of its own, and does the same. From `ready` onward the
 * instance is an image-backed instance whose image is the whole recording;
 * the only things that know otherwise are the view geometry (`playerView`,
 * `svgLayout`) and the transport.
 *
 * Runs after the constructor returns — the first `await` sees to that — so
 * the modes, renderer and listeners it calls into all exist.
 */

/// <reference path="../types.js" />

import { loadAudioBytes } from '../audio/audioSource.js'
import { decodeWav } from '../audio/wavDecoder.js'
import { planAnalysis, analyse } from '../audio/spectrogram.js'
import { fitGramSize, checkGramSize, powerToLevels, paintGram } from '../audio/gramImage.js'
import { updateSVGLayout } from '../components/svgLayout.js'
import { updatePersistentPanels } from '../components/MainUI.js'
import { createErrorIndicator } from '../components/ErrorIndicator.js'
import { createTransportBar } from '../components/TransportBar.js'
import { createDisplayRangeControls } from '../components/DisplayRangeControls.js'
import { dispatch } from '../core/state.js'
import { createTransport } from './transport.js'
import { PLAYER_RENDER_WIDTH, PLAYER_RENDER_HEIGHT } from './playerView.js'
import { createExpandToggle } from '../components/ExpandToggle.js'

/**
 * The caption naming what the render caps changed (spec 171, FR-024).
 *
 * An author sees this once, at authoring time, and needs to know their
 * `hop-size` is not the one in force — a degraded load that said nothing would
 * be worse than the refusal it replaced.
 * @param {import('../audio/gramImage.js').DegradedAnalysis} degraded - What was changed
 * @returns {HTMLDivElement} The note
 */
function createDegradedNote(degraded) {
  const note = document.createElement('div')
  note.className = 'gram-frame-degraded-note'
  note.setAttribute('role', 'note')
  note.textContent = `This recording is too long to render at ${degraded.parameter} ${degraded.requested}; ` +
    `it is drawn at ${degraded.parameter} ${degraded.used}.`
  return note
}

/**
 * Show progress in the gram area while the recording is prepared (FR-006).
 * @param {GramFrame} instance - GramFrame instance
 * @param {number} fraction - 0..1
 * @param {string} stage - What is happening, for the caption
 */
function setProgress(instance, fraction, stage) {
  instance.state.player.progress = fraction
  if (instance.ui.mainCell) {
    instance.ui.mainCell.dataset.gramProgress = `${stage} ${Math.round(fraction * 100)}%`
  }
}

/**
 * Replace the half-built component with the standard error indicator (FR-007).
 *
 * The config table went into the container's place during construction;
 * the container now goes back out, the table returns, and the indicator sits
 * beside it — the same picture a table that failed to construct leaves. The
 * instance's own `destroy()` does the teardown, so nothing it registered
 * survives, and it drops out of the API's live list with its container.
 * @param {GramFrame} instance - GramFrame instance
 * @param {unknown} error - What went wrong
 */
function failAudioSetup(instance, error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`GramFrame: could not prepare the audio-sourced gram (${instance.configTable.querySelector('audio')?.getAttribute('src')}): ${message}`, error)

  const container = instance.ui.container
  const parent = container && container.parentNode
  const next = container ? container.nextSibling : null
  instance.destroy()

  const table = instance.configTable
  if (parent) {
    parent.insertBefore(table, next)
    table.classList.add('gram-frame-config-error')
    const source = table.querySelector('audio')?.getAttribute('src') || ''
    parent.insertBefore(createErrorIndicator(`Audio-sourced gram failed (${source}): ${message}`), table.nextSibling)
  }
}

/**
 * Plan the analysis, coarsening it rather than refusing when the requested
 * settings would exceed the render caps (spec 171, FR-023).
 *
 * The fitting hop was already being computed in order to name it in the
 * refusal message; offering it costs a second `planAnalysis` call. What was
 * changed is recorded in `player.degraded` so the caption can say so (FR-024),
 * and the original refusal still stands behind it for anything a coarser hop
 * cannot rescue (FR-025).
 * @param {PlayerState} player - The instance's player slice, updated in place with what was used
 * @param {{sampleRate: number, samples: Float32Array}} decoded - The decoded recording
 * @returns {import('../audio/spectrogram.js').AnalysisPlan} The plan actually used
 */
function planFittingAnalysis(player, decoded) {
  /**
   * @param {number} hopSize - Hop to plan at
   * @returns {import('../audio/spectrogram.js').AnalysisPlan} The plan
   */
  const planAt = (hopSize) => planAnalysis({
    sampleRate: decoded.sampleRate,
    sampleCount: decoded.samples.length,
    fftSize: player.analysis.fftSize,
    hopSize,
    freqStart: player.analysis.freqStart,
    freqEnd: player.analysis.freqEnd
  })

  let plan = planAt(player.analysis.hopSize)
  if (plan.clamped) {
    console.warn(`GramFrame: freq-end ${player.analysis.freqEnd} Hz is above this recording's Nyquist frequency (${decoded.sampleRate / 2} Hz); clamped to ${plan.freqEnd} Hz`)
  }

  const degraded = fitGramSize(plan.frames, plan.columns, plan)
  if (degraded) {
    console.warn(`GramFrame: ${plan.frames} analysis frames is above the render limit; ${degraded.parameter} raised from ${degraded.requested} to ${degraded.used}`)
    plan = planAt(degraded.used)
    player.analysis.hopSize = degraded.used
    player.degraded = degraded
  }
  // Anything the substitution could not rescue is still refused, with the
  // message it always had.
  checkGramSize(plan.frames, plan.columns, plan)
  return plan
}

/**
 * Load, decode, analyse and paint the recording, then finish initialising.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {Promise<void>} Resolves when the instance is ready or has failed
 */
export async function setupAudioSource(instance) {
  const state = instance.state
  const player = state.player
  const container = instance.ui.container
  container.classList.add('gram-frame-audio', 'gram-frame-analysing')
  setProgress(instance, 0, 'Loading audio')

  try {
    const bytes = await loadAudioBytes(player.source)
    setProgress(instance, 0.1, 'Decoding audio')
    // Let the caption paint before the synchronous decode runs.
    await new Promise(resolve => setTimeout(resolve, 0))

    const decoded = decodeWav(bytes)
    player.duration = decoded.duration
    player.sampleRate = decoded.sampleRate
    player.channels = decoded.channels
    setProgress(instance, 0.2, 'Analysing audio')

    const plan = planFittingAnalysis(player, decoded)

    const grid = await analyse(decoded.samples, plan, {
      onProgress: fraction => setProgress(instance, 0.2 + 0.7 * fraction, 'Analysing audio')
    })
    setProgress(instance, 0.9, 'Painting spectrogram')
    await new Promise(resolve => setTimeout(resolve, 0))
    const url = paintGram(powerToLevels(grid), plan.frames, plan.columns)

    // The instance may have been destroyed while we were away (an SPA page
    // swap, a test teardown); a detached container means stop quietly.
    if (!container.isConnected) {
      return
    }

    // From here the instance is an image-backed one whose image is the whole
    // recording (D6). `imageDetails.url` keeps the audio URL: it names the
    // source in state and is what the storage fingerprint identifies the gram by.
    const imageDetails = state.imageDetails
    imageDetails.naturalWidth = plan.columns
    imageDetails.naturalHeight = plan.frames
    imageDetails.renderWidth = PLAYER_RENDER_WIDTH
    imageDetails.renderHeight = PLAYER_RENDER_HEIGHT
    imageDetails.timeStretch = decoded.duration / player.windowSeconds
    instance.ui.spectrogramImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', url)

    state.config.timeMin = 0
    state.config.timeMax = decoded.duration
    state.config.freqMin = plan.freqStart
    state.config.freqMax = plan.freqEnd
    player.analysis.freqStart = plan.freqStart
    player.analysis.freqEnd = plan.freqEnd
    player.analysis.columns = plan.columns
    player.analysis.frames = plan.frames
    player.playhead = 0
    // The first window of the recording, rather than the blank above its
    // start: the whole gram is drawn from load now (spec 171, FR-005), so the
    // opening view is of the recording rather than of the space before it.
    player.viewTop = Math.min(player.windowSeconds, decoded.duration)
    player.progress = 1
    player.ready = true

    createTransport(instance)
    const bar = createTransportBar(instance)
    // Contrast, and the caption for anything the caps changed: both belong to
    // an audio-sourced instance only (FR-014), so both are mounted here rather
    // than anywhere an image instance would reach.
    createDisplayRangeControls(instance, bar, player.display)
    if (player.degraded) {
      bar.parentElement?.insertBefore(createDegradedNote(player.degraded), bar)
    }

    container.classList.remove('gram-frame-loading', 'gram-frame-analysing')
    delete instance.ui.mainCell.dataset.gramProgress

    updateSVGLayout(instance)

    // The expand toggle, as an image instance mounts it on load: a player's
    // axes area is landscape whatever shape the analysed gram is, and filling
    // the window is where the rows are tallest and the detail clearest.
    createExpandToggle(instance)

    // The four calls the constructor makes for an image instance, deferred to
    // here because the storage fingerprint needs the duration (D12).
    instance._restoreAnnotations()
    updatePersistentPanels(instance)
    if (instance.featureRenderer) {
      instance.featureRenderer.renderAllPersistentFeatures()
    }
    instance._setupStorageSaveListener()

    dispatch(instance)
  } catch (error) {
    if (container.isConnected) {
      failAudioSetup(instance, error)
    }
  }
}
