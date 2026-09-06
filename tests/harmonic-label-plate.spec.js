import { test, expect } from './helpers/fixtures.js'

/**
 * @fileoverview E2E tests for the harmonic pin label plate (issue #243) — the
 * number labels are drawn as black digits on an opaque white rounded rectangle
 * instead of in the harmonic set's colour, so they stay legible over both dark
 * and light areas of a gram. The plate replaced a halo (a white outline behind
 * the glyphs), which left the gram showing through between and inside the
 * digits; these tests assert the plate is there, is opaque white, and actually
 * covers the characters it carries.
 *
 * Set identity must still be carried by the pin's line (and symbol) colour, so
 * these tests also assert the line keeps the set colour.
 *
 * These are about the resting treatment, so each test clears the selection a
 * newly created set arrives with: a SELECTED set's plates are inverted (dark
 * plate, light text), which `tests/selection-highlight.spec.js` covers.
 *
 * Debug config spans freq 0-100 Hz over time 0-60 s, so a 20 Hz set places
 * harmonics 1..5 — every pin labelled.
 */

const BLACK = 'rgb(0, 0, 0)'
const WHITE = 'rgb(255, 255, 255)'

/**
 * Set the colour the next created feature will take (the colour picker's
 * selection), via the test-only instance registry.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gfp - Page helper
 * @param {string} color - Hex colour
 * @returns {Promise<void>}
 */
async function setSelectedColor(gfp, color) {
  await gfp.page.evaluate((c) => {
    // @ts-ignore - test-only global
    const instance = window.GramFrame.__test__getInstances()[0]
    instance.state.selectedColor = c
  }, color)
}

/**
 * Drop the selection a newly created set arrives with, so the labels are read at
 * rest rather than inverted.
 * @param {import('./helpers/gram-frame-page.js').GramFramePage} gfp - Page helper
 * @returns {Promise<void>}
 */
async function deselect(gfp) {
  await gfp.page.evaluate(() => {
    // @ts-ignore - test-only global
    window.GramFrame.__test__getInstances()[0].interaction.clearSelection()
  })
}

test.describe('Harmonic pin label plate', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.clickMode('Harmonics')
    await gramFramePage.waitForImageDimensions()
  })

  test('every pin number label is black digits on a white rounded plate', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addHarmonicSet(30, 20)
    await deselect(gramFramePage)

    const labels = await gramFramePage.getHarmonicLabelPaint(setId)
    expect(labels.length).toBeGreaterThan(0)

    for (const label of labels) {
      expect(label.fill).toBe(BLACK)
      // No halo left on the glyphs: the plate is the contrast now, and a
      // leftover stroke would just thicken the digits over it.
      expect(label.stroke).toBe('none')

      expect(label.plate).not.toBeNull()
      expect(label.plate?.fill).toBe(WHITE)
      // Rounded, as on the legacy viewer — but not so round it turns into a pill
      expect(label.plate?.radius).toBeGreaterThan(0)
      expect(label.plate?.radius).toBeLessThanOrEqual(6)
    }
  })

  test('the plate covers the digits it carries, with room around them', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addHarmonicSet(30, 20)
    await deselect(gramFramePage)

    const labels = await gramFramePage.getHarmonicLabelPaint(setId)
    expect(labels.length).toBeGreaterThan(0)

    for (const { plate, textBox } of labels) {
      expect(plate).not.toBeNull()
      if (!plate) continue
      // Every side of the characters is inside the plate — a plate that merely
      // overlapped them would leave the same show-through the halo did.
      expect(plate.box.left).toBeLessThanOrEqual(textBox.left)
      expect(plate.box.right).toBeGreaterThanOrEqual(textBox.right)
      expect(plate.box.top).toBeLessThanOrEqual(textBox.top)
      expect(plate.box.bottom).toBeGreaterThanOrEqual(textBox.bottom)
      // And it is bigger than them, so the contrast reaches past the glyphs
      expect(plate.box.right - plate.box.left).toBeGreaterThan(textBox.right - textBox.left)
    }
  })

  test('label paint is independent of the set colour, which stays on the pin line', async ({ gramFramePage }) => {
    // A new set takes the currently selected colour, so pick a different one
    // before each add to get two visibly distinct sets.
    await setSelectedColor(gramFramePage, '#ff6b6b')
    const firstId = await gramFramePage.addHarmonicSet(20, 20)
    await setSelectedColor(gramFramePage, '#45b7d1')
    const secondId = await gramFramePage.addHarmonicSet(40, 25)
    await deselect(gramFramePage)

    const state = await gramFramePage.getState()
    const sets = state.harmonics.harmonicSets
    expect(sets.length).toBe(2)
    const colors = sets.map((/** @type {any} */ s) => String(s.color).toLowerCase())
    expect(colors[0]).not.toBe(colors[1])

    // Both sets' labels are painted identically — colour no longer distinguishes them
    for (const setId of [firstId, secondId]) {
      const labels = await gramFramePage.getHarmonicLabelPaint(setId)
      expect(labels.length).toBeGreaterThan(0)
      for (const label of labels) {
        expect(label.fill).toBe(BLACK)
        expect(label.plate?.fill).toBe(WHITE)
      }
    }

    // ...because set identity is carried by the pin lines, which keep the colour
    const lineColors = await gramFramePage.page.evaluate((ids) => {
      return ids.map((id) => {
        const line = document.querySelector(`.gram-frame-harmonic-line[data-harmonic-set-id="${id}"]`)
        return line ? String(line.getAttribute('stroke')).toLowerCase() : null
      })
    }, [firstId, secondId])
    expect(lineColors[0]).toBe(colors[sets.findIndex((/** @type {any} */ s) => s.id === firstId)])
    expect(lineColors[1]).toBe(colors[sets.findIndex((/** @type {any} */ s) => s.id === secondId)])
  })

  test('labels stay plated after a zoom re-render', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addHarmonicSet(30, 20)
    await deselect(gramFramePage)

    await gramFramePage.setZoom(2.0, 0.5, 0.5)

    const labels = await gramFramePage.getHarmonicLabelPaint(setId)
    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) {
      expect(label.fill).toBe(BLACK)
      expect(label.plate?.fill).toBe(WHITE)
      expect(label.plate?.box.left).toBeLessThanOrEqual(label.textBox.left)
      expect(label.plate?.box.right).toBeGreaterThanOrEqual(label.textBox.right)
    }
  })
})
