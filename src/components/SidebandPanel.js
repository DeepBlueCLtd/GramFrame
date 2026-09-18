/**
 * Sideband Management Panel Component (issue #241)
 *
 * The sidebands table, built on the shared {@link createDiffingTable} engine —
 * the same one behind the markers table and the harmonics panel. What lives
 * here is what makes this the *sidebands* panel: its columns (the fundamental
 * and the spacing), its cell formatting, and what selecting or deleting a
 * sideband set means.
 */

/// <reference path="../types.js" />

import { createColorIndicator } from '../rendering/symbols.js'
import { createDiffingTable } from './DiffingTable.js'

/**
 * The diffing table backing each panel element, so the
 * `updateSidebandPanelContent(panel, instance)` signature works for every
 * caller without them holding the table handle.
 * @type {WeakMap<HTMLElement, {update: function(any[]): void, destroy: function(): void, element: HTMLTableElement}>}
 */
const panelTables = new WeakMap()

/**
 * Build the colour cell's contents: the set's symbol drawn in its colour (or a
 * plain filled rectangle for the symbol-less `cross` style), inside the tinted
 * wrapper the harmonics panel uses.
 * @param {SidebandSet} sidebandSet - The sideband set data
 * @returns {HTMLDivElement} The colour cell content
 */
function createColorCellContent(sidebandSet) {
  const colorDiv = document.createElement('div')
  colorDiv.className = 'gram-frame-sideband-color'
  colorDiv.style.color = sidebandSet.color
  colorDiv.appendChild(createColorIndicator(sidebandSet.symbol, sidebandSet.color))
  return colorDiv
}

/**
 * Build a sideband row's delete button, matching the harmonics panel's markup.
 * @param {SidebandSet} sidebandSet - The sideband set data
 * @returns {HTMLButtonElement} The delete button
 */
function createSidebandDeleteButton(sidebandSet) {
  const button = document.createElement('button')
  button.className = 'gram-frame-sideband-delete'
  button.setAttribute('data-sideband-id', sidebandSet.id)
  button.title = 'Delete sideband set'
  button.textContent = '\u00d7'
  return button
}

/**
 * Create the sideband management panel.
 *
 * Mounted inside a `gram-frame-table-area` wrapper, exactly as the markers and
 * harmonics tables are: the wrapper takes whatever vertical space the column
 * has and the panel fills it, so however many sets exist the panel scrolls
 * instead of growing the page layout.
 *
 * @param {HTMLElement} container - Container element to append the panel to
 * @param {GramFrame} instance - GramFrame instance
 * @returns {HTMLElement} The created panel element
 */
export function createSidebandPanel(container, instance) {
  const table = createDiffingTable(container, {
    columns: [
      { label: '', width: '14%' },
      { label: 'Freq', width: '36%', cellClassName: 'gram-frame-sideband-freq gram-frame-cell-numeric' },
      { label: 'Spacing', width: '36%', cellClassName: 'gram-frame-sideband-spacing gram-frame-cell-numeric' },
      { label: '', width: '14%', cellClassName: 'gram-frame-cell-action' }
    ],
    emptyMessage: 'Click to set the sideband origin',
    rowAttribute: 'data-sideband-id',
    rowClassName: 'gram-frame-sideband-row',
    rowKey: (sidebandSet) => sidebandSet.id,
    cells: (sidebandSet) => [
      createColorCellContent(sidebandSet),
      sidebandSet.fundamentalFreq.toFixed(2),
      sidebandSet.spacing.toFixed(2),
      createSidebandDeleteButton(sidebandSet)
    ],
    deleteSelector: '.gram-frame-sideband-delete',
    onSelect: (sidebandSetId, _sidebandSet, index) =>
      instance.interaction.toggleSelection('sidebandSet', sidebandSetId, index),
    onDelete: (sidebandSetId) => instance.interaction.removeSidebandSet(sidebandSetId),
    isSelected: (sidebandSetId) => instance.interaction.isFeatureSelected('sidebandSet', sidebandSetId)
  })

  const panel = /** @type {HTMLElement} */ (table.element.parentElement)
  // Named so the mode can re-resolve its own panel from the container after a
  // mode switch has rebuilt its UI references.
  panel.classList.add('gram-frame-sideband-panel')
  panelTables.set(panel, table)
  return panel
}

/**
 * Update sideband panel content
 * @param {HTMLElement} panel - Panel element
 * @param {GramFrame} instance - GramFrame instance
 */
export function updateSidebandPanelContent(panel, instance) {
  if (!panel) {
    return
  }

  const table = panelTables.get(panel)
  if (!table) {
    return
  }

  table.update(instance.state.sidebands.sidebandSets)
}
