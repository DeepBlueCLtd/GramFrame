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

/**
 * Legacy helper: Parse HTML string content to structured format
 * This helps transition existing getGuidanceText() methods to the new format
 * 
 * @deprecated Use structured content directly instead of HTML strings
 * @param {string} htmlString - Legacy HTML string
 * @returns {GuidanceContent} Structured content object
 */
export function parseGuidanceHTML(htmlString) {
  console.warn('parseGuidanceHTML is deprecated - use structured content instead')
  
  // Create temporary container to parse HTML safely
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlString
  
  // Extract title from h4
  const titleElement = tempDiv.querySelector('h4')
  const title = titleElement ? titleElement.textContent : ''
  
  // Extract items from paragraphs
  const paragraphs = tempDiv.querySelectorAll('p')
  const items = Array.from(paragraphs).map(p => {
    const text = p.textContent || ''
    // Remove bullet point if present to avoid double bullets
    return text.startsWith('• ') ? text.substring(2) : text
  })
  
  return { title, items }
}