/**
 * Harmonic Management Panel Component
 */

/// <reference path="../types.js" />

/**
 * Create harmonic management panel
 * @param {HTMLElement} container - Container element to append the panel to
 * @returns {HTMLElement} The created panel element
 */
export function createHarmonicPanel(container) {
  const panel = document.createElement('div')
  panel.className = 'gram-frame-harmonic-panel'
  panel.innerHTML = `
    <div class="gram-frame-harmonic-list">
      <table class="gram-frame-harmonic-table">
        <thead>
          <tr>
            <th>Color</th>
            <th>Spacing (Hz)</th>
            <th>Ratio</th>
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

  if (!panel) {

    return
  }
  
  const listContainer = panel.querySelector('.gram-frame-harmonic-list')

  if (!listContainer) {

    return
  }
  
  const harmonicSets = instance.state.harmonics.harmonicSets
  
  // Store current selection to restore after table update
  const currentSelection = instance.state.selection

  
  // Always create table structure with headers, populate tbody based on harmonic sets
  const tableBodyHTML = harmonicSets.length === 0 ? '' : harmonicSets.map((harmonicSet) => {
    // Calculate rate: cursor frequency / spacing
    // If cursor position is available, use it; otherwise show a representative rate
    let rate
    if (instance.state.cursorPosition && instance.state.cursorPosition.freq > 0) {
      rate = (instance.state.cursorPosition.freq / harmonicSet.spacing).toFixed(2)
    } else {
      // Fallback: show a representative rate based on a middle harmonic
      const representativeHarmonic = 5
      rate = representativeHarmonic.toFixed(2)
    }
    
    return `
      <tr data-harmonic-id="${harmonicSet.id}" class="gram-frame-harmonic-row">
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
          <th>Ratio</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${tableBodyHTML}
      </tbody>
    </table>
  `
  

  listContainer.innerHTML = tableHTML

  
  // Add event listeners for row clicks (selection) and delete buttons
  const harmonicRows = listContainer.querySelectorAll('.gram-frame-harmonic-row')
  harmonicRows.forEach((row, index) => {
    const harmonicId = row.getAttribute('data-harmonic-id')
    
    // Add click handler for selection
    row.addEventListener('click', (event) => {
      // Don't trigger selection if clicking delete button
      if (event.target && /** @type {Element} */ (event.target).closest('.gram-frame-harmonic-delete')) {
        return
      }
      
      // Import keyboard control functions
      import('../core/keyboardControl.js').then(({ setSelection, clearSelection }) => {
        // Toggle selection
        if (instance.state.selection.selectedType === 'harmonicSet' && 
            instance.state.selection.selectedId === harmonicId) {
          clearSelection(instance)
        } else {
          setSelection(instance, 'harmonicSet', harmonicId, index)
        }
      })
    })
  })
  
  // Add event listeners for delete buttons
  const deleteButtons = listContainer.querySelectorAll('.gram-frame-harmonic-delete')
  deleteButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const harmonicId = button.getAttribute('data-harmonic-id')
      if (harmonicId && instance.currentMode && instance.currentMode.removeHarmonicSet) {
        instance.currentMode.removeHarmonicSet(harmonicId)
        // Panel will be updated automatically by the remove method
      }
    })
  })
  
  // Restore selection highlighting after table update
  if (currentSelection.selectedType === 'harmonicSet' && currentSelection.selectedId) {
    // Import and call updateSelectionVisuals to restore highlighting
    import('../core/keyboardControl.js').then(({ updateSelectionVisuals }) => {
      updateSelectionVisuals(instance)
    })
  }
}