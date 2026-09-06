/**
 * The three annotation tables — markers, harmonic sets, sideband sets — and
 * the headers above them.
 *
 * All three are visible at all times, whatever mode is armed: a set is managed
 * from its own table wherever the analyst happens to be (issue #241). What
 * lives here is the furniture they share — the header, the count chip, the
 * empty-state line, and the slot each mode fills with its own table. What the
 * columns contain is each mode's business, in `AnalysisMode`, `HarmonicPanel`
 * and `SidebandPanel`.
 *
 * The sideband column carries one extra thing: the footer holding "Clear all
 * annotations". Sideband sets are rare, so the foot of that column is the space
 * the panel has going spare — and clearing is not a view control, so it does
 * not belong in the mode rail beside zoom and fit.
 */

/// <reference path="../types.js" />

/**
 * The containers the layout mounts and the modes fill.
 * @typedef {Object} AnnotationTableElements
 * @property {HTMLDivElement} tables - The three columns' shared container
 * @property {HTMLDivElement} markersContainer - Markers column
 * @property {HTMLDivElement} harmonicsContainer - Harmonics column
 * @property {HTMLDivElement} sidebandsContainer - Sidebands column
 */

/**
 * Build one table column: a header, and the space beneath it a mode fills.
 * @param {string} className - The column's own class
 * @param {string} title - Heading text
 * @returns {HTMLDivElement} The column
 */
function createTableColumn(className, title) {
  const column = document.createElement('div')
  column.className = `gram-frame-table-column ${className}`

  const header = document.createElement('div')
  header.className = 'gram-frame-panel-header'

  const heading = document.createElement('h4')
  heading.textContent = title
  header.appendChild(heading)

  // How many of this kind there are, hidden while there are none: a chip
  // reading "0" is noise beside an empty state that already says so.
  const count = document.createElement('span')
  count.className = 'gram-frame-count-chip'
  count.hidden = true
  header.appendChild(count)

  column.appendChild(header)
  return column
}

/**
 * Build the three annotation columns.
 * @returns {AnnotationTableElements} The columns, ready to mount and fill
 */
export function createAnnotationTables() {
  const tables = document.createElement('div')
  tables.className = 'gram-frame-tables'

  const markersContainer = createTableColumn('gram-frame-markers-persistent-container', 'Markers')

  const harmonicsContainer = createTableColumn('gram-frame-harmonics-persistent-container', 'Harmonics')
  // The slot HarmonicsMode mounts its "+ Manual" button into. It is a command
  // for the harmonics table specifically, so it rides that table's header
  // rather than the mode rail, where it would be one mode's command among four
  // view controls.
  const harmonicsButtons = document.createElement('div')
  harmonicsButtons.className = 'gram-frame-harmonics-button-container'
  const harmonicsHeader = harmonicsContainer.querySelector('.gram-frame-panel-header')
  if (harmonicsHeader) {
    harmonicsHeader.classList.add('gram-frame-harmonics-header')
    harmonicsHeader.appendChild(harmonicsButtons)
  }

  const sidebandsContainer = createTableColumn('gram-frame-sidebands-persistent-container', 'Sidebands')

  tables.appendChild(markersContainer)
  tables.appendChild(harmonicsContainer)
  tables.appendChild(sidebandsContainer)

  return { tables, markersContainer, harmonicsContainer, sidebandsContainer }
}

/**
 * Show how many of each kind of annotation there are.
 *
 * Called from the same place the tables themselves are refreshed, so the chip
 * and the rows it counts can never disagree.
 * @param {GramFrame} instance - GramFrame instance
 * @returns {void}
 */
export function refreshTableCounts(instance) {
  const { analysis, harmonics, sidebands } = instance.state
  const { markersContainer, harmonicsContainer, sidebandsContainer } = instance.ui
  setCount(markersContainer, analysis ? analysis.markers.length : 0)
  setCount(harmonicsContainer, harmonics ? harmonics.harmonicSets.length : 0)
  setCount(sidebandsContainer, sidebands ? sidebands.sidebandSets.length : 0)
}

/**
 * Write one column's count chip, hiding it at zero.
 * @param {HTMLElement|null} container - The column
 * @param {number} count - How many rows it holds
 * @returns {void}
 */
function setCount(container, count) {
  const chip = container ? container.querySelector('.gram-frame-count-chip') : null
  if (!(chip instanceof HTMLElement)) {
    return
  }
  chip.textContent = String(count)
  chip.hidden = count === 0
}

/**
 * Put the "Clear all annotations" button at the foot of the sidebands column.
 *
 * Trainer pages only — a student's annotations are session-scoped and there is
 * nothing to clear. It is here rather than in the mode rail beside zoom and fit
 * because it removes annotations, not view state, and a destructive control
 * among three view controls is one slip from an afternoon's work. Sideband sets
 * are rare, so the bottom of that column is the space the panel has spare.
 * @param {GramFrame} instance - GramFrame instance
 * @param {function(): void} onClear - What the button does
 * @returns {void}
 */
export function mountClearAllButton(instance, onClear) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'gram-frame-clear-btn'
  button.textContent = 'Clear all annotations'
  button.title = 'Remove every cross, harmonic set and sideband set'
  button.addEventListener('click', event => {
    event.preventDefault()
    onClear()
  })

  const footer = document.createElement('div')
  footer.className = 'gram-frame-tables-footer'
  footer.appendChild(button)

  if (instance.ui.sidebandsContainer) {
    instance.ui.sidebandsContainer.appendChild(footer)
  }
}
