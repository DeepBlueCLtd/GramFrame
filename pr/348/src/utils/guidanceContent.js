/**
 * What a mode's guidance actually says, as data.
 *
 * A mode returns its guidance in one of two shapes — a single title with lines,
 * or several titled sections — and each line is either a trigger/outcome pair
 * or a plain note with no trigger to lift out. Four shapes to render, from two
 * optional fields and a union. This module also appends the gestures that work
 * in every mode, so no mode has to remember to.
 *
 * Deciding which is which is arithmetic over plain objects, so it lives here
 * where it can be tested, and `utils/secureHTML.js` is left with one loop over
 * a settled list. That module builds DOM and cannot be exercised by the unit
 * lane at all; every branch moved out of it is a branch that gets checked.
 */

import { NAVIGATION_GUIDANCE } from './navigationGuidance.js'

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
 * Guidance content as a mode returns it. Either a single title + items, or
 * multiple titled sections.
 * @typedef {Object} GuidanceContent
 * @property {string} [title] - The main heading text (single-section form)
 * @property {Array<GuidanceItem|string>} [items] - Guidance lines (single-section form)
 * @property {GuidanceSection[]} [sections] - Multiple titled sections (multi-section form)
 */

/**
 * One line, resolved. `trigger` is empty for a line that has none, which is the
 * one thing the renderer needs to know about it.
 * @typedef {Object} ResolvedGuidanceLine
 * @property {string} trigger - The gesture, or '' for a plain note
 * @property {string} outcome - What it does, or the note's whole text
 */

/**
 * One section, resolved: no optional fields left, and its lines settled.
 * @typedef {Object} ResolvedGuidanceSection
 * @property {string} title - Heading text, or '' for an untitled section
 * @property {string} qualifier - Aside for the heading, or ''
 * @property {ResolvedGuidanceLine[]} lines - The section's lines
 */

/**
 * Append the cross-mode gestures to a mode's own guidance.
 *
 * They apply in every mode — wheel zoom and pan, the wheel-button drag, Shift +
 * drag region zoom are all resolved centrally, ahead of mode delegation — and
 * they used to be shown in Pan's guidance alone, because Pan is the initial
 * mode and the old panel had room for them nowhere else. An analyst who armed
 * Cross Cursor first therefore never learnt that Shift + drag zooms. The
 * redesigned column has the height, so every mode carries them.
 *
 * Beneath the mode's own lines, under their own heading: the column's header
 * names the armed mode, so the rows directly under it should be the ones
 * answering it.
 * @param {GuidanceContent|null|undefined} content - The mode's own guidance
 * @returns {GuidanceContent & {sections: GuidanceSection[]}} That guidance, with
 *   the shared section appended
 */
export function withNavigationGuidance(content) {
  const own = resolveGuidance(content).map(section => ({
    title: section.title,
    qualifier: section.qualifier,
    items: section.lines.map(line => (
      line.trigger === '' ? line.outcome : { trigger: line.trigger, outcome: line.outcome }
    ))
  }))

  return {
    sections: [...own, { title: 'In every mode', items: [...NAVIGATION_GUIDANCE] }]
  }
}

/**
 * Resolve a mode's guidance into a flat list of sections and lines.
 *
 * Total: any shape in, a renderable list out. Content that is missing, not an
 * object, or carries no lines at all resolves to an empty list rather than to
 * something the renderer has to guard against.
 * @param {GuidanceContent|null|undefined} content - Guidance as a mode returned it
 * @returns {ResolvedGuidanceSection[]} The sections to draw, in order
 */
export function resolveGuidance(content) {
  if (!content || typeof content !== 'object') {
    return []
  }

  const sections = Array.isArray(content.sections)
    ? content.sections
    : [{ title: content.title, qualifier: undefined, items: content.items }]

  return sections
    .filter(section => section && typeof section === 'object')
    .map(section => ({
      title: typeof section.title === 'string' ? section.title : '',
      qualifier: typeof section.qualifier === 'string' ? section.qualifier : '',
      lines: resolveLines(section.items)
    }))
    // A section with neither a heading nor a line has nothing to draw, and an
    // empty <h4>-less block would still cost the column a row's gap.
    .filter(section => section.title !== '' || section.lines.length > 0)
}

/**
 * Resolve one section's lines.
 * @param {Array<GuidanceItem|string>|undefined} items - The section's lines
 * @returns {ResolvedGuidanceLine[]} The lines, settled
 */
function resolveLines(items) {
  if (!Array.isArray(items)) {
    return []
  }
  return items
    .map(item => {
      if (typeof item === 'string') {
        return { trigger: '', outcome: item }
      }
      if (item && typeof item === 'object') {
        return {
          trigger: typeof item.trigger === 'string' ? item.trigger : '',
          outcome: typeof item.outcome === 'string' ? item.outcome : ''
        }
      }
      return { trigger: '', outcome: '' }
    })
    .filter(line => line.trigger !== '' || line.outcome !== '')
}
