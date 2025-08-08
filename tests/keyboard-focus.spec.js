import { test, expect } from '@playwright/test'

async function ensureMarkerExistsIn(container, page) {
  const svg = container.locator('.gram-frame-svg')
  await expect(svg).toBeVisible()

  const box = await svg.boundingBox()
  if (!box) throw new Error('SVG has no bounding box')

  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await page.waitForTimeout(50)

  const marker = container.locator('.gram-frame-marker').first()
  await expect(marker).toBeVisible()
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

    // Create markers robustly
    await ensureMarkerExistsIn(gramFrame1, page)
    await ensureMarkerExistsIn(gramFrame2, page)

    const getMarkerPosition = async (container) => {
      const marker = container.locator('.gram-frame-marker').first()
      const boundingBox = await marker.boundingBox()
      if (!boundingBox) return null
      return { x: boundingBox.x + boundingBox.width / 2, y: boundingBox.y + boundingBox.height / 2 }
    }

    const marker1InitialPos = await getMarkerPosition(gramFrame1)
    const marker2InitialPos = await getMarkerPosition(gramFrame2)
    expect(marker1InitialPos).not.toBeNull()
    expect(marker2InitialPos).not.toBeNull()

    // Focus and select inside GramFrame #1
    await gramFrame1.click()
    await gramFrame1.locator('.gram-frame-marker').first().click()
    await page.waitForTimeout(100)

    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(150)

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
      const marker = container.locator('.gram-frame-marker').first()
      const boundingBox = await marker.boundingBox()
      if (!boundingBox) return null
      return { x: boundingBox.x + boundingBox.width / 2, y: boundingBox.y + boundingBox.height / 2 }
    }

    await gramFrame1.click()
    await gramFrame1.locator('.gram-frame-marker').first().click()
    const marker1InitialPos = await getMarkerPosition(gramFrame1)
    const marker2InitialPos = await getMarkerPosition(gramFrame2)

    await gramFrame2.click()
    await gramFrame2.locator('.gram-frame-marker').first().click()
    await page.waitForTimeout(100)

    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(150)

    const marker1NewPos = await getMarkerPosition(gramFrame1)
    const marker2NewPos = await getMarkerPosition(gramFrame2)

    expect(marker1NewPos.x).toBeCloseTo(marker1InitialPos.x, 1)
    expect(marker1NewPos.y).toBeCloseTo(marker1InitialPos.y, 1)
    expect(marker2NewPos.x).toBeLessThan(marker2InitialPos.x)
  })

  test('should show visual focus indicator', async ({ page }) => {
    const gramFrame1 = page.locator('.gram-frame-container').first()
    const gramFrame2 = page.locator('.gram-frame-container').nth(1)

    // Normalize initial state: ensure nothing has the focus class
    await page.evaluate(() => {
      document.querySelectorAll('.gram-frame-focused').forEach(el => el.classList.remove('gram-frame-focused'))
      if (document.activeElement && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
    })

    // Click on first GramFrame
    await gramFrame1.click()
    await page.waitForTimeout(50)
    let hasFocus1 = await gramFrame1.evaluate(el => el.classList.contains('gram-frame-focused'))
    let hasFocus2 = await gramFrame2.evaluate(el => el.classList.contains('gram-frame-focused'))
    expect(hasFocus1).toBe(true)
    expect(hasFocus2).toBe(false)

    // Click on second GramFrame
    await gramFrame2.click()
    await page.waitForTimeout(50)
    hasFocus1 = await gramFrame1.evaluate(el => el.classList.contains('gram-frame-focused'))
    hasFocus2 = await gramFrame2.evaluate(el => el.classList.contains('gram-frame-focused'))
    expect(hasFocus1).toBe(false)
    expect(hasFocus2).toBe(true)
  })
})
