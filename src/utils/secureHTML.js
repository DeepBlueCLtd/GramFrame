/**
 * Secure HTML rendering utilities
 * 
 * This module provides XSS-safe methods for rendering HTML content by creating
 * DOM elements programmatically instead of using innerHTML with string content.
 * This prevents all forms of HTML injection attacks while preserving rich formatting.
 */

/**
 * One line of guidance, split into the gesture that starts it and what that
 * gesture does.
 *
 * The split is what lets an analyst scan the column: every trigger sits in the
 * same narrow left-hand track, so the four gestures of a mode compare down the
 * page instead of having to be read out of four sentences.
 * @typedef {Object} GuidanceItem
 * @property {string} trigger - The gesture ("Click", "Right-click", "Row + ← →")
 * @property {string} outcome - What it does ("to add a persistent cross")
 */

/**
 * A single titled block of guidance lines.
 * @typedef {Object} GuidanceSection
 * @property {string} [title] - The section heading text
 * @property {string} [qualifier] - Aside appended to the heading, in parentheses
 * @property {Array<GuidanceItem|string>} [items] - The lines. A plain string is
 *   rendered as one full-width line with no trigger track.
 */

/**
 * Guidance content structure for type safety. Either a single title + items, or
 * multiple titled sections (used by Pan mode to show the global Mouse-Wheel help
 * alongside the pan-specific help).
 * @typedef {Object} GuidanceContent
 * @property {string} [title] - The main heading text (single-section form)
 * @property {Array<GuidanceItem|string>} [items] - Guidance lines (single-section form)
 * @property {GuidanceSection[]} [sections] - Multiple titled sections (multi-section form)
 */

/**
 * Build one guidance row.
 *
 * `textContent` throughout — the trigger and the outcome are authored strings,
 * but this module's whole reason for existing is that guidance never reaches
 * the DOM as markup.
 * @param {GuidanceItem|string} item - The line
 * @returns {HTMLDivElement} The row
 */
function buildGuidanceRow(item) {
  const row = document.createElement('div')
  row.className = 'gram-frame-guidance-row'

  if (typeof item === 'string') {
    const note = document.createElement('div')
    note.className = 'gram-frame-guidance-note'
    note.textContent = item
    row.appendChild(note)
    return row
  }

  const trigger = document.createElement('div')
  trigger.className = 'gram-frame-guidance-trigger'
  trigger.textContent = item.trigger

  const outcome = document.createElement('div')
  outcome.className = 'gram-frame-guidance-outcome'
  outcome.textContent = item.outcome

  row.appendChild(trigger)
  row.appendChild(outcome)
  return row
}

/**
 * Securely render guidance content to a DOM element
 * Creates DOM elements programmatically to prevent XSS attacks
 *
 * @param {HTMLElement} container - Target container element
 * @param {GuidanceContent} content - Structured guidance content
 */
function renderSecureGuidance(container, content) {
  // Clear existing content safely
  container.replaceChildren()

  // Normalise to a list of sections so single- and multi-section content share
  // one render path. The single-section form may omit either field, which is
  // why GuidanceSection marks both optional and why each is guarded below.
  /** @type {GuidanceSection[]} */
  const sections = Array.isArray(content.sections)
    ? content.sections
    : [{ title: content.title, items: content.items }]

  sections.forEach(section => {
    // Create and append the section title
    if (section.title) {
      const title = document.createElement('h4')
      title.textContent = section.title
      // A qualifier rides the heading rather than taking a bullet of its own —
      // it describes the whole section, and a bullet costs the control row a
      // full line. Its own element so the CSS can drop the heading's uppercase
      // and letter-spacing for it, which is what keeps the two on one line.
      if (section.qualifier) {
        const qualifier = document.createElement('span')
        qualifier.className = 'gram-frame-guidance-qualifier'
        qualifier.textContent = ` (${section.qualifier})`
        title.appendChild(qualifier)
      }
      container.appendChild(title)
    }

    // Each line is a two-column row: the trigger in its own fixed track, the
    // outcome beside it. A line given as a plain string has no trigger to lift
    // out, so it spans both tracks.
    if (section.items && Array.isArray(section.items)) {
      section.items.forEach(item => {
        container.appendChild(buildGuidanceRow(item))
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

