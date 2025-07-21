/**
 * SVG utility functions for creating common elements
 */

/**
 * Creates an SVG line element with the specified coordinates and class
 * @param {number} x1 - Starting x coordinate
 * @param {number} y1 - Starting y coordinate
 * @param {number} x2 - Ending x coordinate
 * @param {number} y2 - Ending y coordinate
 * @param {string} className - CSS class name
 * @returns {SVGLineElement} The created line element
 */
export function createSVGLine(x1, y1, x2, y2, className) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line.setAttribute('x1', String(x1))
  line.setAttribute('y1', String(y1))
  line.setAttribute('x2', String(x2))
  line.setAttribute('y2', String(y2))
  line.setAttribute('class', className)
  return line
}

/**
 * Creates an SVG text element with the specified position, content, and styling
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {string} textContent - Text content
 * @param {string} className - CSS class name
 * @param {string} [textAnchor='start'] - Text anchor position
 * @returns {SVGTextElement} The created text element
 */
export function createSVGText(x, y, textContent, className, textAnchor = 'start') {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  text.setAttribute('x', String(x))
  text.setAttribute('y', String(y))
  text.setAttribute('text-anchor', textAnchor)
  text.setAttribute('class', className)
  text.textContent = textContent
  return text
}

/**
 * Calculates layout dimensions including margins
 * @param {number} containerWidth - Width of the container
 * @param {number} aspectRatio - Image aspect ratio
 * @param {number} originalWidth - Original image width
 * @param {number} originalHeight - Original image height
 * @param {Object} margins - Margin object with left, right, top, bottom properties
 * @returns {Object} Layout dimensions object
 */
export function calculateLayoutDimensions(containerWidth, aspectRatio, originalWidth, originalHeight, margins) {
  const totalMarginWidth = margins.left + margins.right
  const totalMarginHeight = margins.top + margins.bottom

  const availableWidth = containerWidth - totalMarginWidth
  const availableHeight = availableWidth / aspectRatio

  const newWidth = availableWidth + totalMarginWidth
  const newHeight = availableHeight + totalMarginHeight

  const viewBoxWidth = originalWidth + totalMarginWidth
  const viewBoxHeight = originalHeight + totalMarginHeight

  return {
    totalMarginWidth,
    totalMarginHeight,
    availableWidth,
    availableHeight,
    newWidth,
    newHeight,
    viewBoxWidth,
    viewBoxHeight
  }
}

/**
 * Calculates position with margin offset
 * @param {number} value - Base value
 * @param {number} marginOffset - Margin offset to add
 * @returns {number} Position with margin offset
 */
export function withMarginOffset(value, marginOffset) {
  return value + marginOffset
}