/**
 * Harmonic Management Panel Component
 *
 * The panel's table is a {@link createDiffingTable} instance: the row-diffing
 * mechanism is shared with the markers table (spec 166, FR-009), and what stays
 * here is what makes this the *harmonics* panel — its columns, its cell
 * formatting, and what selecting or deleting a harmonic set means.
 */

/// <reference path="../types.js" />

import { createColorIndicator } from '../rendering/symbols.js'
import { createDiffingTable } from './DiffingTable.js'

/**
 * The diffing table backing each panel element, so the existing
 * `updateHarmonicPanelContent(panel, instance)` signature keeps working for its
 * several callers.
 * @type {WeakMap<HTMLElement, {update: function(any[]): void, destroy: function(): void, element: HTMLTableElement}>}
 */
const panelTables = new WeakMap()

/**
 * Build the colour/symbol indicator for a harmonic set's table row: the set's
 * symbol drawn in its colour, or — for the symbol-less `cross` style — a plain
 * filled colour rectangle (feature 161). Colour-blind-friendly affordance.
 * @param {HarmonicSet} harmonicSet - The harmonic set data
 * @returns {SVGSVGElement|HTMLDivElement} The indicator element
 */
function createSymbolSwatch(harmonicSet) {
  return createColorIndicator(harmonicSet.symbol, harmonicSet.color)
}

/**
 * Build the colour cell's contents: the swatch inside the tinted wrapper the
 * panel has always used.
 * @param {HarmonicSet} harmonicSet - The harmonic set data
 * @returns {HTMLDivElement} The colour cell content
 */
function createColorCellContent(harmonicSet) {
  const colorDiv = document.createElement('div')
  colorDiv.className = 'gram-frame-harmonic-color'
  colorDiv.style.color = harmonicSet.color
  colorDiv.appendChild(createSymbolSwatch(harmonicSet))
  return colorDiv
}

/**
 * The ratio of the cursor's frequency to a set's spacing, as displayed.
 * @param {HarmonicSet} harmonicSet - The harmonic set data
 * @param {GramFrame} instance - GramFrame instance
 * @returns {string} Formatted ratio
 */
function formatRatio(harmonicSet, instance) {
  if (instance.state.cursorPosition && instance.state.cursorPosition.freq > 0) {
    return (instance.state.cursorPosition.freq / harmonicSet.spacing).toFixed(3)
  }
  return '5.000' // Representative rate for 5th harmonic
}

/**
 * Build a harmonic row's delete button. Markup unchanged from before the table
 * engines were shared, so existing selectors and styling keep working (T2).
 * @param {HarmonicSet} harmonicSet - The harmonic set data
 * @returns {HTMLButtonElement} The delete button
 */
function createHarmonicDeleteButton(harmonicSet) {
  const button = document.createElement('button')
  button.className = 'gram-frame-harmonic-delete'
  button.setAttribute('data-harmonic-id', harmonicSet.id)
  button.title = 'Delete harmonic set'
  button.textContent = '\u00d7'
  return button
}

/**
 * Create harmonic management panel
 *
 * The panel is mounted inside a `gram-frame-table-area` wrapper: the wrapper
 * takes whatever vertical space the column has, and the panel fills it
 * absolutely, so however many harmonic sets exist the panel scrolls instead of
 * growing the page layout (the header row stays pinned via sticky `th`).
 *
 * @param {HTMLElement} container - Container element to append the panel to
 * @param {GramFrame} instance - GramFrame instance
 * @returns {HTMLElement} The created panel element
 */
export function createHarmonicPanel(container, instance) {
  const table = createDiffingTable(container, {
    columns: [
      { label: '', width: '15%' },
      { label: 'Spacing (Hz)', width: '35%', cellClassName: 'gram-frame-harmonic-spacing' },
      { label: 'Ratio', width: '35%', cellClassName: 'gram-frame-harmonic-rate' },
      { label: '', width: '15%' }
    ],
    rowAttribute: 'data-harmonic-id',
    rowClassName: 'gram-frame-harmonic-row',
    rowKey: (harmonicSet) => harmonicSet.id,
    cells: (harmonicSet) => [
      createColorCellContent(harmonicSet),
      harmonicSet.spacing.toFixed(2),
      formatRatio(harmonicSet, instance),
      createHarmonicDeleteButton(harmonicSet)
    ],
    deleteSelector: '.gram-frame-harmonic-delete',
    onSelect: (harmonicSetId, _harmonicSet, index) => {
      // Toggle selection
      if (instance.state.selection.selectedType === 'harmonicSet' &&
          instance.state.selection.selectedId === harmonicSetId) {
        instance.interaction.clearSelection()
      } else {
        instance.interaction.setSelection('harmonicSet', harmonicSetId, index)
      }
    },
    onDelete: (harmonicSetId) => instance.interaction.removeHarmonicSet(harmonicSetId),
    isSelected: (harmonicSetId) => (
      instance.state.selection.selectedType === 'harmonicSet' &&
      instance.state.selection.selectedId === harmonicSetId
    )
  })

  const panel = /** @type {HTMLElement} */ (table.element.parentElement)
  panelTables.set(panel, table)
  return panel
}

/**
 * Update harmonic panel content
 * @param {HTMLElement} panel - Panel element
 * @param {GramFrame} instance - GramFrame instance
 */
export function updateHarmonicPanelContent(panel, instance) {
  if (!panel) {
    return
  }

  const table = panelTables.get(panel)
  if (!table) {
    return
  }

  table.update(instance.state.harmonics.harmonicSets)
}
