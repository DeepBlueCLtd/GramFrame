import { test, expect } from './helpers/fixtures.js'

/**
 * @fileoverview Mechanical consistency fixes (spec 165, User Story 4).
 *
 * GF-12: "Clear gram" rebuilds the annotation-bearing state from the
 *        initial-state builders, so a field added to a mode later cannot
 *        survive a clear by being forgotten in a hand-written reset.
 * GF-24: every GramFrameAPI method reads the same instance registry.
 */

/**
 * Add an analysis marker at a position on the first instance.
 * @param {import('@playwright/test').Page} page
 * @param {number} x
 * @param {number} y
 */
async function addMarker(page, x, y) {
  await page.locator('.gram-frame-mode-btn:text("Cross Cursor")').first().click()
  await page.locator('.gram-frame-svg').first().click({ position: { x, y } })
}

test.describe('Clear gram rebuilds state from the initial-state builders (GF-12)', () => {
  test('cleared state deep-equals a fresh state, keeping config and image details', async ({ page }) => {
    await page.goto('/tests/fixtures/trainer-page.html')
    await page.locator('.gram-frame-container').waitFor()

    // Annotate in every mode, and leave a selection behind.
    await addMarker(page, 200, 150)
    await addMarker(page, 260, 180)

    await page.locator('.gram-frame-mode-btn:text("Harmonics")').first().click()
    const svg = page.locator('.gram-frame-svg').first()
    const box = await svg.boundingBox()
    if (!box) throw new Error('SVG not found')
    await page.mouse.move(box.x + 200, box.y + 120)
    await page.mouse.down()
    await page.mouse.move(box.x + 320, box.y + 180, { steps: 5 })
    await page.mouse.up()

    await page.locator('.gram-frame-mode-btn:text("Doppler")').first().click()
    await page.mouse.move(box.x + 180, box.y + 100)
    await page.mouse.down()
    await page.mouse.move(box.x + 300, box.y + 220, { steps: 5 })
    await page.mouse.up()

    const before = await page.evaluate(
      () => window.GramFrame.__test__getInstances()[0].state
    )
    expect(before.analysis.markers.length).toBeGreaterThan(0)
    expect(before.harmonics.harmonicSets.length).toBeGreaterThan(0)
    expect(before.doppler.fPlus).not.toBeNull()

    await page.locator('.gram-frame-clear-btn').click()

    const result = await page.evaluate(async () => {
      const { createInitialState } = await import('/src/core/state.js')
      // Composed the way an instance composes it: `state.js` no longer knows
      // the mode roster, so the slices come from the factory (spec 167, US2).
      const { ModeFactory } = await import('/src/modes/ModeFactory.js')
      const fresh = createInitialState(ModeFactory.getModeInitialStates())
      const state = window.GramFrame.__test__getInstances()[0].state
      // Slices the clear is responsible for, compared against a fresh state.
      const cleared = {}
      const expected = {}
      for (const key of ['analysis', 'harmonics', 'doppler', 'selection', 'drag', 'cursors']) {
        cleared[key] = state[key]
        expected[key] = fresh[key]
      }
      return {
        cleared,
        expected,
        config: state.config,
        imageDetails: state.imageDetails,
        mode: state.mode
      }
    })

    expect(result.cleared).toEqual(result.expected)

    // What describes this gram survives the clear.
    expect(result.config).toEqual(before.config)
    expect(result.imageDetails).toEqual(before.imageDetails)
    expect(result.mode).toBe('doppler')
  })
})

test.describe('The API has a single instance registry (GF-24)', () => {
  test('every method sees the same instances, and a detached one is dropped by all', async ({ page }) => {
    await page.goto('/debug-multiple.html')
    await page.locator('.gram-frame-container').first().waitFor()

    const before = await page.evaluate(() => {
      const api = window.GramFrame
      let listenerCalls = 0
      const listener = () => { listenerCalls++ }
      api.addStateListener(listener)
      api.__test__forceUpdate()
      const instances = api.__test__getInstances()
      api.removeStateListener(listener)
      return {
        registryCount: instances.length,
        containerCount: document.querySelectorAll('.gram-frame-container').length,
        // One immediate call per instance from addStateListener, plus one each
        // from forceUpdate: the same set both times.
        listenerCalls
      }
    })

    expect(before.registryCount).toBe(before.containerCount)
    expect(before.listenerCalls).toBe(before.registryCount * 2)

    // Detach one instance's container: every method must agree it is gone.
    const after = await page.evaluate(() => {
      const api = window.GramFrame
      const doomed = api.__test__getInstances()[0]
      const doomedId = doomed.instanceId
      doomed.destroy()

      let listenerCalls = 0
      const listener = () => { listenerCalls++ }
      api.addStateListener(listener)
      api.__test__forceUpdate()
      const instances = api.__test__getInstances()
      api.removeStateListener(listener)

      return {
        registryCount: instances.length,
        containerCount: document.querySelectorAll('.gram-frame-container').length,
        lookupOfDestroyed: api.__test__getInstance(doomedId),
        listenerCalls
      }
    })

    expect(after.registryCount).toBe(before.registryCount - 1)
    expect(after.registryCount).toBe(after.containerCount)
    expect(after.lookupOfDestroyed).toBeNull()
    expect(after.listenerCalls).toBe(after.registryCount * 2)
  })
})

test.describe('Drag state has one owner and one projection (GF-17, spec 166)', () => {
  test('at most one drag is active across all modes, and it is always projected', async ({ gramFramePage }) => {
    const page = gramFramePage.page

    // Idle: the projection is present and empty, never absent
    let state = await gramFramePage.getState()
    expect(state.drag).toEqual({
      active: false,
      kind: null,
      mode: null,
      targetId: null,
      targetType: null,
      startPosition: null
    })

    // A drag in one mode: exactly one handler owns it, and the projection
    // names that mode. Every other mode's handler must be idle.
    await gramFramePage.clickMode('Harmonics')
    const svgBox = await gramFramePage.svg.boundingBox()
    await page.mouse.move(svgBox.x + 220, svgBox.y + 150)
    await page.mouse.down()

    // Sampled immediately after mousedown: a later move can pan or re-render
    // enough to pull the pointer off the SVG, which legitimately cancels the
    // drag — so mid-gesture is not a stable point to observe ownership at.
    const during = await page.evaluate(() => {
      const instance = window.GramFrame.__test__getInstances()[0]
      const dragging = Object.entries(instance.modes)
        .filter(([, mode]) => mode.dragHandler && mode.dragHandler.isDragging())
        .map(([name]) => name)
      const wheelPanActive = !!(instance.interaction._wheelPanHandler && instance.interaction._wheelPanHandler.isDragging())
      return { dragging, wheelPanActive, drag: instance.state.drag }
    })

    expect(during.dragging).toEqual(['harmonics'])
    expect(during.wheelPanActive).toBe(false)
    expect(during.drag.active).toBe(true)
    expect(during.drag.mode).toBe('harmonics')
    expect(during.drag.targetType).toBe('harmonicSet')
    expect(during.drag.startPosition).not.toBeNull()

    // Landing on empty space creates a set and drags it out
    expect(['move', 'create']).toContain(during.drag.kind)

    await page.mouse.move(svgBox.x + 300, svgBox.y + 170, { steps: 3 })
    await page.mouse.up()

    // Back to idle, with every field cleared
    await gramFramePage.waitForState((s) => s.drag.active === false, {
      message: 'the drag projection to return to idle'
    })
    state = await gramFramePage.getState()
    expect(state.drag.kind).toBeNull()
    expect(state.drag.mode).toBeNull()
    expect(state.drag.targetId).toBeNull()
    expect(state.drag.startPosition).toBeNull()
  })

  test('a middle-button pan is a pan-kind drag with no feature target', async ({ gramFramePage }) => {
    const page = gramFramePage.page

    // Panning only engages when zoomed in
    await gramFramePage.setZoom(2.0, 0.5, 0.5)
    const svgBox = await gramFramePage.svg.boundingBox()

    await page.mouse.move(svgBox.x + 250, svgBox.y + 150)
    await page.mouse.down({ button: 'middle' })

    const during = await page.evaluate(() => {
      const instance = window.GramFrame.__test__getInstances()[0]
      const modesDragging = Object.entries(instance.modes)
        .filter(([, mode]) => mode.dragHandler && mode.dragHandler.isDragging())
        .map(([name]) => name)
      return { modesDragging, drag: instance.state.drag }
    })

    // The pan is resolved centrally, so no mode's handler is involved
    expect(during.modesDragging).toEqual([])
    expect(during.drag.active).toBe(true)
    expect(during.drag.kind).toBe('pan')
    expect(during.drag.targetId).toBeNull()
    expect(during.drag.targetType).toBeNull()

    await page.mouse.move(svgBox.x + 300, svgBox.y + 170, { steps: 3 })
    await page.mouse.up({ button: 'middle' })
    await gramFramePage.waitForState((s) => s.drag.active === false, {
      message: 'the pan projection to return to idle'
    })
  })
})
