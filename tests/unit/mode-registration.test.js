import { describe, test, expect } from 'vitest'

import { createInitialState } from '../../src/core/state.js'
import { ModeFactory } from '../../src/modes/ModeFactory.js'

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
  return createInitialState(ModeFactory.getModeInitialStates())
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
  frequencyRate: 1,
  selectedColor: '#ff6b6b',
  selectedSymbol: 'cross',
  showHarmonicPin: true,
  largeSymbols: false,
  cursorPosition: null,
  cursors: [],
  annotationRevision: 0,
  // Added by the multi-tab merge (issue #269). The constant is otherwise the
  // shape frozen before the registration seam landed; a core key added since
  // is recorded here with why, rather than left to make the comparison fail.
  tombstones: {
    markers: {},
    harmonicSets: {},
    sidebandSets: {},
    doppler: null
  },
  imageDetails: {
    url: '',
    naturalWidth: 0,
    naturalHeight: 0,
    renderWidth: 0,
    renderHeight: 0
  },
  // Moved out of the player slice by #324, when image-backed grams gained the
  // contrast controls: it is view state about the picture, not about audio.
  display: { floor: 0, ceiling: 1 },
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
  // Added with the spectrograph player (spec 168): a core slice, so it sits
  // with the core keys rather than after the mode slices.
  player: {
    active: false,
    ready: false,
    progress: 0,
    source: '',
    duration: 0,
    sampleRate: 0,
    channels: 0,
    playhead: 0,
    playing: false,
    ended: false,
    loop: false,
    playbackRate: 1,
    volume: 1,
    muted: false,
    viewTop: 0,
    windowSeconds: 10,
    // Two fields added by spec 171: the pitch behaviour, made explicit
    // (FR-021), and what the render caps changed when they did (FR-024).
    // Recorded here with why, as the tombstones and sidebands entries are.
    // The third, `display`, moved to the core keys in #324.
    preservesPitch: true,
    degraded: null,
    analysis: {
      fftSize: 1024,
      hopSize: 512,
      freqStart: 0,
      freqEnd: null,
      columns: 0,
      frames: 0
    }
  },
  // --- contributed by the modes, in registration order --------------------
  // Pan contributes no slice, which is why there are four and not five.
  analysis: {
    markers: []
  },
  harmonics: {
    baseFrequency: null,
    harmonicData: [],
    harmonicSets: []
  },
  // Added when Sidebands mode landed (issue #241) — the one edit this frozen
  // constant takes: a new mode's slice appears here, in registration order,
  // and nothing else about the shape moves.
  sidebands: {
    sidebandSets: []
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

describe('core/state.js stands alone (AS-2.2)', () => {
  test('createInitialState() with no argument returns a valid core state', () => {
    const core = createInitialState()

    // Every core key is present and carries its documented default...
    expect(withoutVolatileKeys(core)).toEqual(
      Object.fromEntries(
        Object.entries(FROZEN_INITIAL_STATE)
          .filter(([key]) => !['analysis', 'harmonics', 'sidebands', 'doppler'].includes(key))
      )
    )
    // ...and no mode slice appears, because no mode was asked for one.
    expect(core.analysis).toBeUndefined()
    expect(core.harmonics).toBeUndefined()
    expect(core.sidebands).toBeUndefined()
    expect(core.doppler).toBeUndefined()
  })

  test('imports no mode module', async () => {
    // The cycle this phase breaks ran state.js → a mode → back to state.js.
    // Reading the source is the assertion madge makes at the graph level; here
    // it is a unit test so the regression is caught in the fast lane too.
    const source = await readSource('src/core/state.js')
    expect(source).not.toMatch(/from\s+'\.\.\/modes\//)
  })

  test('a mode class loads without core/state.js being imported', async () => {
    const source = await readSource('src/modes/analysis/AnalysisMode.js')
    // AnalysisMode still dispatches, so it imports state.js one-directionally.
    // What must not exist is the return edge — asserted above — which is what
    // makes this a chain rather than a cycle.
    expect(source).toMatch(/from\s+'\.\.\/\.\.\/core\/state\.js'/)
  })
})

describe('the collision rule (contracts/mode-registration.md)', () => {
  test('no mode slice key collides with a core state key', () => {
    const coreKeys = Object.keys(createInitialState())
    const collisions = Object.keys(ModeFactory.getModeInitialStates())
      .filter(key => coreKeys.includes(key))
    expect(collisions).toEqual([])
  })

  test('a colliding slice cannot overwrite the core value', () => {
    // `version` and `timestamp` were exactly the keys the old spread clobbered.
    const composed = createInitialState({ version: 'hijacked', mode: 'analysis' })
    expect(composed.version).not.toBe('hijacked')
    expect(composed.mode).toBe('pan')
  })

  test('a mode contributing a new key has it composed in', () => {
    // A slice from a mode that does not exist yet: `Partial<GramFrameState>`
    // cannot name it, which is exactly what makes this the additive case.
    const composed = createInitialState(/** @type {any} */ ({ fifthMode: { placed: [] } }))
    expect(/** @type {any} */ (composed).fifthMode).toEqual({ placed: [] })
  })
})

describe('the no-argument form is for loading, not for building state', () => {
  test('every production call site composes the mode slices', async () => {
    // `createInitialState()` returning a mode-less state is deliberate — it is
    // what lets this file exercise `state.js` without importing a mode. It also
    // means a caller who forgets the slices gets a state with no `analysis`,
    // `harmonics` or `doppler` key and no complaint from anyone. That is not
    // hypothetical: `_clearGram` was written before the seam existed and reset
    // the annotation slices to `undefined` the moment the signature changed.
    const { readdir } = await import('node:fs/promises')
    const { fileURLToPath } = await import('node:url')
    const { dirname, join, relative } = await import('node:path')
    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

    /**
     * @param {string} dir - Directory to walk
     * @returns {Promise<string[]>} Every `.js` file beneath it
     */
    async function walk(dir) {
      const entries = await readdir(dir, { withFileTypes: true })
      const files = await Promise.all(entries.map(entry => {
        const full = join(dir, entry.name)
        return entry.isDirectory() ? walk(full) : (full.endsWith('.js') ? [full] : [])
      }))
      return files.flat()
    }

    // `state.js` declares it; `ModeFactory.js` calls it bare on purpose, to read
    // the core key list for the collision check.
    const exempt = ['src/core/state.js', 'src/modes/ModeFactory.js']
    /** @type {string[]} */
    const bare = []
    for (const file of await walk(join(repoRoot, 'src'))) {
      const relativePath = relative(repoRoot, file).split('\\').join('/')
      if (exempt.includes(relativePath)) continue
      const source = await readSource(relativePath)
      source.split('\n').forEach((line, index) => {
        if (/createInitialState\(\s*\)/.test(line)) {
          bare.push(`${relativePath}:${index + 1}`)
        }
      })
    }
    expect(bare).toEqual([])
  })
})

/**
 * Read a repo-relative source file as text.
 * @param {string} relativePath - Path from the repository root
 * @returns {Promise<string>} File contents
 */
async function readSource(relativePath) {
  const { readFile } = await import('node:fs/promises')
  const { fileURLToPath } = await import('node:url')
  const { dirname, join } = await import('node:path')
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  return readFile(join(repoRoot, relativePath), 'utf8')
}
