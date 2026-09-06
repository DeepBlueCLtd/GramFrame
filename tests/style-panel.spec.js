import { test, expect } from './helpers/fixtures.js'

/**
 * @fileoverview The style panel's twin target tabs, and the panel parts that
 * follow them.
 *
 * The confusion this replaces was real: with one panel and no visible target,
 * a colour click either set the default for the next feature or restyled the
 * one just clicked, depending on state the analyst could not see. The tabs make
 * that state visible and, crucially, selectable — arming "New features" does
 * NOT give up the selection, so an analyst can set what comes next while still
 * nudging the row they are on.
 *
 * Also covers the two things the redesign moved into the panel: the readout
 * column retargeting to the selected feature, and Delete.
 */

const NEW_TAB = '.gram-frame-style-tab-new'
const SELECTED_TAB = '.gram-frame-style-tab-selected'
const ARMED = /gram-frame-style-tab-armed/

test.describe('The style panel states what it is about to change', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')
  })

  test('with nothing selected, "New features" is armed and the other tab is dead', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    await expect(page.locator(NEW_TAB)).toHaveClass(ARMED)
    await expect(page.locator(SELECTED_TAB)).toBeDisabled()
    await expect(page.locator(SELECTED_TAB)).toHaveText('Selected: none')
    await expect(page.locator('.gram-frame-style-footer-note'))
      .toHaveText('applies to every feature you add, in any mode')
  })

  test('selecting a feature arms the second tab and names it', async ({ gramFramePage }) => {
    const markerId = await gramFramePage.addMarker(30, 50)
    await gramFramePage.waitForSelectedRow('markers', markerId)

    const page = gramFramePage.page
    await expect(page.locator(SELECTED_TAB)).toHaveClass(ARMED)
    await expect(page.locator(SELECTED_TAB)).toBeEnabled()
    await expect(page.locator(SELECTED_TAB)).toContainText('Selected: Marker 1')
    expect((await gramFramePage.getState()).styleTarget).toBe('selected')

    // A label renames the target wherever it is named.
    await gramFramePage.setMarkerLabel(markerId, 'ABS')
    await expect(page.locator(SELECTED_TAB)).toContainText('Selected: ABS')
    await expect(page.locator('.gram-frame-style-footer-note')).toHaveText('changes ABS only')
  })

  test('arming "New features" keeps the selection, and retargets the controls', async ({ gramFramePage }) => {
    const markerId = await gramFramePage.addMarker(30, 50)
    await gramFramePage.waitForSelectedRow('markers', markerId)
    const before = (await gramFramePage.getState()).analysis.markers[0].color

    const page = gramFramePage.page
    await page.locator(NEW_TAB).click()
    await expect(page.locator(NEW_TAB)).toHaveClass(ARMED)

    // The row is still selected — this is the whole point of two tabs rather
    // than a selected/not-selected panel.
    const state = await gramFramePage.getState()
    expect(state.selection.selectedId).toBe(markerId)
    expect(state.styleTarget).toBe('new')
    await gramFramePage.waitForSelectedRow('markers', markerId)

    // ...and a colour click now writes the default rather than restyling it.
    await page.locator('.gram-frame-color-canvas').click({ position: { x: 8, y: 10 } })
    const after = await gramFramePage.getState()
    expect(after.analysis.markers[0].color).toBe(before)
    expect(after.selectedColor).not.toBe(before)
  })

  test('with the second tab armed, a colour click restyles that feature alone', async ({ gramFramePage }) => {
    const first = await gramFramePage.addMarker(30, 50)
    const second = await gramFramePage.addMarker(40, 60)
    await gramFramePage.waitForSelectedRow('markers', second)

    const before = (await gramFramePage.getState()).analysis.markers
    const firstColour = before.find((/** @type {any} */ m) => m.id === first).color

    await gramFramePage.page.locator('.gram-frame-color-canvas').click({ position: { x: 8, y: 10 } })

    const after = (await gramFramePage.getState()).analysis.markers
    expect(after.find((/** @type {any} */ m) => m.id === first).color).toBe(firstColour)
    expect(after.find((/** @type {any} */ m) => m.id === second).color).not.toBe(firstColour)
  })

  test('the pin control is offered for a pin set and refused for a marker', async ({ gramFramePage }) => {
    await gramFramePage.addMarker(30, 50)
    // Markers have no pin, so the control says so rather than lying.
    expect((await gramFramePage.getPinToggleState()).disabled).toBe(true)

    await gramFramePage.clickMode('Harmonics')
    const setId = await gramFramePage.addHarmonicSet(20, 100)
    await gramFramePage.waitForSelectedRow('harmonics', setId)
    expect((await gramFramePage.getPinToggleState()).disabled).toBe(false)
  })

  test('the panel offers Nudge and Delete only while a feature is targeted', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    await expect(page.locator('.gram-frame-nudge-btn').first()).toBeHidden()
    await expect(page.locator('.gram-frame-style-delete')).toBeHidden()

    const markerId = await gramFramePage.addMarker(30, 50)
    await gramFramePage.waitForSelectedRow('markers', markerId)
    await expect(page.locator('.gram-frame-nudge-btn').first()).toBeVisible()
    await expect(page.locator('.gram-frame-style-delete')).toBeVisible()

    await page.locator('.gram-frame-style-delete').click()
    await gramFramePage.waitForMarkerCount(0)
    // Deleting also clears the selection, so the panel falls back.
    await expect(page.locator(NEW_TAB)).toHaveClass(ARMED)
  })

  test('the nudge buttons move the selected marker, like the arrow keys', async ({ gramFramePage }) => {
    const markerId = await gramFramePage.addMarker(30, 50)
    await gramFramePage.waitForSelectedRow('markers', markerId)
    const before = (await gramFramePage.getState()).analysis.markers[0].freq

    await gramFramePage.page.locator('.gram-frame-nudge-btn').nth(1).click()
    await gramFramePage.waitForState(
      (state) => state.analysis.markers[0].freq !== before,
      { message: 'the nudged marker to move' }
    )
    expect((await gramFramePage.getState()).analysis.markers[0].freq).toBeGreaterThan(before)
  })
})

test.describe('The readout column reads the selection when there is one', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')
  })

  test('it says CURSOR at rest and SELECTED once a row is chosen', async ({ gramFramePage }) => {
    const kicker = gramFramePage.page.locator('.gram-frame-readout-kicker')
    await expect(kicker).toHaveText('Cursor')

    const markerId = await gramFramePage.addMarker(30, 50)
    await gramFramePage.waitForSelectedRow('markers', markerId)
    await expect(kicker).toContainText('Selected')
    await expect(gramFramePage.page.locator('.gram-frame-readout-target')).toHaveText('Marker 1')
  })

  test('it shows the selected feature’s own frequency, not the pointer’s', async ({ gramFramePage }) => {
    const markerId = await gramFramePage.addMarker(30, 50)
    await gramFramePage.waitForSelectedRow('markers', markerId)

    const marker = (await gramFramePage.getState()).analysis.markers[0]
    const freqValue = gramFramePage.page
      .locator('.gram-frame-led:has(.gram-frame-led-label:text-is("Frequency (Hz)")) .gram-frame-led-value')
    await expect(freqValue).toHaveText(marker.freq.toFixed(2))

    // Moving the pointer over the gram must not overwrite it: the column is
    // reading the selection, and its kicker says so.
    await gramFramePage.moveMouse(180, 140)
    await expect(freqValue).toHaveText(marker.freq.toFixed(2))
  })
})

test.describe('The annotation tables', () => {
  test('each column shows an instructional empty state, and a count once filled', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    const markers = page.locator('.gram-frame-markers-persistent-container')

    await expect(markers.locator('.gram-frame-table-empty'))
      .toHaveText('Click the gram to add a cross')
    await expect(markers.locator('.gram-frame-count-chip')).toBeHidden()

    await gramFramePage.clickMode('Cross Cursor')
    await gramFramePage.addMarker(30, 50)

    await expect(markers.locator('.gram-frame-table-empty')).toHaveCount(0)
    await expect(markers.locator('.gram-frame-count-chip')).toHaveText('1')
  })

  test('the selected row is reversed out, whatever colour the feature carries', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')
    const markerId = await gramFramePage.addMarker(30, 50)
    await gramFramePage.waitForSelectedRow('markers', markerId)

    // Light ground, dark ink — an inversion, not a border that could collide
    // with the feature's own colour in the cell beside it.
    const cell = gramFramePage.page.locator(`tr[data-marker-id="${markerId}"] td`).nth(1)
    const style = await cell.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { background: cs.backgroundColor, color: cs.color }
    })
    expect(style.background).toBe('rgb(247, 247, 250)')
    expect(style.color).toBe('rgb(13, 14, 24)')
  })
})
