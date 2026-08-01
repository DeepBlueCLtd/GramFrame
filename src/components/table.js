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
 * Create the complete DOM structure for the GramFrame component.
 *
 * Builds locally and returns; it writes nothing onto the instance. That is what
 * lets the constructor assemble `instance.ui` in one place, after every element
 * exists, rather than the sub-object having to be half-formed before the first
 * step runs (spec 167, FR-009).
 * @param {string} instanceId - Instance id, used to make the clip-path ids unique
 * @returns {TableElements} Object containing all created DOM elements
 */
function createComponentStructure(instanceId) {
  // Create a container to replace the table. It starts in the loading state:
  // the SVG has no dimensions until the spectrogram's natural size is known, so
  // the panel would otherwise be an unexplained empty black rectangle until the
  // image arrives. setupSpectrogramImage() clears the class on load.
  const container = document.createElement('div')
  container.className = 'gram-frame-container gram-frame-loading'

  // Create table structure for proper resizing
  const table = document.createElement('div')
  table.className = 'gram-frame-table'
  container.appendChild(table)

  // Create mode header row
  const modeRow = document.createElement('div')
  modeRow.className = 'gram-frame-row'
  table.appendChild(modeRow)

  const modeCell = document.createElement('div')
  modeCell.className = 'gram-frame-cell gram-frame-mode-header'
  modeRow.appendChild(modeCell)

  // Create main panel row (stretches)
  const mainRow = document.createElement('div')
  mainRow.className = 'gram-frame-row'
  mainRow.style.height = '100%'
  table.appendChild(mainRow)

  const mainCell = document.createElement('div')
  mainCell.className = 'gram-frame-cell gram-frame-main-panel'
  mainRow.appendChild(mainCell)

  // Create SVG container for spectrogram display
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('class', 'gram-frame-svg')
  svg.style.width = '100%'
  svg.style.height = '100%'
  svg.style.display = 'block'
  mainCell.appendChild(svg)

  // Create clipping paths for both image and cursor group with unique IDs
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  svg.appendChild(defs)

  const clipPathId = `imageClip-${instanceId || Date.now()}`
  const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
  clipPath.setAttribute('id', clipPathId)
  defs.appendChild(clipPath)

  const imageClipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  clipPath.appendChild(imageClipRect)

  // Create second clipping path for cursor group features
  const cursorClipPathId = `cursorClip-${instanceId || Date.now()}`
  const cursorClipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
  cursorClipPath.setAttribute('id', cursorClipPathId)
  defs.appendChild(cursorClipPath)

  const cursorClipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  cursorClipPath.appendChild(cursorClipRect)

  // Create image element within SVG
  const spectrogramImage = document.createElementNS('http://www.w3.org/2000/svg', 'image')
  spectrogramImage.setAttribute('class', 'gram-frame-spectrogram-image')
  spectrogramImage.setAttribute('clip-path', `url(#${clipPathId})`)
  spectrogramImage.setAttribute('preserveAspectRatio', 'none')
  svg.appendChild(spectrogramImage)

  // Create cursor group for overlays with clipping applied
  const cursorGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  cursorGroup.setAttribute('class', 'gram-frame-cursors')
  cursorGroup.setAttribute('clip-path', `url(#${cursorClipPathId})`)
  svg.appendChild(cursorGroup)

  // Create axes group
  const axesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  axesGroup.setAttribute('class', 'gram-frame-axes')
  svg.appendChild(axesGroup)

  const readoutPanel = document.createElement('div')
  readoutPanel.className = 'gram-frame-readout'
  // Will be appended to modeCell by the layout step

  return {
    container,
    table,
    modeRow,
    modeCell,
    mainRow,
    mainCell,
    readoutPanel,
    svg,
    spectrogramImage,
    cursorGroup,
    axesGroup,
    imageClipRect,
    cursorClipRect
  }
}

/**
 * Replace the original config table with the new component structure
 * @param {GramFrame} instance - GramFrame instance, stamped onto the container
 * @param {HTMLDivElement} container - Component container standing in for the table
 * @param {HTMLTableElement} configTable - Original table to replace
 */
function replaceConfigTable(instance, container, configTable) {
  // Replace the table with our container
  if (configTable && configTable.parentNode) {
    configTable.parentNode.replaceChild(container, configTable)

    // Store a reference to this instance on the container element
    // This allows the state listener mechanism to access the instance
    // @ts-ignore - Adding custom property to DOM element
    container.__gramFrameInstance = instance
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
  const domElements = createComponentStructure(instance.instanceId)

  // Replace original table
  replaceConfigTable(instance, domElements.container, configTable)

  return domElements
}
