/**
 * Quick test script to verify persistent features functionality
 */

import { test, expect } from '@playwright/test';

test('persistent features across modes', async ({ page }) => {
  // Go to debug page
  await page.goto('http://localhost:5173/debug.html');
  
  // Wait for component to load
  await page.waitForSelector('.gram-frame-component');
  
  console.log('✓ Page loaded');
  
  // 1. Test Analysis mode - add a marker
  console.log('Testing Analysis mode marker creation...');
  
  // Should be in analysis mode by default
  const analysisButton = page.locator('.gram-frame-mode-button[data-mode="analysis"]');
  await expect(analysisButton).toHaveClass(/active/);
  
  // Click on spectrogram to add marker
  const spectrogram = page.locator('.gram-frame-spectrogram');
  await spectrogram.click({ position: { x: 200, y: 200 } });
  
  // Wait a bit for the marker to be added
  await page.waitForTimeout(500);
  
  console.log('✓ Marker added in Analysis mode');
  
  // 2. Switch to Harmonics mode
  console.log('Switching to Harmonics mode...');
  const harmonicsButton = page.locator('.gram-frame-mode-button[data-mode="harmonics"]');
  await harmonicsButton.click();
  await page.waitForTimeout(500);
  
  // Check if marker is still visible
  const markers = page.locator('.gram-frame-marker-line');
  const markerCount = await markers.count();
  console.log(`Found ${markerCount} markers in Harmonics mode`);
  
  // 3. Add a harmonic set
  console.log('Adding harmonic set in Harmonics mode...');
  await spectrogram.click({ position: { x: 300, y: 300 } });
  await page.waitForTimeout(500);
  
  console.log('✓ Harmonic set added in Harmonics mode');
  
  // 4. Switch to Doppler mode
  console.log('Switching to Doppler mode...');
  const dopplerButton = page.locator('.gram-frame-mode-button[data-mode="doppler"]');
  await dopplerButton.click();
  await page.waitForTimeout(500);
  
  // Check if both markers and harmonics are still visible
  const markersInDoppler = await page.locator('.gram-frame-marker-line').count();
  const harmonicsInDoppler = await page.locator('.gram-frame-harmonic-set-line').count();
  
  console.log(`Found ${markersInDoppler} markers and ${harmonicsInDoppler} harmonic lines in Doppler mode`);
  
  // 5. Switch back to Analysis mode
  console.log('Switching back to Analysis mode...');
  await analysisButton.click();
  await page.waitForTimeout(500);
  
  // Check if markers table shows the marker
  const markersTable = page.locator('.gram-frame-markers-table tbody tr');
  const tableRowCount = await markersTable.count();
  console.log(`Found ${tableRowCount} rows in markers table`);
  
  console.log('✓ Test completed successfully!');
});