/**
 * Table and DOM structure creation for GramFrame component
 */

/// <reference path="../types.js" />

/**
 * Create the complete DOM structure for the GramFrame component
 * @param {Object} instance - GramFrame instance to populate with DOM elements
 * @returns {Object} Object containing all created DOM elements
 */
export function createComponentStructure(instance) {
  // Create a container to replace the table
  instance.container = document.createElement('div')
  instance.container.className = 'gram-frame-container'
  
  // Create table structure for proper resizing
  instance.table = document.createElement('div')
  instance.table.className = 'gram-frame-table'
  instance.container.appendChild(instance.table)
  
  // Create mode header row
  instance.modeRow = document.createElement('div')
  instance.modeRow.className = 'gram-frame-row'
  instance.table.appendChild(instance.modeRow)
  
  instance.modeCell = document.createElement('div')
  instance.modeCell.className = 'gram-frame-cell gram-frame-mode-header'
  instance.modeRow.appendChild(instance.modeCell)
  
  // Create main panel row (stretches)
  instance.mainRow = document.createElement('div')
  instance.mainRow.className = 'gram-frame-row'
  instance.mainRow.style.height = '100%'
  instance.table.appendChild(instance.mainRow)
  
  instance.mainCell = document.createElement('div')
  instance.mainCell.className = 'gram-frame-cell gram-frame-main-panel'
  instance.mainRow.appendChild(instance.mainCell)
  
  instance.readoutPanel = document.createElement('div')
  instance.readoutPanel.className = 'gram-frame-readout'
  // Will be appended to modeCell in UIComponents.js
  
  return {
    container: instance.container,
    table: instance.table,
    modeRow: instance.modeRow,
    modeCell: instance.modeCell,
    mainRow: instance.mainRow,
    mainCell: instance.mainCell,
    readoutPanel: instance.readoutPanel
  }
}

// Image display removed - component stripped to minimum







/**
 * Replace the original config table with the new component structure
 * @param {Object} instance - GramFrame instance with created DOM structure
 * @param {HTMLTableElement} configTable - Original table to replace
 */
export function replaceConfigTable(instance, configTable) {
  // Replace the table with our container
  if (configTable && configTable.parentNode) {
    configTable.parentNode.replaceChild(instance.container, configTable)
    
    // Store a reference to this instance on the container element
    // This allows the state listener mechanism to access the instance
    // @ts-ignore - Adding custom property to DOM element
    instance.container.__gramFrameInstance = instance
  }
}

/**
 * Create minimal component table structure
 * @param {Object} instance - GramFrame instance
 * @param {HTMLTableElement} configTable - Original table to replace
 * @returns {Object} Object containing all created elements
 */
export function setupComponentTable(instance, configTable) {
  // Create DOM structure only
  const domElements = createComponentStructure(instance)
  
  // Replace original table
  replaceConfigTable(instance, configTable)
  
  return domElements
}