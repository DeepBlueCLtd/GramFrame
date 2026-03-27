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
 * Creates an SVG circle element with the specified coordinates and class
 * @param {number} cx - Center x coordinate
 * @param {number} cy - Center y coordinate
 * @param {number} r - Radius
 * @param {string} className - CSS class name
 * @returns {SVGCircleElement} The created circle element
 */
export function createSVGCircle(cx, cy, r, className) {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  circle.setAttribute('cx', String(cx))
  circle.setAttribute('cy', String(cy))
  circle.setAttribute('r', String(r))
  circle.setAttribute('class', className)
  return circle
}


