/**
 * Type definitions for the zoom-demonstrator project
 * @module types
 */

/**
 * @typedef {Object} Point2D
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * @typedef {Object} DataRange
 * @property {number} minX - Minimum X value (e.g., frequency in Hz)
 * @property {number} maxX - Maximum X value
 * @property {number} minY - Minimum Y value (e.g., time in seconds)
 * @property {number} maxY - Maximum Y value
 */

/**
 * @typedef {Object} ImageDimensions
 * @property {number} width - Image width in pixels
 * @property {number} height - Image height in pixels
 */

/**
 * @typedef {Object} ZoomState
 * @property {number} scaleX - X-axis zoom scale factor (1.0 = no zoom)
 * @property {number} scaleY - Y-axis zoom scale factor (1.0 = no zoom)
 * @property {number} panX - X-axis pan offset in SVG units
 * @property {number} panY - Y-axis pan offset in SVG units
 */

/**
 * @typedef {Object} SVGDelta
 * @property {number} x - X-axis delta in SVG units
 * @property {number} y - Y-axis delta in SVG units
 */

/**
 * @typedef {Object} PanLimits
 * @property {number} minPanX - Minimum allowed X pan value
 * @property {number} maxPanX - Maximum allowed X pan value
 * @property {number} minPanY - Minimum allowed Y pan value
 * @property {number} maxPanY - Maximum allowed Y pan value
 */

/**
 * @typedef {Object} VisibleDataBounds
 * @property {number} minX - Minimum visible X data value
 * @property {number} maxX - Maximum visible X data value
 * @property {number} minY - Minimum visible Y data value
 * @property {number} maxY - Maximum visible Y data value
 */

/**
 * @typedef {Object} TestImageConfig
 * @property {string} src - Image source path
 * @property {DataRange} dataRange - Data coordinate ranges
 * @property {number} nativeWidth - Native image width in pixels
 * @property {number} nativeHeight - Native image height in pixels
 * @property {string} description - Human-readable description
 */

/**
 * @typedef {Object.<string, TestImageConfig>} TestImageConfigs
 */

/**
 * @typedef {Object} CoordinateSet
 * @property {Point2D} screen - Screen coordinates (pixels from container top-left)
 * @property {Point2D} svg - SVG coordinates (accounting for zoom/pan)
 * @property {Point2D} image - Image pixel coordinates
 * @property {Point2D} data - Data coordinates (e.g., frequency/time)
 * @property {Point2D} zoom - Current zoom levels (x and y scale factors)
 * @property {Point2D} pan - Current pan offsets
 */

/**
 * @typedef {Object} SVGViewBox
 * @property {number} x - ViewBox X origin
 * @property {number} y - ViewBox Y origin
 * @property {number} width - ViewBox width
 * @property {number} height - ViewBox height
 */

/**
 * @typedef {Object} ContainerDimensions
 * @property {number} width - Container width in pixels
 * @property {number} height - Container height in pixels
 */

/**
 * @typedef {'pan'|'zoom'} InteractionMode
 */

/**
 * @typedef {Object} TickSpacing
 * @property {number} interval - Spacing between ticks in data units
 * @property {number[]} ticks - Array of tick values
 */

/**
 * @typedef {Object} AxisLabel
 * @property {number} value - Data value for the label
 * @property {number} position - Position in pixels
 * @property {string} text - Formatted label text
 */

// Re-export for convenience
export const Types = {
  // This is just for documentation - these types are used via JSDoc comments
};