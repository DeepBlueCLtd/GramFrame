import { test, expect } from './helpers/fixtures.js'

/**
 * @fileoverview Modal element scoping, Escape and focus restore (R9-08, issue #260).
 *
 * Three defects, verified in the live bundle by the September review:
 *
 *   1. `ManualHarmonicModal` injected four page-global ids —
 *      `harmonic-spacing-input`, `spacing-error`, `cancel-button`, `add-button`
 *      — into whatever document the component was dropped into. The last two
 *      are names a training page could plausibly use itself, and a page with
 *      two grams had two of each.
 *   2. Escape was bound on the text input only, so tabbing to Cancel and
 *      pressing Escape left the dialog open.
 *   3. Neither dialog restored focus: after Save or Cancel,
 *      `document.activeElement` was `<body>`.
 *
 * The marker-label dialog is gone with the control-row redesign — labels are
 * edited in the style panel — so the second half of each pair is now the symbol
 * popup, which is the panel's one remaining overlay and inherits the same three
 * obligations.
 */

const MANUAL_MODAL = '.gram-frame-manual-harmonic-modal'
const SYMBOL_POPUP = '.gram-frame-symbol-popup'
const SPACING_INPUT = '.gram-frame-harmonic-spacing-input'

/**
 * Every id the component puts in the document.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string[]>} Element ids, document-wide
 */
async function documentIds(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[id]')).map((el) => el.id)
  )
}

test.describe('Dialogs do not put generic ids in the host document (R9-08)', () => {
  test('the manual harmonic dialog adds no page-global ids', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    await gramFramePage.clickMode('Harmonics')

    const before = await documentIds(page)
    await page.locator('.gram-frame-manual-button').click()
    await expect(page.locator(MANUAL_MODAL)).toHaveCount(1)
    const after = await documentIds(page)

    const added = after.filter((id) => !before.includes(id))
    expect(added, `dialog added ids: ${added.join(', ')}`).toEqual([])

    // The specific names the review found, spelled out so a regression is
    // obvious in the failure message.
    for (const id of ['harmonic-spacing-input', 'spacing-error', 'cancel-button', 'add-button']) {
      expect(await page.locator(`#${id}`).count(), `#${id} must not exist`).toBe(0)
    }
  })

  test('the input is still labelled, without an id to do it', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    await gramFramePage.clickMode('Harmonics')
    await page.locator('.gram-frame-manual-button').click()

    // The label wraps the input, so the association survives losing the id.
    const wrapped = await page.locator(`${MANUAL_MODAL} label ${SPACING_INPUT}`).count()
    expect(wrapped).toBe(1)
    await expect(page.locator(`${MANUAL_MODAL} label`)).toContainText('Harmonic spacing')
  })

  test('two grams on a page produce no duplicate ids', async ({ page }) => {
    await page.goto('/debug-multiple.html')
    await page.locator('.gram-frame-container').first().waitFor()

    const ids = await documentIds(page)
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(duplicates, `duplicate ids: ${duplicates.join(', ')}`).toEqual([])
  })
})

test.describe('Escape closes a dialog from anywhere in it (R9-08)', () => {
  test('the manual harmonic dialog closes on Escape from the Cancel button', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    await gramFramePage.clickMode('Harmonics')
    await page.locator('.gram-frame-manual-button').click()
    await expect(page.locator(MANUAL_MODAL)).toHaveCount(1)

    // Move focus off the text field — the case that used to trap the analyst.
    await page.locator(`${MANUAL_MODAL} .gram-frame-modal-cancel`).focus()
    await page.keyboard.press('Escape')

    await expect(page.locator(MANUAL_MODAL)).toHaveCount(0)
  })

  test('the manual harmonic dialog still closes on Escape from the input', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    await gramFramePage.clickMode('Harmonics')
    await page.locator('.gram-frame-manual-button').click()
    await page.locator(SPACING_INPUT).focus()
    await page.keyboard.press('Escape')

    await expect(page.locator(MANUAL_MODAL)).toHaveCount(0)
  })

  test('the symbol popup closes on Escape from one of its cells', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    await page.locator('.gram-frame-symbol-select').click()
    await expect(page.locator(SYMBOL_POPUP)).toHaveCount(1)

    // Focus somewhere inside the popup rather than on the button that opened
    // it — the case that used to trap the analyst in the dialogs.
    await page.locator('.gram-frame-symbol-cell').first().focus()
    await page.keyboard.press('Escape')

    await expect(page.locator(SYMBOL_POPUP)).toHaveCount(0)
  })

  test('Escape while a popup is open does not also reach the component', async ({ gramFramePage }) => {
    // The component uses document-level Escape to cancel a drag; the popup's
    // handler stops the event so one keypress cannot do two things.
    const page = gramFramePage.page
    await gramFramePage.clickMode('Cross Cursor')
    await gramFramePage.addMarker(30, 50)
    const before = await gramFramePage.getState()

    await page.locator('.gram-frame-symbol-select').click()
    await page.keyboard.press('Escape')
    await expect(page.locator(SYMBOL_POPUP)).toHaveCount(0)

    const after = await gramFramePage.getState()
    expect(after.analysis.markers).toHaveLength(before.analysis.markers.length)
    expect(after.drag.active).toBe(false)
  })
})

test.describe('A dialog gives focus back to what opened it (R9-08)', () => {
  test('cancelling the manual harmonic dialog returns focus to the Manual button', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    await gramFramePage.clickMode('Harmonics')

    const manualButton = page.locator('.gram-frame-manual-button')
    await manualButton.click()
    await expect(page.locator(MANUAL_MODAL)).toHaveCount(1)
    await page.locator(`${MANUAL_MODAL} .gram-frame-modal-cancel`).click()

    // Was `<body>`: a keyboard user was returned to the top of the document.
    const focused = await page.evaluate(() => document.activeElement?.className || '')
    expect(focused).toContain('gram-frame-manual-button')
  })

  test('adding through the manual harmonic dialog also returns focus', async ({ gramFramePage }) => {
    const page = gramFramePage.page
    await gramFramePage.clickMode('Harmonics')

    await page.locator('.gram-frame-manual-button').click()
    await page.locator(SPACING_INPUT).fill('25')
    await page.locator(`${MANUAL_MODAL} .gram-frame-modal-add`).click()
    await gramFramePage.waitForHarmonicSetCount(1)

    const focused = await page.evaluate(() => document.activeElement?.className || '')
    expect(focused).toContain('gram-frame-manual-button')
  })

  test('closing the symbol popup returns focus to the button that opened it', async ({ gramFramePage }) => {
    const page = gramFramePage.page

    await page.locator('.gram-frame-symbol-select').click()
    await expect(page.locator(SYMBOL_POPUP)).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(page.locator(SYMBOL_POPUP)).toHaveCount(0)

    const focused = await page.evaluate(() => document.activeElement?.className || '')
    expect(focused).toContain('gram-frame-symbol-select')
  })
})
