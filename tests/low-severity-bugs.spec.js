import { test, expect } from './helpers/fixtures.js'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview Three Low-severity defects from the September review, each of
 * which an analyst can hit (R9-19 / R9-21 / R9-22; issues #270, #272, #273).
 *
 * They share a file because they share a cause: a rule stated in one place and
 * not applied in the other.
 *
 *   - zoom-out recentres on the wheel path and not on the button path (#270)
 *   - init is bound to an event that has already fired on a late-loaded
 *     bundle, so nothing is ever replaced (#272)
 *   - the hit test follows crosshair arms that a symbol marker never draws
 *     (#273)
 */

/** Half-length of a marker's crosshair arm, in SVG pixels — `AnalysisMode.CROSSHAIR_SIZE`. */
const CROSSHAIR_SIZE = 15

/**
 * Where a marker is actually drawn, in SVG-relative pixels.
 *
 * Measured off the rendered element rather than recomputed from the config, so
 * the test aims at the glyph the analyst sees. That is the whole point here:
 * the defect was the grab region disagreeing with the drawing.
 * @param {GramFramePage} gfp - Page object
 * @param {string} markerId - The marker's id
 * @returns {Promise<{x: number, y: number}>} SVG-relative coordinates
 */
async function markerSVGPoint(gfp, markerId) {
  return await gfp.page.evaluate((id) => {
    const svg = document.querySelector('.gram-frame-svg')
    // Scoped to the SVG: the markers *table* rows carry `data-marker-id` too
    // (`rowAttribute` in AnalysisMode), and a document-wide query finds
    // whichever comes first, silently measuring the wrong element.
    const group = svg && svg.querySelector(`[data-marker-id="${id}"]`)
    if (!svg || !group) {
      throw new Error(`markerSVGPoint: no rendered marker ${id}`)
    }
    const svgBox = svg.getBoundingClientRect()
    const box = group.getBoundingClientRect()
    return {
      x: box.x + box.width / 2 - svgBox.x,
      y: box.y + box.height / 2 - svgBox.y
    }
  }, markerId)
}

test.describe('Zoom-out to 1x recentres, whichever control did it (R9-19, #270)', () => {
  test('the button path forgets the corner the wheel zoomed into', async ({ gramFramePage }) => {
    // Wheel-zoom into the top-left corner, so the stored centre is far from
    // the middle. Then `-` back to 1x with the button.
    await gramFramePage.wheelAtSVG(120, 120, -200, true)
    await gramFramePage.waitForState((s) => s.zoom.level > 1, { message: 'a zoom-in to take effect' })

    const zoomedIn = await gramFramePage.getState()
    expect(zoomedIn.zoom.centerX, 'the wheel zoom should move the centre off middle').not.toBeCloseTo(0.5, 2)

    await gramFramePage.page.locator('.gram-frame-command-btn[title="Zoom Out"]').click()
    await gramFramePage.waitForState((s) => s.zoom.level === 1, { message: 'zoom to return to 1x' })

    // Was: centerX/centerY kept the corner, so the next `+` jumped back to it.
    const atOne = await gramFramePage.getState()
    expect(atOne.zoom.centerX).toBeCloseTo(0.5, 6)
    expect(atOne.zoom.centerY).toBeCloseTo(0.5, 6)
  })

  test('the next zoom-in is centred, not back at the old corner', async ({ gramFramePage }) => {
    await gramFramePage.wheelAtSVG(120, 120, -200, true)
    await gramFramePage.waitForState((s) => s.zoom.level > 1, { message: 'a zoom-in to take effect' })

    await gramFramePage.page.locator('.gram-frame-command-btn[title="Zoom Out"]').click()
    await gramFramePage.waitForState((s) => s.zoom.level === 1, { message: 'zoom to return to 1x' })

    await gramFramePage.page.locator('.gram-frame-command-btn[title="Zoom In"]').click()
    await gramFramePage.waitForState((s) => s.zoom.level > 1, { message: 'the button zoom-in to take effect' })

    // The assertion an analyst would make: `+` after `-` shows the middle.
    const state = await gramFramePage.getState()
    expect(state.zoom.centerX).toBeCloseTo(0.5, 6)
    expect(state.zoom.centerY).toBeCloseTo(0.5, 6)
  })
})

test.describe('A bundle loaded after DOMContentLoaded still initialises (R9-21, #272)', () => {
  test('a config table on a page with no script tag is replaced once the script is added', async ({ page }) => {
    // The fixture carries a `.gram-config` table and deliberately no component
    // script, so nothing has run when this resolves.
    await page.goto('/tests/fixtures/late-load-page.html')
    await expect(page.locator('table.gram-config')).toBeVisible()
    await expect(page.locator('.gram-frame-container')).toHaveCount(0)

    // `addScriptTag` runs after load, so `document.readyState` is well past
    // 'loading' and `DOMContentLoaded` will never fire again. Was: the
    // listener was registered for an event already gone and no table was
    // replaced.
    await page.addScriptTag({ url: '/src/main.js', type: 'module' })

    await expect(page.locator('.gram-frame-container')).toHaveCount(1)
    await expect(page.locator('table.gram-config')).toHaveCount(0)
  })

  test('the late-loaded component is live, not just present', async ({ page }) => {
    await page.goto('/tests/fixtures/late-load-page.html')
    await page.addScriptTag({ url: '/src/main.js', type: 'module' })
    await page.locator('.gram-frame-container').waitFor()

    // A replaced table proves `init()` ran; a parsed config proves it ran
    // properly. The fixture declares 0-60 s over 0-100 Hz.
    const gfp = new GramFramePage(page)
    await gfp.waitForState(
      (s) => s.config.timeMax === 60 && s.config.freqMax === 100,
      { message: 'the late-loaded instance to parse its config' }
    )
  })
})

test.describe('Marker hit-testing follows what is drawn (R9-22, #273)', () => {
  /**
   * Try to drag a marker from a point offset from its centre, and report
   * whether it moved.
   * @param {GramFramePage} gfp - Page object
   * @param {string} markerId - The marker to aim at
   * @param {number} dx - Horizontal offset from the marker, in SVG pixels
   * @param {number} dy - Vertical offset from the marker, in SVG pixels
   * @returns {Promise<boolean>} True if the grab moved the marker
   */
  async function grabMovesMarker(gfp, markerId, dx, dy) {
    const before = await gfp.getState()
    const start = /** @type {any} */ (before.analysis.markers.find((/** @type {any} */ m) => m.id === markerId))

    const at = await markerSVGPoint(gfp, markerId)
    await gfp.startDragSVG(at.x + dx, at.y + dy)
    await gfp.endDragSVG(at.x + dx + 40, at.y + dy)

    const after = await gfp.getState()
    const end = /** @type {any} */ (after.analysis.markers.find((/** @type {any} */ m) => m.id === markerId))
    return Math.abs(end.freq - start.freq) > 1e-6 || Math.abs(end.time - start.time) > 1e-6
  }

  test('a symbol marker is not grabbable along an arm it never draws', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')
    await gramFramePage.selectSymbol('circle')
    const markerId = await gramFramePage.addMarker(30, 50)

    const state = await gramFramePage.getState()
    const marker = /** @type {any} */ (state.analysis.markers.find((/** @type {any} */ m) => m.id === markerId))
    expect(marker.symbol, 'the marker should carry the chosen symbol').toBe('circle')

    // 12 px out along the horizontal: inside the old 15 px arm, outside the
    // 8 px tolerance radius, and nothing is drawn there. Was: it moved.
    expect(await grabMovesMarker(gramFramePage, markerId, 12, 0)).toBe(false)
  })

  test('a symbol marker is still grabbable where its symbol actually is', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')
    await gramFramePage.selectSymbol('circle')
    const markerId = await gramFramePage.addMarker(30, 50)

    // Inside the tolerance radius, on the diagonal — which the arm test never
    // covered, so this is the radius doing the work. The fix must not have
    // narrowed it.
    expect(await grabMovesMarker(gramFramePage, markerId, 4, 4)).toBe(true)
  })

  test('a cross marker keeps its arms', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')
    const markerId = await gramFramePage.addMarker(30, 50)

    const state = await gramFramePage.getState()
    const marker = /** @type {any} */ (state.analysis.markers.find((/** @type {any} */ m) => m.id === markerId))
    expect(marker.symbol, 'the default marker is the symbol-less cross').toBe('cross')

    // The same 12 px grab, on a marker that does draw a 15 px arm there.
    expect(await grabMovesMarker(gramFramePage, markerId, 12, 0)).toBe(true)
  })

  test('no marker is grabbable beyond the arm it draws', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')
    const markerId = await gramFramePage.addMarker(30, 50)

    // Past the end of the drawn arm: neither style reaches here.
    expect(await grabMovesMarker(gramFramePage, markerId, CROSSHAIR_SIZE + 6, 0)).toBe(false)
  })
})
