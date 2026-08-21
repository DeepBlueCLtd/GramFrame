import { test, expect } from './helpers/fixtures.js'

/**
 * @fileoverview E2E tests for the grab region ("hotspot") of a Doppler marker.
 *
 * A marker that is drawn is a marker that can be picked up: anywhere on an
 * f+/f- dot must start a drag. The hit test used to run against a tolerance
 * clamped in seconds (0.5s), which on the debug gram — 237px tall over 60s —
 * is under 2px. The grab band down the time axis was therefore *narrower than
 * the 8px dot drawn on it*: the analyst could be dead centre on a marker,
 * 3px above its middle, and the mousedown would resolve to nothing at all.
 *
 * Debug config spans freq 0-100 Hz over time 0-60 s.
 */

/**
 * Place an f+/f- pair by dragging, and return the f- dot's on-screen box.
 * @param {import('./helpers/gram-frame-page.js').default} gfp - Page helper
 * @returns {Promise<{x: number, y: number, width: number, height: number}>} The dot's client rect
 */
async function drawCurveAndLocateMarker(gfp) {
  await gfp.clickMode('Doppler')
  await gfp.waitForImageDimensions()
  // Keep the whole component on screen: a drag towards a point outside the
  // window leaves the SVG, which cancels the placement for unrelated reasons.
  await gfp.svg.scrollIntoViewIfNeeded()

  await gfp.startDragSVG(200, 100)
  await gfp.endDragSVG(300, 200)
  await gfp.waitForState((state) => !!(state.doppler.fPlus && state.doppler.fMinus))

  const box = await gfp.page.locator('.gram-frame-doppler-fMinus').boundingBox()
  expect(box).not.toBeNull()
  return box
}

/**
 * Press at a client point and report whether it started a marker drag.
 * @param {import('./helpers/gram-frame-page.js').default} gfp - Page helper
 * @param {number} x - Client X
 * @param {number} y - Client Y
 * @returns {Promise<{active: boolean, kind: string|null}>} The drag projection at mousedown
 */
async function pressAt(gfp, x, y) {
  await gfp.page.mouse.move(x, y)
  await gfp.page.mouse.down()
  const state = await gfp.getState()
  await gfp.page.mouse.up()
  return { active: !!state.drag.active, kind: state.drag.kind }
}

test.describe('Doppler marker hotspot', () => {
  test('every pixel of the drawn dot grabs the marker', async ({ gramFramePage }) => {
    const box = await drawCurveAndLocateMarker(gramFramePage)

    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    // Half a pixel inside each edge, so the probe is unambiguously on the glyph.
    const dx = box.width / 2 - 0.5
    const dy = box.height / 2 - 0.5

    /** @type {Array<[string, number, number]>} */
    const probes = [
      ['centre', 0, 0],
      ['top', 0, -dy],
      ['bottom', 0, dy],
      ['left', -dx, 0],
      ['right', dx, 0]
    ]

    for (const [where, offsetX, offsetY] of probes) {
      const drag = await pressAt(gramFramePage, cx + offsetX, cy + offsetY)
      expect(drag, `pressing the ${where} of the marker should grab it`).toEqual({
        active: true,
        kind: 'move'
      })
    }
  })

  test('the grab region reaches the full 8px radius on both axes', async ({ gramFramePage }) => {
    const box = await drawCurveAndLocateMarker(gramFramePage)
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    // The documented radius is 8 rendered pixels. Probe just inside it on the
    // time axis, which is the axis the old seconds-based ceiling collapsed.
    expect(await pressAt(gramFramePage, cx, cy - 7)).toEqual({ active: true, kind: 'move' })
    expect(await pressAt(gramFramePage, cx, cy + 7)).toEqual({ active: true, kind: 'move' })
    expect(await pressAt(gramFramePage, cx - 7, cy)).toEqual({ active: true, kind: 'move' })
    expect(await pressAt(gramFramePage, cx + 7, cy)).toEqual({ active: true, kind: 'move' })
  })

  test('a press well clear of every marker grabs nothing', async ({ gramFramePage }) => {
    const box = await drawCurveAndLocateMarker(gramFramePage)
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    // Far enough out that no marker's region reaches, so the widened tolerance
    // has not simply made the whole gram grabbable.
    const drag = await pressAt(gramFramePage, cx + 60, cy + 40)
    expect(drag.active).toBe(false)
  })

  test('dragging a marker moves it, and moves only it', async ({ gramFramePage }) => {
    const box = await drawCurveAndLocateMarker(gramFramePage)

    const before = await gramFramePage.getState()
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    await gramFramePage.page.mouse.move(cx, cy)
    await gramFramePage.page.mouse.down()
    await gramFramePage.page.mouse.move(cx + 40, cy - 20, { steps: 5 })
    await gramFramePage.page.mouse.up()

    const after = await gramFramePage.getState()

    // f- followed the pointer: right is up in frequency, up is later in time.
    expect(after.doppler.fMinus.freq).toBeGreaterThan(before.doppler.fMinus.freq)
    expect(after.doppler.fMinus.time).toBeGreaterThan(before.doppler.fMinus.time)

    // f+ stayed put, and f₀ is not dragged along with its neighbours.
    expect(after.doppler.fPlus).toEqual(before.doppler.fPlus)
    expect(after.doppler.fZero).toEqual(before.doppler.fZero)

    // The drag ended cleanly rather than leaving the marker chasing the cursor.
    expect(after.drag.active).toBe(false)
  })
})
