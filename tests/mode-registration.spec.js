import { test, expect } from '@playwright/test'

/**
 * @fileoverview A fifth mode, added without touching the files that used to
 * need editing (spec 167, SC-003, AS-2.2, AS-4.2).
 *
 * The claim under test is that the registration seam and the capability seams
 * between them mean a new mode touches only `src/modes/` and the factory —
 * specifically **not** `core/state.js`, `components/MainUI.js` or
 * `core/FeatureRenderer.js`.
 *
 * The plan called for a throwaway mode committed under `src/modes/`. That would
 * ship dead code in every build to prove a point about the build, so the fifth
 * mode is instead built here at runtime and injected into a live instance. It
 * exercises the same two capabilities through the same two coordinators, and it
 * leaves nothing behind.
 *
 * The registration seam's half — a mode's `static getInitialState()` slice
 * appearing in the composed state — is covered in the unit lane by
 * `tests/unit/mode-registration.test.js`, which can load `state.js` and
 * `ModeFactory` directly.
 */

test.describe('A fifth mode is coordinated by capability, not by name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/debug.html')
    await page.locator('.gram-frame-container').first().waitFor()
  })

  test('its persistent features render, with no edit to FeatureRenderer', async ({ page }) => {
    const result = await page.evaluate(() => {
      const instance = window.GramFrame.__test__getInstances()[0]

      // A mode implementing `PersistentFeatureProvider` and nothing else.
      let renderCount = 0
      instance.modes.spike = {
        hasPersistentFeatures: () => true,
        renderPersistentFeatures: () => {
          renderCount++
          const mark = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          mark.setAttribute('class', 'spike-feature')
          mark.setAttribute('cx', '100')
          mark.setAttribute('cy', '100')
          mark.setAttribute('r', '5')
          instance.ui.cursorGroup.appendChild(mark)
        }
      }

      instance.featureRenderer.renderAllPersistentFeatures()
      const drawn = document.querySelectorAll('.spike-feature').length

      // A mode that says it has nothing must not be asked to draw.
      instance.modes.spike.hasPersistentFeatures = () => false
      instance.featureRenderer.renderAllPersistentFeatures()
      const afterOptOut = document.querySelectorAll('.spike-feature').length

      delete instance.modes.spike
      return { renderCount, drawn, afterOptOut }
    })

    expect(result.renderCount).toBe(1)
    expect(result.drawn).toBe(1)
    expect(result.afterOptOut).toBe(0)
  })

  test('its panel is refreshed, with no edit to MainUI', async ({ page }) => {
    const refreshes = await page.evaluate(async () => {
      const instance = window.GramFrame.__test__getInstances()[0]
      let refreshed = 0

      // A mode implementing `PanelOwner` and nothing else.
      instance.modes.spike = { refreshPanel: () => { refreshed++ } }

      const { updatePersistentPanels } = await import('/src/components/MainUI.js')
      updatePersistentPanels(instance)

      delete instance.modes.spike
      return refreshed
    })

    expect(refreshes).toBe(1)
  })

  test('a mode implementing neither capability is left alone', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const instance = window.GramFrame.__test__getInstances()[0]
      let touched = 0

      // Pan's shape: no persistent features, no panel.
      instance.modes.inert = {
        activate: () => { touched++ },
        handleMouseMove: () => { touched++ }
      }

      instance.featureRenderer.renderAllPersistentFeatures()
      const { updatePersistentPanels } = await import('/src/components/MainUI.js')
      updatePersistentPanels(instance)

      delete instance.modes.inert
      return touched
    })

    // Neither coordinator invented a call for a mode that opted into nothing.
    expect(result).toBe(0)
  })

  test('the three coordinating files name no mode', async ({ page }) => {
    // The runtime proof above shows a fifth mode is coordinated. This is the
    // static half of the same claim: those files could not name it if they
    // tried, because they name no mode at all.
    const sources = await page.evaluate(async () => {
      const paths = [
        '/src/core/state.js',
        '/src/components/MainUI.js',
        '/src/core/FeatureRenderer.js'
      ]
      const fetched = await Promise.all(paths.map((p) => fetch(p).then((r) => r.text())))
      return paths.map((path, i) => ({ path, source: fetched[i] }))
    })

    for (const { path, source } of sources) {
      // Strip comments: the files explain the seam, and saying "analysis" in
      // prose is not reaching for a mode.
      const code = source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')

      expect(code, `${path} imports a mode`).not.toMatch(/from\s+['"][^'"]*modes\/(analysis|harmonics|doppler|pan)\//)
      expect(code, `${path} names a mode`).not.toMatch(/modes\s*[.[]\s*['"]?(analysis|harmonics|doppler)\b/)
    }
  })
})
