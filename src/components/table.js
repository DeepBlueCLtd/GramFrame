/**
 * Component scaffold: build the GramFrame DOM structure and put it in the
 * config table's place.
 *
 * What remains of the 713-line hub after the Story 3 split (spec 167, FR-004).
 * Its five other responsibilities now live in `components/spectrogramImage.js`,
 * `components/svgLayout.js`, `rendering/axes.js` and `utils/coordinates.js`.
 *
 * Imported by exactly one module, `core/initialization/DOMSetup.js`, which is
 * what a scaffold should look like.
 */

/// <reference path="../types.js" />

/**
 * Create the complete DOM structure for the GramFrame component
 * @param {GramFrame} instance - GramFrame instance to populate with DOM elements
 * @returns {TableElements} Object containing all created DOM elements
 */
function createComponentStructure(instance) {
  // Create a container to replace the table. It starts in the loading state:
  // the SVG has no dimensions until the spectrogram's natural size is known, so
  // the panel would otherwise be an unexplained empty black rectangle until the
  // image arrives. setupSpectrogramImage() clears the class on load.
  instance.container = document.createElement('div')
  instance.container.className = 'gram-frame-container gram-frame-loading'

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
  
  // Create SVG container for spectrogram display
  instance.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  instance.svg.setAttribute('class', 'gram-frame-svg')
  instance.svg.style.width = '100%'
  instance.svg.style.height = '100%'
  instance.svg.style.display = 'block'
  instance.mainCell.appendChild(instance.svg)
  
  // Create clipping paths for both image and cursor group with unique IDs
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  instance.svg.appendChild(defs)
  
  const clipPathId = `imageClip-${instance.instanceId || Date.now()}`
  const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
  clipPath.setAttribute('id', clipPathId)
  defs.appendChild(clipPath)
  
  instance.imageClipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  clipPath.appendChild(instance.imageClipRect)
  
  // Create second clipping path for cursor group features
  const cursorClipPathId = `cursorClip-${instance.instanceId || Date.now()}`
  const cursorClipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
  cursorClipPath.setAttribute('id', cursorClipPathId)
  defs.appendChild(cursorClipPath)
  
  instance.cursorClipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  cursorClipPath.appendChild(instance.cursorClipRect)
  
  // Create image element within SVG
  instance.spectrogramImage = document.createElementNS('http://www.w3.org/2000/svg', 'image')
  instance.spectrogramImage.setAttribute('class', 'gram-frame-spectrogram-image')
  instance.spectrogramImage.setAttribute('clip-path', `url(#${clipPathId})`)
  instance.spectrogramImage.setAttribute('preserveAspectRatio', 'none')
  instance.svg.appendChild(instance.spectrogramImage)
  
  // Create cursor group for overlays with clipping applied
  instance.cursorGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  instance.cursorGroup.setAttribute('class', 'gram-frame-cursors')
  instance.cursorGroup.setAttribute('clip-path', `url(#${cursorClipPathId})`)
  instance.svg.appendChild(instance.cursorGroup)
  
  // Create axes group
  instance.axesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  instance.axesGroup.setAttribute('class', 'gram-frame-axes')
  instance.svg.appendChild(instance.axesGroup)
  
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
    readoutPanel: instance.readoutPanel,
    svg: instance.svg,
    spectrogramImage: instance.spectrogramImage,
    cursorGroup: instance.cursorGroup,
    axesGroup: instance.axesGroup,
    imageClipRect: instance.imageClipRect,
    cursorClipRect: instance.cursorClipRect
  }
}

/**
 * Replace the original config table with the new component structure
 * @param {GramFrame} instance - GramFrame instance with created DOM structure
 * @param {HTMLTableElement} configTable - Original table to replace
 */
function replaceConfigTable(instance, configTable) {
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
 * @param {GramFrame} instance - GramFrame instance
 * @param {HTMLTableElement} configTable - Original table to replace
 * @returns {TableElements} Object containing all created elements
 */
export function setupComponentTable(instance, configTable) {
  // Create DOM structure only
  const domElements = createComponentStructure(instance)
  
  // Replace original table
  replaceConfigTable(instance, configTable)
  
  return domElements
}
