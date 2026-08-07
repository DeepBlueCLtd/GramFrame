import { test, expect } from './helpers/fixtures.js'

/**
 * @fileoverview E2E coverage for the cursor over a grabbable feature.
 *
 * The hand cursors (`grab` / `grabbing`) are opaque bitmaps whose hotspot sits
 * mid-palm, so they landed on exactly the marker and gram pixels being aimed
 * at. Feature drags now use a hollow corner-bracket cursor instead.
 *
 * The artwork's geometry is covered in `tests/unit/cursors.test.js`; what these
 * tests pin is the wiring — that the value actually reaches the SVG element on
 * hover, in every mode that owns draggable features, and that panning still
 * gets the hand.
 */

/** Matches a data-URI cursor: the brackets rather than a keyword. */
const BRACKET_CURSOR = /^url\("data:image\/svg\+xml/

/**
 * Read the cursor style currently applied to the component's SVG.
 * @param {import('./helpers/gram-frame-page.js').default} gramFramePage - Page object
 * @returns {Promise<string>} The inline cursor style
 */
async function svgCursor(gramFramePage) {
  return gramFramePage.page.evaluate(() => {
    const svg = document.querySelector('.gram-frame-svg')
    return svg instanceof SVGElement ? svg.style.cursor : ''
  })
}

test.describe('Cursor over a draggable feature', () => {
  test('a cross-cursor marker takes the hollow cursor, empty gram stays crosshair', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')

    await gramFramePage.clickSpectrogram(200, 150)
    await gramFramePage.waitForMarkerCount(1)

    // Off the marker: the resting crosshair, which never obscured anything.
    await gramFramePage.moveMouseToSpectrogram(340, 240)
    expect(await svgCursor(gramFramePage)).toBe('crosshair')

    // On the marker: the brackets, and emphatically not a hand.
    await gramFramePage.moveMouseToSpectrogram(200, 150)
    const overMarker = await svgCursor(gramFramePage)
    expect(overMarker).toMatch(BRACKET_CURSOR)
    expect(overMarker).not.toContain('grab')

    // And it goes back, so the switch is a real affordance rather than a
    // one-way change the analyst stops noticing.
    await gramFramePage.moveMouseToSpectrogram(340, 240)
    expect(await svgCursor(gramFramePage)).toBe('crosshair')
  })

  test('the cursor stays hollow for the whole drag', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')

    await gramFramePage.clickSpectrogram(200, 150)
    await gramFramePage.waitForMarkerCount(1)

    await gramFramePage.startDragSVG(200, 150)
    const duringDrag = await svgCursor(gramFramePage)

    // The old `grabbing` fist covered the placement point at the exact moment
    // placement accuracy mattered most.
    expect(duringDrag).toMatch(BRACKET_CURSOR)
    expect(duringDrag).not.toContain('grabbing')

    await gramFramePage.endDragSVG(260, 190)
    expect(await svgCursor(gramFramePage)).toBe('crosshair')
  })

  test('a harmonic set takes the hollow cursor too', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Harmonics')
    await gramFramePage.waitForImageDimensions()

    // Debug config spans 0-100 Hz over 0-60 s; harmonic 5 of a 10 Hz spacing
    // lands near the horizontal centre.
    const setId = await gramFramePage.addHarmonicSet(30, 10)
    const pin = gramFramePage.page.locator(
      `.gram-frame-harmonic-line[data-harmonic-set-id="${setId}"][data-harmonic-number="5"]`
    )

    const box = await pin.boundingBox()
    await gramFramePage.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)

    const overSet = await svgCursor(gramFramePage)
    expect(overSet).toMatch(BRACKET_CURSOR)
    expect(overSet).not.toContain('grab')
  })

  test('panning keeps the hand — there is no feature under it to hide', async ({ gramFramePage }) => {
    // Zoom before switching, because pan mode applies its resting cursor when
    // it activates: panning is only meaningful once zoomed in.
    await gramFramePage.setZoom(2.0, 0.5, 0.5)
    await gramFramePage.clickMode('Pan')

    expect(await svgCursor(gramFramePage)).toBe('grab')

    await gramFramePage.moveMouseToSpectrogram(200, 150)
    expect(await svgCursor(gramFramePage)).toBe('grab')
  })
})
