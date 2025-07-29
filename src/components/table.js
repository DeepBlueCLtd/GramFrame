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

/**
 * Create SVG structure and groups for rendering
 * @param {Object} instance - GramFrame instance to populate with SVG elements
 * @returns {Object} Object containing all created SVG elements
 */
export function createSVGStructure(instance) {
  // Create SVG element for rendering inside main panel
  instance.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  instance.svg.setAttribute('class', 'gram-frame-svg')
  instance.svg.setAttribute('width', '100%')
  instance.svg.setAttribute('height', 'auto')
  instance.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  instance.mainCell.appendChild(instance.svg)
  
  // Create defs for clipping path
  instance.defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  instance.svg.appendChild(instance.defs)
  
  // Create clip path for content area
  instance.clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
  instance.clipPath.setAttribute('id', `gram-frame-clip-${Math.random().toString(36).substr(2, 9)}`)
  instance.defs.appendChild(instance.clipPath)
  
  // Create clip rect (will be updated with proper dimensions)
  instance.clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  instance.clipPath.appendChild(instance.clipRect)
  
  // Create zoom container for scalable content
  instance.zoomContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  instance.zoomContainer.setAttribute('class', 'gram-frame-zoom-container')
  instance.zoomContainer.setAttribute('clip-path', `url(#${instance.clipPath.getAttribute('id')})`)
  instance.svg.appendChild(instance.zoomContainer)
  
  // Create main group for content with margins for axes (inside zoom container)
  instance.mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  instance.mainGroup.setAttribute('class', 'gram-frame-main-group')
  instance.zoomContainer.appendChild(instance.mainGroup)
  
  // Create image element within main group for spectrogram
  instance.svgImage = document.createElementNS('http://www.w3.org/2000/svg', 'image')
  instance.svgImage.setAttribute('class', 'gram-frame-image')
  instance.mainGroup.appendChild(instance.svgImage)
  
  // Create cursor indicator group (inside zoom container to scale with content)
  instance.cursorGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  instance.cursorGroup.setAttribute('class', 'gram-frame-cursor-group')
  instance.zoomContainer.appendChild(instance.cursorGroup)
  
  // Create groups for axes (outside zoom container - they don't scale)
  instance.timeAxisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  instance.timeAxisGroup.setAttribute('class', 'gram-frame-time-axis')
  instance.svg.appendChild(instance.timeAxisGroup)
  
  instance.freqAxisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  instance.freqAxisGroup.setAttribute('class', 'gram-frame-freq-axis')
  instance.svg.appendChild(instance.freqAxisGroup)
  
  return {
    svg: instance.svg,
    zoomContainer: instance.zoomContainer,
    mainGroup: instance.mainGroup,
    svgImage: instance.svgImage,
    timeAxisGroup: instance.timeAxisGroup,
    freqAxisGroup: instance.freqAxisGroup,
    cursorGroup: instance.cursorGroup
  }
}







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
 * Create complete component table structure including DOM and SVG
 * @param {Object} instance - GramFrame instance
 * @param {HTMLTableElement} configTable - Original table to replace
 * @returns {Object} Object containing all created elements
 */
export function setupComponentTable(instance, configTable) {
  // Create DOM structure
  const domElements = createComponentStructure(instance)
  
  // Create SVG structure
  const svgElements = createSVGStructure(instance)
  
  // Replace original table
  replaceConfigTable(instance, configTable)
  
  return {
    ...domElements,
    ...svgElements
  }
}