import { test, expect } from './helpers/fixtures.js'

/**
 * @fileoverview E2E tests for the harmonic pin label halo — the number labels
 * are drawn as black digits inside a white outline ("halo"/text casing) instead
 * of in the harmonic set's colour, so they stay legible over both dark and
 * light areas of a gram.
 *
 * Set identity must still be carried by the pin's line (and symbol) colour, so
 * these tests also assert the line keeps the set colour.
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

test.describe('Harmonic pin label halo', () => {
  test.beforeEach(async ({ gramFramePage }) => {
    await gramFramePage.page.waitForTimeout(100)
    await gramFramePage.clickMode('Harmonics')
    await gramFramePage.waitForImageDimensions()
  })

  test('every pin number label is black digits inside a white halo', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addHarmonicSet(30, 20)
    await gramFramePage.page.waitForTimeout(100)

    const styles = await gramFramePage.getHarmonicLabelStyles(setId)
    expect(styles.length).toBeGreaterThan(0)

    for (const style of styles) {
      expect(style.fill).toBe(BLACK)
      expect(style.stroke).toBe(WHITE)
      // A halo wide enough to read over noise, but not so wide it closes up the digits
      expect(parseFloat(style.strokeWidth)).toBeGreaterThan(1)
      expect(parseFloat(style.strokeWidth)).toBeLessThanOrEqual(4)
      expect(style.strokeLinejoin).toBe('round')
      // The halo must be painted BEHIND the fill, or the stroke eats the glyphs
      expect(style.paintOrder).toMatch(/^stroke/)
    }
  })

  test('label paint is independent of the set colour, which stays on the pin line', async ({ gramFramePage }) => {
    // A new set takes the currently selected colour, so pick a different one
    // before each add to get two visibly distinct sets.
    await setSelectedColor(gramFramePage, '#ff6b6b')
    const firstId = await gramFramePage.addHarmonicSet(20, 20)
    await setSelectedColor(gramFramePage, '#45b7d1')
    const secondId = await gramFramePage.addHarmonicSet(40, 25)
    await gramFramePage.page.waitForTimeout(100)

    const state = await gramFramePage.getState()
    const sets = state.harmonics.harmonicSets
    expect(sets.length).toBe(2)
    const colors = sets.map((/** @type {any} */ s) => String(s.color).toLowerCase())
    expect(colors[0]).not.toBe(colors[1])

    // Both sets' labels are painted identically — colour no longer distinguishes them
    for (const setId of [firstId, secondId]) {
      const styles = await gramFramePage.getHarmonicLabelStyles(setId)
      expect(styles.length).toBeGreaterThan(0)
      for (const style of styles) {
        expect(style.fill).toBe(BLACK)
        expect(style.stroke).toBe(WHITE)
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

  test('labels stay haloed after a zoom re-render', async ({ gramFramePage }) => {
    const setId = await gramFramePage.addHarmonicSet(30, 20)
    await gramFramePage.page.waitForTimeout(100)

    await gramFramePage.setZoom(2.0, 0.5, 0.5)
    await gramFramePage.page.waitForTimeout(100)

    const styles = await gramFramePage.getHarmonicLabelStyles(setId)
    expect(styles.length).toBeGreaterThan(0)
    for (const style of styles) {
      expect(style.fill).toBe(BLACK)
      expect(style.stroke).toBe(WHITE)
      expect(style.paintOrder).toMatch(/^stroke/)
    }
  })
})
