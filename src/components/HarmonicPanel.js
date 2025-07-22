/**
 * Harmonic Management Panel Component
 */

/// <reference path="../types.js" />

/**
 * Create harmonic management panel
 * @param {HTMLElement} container - Container element to append the panel to
 * @param {Object} instance - GramFrame instance
 * @returns {HTMLElement} The created panel element
 */
export function createHarmonicPanel(container, instance) {
  const panel = document.createElement('div')
  panel.className = 'gram-frame-harmonic-panel'
  panel.innerHTML = `
    <div class="gram-frame-harmonic-header">
      <h4>Harmonic Sets</h4>
    </div>
    <div class="gram-frame-harmonic-list">
      <table class="gram-frame-harmonic-table">
        <thead>
          <tr>
            <th>Color</th>
            <th>Spacing (Hz)</th>
            <th>Rate</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
        </tbody>
      </table>
    </div>
  `
  
  container.appendChild(panel)
  return panel
}

/**
 * Update harmonic panel content
 * @param {HTMLElement} panel - Panel element
 * @param {Object} instance - GramFrame instance
 */
export function updateHarmonicPanelContent(panel, instance) {
  if (!panel) return
  
  const listContainer = panel.querySelector('.gram-frame-harmonic-list')
  if (!listContainer) return
  
  const harmonicSets = instance.state.harmonics.harmonicSets
  
  // Always create table structure with headers, populate tbody based on harmonic sets
  const tableBodyHTML = harmonicSets.length === 0 ? '' : harmonicSets.map(harmonicSet => {
    // Calculate rate: cursor frequency / spacing
    // For display, we'll show a representative rate based on a middle harmonic
    const representativeHarmonic = 5
    const representativeFreq = representativeHarmonic * harmonicSet.spacing
    const rate = (representativeFreq / harmonicSet.spacing).toFixed(2)
    
    return `
      <tr data-harmonic-id="${harmonicSet.id}">
        <td>
          <div class="gram-frame-harmonic-color" style="background-color: ${harmonicSet.color}"></div>
        </td>
        <td class="gram-frame-harmonic-spacing">${harmonicSet.spacing.toFixed(1)}</td>
        <td class="gram-frame-harmonic-rate">${rate}</td>
        <td>
          <button class="gram-frame-harmonic-delete" data-harmonic-id="${harmonicSet.id}" title="Delete harmonic set">×</button>
        </td>
      </tr>
    `
  }).join('')
  
  // Create table for harmonic sets - always show headers
  const tableHTML = `
    <table class="gram-frame-harmonic-table">
      <thead>
        <tr>
          <th>Color</th>
          <th>Spacing (Hz)</th>
          <th>Rate</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${tableBodyHTML}
      </tbody>
    </table>
  `
  
  listContainer.innerHTML = tableHTML
  
  // Add event listeners for delete buttons
  const deleteButtons = listContainer.querySelectorAll('.gram-frame-harmonic-delete')
  deleteButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault()
      const harmonicId = button.getAttribute('data-harmonic-id')
      if (harmonicId) {
        instance._removeHarmonicSet(harmonicId)
        // Panel will be updated automatically by the remove method
      }
    })
  })
}

/**
 * Show or hide the harmonic panel based on mode
 * @param {HTMLElement} panel - Panel element
 * @param {string} mode - Current mode
 */
export function toggleHarmonicPanelVisibility(panel, mode) {
  if (!panel) return
  
  if (mode === 'harmonics') {
    panel.style.display = 'block'
  } else {
    panel.style.display = 'none'
  }
}