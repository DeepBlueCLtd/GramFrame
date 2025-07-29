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
 * Create SVG structure and groups for rendering with viewport-based zoom support
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
  
  // Initialize viewport-based zoom structure
  setupViewportZoom(instance)
  
  // Create main group for content with margins for axes
  instance.mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  instance.mainGroup.setAttribute('class', 'gram-frame-main-group')
  instance.svg.appendChild(instance.mainGroup)
  
  // Create image element within main group for spectrogram
  instance.svgImage = document.createElementNS('http://www.w3.org/2000/svg', 'image')
  instance.svgImage.setAttribute('class', 'gram-frame-image')
  instance.mainGroup.appendChild(instance.svgImage)
  
  // Create groups for axes
  instance.timeAxisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  instance.timeAxisGroup.setAttribute('class', 'gram-frame-time-axis')
  instance.svg.appendChild(instance.timeAxisGroup)
  
  instance.freqAxisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  instance.freqAxisGroup.setAttribute('class', 'gram-frame-freq-axis')
  instance.svg.appendChild(instance.freqAxisGroup)
  
  // Create cursor indicator group
  instance.cursorGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  instance.cursorGroup.setAttribute('class', 'gram-frame-cursor-group')
  instance.svg.appendChild(instance.cursorGroup)
  
  return {
    svg: instance.svg,
    mainGroup: instance.mainGroup,
    svgImage: instance.svgImage,
    timeAxisGroup: instance.timeAxisGroup,
    freqAxisGroup: instance.freqAxisGroup,
    cursorGroup: instance.cursorGroup
  }
}

/**
 * Setup viewport-based zoom structure and state management
 * @param {Object} instance - GramFrame instance
 */
function setupViewportZoom(instance) {
  // Initialize zoom state in instance
  instance.zoomState = {
    level: 1.0,          // Current zoom level (1.0 = no zoom)
    viewBox: {           // Current viewBox parameters
      x: 0,
      y: 0, 
      width: 1000,       // Will be updated based on actual image dimensions
      height: 600        // Will be updated based on actual image dimensions
    },
    originalViewBox: {   // Original full-view viewBox for reference
      x: 0,
      y: 0,
      width: 1000,
      height: 600
    },
    panOffset: {         // Pan offset for zoomed views
      x: 0,
      y: 0
    }
  }
  
  // Add zoom control methods to instance
  instance.zoomIn = async function() {
    await setZoomLevel(instance, instance.zoomState.level * 1.5)
  }
  
  instance.zoomOut = async function() {
    await setZoomLevel(instance, instance.zoomState.level / 1.5)
  }
  
  instance.resetZoom = async function() {
    await setZoomLevel(instance, 1.0)
    await resetPan(instance)
  }
  
  instance.panBy = async function(deltaX, deltaY) {
    await panViewport(instance, deltaX, deltaY)
  }
  
  instance.setZoomLevel = async function(level) {
    await setZoomLevel(instance, level)
  }
  
  // Add renderAxes method reference for zoom system
  instance.renderAxes = function() {
    // Import drawAxes dynamically to avoid circular dependency
    import('../rendering/axes.js').then(({ drawAxes }) => {
      drawAxes(instance)
    })
  }
}

/**
 * Set zoom level and update viewBox accordingly
 * @param {Object} instance - GramFrame instance
 * @param {number} level - Zoom level (1.0 = no zoom, 2.0 = 2x zoom)
 */
async function setZoomLevel(instance, level) {
  // Clamp zoom level to reasonable bounds
  level = Math.max(0.5, Math.min(10.0, level))
  
  const oldLevel = instance.zoomState.level
  instance.zoomState.level = level
  
  // Update main state
  instance.state.zoom.level = level
  
  // Calculate new viewBox dimensions based on zoom level
  const originalWidth = instance.zoomState.originalViewBox.width
  const originalHeight = instance.zoomState.originalViewBox.height
  
  const newWidth = originalWidth / level
  const newHeight = originalHeight / level
  
  // Keep the center point the same when zooming (zoom to center)
  const currentCenterX = instance.zoomState.viewBox.x + instance.zoomState.viewBox.width / 2
  const currentCenterY = instance.zoomState.viewBox.y + instance.zoomState.viewBox.height / 2
  
  const newX = currentCenterX - newWidth / 2
  const newY = currentCenterY - newHeight / 2
  
  // Update viewBox state
  instance.zoomState.viewBox = {
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight
  }
  
  // Sync with main state
  instance.state.zoom.viewBox = { ...instance.zoomState.viewBox }
  
  // Apply viewBox to SVG
  updateSVGViewBox(instance)
  
  // Trigger axis re-rendering for new visible range
  if (instance.renderAxes) {
    instance.renderAxes()
  }
  
  // Notify state listeners of zoom change
  const { notifyStateListeners } = await import('../core/state.js')
  notifyStateListeners(instance.state, instance.stateListeners)
}

/**
 * Pan the viewport by given delta amounts
 * @param {Object} instance - GramFrame instance  
 * @param {number} deltaX - Pan delta in X direction
 * @param {number} deltaY - Pan delta in Y direction
 */
async function panViewport(instance, deltaX, deltaY) {
  // Convert screen delta to data coordinate delta based on current zoom
  const scaleX = instance.zoomState.viewBox.width / instance.svg.clientWidth
  const scaleY = instance.zoomState.viewBox.height / instance.svg.clientHeight
  
  const dataDeltaX = deltaX * scaleX
  const dataDeltaY = deltaY * scaleY
  
  // Update viewBox position
  instance.zoomState.viewBox.x += dataDeltaX
  instance.zoomState.viewBox.y += dataDeltaY
  
  // Clamp to bounds to prevent panning outside the original image
  const minX = instance.zoomState.originalViewBox.x
  const minY = instance.zoomState.originalViewBox.y
  const maxX = instance.zoomState.originalViewBox.x + instance.zoomState.originalViewBox.width - instance.zoomState.viewBox.width
  const maxY = instance.zoomState.originalViewBox.y + instance.zoomState.originalViewBox.height - instance.zoomState.viewBox.height
  
  instance.zoomState.viewBox.x = Math.max(minX, Math.min(maxX, instance.zoomState.viewBox.x))
  instance.zoomState.viewBox.y = Math.max(minY, Math.min(maxY, instance.zoomState.viewBox.y))
  
  // Sync with main state
  instance.state.zoom.viewBox = { ...instance.zoomState.viewBox }
  instance.state.zoom.panOffset.x = instance.zoomState.viewBox.x - instance.zoomState.originalViewBox.x
  instance.state.zoom.panOffset.y = instance.zoomState.viewBox.y - instance.zoomState.originalViewBox.y
  
  // Apply viewBox to SVG
  updateSVGViewBox(instance)
  
  // Trigger axis re-rendering for new visible range
  if (instance.renderAxes) {
    instance.renderAxes()
  }
  
  // Notify state listeners of pan change
  const { notifyStateListeners } = await import('../core/state.js')
  notifyStateListeners(instance.state, instance.stateListeners)
}

/**
 * Reset pan offset to center
 * @param {Object} instance - GramFrame instance
 */
async function resetPan(instance) {
  const centerX = instance.zoomState.originalViewBox.x + (instance.zoomState.originalViewBox.width - instance.zoomState.viewBox.width) / 2
  const centerY = instance.zoomState.originalViewBox.y + (instance.zoomState.originalViewBox.height - instance.zoomState.viewBox.height) / 2
  
  instance.zoomState.viewBox.x = centerX
  instance.zoomState.viewBox.y = centerY
  
  // Sync with main state
  instance.state.zoom.viewBox = { ...instance.zoomState.viewBox }
  instance.state.zoom.panOffset.x = 0
  instance.state.zoom.panOffset.y = 0
  
  updateSVGViewBox(instance)
  
  if (instance.renderAxes) {
    instance.renderAxes()
  }
  
  // Notify state listeners of pan reset
  const { notifyStateListeners } = await import('../core/state.js')
  notifyStateListeners(instance.state, instance.stateListeners)
}

/**
 * Update the SVG viewBox attribute based on current zoom state
 * @param {Object} instance - GramFrame instance
 */
function updateSVGViewBox(instance) {
  const vb = instance.zoomState.viewBox
  const viewBoxString = `${vb.x} ${vb.y} ${vb.width} ${vb.height}`
  instance.svg.setAttribute('viewBox', viewBoxString)
}

/**
 * Initialize zoom state based on actual image dimensions
 * @param {Object} instance - GramFrame instance
 * @param {number} imageWidth - Natural width of spectrogram image
 * @param {number} imageHeight - Natural height of spectrogram image
 */
export function initializeZoomForImageDimensions(instance, imageWidth, imageHeight) {
  // Update original viewBox to match actual image dimensions with margins
  const margins = instance.state.axes.margins
  const totalWidth = imageWidth + margins.left + margins.right
  const totalHeight = imageHeight + margins.top + margins.bottom
  
  instance.zoomState.originalViewBox = {
    x: 0,
    y: 0,
    width: totalWidth,
    height: totalHeight
  }
  
  // Initialize current viewBox to show full image
  instance.zoomState.viewBox = {
    x: 0,
    y: 0,
    width: totalWidth,
    height: totalHeight
  }
  
  // Sync with main state
  instance.state.zoom.originalViewBox = { ...instance.zoomState.originalViewBox }
  instance.state.zoom.viewBox = { ...instance.zoomState.viewBox }
  instance.state.zoom.level = 1.0
  instance.state.zoom.panOffset = { x: 0, y: 0 }
  
  // Set initial viewBox on SVG
  updateSVGViewBox(instance)
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