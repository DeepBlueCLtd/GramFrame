import { describe, test, expect } from 'vitest'

import { createInitialState } from '../../src/core/state.js'

/**
 * @fileoverview The composed initial state, pinned (spec 167, US2).
 *
 * Written *before* `core/state.js` stopped importing the four mode classes.
 * `FROZEN_INITIAL_STATE` below is the state as `state.js` composed it itself,
 * transcribed from a run at that commit — so every assertion here is a
 * statement about behaviour that must survive the rewiring, not a description
 * of the code that replaced it.
 *
 * When the registration seam lands, `composeInitialState()` is the **only**
 * thing in this file that changes: the call moves from `createInitialState()`
 * to `createInitialState(ModeFactory.getModeInitialStates())`. The frozen
 * constant stays byte-identical, which is what makes the move provably
 * shape-preserving.
 */

/**
 * Build the initial state the way a GramFrame instance does.
 *
 * The one line that tracks the registration seam; everything below is frozen.
 * @returns {Record<string, any>} A fresh composed initial state
 */
function composeInitialState() {
  return createInitialState()
}

/**
 * The composed initial state, frozen at the commit before the registration
 * seam landed.
 *
 * Two keys are deliberately absent: `version`, injected at build time and
 * changing with every release, and `timestamp`, the construction time. Both
 * are asserted separately below.
 */
const FROZEN_INITIAL_STATE = {
  instanceId: '',
  mode: 'pan',
  previousMode: null,
  rate: 1,
  selectedColor: '#ff6b6b',
  selectedSymbol: 'cross',
  showHarmonicPin: true,
  largeSymbols: false,
  cursorPosition: null,
  cursors: [],
  annotationRevision: 0,
  imageDetails: {
    url: '',
    naturalWidth: 0,
    naturalHeight: 0,
    renderWidth: 0,
    renderHeight: 0
  },
  imageExpanded: false,
  config: {
    timeMin: 0,
    timeMax: 0,
    freqMin: 0,
    freqMax: 0
  },
  displayDimensions: {
    width: 0,
    height: 0
  },
  margins: {
    left: 60,
    bottom: 50,
    right: 15,
    top: 15
  },
  zoom: {
    level: 1,
    centerX: 0.5,
    centerY: 0.5
  },
  drag: {
    active: false,
    kind: null,
    mode: null,
    targetId: null,
    targetType: null,
    startPosition: null
  },
  selection: {
    selectedType: null,
    selectedId: null,
    selectedIndex: null
  },
  // --- contributed by the modes, in registration order --------------------
  // Pan contributes no slice, which is why there are three and not four.
  analysis: {
    markers: []
  },
  harmonics: {
    baseFrequency: null,
    harmonicData: [],
    harmonicSets: []
  },
  doppler: {
    fPlus: null,
    fMinus: null,
    fZero: null,
    speed: null,
    color: null,
    tempFirst: null,
    previewEnd: null
  }
}

/**
 * Strip the two keys whose values are not fixed at authoring time.
 * @param {Record<string, any>} state - A composed initial state
 * @returns {Record<string, any>} The same state without `version`/`timestamp`
 */
function withoutVolatileKeys(state) {
  const { version: _version, timestamp: _timestamp, ...rest } = state
  return rest
}

describe('composed initial state', () => {
  test('matches the shape frozen before the registration seam landed', () => {
    expect(withoutVolatileKeys(composeInitialState())).toEqual(FROZEN_INITIAL_STATE)
  })

  test('lays its keys out in the frozen order, mode slices last', () => {
    // Order is observable only through key collisions, which the seam's
    // composition rule forbids outright — but pinning it here is what makes a
    // silently-reordered merge a test failure rather than a surprise later.
    expect(Object.keys(withoutVolatileKeys(composeInitialState())))
      .toEqual(Object.keys(FROZEN_INITIAL_STATE))
  })

  test('carries a version and a parseable construction timestamp', () => {
    const state = composeInitialState()
    expect(typeof state.version).toBe('string')
    expect(state.version.length).toBeGreaterThan(0)
    expect(Number.isNaN(Date.parse(state.timestamp))).toBe(false)
  })

  test('is a fresh deep copy per call, so instances cannot share nested state', () => {
    const first = composeInitialState()
    const second = composeInitialState()

    expect(first).not.toBe(second)
    expect(first.analysis).not.toBe(second.analysis)

    first.analysis.markers.push({ id: 'm1', color: '#fff', time: 1, freq: 2 })
    first.zoom.level = 4

    expect(second.analysis.markers).toEqual([])
    expect(second.zoom.level).toBe(1)
  })
})
