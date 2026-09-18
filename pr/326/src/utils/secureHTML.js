/**
 * Secure HTML rendering utilities
 *
 * This module provides XSS-safe methods for rendering HTML content by creating
 * DOM elements programmatically instead of using innerHTML with string content.
 * This prevents all forms of HTML injection attacks while preserving rich
 * formatting.
 *
 * It builds DOM and nothing else: which sections a mode's guidance has, and
 * whether a line carries a trigger, is decided by `utils/guidanceContent.js`,
 * where it can be unit-tested. What is left here is one loop over a settled
 * list, so there is nothing to get wrong in the half that no test can reach.
 */

import { resolveGuidance } from './guidanceContent.js'

/**
 * Build one guidance row: the trigger in its own fixed track, the outcome
 * beside it, or — for a line with no trigger — one full-width note.
 *
 * `textContent` throughout: the trigger and the outcome are authored strings,
 * but this module's whole reason for existing is that guidance never reaches
 * the DOM as markup.
 * @param {import('./guidanceContent.js').ResolvedGuidanceLine} line - The line
 * @returns {HTMLDivElement} The row
 */
function buildGuidanceRow(line) {
  const row = document.createElement('div')
  row.className = 'gram-frame-guidance-row'

  if (line.trigger !== '') {
    const trigger = document.createElement('div')
    trigger.className = 'gram-frame-guidance-trigger'
    trigger.textContent = line.trigger
    row.appendChild(trigger)
  }

  const outcome = document.createElement('div')
  outcome.className = line.trigger === ''
    ? 'gram-frame-guidance-note'
    : 'gram-frame-guidance-outcome'
  outcome.textContent = line.outcome
  row.appendChild(outcome)
  return row
}

/**
 * Build a section's heading, with its qualifier if it has one.
 *
 * A qualifier rides the heading rather than taking a line of its own — it
 * describes the whole section, and a line costs the control row a full row's
 * height. Its own element so the CSS can drop the heading's uppercase and
 * letter-spacing for it, which is what keeps the two on one line.
 * @param {import('./guidanceContent.js').ResolvedGuidanceSection} section - The section
 * @returns {HTMLHeadingElement} The heading
 */
function buildGuidanceHeading(section) {
  const title = document.createElement('h4')
  title.textContent = section.title
  if (section.qualifier !== '') {
    const qualifier = document.createElement('span')
    qualifier.className = 'gram-frame-guidance-qualifier'
    qualifier.textContent = ` (${section.qualifier})`
    title.appendChild(qualifier)
  }
  return title
}

/**
 * Securely render guidance content to a DOM element.
 * Creates DOM elements programmatically to prevent XSS attacks.
 *
 * @param {HTMLElement} container - Target container element
 * @param {import('./guidanceContent.js').GuidanceContent} content - Structured guidance content
 */
function renderSecureGuidance(container, content) {
  container.replaceChildren()

  resolveGuidance(content).forEach(section => {
    if (section.title !== '') {
      container.appendChild(buildGuidanceHeading(section))
    }
    section.lines.forEach(line => {
      container.appendChild(buildGuidanceRow(line))
    })
  })
}

/**
 * Securely update guidance panel content
 * Wrapper function specifically for guidance panels with error handling
 *
 * @param {HTMLElement} guidancePanel - The guidance panel element
 * @param {import('./guidanceContent.js').GuidanceContent} content - Structured guidance content
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
