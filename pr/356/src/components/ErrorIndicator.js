/**
 * The standard initialisation-error box.
 *
 * Built here so the two places that show it — the API, when a config table
 * fails to construct, and the audio setup step, when a recording cannot be
 * loaded or analysed after construction (spec 168, FR-007) — produce the same
 * element and the same class the tests look for.
 */

/**
 * Build the `.gramframe-error-indicator` element.
 * @param {string} errorMsg - The cause, shown to the reader
 * @returns {HTMLDivElement} The indicator, not yet attached
 */
export function createErrorIndicator(errorMsg) {
  const errorDiv = document.createElement('div')
  errorDiv.className = 'gramframe-error-indicator'
  errorDiv.style.cssText = `
    position: relative;
    background-color: #ffe6e6;
    border: 2px solid #ff6b6b;
    border-radius: 4px;
    padding: 10px;
    margin: 10px 0;
    color: #d32f2f;
    font-family: monospace;
    font-size: 14px;
  `

  // Create content safely without innerHTML
  const strongElement = document.createElement('strong')
  strongElement.textContent = 'GramFrame Initialization Error:'

  const errorText = document.createElement('div')
  errorText.textContent = errorMsg

  const smallElement = document.createElement('small')
  smallElement.textContent = 'Check the browser console for detailed error information.'

  errorDiv.appendChild(strongElement)
  errorDiv.appendChild(document.createElement('br'))
  errorDiv.appendChild(errorText)
  errorDiv.appendChild(document.createElement('br'))
  errorDiv.appendChild(smallElement)

  return errorDiv
}
