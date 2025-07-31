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
 * @param {GramFrame} instance - GramFrame instance
 */
export function updateHarmonicPanelContent(panel, instance) {
  if (!panel) {
    return
  }
  
  const tbody = /** @type {HTMLTableSectionElement} */ (panel.querySelector('.gram-frame-harmonic-table tbody'))
  if (!tbody) {
    return
  }
  
  const harmonicSets = instance.state.harmonics.harmonicSets
  const existingRows = tbody.querySelectorAll('tr')
  
  // Update existing rows or create new ones
  harmonicSets.forEach((harmonicSet, index) => {
    let row = existingRows[index]
    
    if (row && row.getAttribute('data-harmonic-id') === harmonicSet.id) {
      // Update existing row - only update cells that change
      updateHarmonicRow(row, harmonicSet, instance)
    } else {
      // Need to rebuild from this point
      rebuildHarmonicTableFrom(tbody, harmonicSets, instance, index)
      return
    }
  })
  
  // Remove extra rows if harmonic sets were deleted
  for (let i = harmonicSets.length; i < existingRows.length; i++) {
    existingRows[i].remove()
  }
}

/**
 * Update only the changing cells in an existing harmonic row
 * @param {HTMLTableRowElement} row - The table row to update
 * @param {HarmonicSet} harmonicSet - The harmonic set data
 * @param {GramFrame} instance - GramFrame instance
 */
function updateHarmonicRow(row, harmonicSet, instance) {
  // Update spacing cell if changed
  const spacingCell = row.cells[1]
  if (spacingCell) {
    const newSpacing = harmonicSet.spacing.toFixed(1)
    if (spacingCell.textContent !== newSpacing) {
      spacingCell.textContent = newSpacing
    }
  }
  
  // Update rate cell - this changes with cursor position
  const rateCell = row.cells[2]
  if (rateCell) {
    let rate
    if (instance.state.cursorPosition && instance.state.cursorPosition.freq > 0) {
      rate = (instance.state.cursorPosition.freq / harmonicSet.spacing).toFixed(2)
    } else {
      rate = '5.00' // Representative rate for 5th harmonic
    }
    
    if (rateCell.textContent !== rate) {
      rateCell.textContent = rate
    }
  }
}

/**
 * Rebuild the harmonic table from a specific index
 * @param {HTMLTableSectionElement} tbody - Table body element
 * @param {Array} harmonicSets - Array of harmonic sets
 * @param {GramFrame} instance - GramFrame instance
 * @param {number} startIndex - Index to start rebuilding from
 */
function rebuildHarmonicTableFrom(tbody, harmonicSets, instance, startIndex) {
  // Remove rows from startIndex onward
  const existingRows = tbody.querySelectorAll('tr')
  for (let i = startIndex; i < existingRows.length; i++) {
    existingRows[i].remove()
  }
  
  // Add new rows from startIndex
  for (let index = startIndex; index < harmonicSets.length; index++) {
    const harmonicSet = harmonicSets[index]
    const row = createHarmonicRow(harmonicSet, instance, index)
    tbody.appendChild(row)
  }
  
  // Restore selection highlighting if needed
  instance.updateSelectionVisuals()
}

/**
 * Create a new harmonic table row
 * @param {HarmonicSet} harmonicSet - The harmonic set data
 * @param {GramFrame} instance - GramFrame instance
 * @param {number} index - Row index
 * @returns {HTMLTableRowElement} The created row
 */
function createHarmonicRow(harmonicSet, instance, index) {
  const row = document.createElement('tr')
  row.setAttribute('data-harmonic-id', harmonicSet.id)
  row.className = 'gram-frame-harmonic-row'
  
  // Color cell
  const colorCell = document.createElement('td')
  const colorDiv = document.createElement('div')
  colorDiv.className = 'gram-frame-harmonic-color'
  colorDiv.style.backgroundColor = harmonicSet.color
  colorCell.appendChild(colorDiv)
  row.appendChild(colorCell)
  
  // Spacing cell
  const spacingCell = document.createElement('td')
  spacingCell.className = 'gram-frame-harmonic-spacing'
  spacingCell.textContent = harmonicSet.spacing.toFixed(1)
  row.appendChild(spacingCell)
  
  // Rate cell
  const rateCell = document.createElement('td')
  rateCell.className = 'gram-frame-harmonic-rate'
  let rate
  if (instance.state.cursorPosition && instance.state.cursorPosition.freq > 0) {
    rate = (instance.state.cursorPosition.freq / harmonicSet.spacing).toFixed(2)
  } else {
    rate = '5.00'
  }
  rateCell.textContent = rate
  row.appendChild(rateCell)
  
  // Delete button cell
  const actionCell = document.createElement('td')
  const deleteButton = document.createElement('button')
  deleteButton.className = 'gram-frame-harmonic-delete'
  deleteButton.setAttribute('data-harmonic-id', harmonicSet.id)
  deleteButton.title = 'Delete harmonic set'
  deleteButton.textContent = '×'
  actionCell.appendChild(deleteButton)
  row.appendChild(actionCell)
  
  // Add event listeners
  row.addEventListener('click', (event) => {
    // Don't trigger selection if clicking delete button
    if (event.target && /** @type {Element} */ (event.target).closest('.gram-frame-harmonic-delete')) {
      return
    }
    
    // Toggle selection
    if (instance.state.selection.selectedType === 'harmonicSet' && 
        instance.state.selection.selectedId === harmonicSet.id) {
      instance.clearSelection()
    } else {
      instance.setSelection('harmonicSet', harmonicSet.id, index)
    }
  })
  
  deleteButton.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (instance.currentMode && instance.currentMode.removeHarmonicSet) {
      instance.currentMode.removeHarmonicSet(harmonicSet.id)
    }
  })
  
  return row
}