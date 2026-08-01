import { test, expect } from './helpers/fixtures.js'

/**
 * @fileoverview Regression tests for the harmonic-hover bug.
 *
 * The drag engine's hover path (`updateCursorForHover`) once called the mode's
 * `resolveTarget` — the mousedown resolver. In harmonics mode that resolver
 * *mints a new harmonic set* when the cursor is over empty gram, so simply
 * moving the mouse flooded the gram with sets. And because every new set is
 * auto-selected, a colour picked afterwards restyled the latest phantom set
 * instead of setting the next-feature colour — so deliberately created sets
 * ignored the picked colour.
 *
 * These tests pin the fixed behaviour: hover finds, only mousedown creates,
 * and the picked colour reaches the next deliberately created set.
 */

test.describe('Harmonic hover regression', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Harmonics')
    await gramFramePage.waitForImageDimensions()
  })

  test('hovering over the gram creates no harmonic sets', async ({ gramFramePage }) => {
    // Sweep the cursor across the image without pressing any button.
    for (const [fx, fy] of [[0.2, 0.3], [0.4, 0.5], [0.6, 0.4], [0.8, 0.6], [0.5, 0.2]]) {
      const p = await gramFramePage.imageSVGPoint(fx, fy)
      await gramFramePage.moveMouse(p.x, p.y)
    }

    const state = await gramFramePage.getState()
    expect(state.harmonics.harmonicSets).toEqual([])
    // Nothing was created, so nothing should have been auto-selected either.
    expect(state.selection.selectedType).toBeNull()
  })

  test('hovering near an existing set neither creates nor selects another', async ({ gramFramePage }) => {
    // Debug config spans freq 0-100 Hz over time 0-60 s.
    const setId = await gramFramePage.addHarmonicSet(30, 10)

    for (const [fx, fy] of [[0.3, 0.3], [0.5, 0.5], [0.7, 0.7], [0.45, 0.5]]) {
      const p = await gramFramePage.imageSVGPoint(fx, fy)
      await gramFramePage.moveMouse(p.x, p.y)
    }

    const state = await gramFramePage.getState()
    expect(state.harmonics.harmonicSets).toHaveLength(1)
    expect(state.harmonics.harmonicSets[0].id).toBe(setId)
  })

  test('a mousedown-drag still creates exactly one harmonic set', async ({ gramFramePage }) => {
    const svgBox = await gramFramePage.svg.boundingBox()
    const start = await gramFramePage.imageSVGPoint(0.5, 0.5)
    const end = await gramFramePage.imageSVGPoint(0.6, 0.5)

    await gramFramePage.dragSVG(
      svgBox.x + start.x, svgBox.y + start.y,
      svgBox.x + end.x, svgBox.y + end.y
    )
    await gramFramePage.waitForHarmonicSetCount(1)

    // Hovering onward after the drag must not add more.
    for (const [fx, fy] of [[0.2, 0.2], [0.7, 0.6]]) {
      const p = await gramFramePage.imageSVGPoint(fx, fy)
      await gramFramePage.moveMouse(p.x, p.y)
    }
    const state = await gramFramePage.getState()
    expect(state.harmonics.harmonicSets).toHaveLength(1)
  })

  test('a colour picked after hovering applies to the next created set', async ({ gramFramePage }) => {
    // Hover first — with the bug, this minted and auto-selected a phantom set,
    // diverting the colour pick below into restyling it.
    const hoverPoint = await gramFramePage.imageSVGPoint(0.4, 0.4)
    await gramFramePage.moveMouse(hoverPoint.x, hoverPoint.y)

    const before = await gramFramePage.getState()
    const previousColor = before.selectedColor

    // Pick a colour near the right end of the slider (far from the default).
    const canvas = gramFramePage.page.locator('.gram-frame-color-canvas')
    const canvasBox = await canvas.boundingBox()
    await canvas.click({ position: { x: canvasBox.width - 2, y: canvasBox.height / 2 } })

    // With nothing selected, the pick must land on the next-feature colour.
    await gramFramePage.waitForState(
      (s) => s.selectedColor !== previousColor,
      { message: 'colour pick to update state.selectedColor' }
    )
    const picked = (await gramFramePage.getState()).selectedColor

    // Now create a set by dragging; it must carry the picked colour.
    const svgBox = await gramFramePage.svg.boundingBox()
    const start = await gramFramePage.imageSVGPoint(0.5, 0.5)
    const end = await gramFramePage.imageSVGPoint(0.6, 0.5)
    await gramFramePage.dragSVG(
      svgBox.x + start.x, svgBox.y + start.y,
      svgBox.x + end.x, svgBox.y + end.y
    )
    await gramFramePage.waitForHarmonicSetCount(1)

    const state = await gramFramePage.getState()
    expect(state.harmonics.harmonicSets[0].color).toBe(picked)
  })

  test('hovering in doppler mode places no markers', async ({ gramFramePage }) => {
    // Doppler's resolver seeds f+ when no markers exist — the same minting
    // hazard harmonics had, pinned here for the same hover path.
    await gramFramePage.clickMode('Doppler')

    for (const [fx, fy] of [[0.3, 0.3], [0.5, 0.5], [0.7, 0.4]]) {
      const p = await gramFramePage.imageSVGPoint(fx, fy)
      await gramFramePage.moveMouse(p.x, p.y)
    }

    const state = await gramFramePage.getState()
    expect(state.doppler.fPlus).toBeNull()
    expect(state.doppler.fMinus).toBeNull()
    expect(state.doppler.fZero).toBeNull()
  })
})
