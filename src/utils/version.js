/**
 * Generated version constants
 * Auto-generated from package.json - do not edit manually
 */

export const VERSION = '0.0.1'

/**
 * Get the current version of GramFrame
 * @returns {string} Version string from package.json
 */
export function getVersion() {
  return VERSION
}

/**
 * Create a version display element
 * @param {Object} [options] - Display options
 * @param {string} [options.className] - CSS class name (default: 'gram-frame-version')
 * @param {string} [options.position] - Position within container (default: 'bottom-right')
 * @returns {HTMLElement} Version display element
 */
export function createVersionDisplay(options = {}) {
  const { className = 'gram-frame-version', position = 'bottom-right' } = options
  const versionElement = document.createElement('div')
  versionElement.className = `${className} ${className}-${position}`
  versionElement.textContent = `v${getVersion()}`
  versionElement.title = `GramFrame version ${getVersion()}`
  
  return versionElement
}
