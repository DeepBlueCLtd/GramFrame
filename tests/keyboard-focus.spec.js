import { test, expect } from '@playwright/test'

async function ensureMarkerExistsIn(container, page) {
  const analysisBtn = container.locator('button:has-text("Analysis"), [data-mode="analysis"], [aria-label="Analysis"]')
  if (await analysisBtn.count()) {
    await analysisBtn.first().click()
    await page.waitForTimeout(50)
  }

  const svg = container.locator('.gram-frame-svg, svg.gram-frame-svg, .gram-frame .gram-frame-svg')
  await expect(svg).toBeVisible({ timeout: 5000 })
  const box = await svg.boundingBox()
  if (!box) throw new Error('SVG has no bounding box')

  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await page.waitForTimeout(80)

  const marker = container.locator('.gram-frame-marker, [data-test="marker-cross"], .analysis-marker').first()
  await expect(marker).toBeVisible({ timeout: 3000 })
  return marker
}

test.describe('Keyboard Focus with Multiple GramFrames', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/debug-multiple.html')
    await page.waitForSelector('.gram-frame-container', { timeout: 15000 })
    const containers = await page.locator('.gram-frame-container').count()
    expect(containers).toBe(2)
  })

  test('should only update focused GramFrame on keyboard arrow keys', async ({ page }) => {
    const gramFrame1 = page.locator('.gram-frame-container').first()
    const gramFrame2 = page.locator('.gram-frame-container').nth(1)

    await ensureMarkerExistsIn(gramFrame1, page)
    await ensureMarkerExistsIn(gramFrame2, page)

    const getMarkerPosition = async (container) => {
      const marker = container.locator('.gram-frame-marker, [data-test="marker-cross"], .analysis-marker').first()
      const bb = await marker.boundingBox()
      if (!bb) return null
      return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }
    }

    const marker1InitialPos = await getMarkerPosition(gramFrame1)
    const marker2InitialPos = await getMarkerPosition(gramFrame2)
    expect(marker1InitialPos).not.toBeNull()
    expect(marker2InitialPos).not.toBeNull()

    await gramFrame1.click()
    await gramFrame1.locator('.gram-frame-marker, [data-test="marker-cross"], .analysis-marker').first().click()
    await page.waitForTimeout(80)

    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(120)

    const marker1NewPos = await getMarkerPosition(gramFrame1)
    const marker2NewPos = await getMarkerPosition(gramFrame2)
    expect(marker1NewPos.x).toBeGreaterThan(marker1InitialPos.x)
    expect(marker2NewPos.x).toBeCloseTo(marker2InitialPos.x, 1)
    expect(marker2NewPos.y).toBeCloseTo(marker2InitialPos.y, 1)
  })

  test('should switch focus when clicking on different GramFrame', async ({ page }) => {
    const gramFrame1 = page.locator('.gram-frame-container').first()
    const gramFrame2 = page.locator('.gram-frame-container').nth(1)

    await ensureMarkerExistsIn(gramFrame1, page)
    await ensureMarkerExistsIn(gramFrame2, page)

    const getMarkerPosition = async (container) => {
      const marker = container.locator('.gram-frame-marker, [data-test="marker-cross"], .analysis-marker').first()
      const bb = await marker.boundingBox()
      if (!bb) return null
      return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }
    }

    await gramFrame1.click()
    await gramFrame1.locator('.gram-frame-marker, [data-test="marker-cross"], .analysis-marker').first().click()
    const marker1InitialPos = await getMarkerPosition(gramFrame1)
    const marker2InitialPos = await getMarkerPosition(gramFrame2)

    await gramFrame2.click()
    await gramFrame2.locator('.gram-frame-marker, [data-test="marker-cross"], .analysis-marker').first().click()
    await page.waitForTimeout(80)

    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(120)

    const marker1NewPos = await getMarkerPosition(gramFrame1)
    const marker2NewPos = await getMarkerPosition(gramFrame2)
    expect(marker1NewPos.x).toBeCloseTo(marker1InitialPos.x, 1)
    expect(marker1NewPos.y).toBeCloseTo(marker1InitialPos.y, 1)
    expect(marker2NewPos.x).toBeLessThan(marker2InitialPos.x)
  })

  test('should show visual focus indicator', async ({ page }) => {
    const gramFrame1 = page.locator('.gram-frame-container').first()
    const gramFrame2 = page.locator('.gram-frame-container').nth(1)

    // Reset any lingering focus class and blur active element
    await page.evaluate(() => {
      document.querySelectorAll('.gram-frame-focused').forEach(el => el.classList.remove('gram-frame-focused'))
      if (document.activeElement && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
    })

    await gramFrame1.click()
    await page.waitForTimeout(40)
    let hasFocus1 = await gramFrame1.evaluate(el => el.classList.contains('gram-frame-focused'))
    let hasFocus2 = await gramFrame2.evaluate(el => el.classList.contains('gram-frame-focused'))
    expect(hasFocus1).toBe(true)
    expect(hasFocus2).toBe(false)

    await gramFrame2.click()
    await page.waitForTimeout(40)
    hasFocus1 = await gramFrame1.evaluate(el => el.classList.contains('gram-frame-focused'))
    hasFocus2 = await gramFrame2.evaluate(el => el.classList.contains('gram-frame-focused'))
    expect(hasFocus1).toBe(false)
    expect(hasFocus2).toBe(true)
  })
})
