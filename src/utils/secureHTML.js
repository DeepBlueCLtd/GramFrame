/**
 * Secure HTML rendering utilities
 * 
 * This module provides XSS-safe methods for rendering HTML content by creating
 * DOM elements programmatically instead of using innerHTML with string content.
 * This prevents all forms of HTML injection attacks while preserving rich formatting.
 */

/**
 * Guidance content structure for type safety
 * @typedef {Object} GuidanceContent
 * @property {string} title - The main heading text
 * @property {string[]} items - Array of guidance items (will be rendered as bullet points)
 */

/**
 * Securely render guidance content to a DOM element
 * Creates DOM elements programmatically to prevent XSS attacks
 * 
 * @param {HTMLElement} container - Target container element
 * @param {GuidanceContent} content - Structured guidance content
 */
export function renderSecureGuidance(container, content) {
  // Clear existing content safely
  container.replaceChildren()
  
  // Create and append title
  if (content.title) {
    const title = document.createElement('h4')
    title.textContent = content.title
    container.appendChild(title)
  }
  
  // Create and append guidance items as paragraphs with bullet points
  if (content.items && Array.isArray(content.items)) {
    content.items.forEach(item => {
      const paragraph = document.createElement('p')
      // Use textContent to prevent XSS - bullet point is safe literal
      paragraph.textContent = `• ${item}`
      container.appendChild(paragraph)
    })
  }
}

/**
 * Securely update guidance panel content
 * Wrapper function specifically for guidance panels with error handling
 * 
 * @param {HTMLElement} guidancePanel - The guidance panel element
 * @param {GuidanceContent} content - Structured guidance content
 */
export function updateGuidancePanel(guidancePanel, content) {
  if (!guidancePanel) {
    console.warn('Guidance panel element not found')
    return
  }
  
  if (!content) {
    console.warn('No guidance content provided')
    return
  }
  
  try {
    renderSecureGuidance(guidancePanel, content)
  } catch (error) {
    console.error('Error updating guidance panel:', error)
    // Fallback to safe error message
    guidancePanel.replaceChildren()
    const errorMsg = document.createElement('p')
    errorMsg.textContent = 'Error loading guidance content'
    guidancePanel.appendChild(errorMsg)
  }
}

