/**
 * Secure HTML rendering utilities
 * 
 * This module provides XSS-safe methods for rendering HTML content by creating
 * DOM elements programmatically instead of using innerHTML with string content.
 * This prevents all forms of HTML injection attacks while preserving rich formatting.
 */

/**
 * A single titled block of guidance bullet points.
 * @typedef {Object} GuidanceSection
 * @property {string} title - The section heading text
 * @property {string[]} items - Array of guidance items (rendered as bullet points)
 */

/**
 * Guidance content structure for type safety. Either a single title + items, or
 * multiple titled sections (used by Pan mode to show the global Mouse-Wheel help
 * alongside the pan-specific help).
 * @typedef {Object} GuidanceContent
 * @property {string} [title] - The main heading text (single-section form)
 * @property {string[]} [items] - Guidance items (single-section form)
 * @property {GuidanceSection[]} [sections] - Multiple titled sections (multi-section form)
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

  // Normalise to a list of sections so single- and multi-section content share
  // one render path.
  const sections = Array.isArray(content.sections)
    ? content.sections
    : [{ title: content.title, items: content.items }]

  sections.forEach(section => {
    // Create and append the section title
    if (section.title) {
      const title = document.createElement('h4')
      title.textContent = section.title
      container.appendChild(title)
    }

    // Create and append guidance items as paragraphs with bullet points
    if (section.items && Array.isArray(section.items)) {
      section.items.forEach(item => {
        const paragraph = document.createElement('p')
        // Use textContent to prevent XSS - bullet point is safe literal
        paragraph.textContent = `• ${item}`
        container.appendChild(paragraph)
      })
    }
  })
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

