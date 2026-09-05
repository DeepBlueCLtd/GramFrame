import { test, expect } from './helpers/fixtures.js'

/**
 * @fileoverview Arrow-key movement coverage (spec 166, FR-008 / AS-1.2).
 *
 * Replaces the two disabled keyboard specs, whose FocusManager coverage is
 * already live in focus-simple.spec.js and tab-navigation.spec.js. What was
 * missing — and what this file asserts — is that an arrow keypress moves the
 * selected feature by the *right amount in data coordinates*, not merely that
 * something remained visible.
 *
 * The invariant under test: one keypress moves a feature one rendered pixel,
 * at every zoom level. The keyboard path works in pixels and converts to data,
 * so at zoom Z the data delta is 1/Z of the zoom-1 delta — which is exactly
 * what keeps the on-screen movement constant. This is the coverage protecting
 * the coordinate consolidation in US2, where the keyboard path's private
 * transforms are deleted.
 */

/** Pixel step for an unmodified arrow key, per MOVEMENT_INCREMENTS.normal */
const NORMAL_STEP = 1
/** Pixel step for Shift + arrow, per MOVEMENT_INCREMENTS.fast */
const FAST_STEP = 5

/**
 * The data-coordinate change one rendered pixel of movement represents, read
 * from live state so the expectations track the page's real configuration.
 * @param {any} state - Broadcast GramFrame state
 * @returns {{perPixelFreq: number, perPixelTime: number}} Data units per pixel
 */
function dataPerPixel(state) {
  const { config, imageDetails, frequencyRate } = state
  const renderWidth = imageDetails.renderWidth || imageDetails.naturalWidth
  const renderHeight = imageDetails.renderHeight || imageDetails.naturalHeight
  return {
    perPixelFreq: ((config.freqMax - config.freqMin) / frequencyRate) / renderWidth,
    perPixelTime: (config.timeMax - config.timeMin) / renderHeight
  }
}

/**
 * Create a marker mid-image and select it, so arrow keys act on it. Selecting
 * also focuses the instance, which is what routes the keypress here.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gramFramePage
 * @returns {Promise<string>} The selected marker's id
 */
async function createSelectedMarker(gramFramePage) {
  const state = await gramFramePage.getState()
  const midTime = (state.config.timeMin + state.config.timeMax) / 2
  const midFreq = (state.config.freqMin + state.config.freqMax) / 2

  const id = await gramFramePage.addMarker(midTime, midFreq)
  // A new marker is auto-selected; only click its row if it is not
  const selection = (await gramFramePage.getState()).selection
  if (selection.selectedType !== 'marker' || selection.selectedId !== id) {
    await gramFramePage.clickTableRow('markers', id)
  }
  await gramFramePage.waitForState(
    (s) => s.selection.selectedType === 'marker' && s.selection.selectedId === id,
    { message: `marker ${id} to be selected` }
  )
  return id
}

/**
 * Create a harmonic set mid-image and select it.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gramFramePage
 * @returns {Promise<string>} The selected harmonic set's id
 */
async function createSelectedHarmonicSet(gramFramePage) {
  const state = await gramFramePage.getState()
  const midTime = (state.config.timeMin + state.config.timeMax) / 2

  const id = await gramFramePage.addHarmonicSet(midTime, 20)
  // A newly created set is auto-selected; assert that rather than assume it
  await gramFramePage.waitForState(
    (s) => s.selection.selectedType === 'harmonicSet' && s.selection.selectedId === id,
    { message: `harmonic set ${id} to be selected` }
  )
  return id
}

/**
 * Read a marker's data coordinates from broadcast state.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gramFramePage
 * @param {string} id
 * @returns {Promise<{freq: number, time: number}>}
 */
async function markerPosition(gramFramePage, id) {
  const state = await gramFramePage.getState()
  const marker = state.analysis.markers.find((m) => m.id === id)
  return { freq: marker.freq, time: marker.time }
}

/**
 * Read a harmonic set's spacing and anchor time from broadcast state.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gramFramePage
 * @param {string} id
 * @returns {Promise<{spacing: number, anchorTime: number}>}
 */
async function harmonicSetGeometry(gramFramePage, id) {
  const state = await gramFramePage.getState()
  const set = state.harmonics.harmonicSets.find((s) => s.id === id)
  return { spacing: set.spacing, anchorTime: set.anchorTime }
}

/**
 * Press a key and wait for the movement it causes to land in state.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gramFramePage
 * @param {string} key - Key to press, e.g. 'ArrowRight' or 'Shift+ArrowRight'
 * @param {(state: any) => boolean} settled - True once the move is visible
 * @returns {Promise<void>}
 */
async function pressAndSettle(gramFramePage, key, settled) {
  await gramFramePage.page.keyboard.press(key)
  await gramFramePage.waitForState(settled, { message: `the movement from ${key}` })
}

test.describe('Arrow-key movement moves a selected marker by one rendered pixel', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')
  })

  test('each arrow key changes freq/time by exactly one pixel-worth of data', async ({ gramFramePage }) => {
    const id = await createSelectedMarker(gramFramePage)
    const { perPixelFreq, perPixelTime } = dataPerPixel(await gramFramePage.getState())

    // Right: frequency up by one pixel's worth, time untouched
    let before = await markerPosition(gramFramePage, id)
    await pressAndSettle(gramFramePage, 'ArrowRight',
      (s) => s.analysis.markers.find((m) => m.id === id).freq !== before.freq)
    let after = await markerPosition(gramFramePage, id)
    expect(after.freq - before.freq).toBeCloseTo(NORMAL_STEP * perPixelFreq, 6)
    expect(after.time).toBeCloseTo(before.time, 9)

    // Left: back down by the same amount
    before = after
    await pressAndSettle(gramFramePage, 'ArrowLeft',
      (s) => s.analysis.markers.find((m) => m.id === id).freq !== before.freq)
    after = await markerPosition(gramFramePage, id)
    expect(after.freq - before.freq).toBeCloseTo(-NORMAL_STEP * perPixelFreq, 6)

    // Up: time increases (SVG y decreases as time increases)
    before = after
    await pressAndSettle(gramFramePage, 'ArrowUp',
      (s) => s.analysis.markers.find((m) => m.id === id).time !== before.time)
    after = await markerPosition(gramFramePage, id)
    expect(after.time - before.time).toBeCloseTo(NORMAL_STEP * perPixelTime, 6)
    expect(after.freq).toBeCloseTo(before.freq, 9)

    // Down: time decreases by the same amount
    before = after
    await pressAndSettle(gramFramePage, 'ArrowDown',
      (s) => s.analysis.markers.find((m) => m.id === id).time !== before.time)
    after = await markerPosition(gramFramePage, id)
    expect(after.time - before.time).toBeCloseTo(-NORMAL_STEP * perPixelTime, 6)
  })

  test('Shift multiplies the step to five pixels', async ({ gramFramePage }) => {
    const id = await createSelectedMarker(gramFramePage)
    const { perPixelFreq } = dataPerPixel(await gramFramePage.getState())

    const before = await markerPosition(gramFramePage, id)
    await pressAndSettle(gramFramePage, 'Shift+ArrowRight',
      (s) => s.analysis.markers.find((m) => m.id === id).freq !== before.freq)
    const after = await markerPosition(gramFramePage, id)

    expect(after.freq - before.freq).toBeCloseTo(FAST_STEP * perPixelFreq, 6)
  })

  test('the rendered movement per keypress is the same at every zoom level', async ({ gramFramePage }) => {
    const id = await createSelectedMarker(gramFramePage)
    const { perPixelFreq, perPixelTime } = dataPerPixel(await gramFramePage.getState())

    // At zoom Z the data delta is 1/Z of the zoom-1 delta, which is what keeps
    // the on-screen movement at one pixel per keypress (FR-008).
    for (const zoom of [1.0, 2.0, 4.0]) {
      await gramFramePage.setZoom(zoom, 0.5, 0.5)

      const beforeFreq = await markerPosition(gramFramePage, id)
      await pressAndSettle(gramFramePage, 'ArrowRight',
        (s) => s.analysis.markers.find((m) => m.id === id).freq !== beforeFreq.freq)
      const afterFreq = await markerPosition(gramFramePage, id)
      const freqDelta = afterFreq.freq - beforeFreq.freq
      expect(freqDelta).toBeCloseTo(perPixelFreq / zoom, 6)
      // Same rendered distance: the data delta scaled back up by the zoom
      expect(freqDelta * zoom).toBeCloseTo(perPixelFreq, 6)

      const beforeTime = afterFreq
      await pressAndSettle(gramFramePage, 'ArrowUp',
        (s) => s.analysis.markers.find((m) => m.id === id).time !== beforeTime.time)
      const afterTime = await markerPosition(gramFramePage, id)
      const timeDelta = afterTime.time - beforeTime.time
      expect(timeDelta).toBeCloseTo(perPixelTime / zoom, 6)
      expect(timeDelta * zoom).toBeCloseTo(perPixelTime, 6)
    }
  })
})

test.describe('Arrow-key movement adjusts a selected harmonic set', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Harmonics')
  })

  test('horizontal keys change spacing and vertical keys change anchor time', async ({ gramFramePage }) => {
    const id = await createSelectedHarmonicSet(gramFramePage)
    const { perPixelFreq, perPixelTime } = dataPerPixel(await gramFramePage.getState())

    // Right widens the spacing by one pixel's worth of frequency
    let before = await harmonicSetGeometry(gramFramePage, id)
    await pressAndSettle(gramFramePage, 'ArrowRight',
      (s) => s.harmonics.harmonicSets.find((h) => h.id === id).spacing !== before.spacing)
    let after = await harmonicSetGeometry(gramFramePage, id)
    expect(after.spacing - before.spacing).toBeCloseTo(NORMAL_STEP * perPixelFreq, 6)
    expect(after.anchorTime).toBeCloseTo(before.anchorTime, 9)

    // Left narrows it by the same amount
    before = after
    await pressAndSettle(gramFramePage, 'ArrowLeft',
      (s) => s.harmonics.harmonicSets.find((h) => h.id === id).spacing !== before.spacing)
    after = await harmonicSetGeometry(gramFramePage, id)
    expect(after.spacing - before.spacing).toBeCloseTo(-NORMAL_STEP * perPixelFreq, 6)

    // Up moves the anchor later in time
    before = after
    await pressAndSettle(gramFramePage, 'ArrowUp',
      (s) => s.harmonics.harmonicSets.find((h) => h.id === id).anchorTime !== before.anchorTime)
    after = await harmonicSetGeometry(gramFramePage, id)
    expect(after.anchorTime - before.anchorTime).toBeCloseTo(NORMAL_STEP * perPixelTime, 6)
    expect(after.spacing).toBeCloseTo(before.spacing, 9)
  })

  test('the rendered spacing change per keypress is the same at every zoom level', async ({ gramFramePage }) => {
    const id = await createSelectedHarmonicSet(gramFramePage)
    const { perPixelFreq } = dataPerPixel(await gramFramePage.getState())

    for (const zoom of [1.0, 2.0, 4.0]) {
      await gramFramePage.setZoom(zoom, 0.5, 0.5)

      const before = await harmonicSetGeometry(gramFramePage, id)
      await pressAndSettle(gramFramePage, 'ArrowRight',
        (s) => s.harmonics.harmonicSets.find((h) => h.id === id).spacing !== before.spacing)
      const after = await harmonicSetGeometry(gramFramePage, id)

      const delta = after.spacing - before.spacing
      expect(delta).toBeCloseTo(perPixelFreq / zoom, 6)
      expect(delta * zoom).toBeCloseTo(perPixelFreq, 6)
    }
  })
})
