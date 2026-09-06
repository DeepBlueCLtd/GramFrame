import { test, expect } from './helpers/fixtures.js'
import {

/// <reference path="../src/types.js" />
  expectValidMetadata,
  expectValidMode,
  expectValidConfig,
  expectValidImageDetails
} from './helpers/state-assertions.js'
import { GramFramePage } from './helpers/gram-frame-page.js'

/**
 * @fileoverview Harmonics mode: creating a set by dragging, and what the drag
 * controls (issue #317).
 *
 * Every case here used to drive `page.mouse.move(200, 150)` — **viewport**
 * coordinates — while the numbers were written as if they were SVG-relative.
 * On the debug page the SVG's top edge is at viewport y ≈ 493, so every drag
 * landed a few hundred pixels above the component, in the page header, and
 * created nothing. `cursorPosition` was still `null` afterwards. Each
 * assertion then sat behind `if (harmonicSets.length > 0)`, so the cases
 * passed having asserted nothing about harmonics — the failure mode of a test
 * that reports success while measuring an empty room.
 *
 * Two rules now hold throughout, and are the point of the file:
 *
 *  - Coordinates come from {@link GramFramePage.imageSVGPoint}, which is
 *    expressed as a fraction of the *drawn image* and so cannot drift out of
 *    the component whatever the page layout does.
 *  - No assertion is guarded. If a drag stops creating a set, these fail.
 */

/**
 * Drag across the drawn image, in fractions of it.
 * @param {GramFramePage} gfp - Page object
 * @param {{x: number, y: number}} from - Start, as fractions of the image
 * @param {{x: number, y: number}} to - End, as fractions of the image
 * @returns {Promise<void>}
 */
async function dragOnImage(gfp, from, to) {
  const start = await gfp.imageSVGPoint(from.x, from.y)
  const end = await gfp.imageSVGPoint(to.x, to.y)
  await gfp.startDragSVG(start.x, start.y)
  await gfp.endDragSVG(end.x, end.y)
}

/**
 * The one harmonic set on the gram, failing loudly when there isn't exactly one.
 * @param {GramFramePage} gfp - Page object
 * @returns {Promise<any>} The set
 */
async function onlySet(gfp) {
  const state = await gfp.getState()
  const sets = state.harmonics.harmonicSets
  expect(sets, 'the drag should have created exactly one harmonic set').toHaveLength(1)
  return sets[0]
}

test.describe('Harmonics Mode - creating and adjusting sets by drag', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Harmonics')
    const state = await gramFramePage.getState()
    expectValidMode(state, 'harmonics')
    expect(state.harmonics.harmonicSets, 'each test starts with a clean gram').toEqual([])
  })

  test.describe('Creating a set', () => {
    test('a drag across the gram creates one harmonic set', async ({ gramFramePage }) => {
      await dragOnImage(gramFramePage, { x: 0.2, y: 0.3 }, { x: 0.5, y: 0.6 })

      const set = await onlySet(gramFramePage)
      expect(set).toHaveProperty('id')
      expect(set).toHaveProperty('color')
      expect(set.spacing, 'a created set has a positive spacing').toBeGreaterThan(0)
      expect(set.anchorTime).toBeGreaterThanOrEqual(0)
    })

    test('a created set takes the colour the picker is showing', async ({ gramFramePage }) => {
      const before = await gramFramePage.getState()

      await dragOnImage(gramFramePage, { x: 0.2, y: 0.3 }, { x: 0.5, y: 0.6 })

      const set = await onlySet(gramFramePage)
      // Not `toBeTruthy()`: the set must carry the *selected* colour, which is
      // what the picker promises and what tells two sets apart on the gram.
      expect(set.color).toBe(before.selectedColor)
    })

    test('the further right the drag ends, the wider the spacing', async ({ gramFramePage }) => {
      // Spacing is `currentPos.freq / clickedIndex` (HarmonicsMode
      // `freqUpdatesForDrag`), so it is set by where the drag *ends* on the
      // frequency axis and by nothing else.
      await dragOnImage(gramFramePage, { x: 0.2, y: 0.5 }, { x: 0.4, y: 0.5 })
      const narrow = (await onlySet(gramFramePage)).spacing

      await gramFramePage.page.evaluate(() => {
        // @ts-ignore - test-only global
        const instance = window.GramFrame.__test__getInstances()[0]
        instance.state.harmonics.harmonicSets = []
      })

      await dragOnImage(gramFramePage, { x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 })
      const wide = (await onlySet(gramFramePage)).spacing

      expect(wide).toBeGreaterThan(narrow)
    })

    test('a horizontal drag sets the spacing; a vertical one moves the set in time', async ({ gramFramePage }) => {
      // The two axes do different jobs, and a drag that moved both would be a
      // defect. Horizontal first, from a fixed start.
      await dragOnImage(gramFramePage, { x: 0.3, y: 0.5 }, { x: 0.7, y: 0.5 })
      const horizontal = await onlySet(gramFramePage)

      await gramFramePage.page.evaluate(() => {
        // @ts-ignore - test-only global
        const instance = window.GramFrame.__test__getInstances()[0]
        instance.state.harmonics.harmonicSets = []
      })

      // The same start, dragged straight down instead.
      await dragOnImage(gramFramePage, { x: 0.3, y: 0.5 }, { x: 0.3, y: 0.8 })
      const vertical = await onlySet(gramFramePage)

      // The vertical drag never moved along the frequency axis, so its spacing
      // is whatever the mousedown seeded — narrower than the one dragged right.
      expect(vertical.spacing).toBeLessThan(horizontal.spacing)
      // ...and it is the one that moved in time. Y increases downward and time
      // increases upward, so dragging down lowers the anchor.
      expect(vertical.anchorTime).toBeLessThan(horizontal.anchorTime)
    })

    // The spacing floor is deliberately *not* re-tested here. It is covered by
    // `harmonic-pin-frequency.spec.js` ("a set already at the floor survives
    // another drag towards zero"), which drags to the very left edge where the
    // clamp actually engages. A version of it written here passed with the
    // floor deleted from the component — 2% across a 0-100 Hz gram still gives
    // a spacing well above 0.1 — so it asserted nothing (issue #317).
  })

  test.describe('Real-time calculation during the drag', () => {
    test('spacing follows the pointer while the button is down, not only at release', async ({ gramFramePage }) => {
      const start = await gramFramePage.imageSVGPoint(0.2, 0.5)
      await gramFramePage.startDragSVG(start.x, start.y)

      /** @type {number[]} */
      const spacings = []
      for (const fracX of [0.4, 0.6, 0.8]) {
        const at = await gramFramePage.imageSVGPoint(fracX, 0.5)
        await gramFramePage.page.mouse.move(
          (await gramFramePage.svg.boundingBox()).x + at.x,
          (await gramFramePage.svg.boundingBox()).y + at.y
        )
        const state = await gramFramePage.getState()
        expect(state.harmonics.harmonicSets, 'the set exists from mousedown onward').toHaveLength(1)
        spacings.push(state.harmonics.harmonicSets[0].spacing)
      }

      await gramFramePage.page.mouse.up()

      // Strictly increasing: the readout is live, not a single value written
      // once the button comes up.
      expect(spacings[1]).toBeGreaterThan(spacings[0])
      expect(spacings[2]).toBeGreaterThan(spacings[1])
    })

    test('dragging an existing set re-spaces it', async ({ gramFramePage }) => {
      // Created through the helper, so the starting spacing is exact and the
      // change below is measured against a known number.
      const setId = await gramFramePage.addHarmonicSet(30, 20)
      const before = (await gramFramePage.getState()).harmonics.harmonicSets[0]
      expect(before.id).toBe(setId)

      // Grab a drawn harmonic line and pull it right.
      const line = await gramFramePage.page.locator('.gram-frame-harmonic-line').first().boundingBox()
      if (!line) throw new Error('no harmonic line was rendered to drag')
      const svgBox = await gramFramePage.svg.boundingBox()
      await gramFramePage.page.mouse.move(line.x + line.width / 2, line.y + line.height / 2)
      await gramFramePage.page.mouse.down()
      await gramFramePage.page.mouse.move(line.x + line.width / 2 + 80, line.y + line.height / 2)
      await gramFramePage.page.mouse.up()
      expect(svgBox, 'the component is on the page').toBeTruthy()

      const after = (await gramFramePage.getState()).harmonics.harmonicSets[0]
      expect(after.id, 'the drag re-spaces the set rather than creating another').toBe(setId)
      expect(after.spacing).not.toBeCloseTo(before.spacing, 6)
    })
  })

  test.describe('Overlay rendering', () => {
    test('a created set draws harmonic lines', async ({ gramFramePage }) => {
      await dragOnImage(gramFramePage, { x: 0.2, y: 0.5 }, { x: 0.6, y: 0.5 })
      await onlySet(gramFramePage)

      // Unguarded: the old version wrapped this in try/catch and an
      // `if (count > 0)`, so zero lines was a pass.
      await expect(gramFramePage.page.locator('.gram-frame-harmonic-line').first()).toBeAttached()
      expect(await gramFramePage.page.locator('.gram-frame-harmonic-line').count()).toBeGreaterThan(0)
    })

    test('every drawn line stays inside the gram', async ({ gramFramePage }) => {
      // A narrow spacing puts many lines on the gram, including ones whose
      // frequency runs past its right-hand edge.
      await gramFramePage.addHarmonicSet(30, 5)

      const image = await gramFramePage.page.locator('.gram-frame-svg image').boundingBox()
      if (!image) throw new Error('the gram image is not on the page')

      const lines = gramFramePage.page.locator('.gram-frame-harmonic-line')
      const count = await lines.count()
      expect(count, 'a 5-unit spacing should draw several lines').toBeGreaterThan(1)

      for (let i = 0; i < count; i++) {
        const box = await lines.nth(i).boundingBox()
        if (!box) continue
        expect(box.x, `line ${i} starts left of the gram`).toBeGreaterThanOrEqual(image.x - 1)
        expect(box.x + box.width, `line ${i} runs past the gram`).toBeLessThanOrEqual(image.x + image.width + 1)
      }
    })
  })

  test.describe('Edge cases', () => {
    test('switching mode mid-drag leaves no drag in progress', async ({ gramFramePage }) => {
      const start = await gramFramePage.imageSVGPoint(0.3, 0.4)
      const svgBox = await gramFramePage.svg.boundingBox()
      if (!svgBox) throw new Error('the component is not on the page')

      await gramFramePage.startDragSVG(start.x, start.y)
      await gramFramePage.page.mouse.move(svgBox.x + start.x + 20, svgBox.y + start.y + 20)

      const during = await gramFramePage.getState()
      expect(during.drag.active, 'the drag is live before the mode switch').toBe(true)

      // Switched without moving the pointer. Clicking the mode *button* would
      // take the cursor off the SVG, and mouseleave cancels the drag on its own
      // (`cancelActiveDrag`) — so a button click passes whether or not the mode
      // switch cancels anything, which is no test at all.
      await gramFramePage.page.evaluate(() => {
        // @ts-ignore - test-only global
        window.GramFrame.__test__getInstances()[0]._switchMode('analysis')
      })

      // Asserted with the button still down: after `mouse.up()` the drag would
      // have ended anyway, so checking then proves nothing either.
      const switched = await gramFramePage.getState()
      expect(switched.drag.active, 'switching mode should cancel the live drag').toBe(false)
      expect(switched.drag.targetId).toBeNull()

      await gramFramePage.clickMode('Harmonics')
      await gramFramePage.page.mouse.move(svgBox.x + start.x + 60, svgBox.y + start.y + 60)
      await gramFramePage.page.mouse.up()

      const state = await gramFramePage.getState()
      expectValidMetadata(state)
      expectValidMode(state, 'harmonics')
      expectValidConfig(state)
      expectValidImageDetails(state)
      expect(state.drag.active).toBe(false)
    })
  })
})
