/**
 * The per-mode guidance column, and the rail it collapses to.
 *
 * The column sits immediately beside the mode rail, so the armed tool and the
 * gestures that drive it read as one block. Its space is dedicated: collapsing
 * it hands the width to the annotation tables and nothing else ever moves in.
 *
 * The column owns two things the mode does not: the header naming the armed
 * mode, and the collapse. What goes in the body is still the mode's — every
 * mode's `getGuidanceText()` — rendered through `utils/secureHTML.js`, which is
 * the only path guidance takes to the DOM.
 */

/// <reference path="../types.js" />

import { getModeDisplayName } from '../modes/modeRoster.js'
import { updateGuidancePanel } from '../utils/secureHTML.js'
import { withNavigationGuidance } from '../utils/guidanceContent.js'
import { loadGuidancePreference, saveGuidancePreference } from '../core/preferences.js'
import { dispatch } from '../core/state.js'

/**
 * Whether this instance's analyst has decided about the column, as opposed to
 * leaving it to the panel's own width.
 *
 * A WeakMap rather than a field on the instance or a key in state: it is not
 * part of what the component broadcasts, and it is read by exactly this module.
 * @type {WeakMap<object, boolean>}
 */
const hasChosen = new WeakMap()

/**
 * The parts of the guidance column its owner has to hold on to.
 * @typedef {Object} GuidanceColumnElements
 * @property {HTMLDivElement} column - The column itself, mounted in the control row
 * @property {HTMLDivElement} body - Where the mode's guidance is rendered
 * @property {HTMLDivElement} title - The header's mode name
 */

/**
 * Build the guidance column: a header naming the armed mode with a Hide
 * button, a body for that mode's lines, and — shown in its place when
 * collapsed — a 40px rail carrying a reveal button and the word "Guidance".
 *
 * Both faces are built once and swapped by a class on the column, rather than
 * torn down and rebuilt: the body holds the current mode's rendered guidance,
 * and collapsing should not throw that away only to re-render it on reveal.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {GuidanceColumnElements} The column and the handles into it
 */
export function createGuidanceColumn(instance) {
  // The stored choice, if there is one. `null` means the analyst has never
  // touched the column and the panel decides by its own width.
  const stored = loadGuidancePreference()
  instance.state.guidanceCollapsed = stored === true
  hasChosen.set(instance, stored !== null)

  const column = document.createElement('div')
  column.className = 'gram-frame-guidance-column'

  const header = document.createElement('div')
  header.className = 'gram-frame-guidance-header'

  const title = document.createElement('div')
  title.className = 'gram-frame-guidance-title'

  const hide = document.createElement('button')
  hide.type = 'button'
  hide.className = 'gram-frame-guidance-hide'
  hide.textContent = 'Hide'
  hide.title = 'Hide guidance'
  hide.addEventListener('click', event => {
    event.preventDefault()
    setGuidanceCollapsed(instance, true)
  })

  header.appendChild(title)
  header.appendChild(hide)

  // `gram-frame-guidance` stays the body's class: it is what the guidance
  // renderer and every existing caller address, and what the body *is* has not
  // changed — only what surrounds it.
  const body = document.createElement('div')
  body.className = 'gram-frame-guidance'

  const rail = document.createElement('div')
  rail.className = 'gram-frame-guidance-rail'

  const reveal = document.createElement('button')
  reveal.type = 'button'
  reveal.className = 'gram-frame-guidance-reveal'
  reveal.textContent = '›'
  reveal.title = 'Show guidance'
  reveal.setAttribute('aria-label', 'Show guidance')
  reveal.addEventListener('click', event => {
    event.preventDefault()
    setGuidanceCollapsed(instance, false)
  })

  const railLabel = document.createElement('div')
  railLabel.className = 'gram-frame-guidance-rail-label'
  railLabel.textContent = 'Guidance'

  rail.appendChild(reveal)
  rail.appendChild(railLabel)

  column.appendChild(header)
  column.appendChild(body)
  column.appendChild(rail)

  return { column, body, title }
}

/**
 * Collapse the guidance column to its rail, or open it again, and remember the
 * choice for next time.
 *
 * Dispatched like any other state change. The column is chrome rather than
 * annotation, but "what does this instance look like right now" is exactly what
 * a listener is asking, and a host page that mirrors the panel's state has no
 * other way to hear about it.
 * @param {GramFrame} instance - GramFrame instance
 * @param {boolean} collapsed - Whether the column shows its rail
 * @returns {void}
 */
function setGuidanceCollapsed(instance, collapsed) {
  instance.state.guidanceCollapsed = collapsed
  hasChosen.set(instance, true)
  saveGuidancePreference(collapsed)
  applyGuidanceCollapsed(instance)
  dispatch(instance)
}

/**
 * Put the column into the state the flag describes.
 *
 * Three states, stamped as two classes. Once the analyst has decided,
 * collapsing adds `-collapsed` and opening adds `-open`, and either beats the
 * width rule in the stylesheet that otherwise collapses a narrow panel's
 * guidance for them. With neither class the column is automatic — which is
 * where it starts, and where it stays until someone presses Hide or the reveal.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {void}
 */
export function applyGuidanceCollapsed(instance) {
  const { guidanceColumn } = instance.ui
  if (!guidanceColumn) {
    return
  }
  const collapsed = !!instance.state.guidanceCollapsed
  const chosen = hasChosen.get(instance) === true
  guidanceColumn.classList.toggle('gram-frame-guidance-collapsed', collapsed)
  guidanceColumn.classList.toggle('gram-frame-guidance-open', chosen && !collapsed)
}

/**
 * Show a mode's guidance: its name in the header, its lines in the body.
 *
 * The one call site for both halves, so the header can never name one mode
 * while the body describes another — which is exactly what a second,
 * independent "also set the title" call would eventually allow.
 * @param {GramFrame} instance - GramFrame instance
 * @param {import('../modes/BaseMode.js').BaseMode} mode - The armed mode
 * @returns {void}
 */
export function showGuidanceForMode(instance, mode) {
  const { guidanceTitle, guidancePanel } = instance.ui
  if (guidanceTitle) {
    guidanceTitle.textContent = getModeDisplayName(instance.state.mode)
  }
  if (guidancePanel) {
    // Every mode's own lines, then the gestures that work in all of them.
    updateGuidancePanel(guidancePanel, withNavigationGuidance(mode.getGuidanceText()))
  }
}
