import { test, expect } from './helpers/fixtures.js'

/**
 * @fileoverview What a selected feature looks like on the gram.
 *
 * Selection used to be visible only in the control row, so the panel could say
 * "Selected: Marker 3" while three identical crosses sat on the plot with
 * nothing to tell them apart. Two treatments answer that: a halo under the
 * feature's own geometry, and — where it has a label — the same inversion its
 * table row gets.
 */

const HALO = '.gram-frame-selection-halo'

test.describe('The selected feature is marked on the gram', () => {
  test('a halo appears under the selected marker and goes when it is deselected', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')
    const markerId = await gramFramePage.addMarker(30, 50)
    await gramFramePage.waitForSelectedRow('markers', markerId)

    const page = gramFramePage.page
    await expect(page.locator(HALO)).toHaveCount(1)

    // Beneath the feature it copies, so the marker's own colour still reads.
    const order = await page.evaluate(() => {
      const group = document.querySelector('.gram-frame-cursors')
      const children = group ? Array.from(group.children) : []
      return {
        halo: children.findIndex(el => el.classList.contains('gram-frame-selection-halo')),
        marker: children.findIndex(el => el.classList.contains('gram-frame-analysis-marker'))
      }
    })
    expect(order.halo).toBeGreaterThanOrEqual(0)
    expect(order.halo).toBeLessThan(order.marker)

    // Clicking the row again deselects it.
    await page.locator(`tr[data-marker-id="${markerId}"]`).click()
    await expect(page.locator(HALO)).toHaveCount(0)
  })

  test('the halo carries no feature id, so nothing can find it by one', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')
    const markerId = await gramFramePage.addMarker(30, 50)
    await gramFramePage.waitForSelectedRow('markers', markerId)

    const page = gramFramePage.page
    const ids = await page.locator(HALO).evaluateAll(halos => halos.flatMap(halo =>
      [halo, ...Array.from(halo.querySelectorAll('*'))]
        .flatMap(el => Array.from(el.attributes).map(a => a.name))
        .filter(name => name.startsWith('data-'))
    ))
    expect(ids).toEqual([])
  })

  test("a selected feature's label plate is inverted, like its table row", async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Cross Cursor')
    const markerId = await gramFramePage.addMarker(30, 50)
    await gramFramePage.waitForSelectedRow('markers', markerId)

    const page = gramFramePage.page
    await page.locator('.gram-frame-style-label-input').fill('Contact A')
    const plated = page.locator('.gram-frame-label-plated').first()
    await expect(plated).toHaveCount(1)

    /**
     * The plate's fill and its text's, as the browser resolves them.
     * @param {import('@playwright/test').Locator} group - The plated-label group
     */
    const inks = (group) => group.evaluate(el => {
      const plate = el.querySelector('.gram-frame-label-plate')
      const text = el.querySelector('text')
      return {
        plate: plate ? getComputedStyle(plate).fill : null,
        text: text ? getComputedStyle(text).fill : null
      }
    })

    // Dark plate, light text — the reverse of the white plate an unselected
    // label carries, and the same reversal the table row performs.
    expect(await inks(plated)).toEqual({ plate: 'rgb(13, 14, 24)', text: 'rgb(247, 247, 250)' })

    await page.locator(`tr[data-marker-id="${markerId}"]`).click()
    expect(await inks(plated)).toEqual({ plate: 'rgb(255, 255, 255)', text: 'rgb(0, 0, 0)' })
  })

  test('a whole pin set is haloed, not just one of its pins', async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Harmonics')
    await gramFramePage.addHarmonicSet(30, 3)
    await gramFramePage.waitForHarmonicSetCount(1)

    // Creating a set selects it, and every drawn member takes the halo: one
    // haloed pin among forty would read as a member marker, not a set marker.
    const page = gramFramePage.page
    expect(await page.locator(HALO).count()).toBeGreaterThan(1)

    await page.locator('.gram-frame-harmonics-persistent-container tbody tr').first().click()
    await expect(page.locator(HALO)).toHaveCount(0)
  })
})
