/**
 * The shared row-diffing table.
 *
 * The markers table and the harmonics panel had the same engine written twice
 * (spec 166, FR-009): the same fixed-height scroll wrapper, the same
 * update-in-place / rebuild-from-index / trim-the-tail diff, the same
 * click-to-select with a delete button excluded from it. They differed only in
 * their columns, their cell formatting, and what selection and deletion mean.
 *
 * This module owns the mechanism. The consumer owns the meaning, supplied as a
 * {@link TableSpec}: column labels, cell content, row identity, and the select
 * and delete callbacks. No cell formatting lives here (T4).
 *
 * The rendered DOM — element tags, class names, row and cell order — is
 * whatever the spec asks for, so both tables kept their existing markup and
 * every existing CSS selector and test kept working (T2).
 */

/// <reference path="../types.js" />

import { revealTableRow } from './tableScroll.js'

/**
 * Create a diffing table inside `container`.
 *
 * @param {HTMLElement} container - Element to append the table to
 * @param {TableSpec} spec - What to render and what selection/deletion mean
 * @returns {{update: function(any[]): void, destroy: function(): void, element: HTMLTableElement}} Table handle
 */
export function createDiffingTable(container, spec) {
  // Fixed-height scroll wrapper: the area takes whatever vertical space the
  // column has and the container fills it, so a long list scrolls instead of
  // growing the page layout. The header stays pinned via sticky `th` in CSS.
  const area = document.createElement('div')
  area.className = 'gram-frame-table-area'

  const wrapper = document.createElement('div')
  wrapper.className = 'gram-frame-table-container'

  const table = document.createElement('table')
  table.className = 'gram-frame-table'

  const thead = document.createElement('thead')
  const headerRow = document.createElement('tr')
  spec.columns.forEach((column) => {
    const th = document.createElement('th')
    th.textContent = column.label || ''
    if (column.width) {
      th.style.width = column.width
    }
    headerRow.appendChild(th)
  })
  thead.appendChild(headerRow)
  table.appendChild(thead)

  const tbody = document.createElement('tbody')
  table.appendChild(tbody)

  wrapper.appendChild(table)
  area.appendChild(wrapper)
  container.appendChild(area)

  /** @type {any[]} */
  let currentRows = []

  /**
   * Row keys rendered by the previous update, so a genuinely new row can be
   * told apart from one that merely moved or changed. Its emptiness also marks
   * the first population — a restore from storage, or the initial render — which
   * is not an "addition" to scroll to.
   * @type {Set<string>}
   */
  let renderedKeys = new Set()

  /**
   * The selected row's key as of the previous update, so a *change* of
   * selection can be told from the same row staying selected across the many
   * updates a drag produces. Only a change scrolls; once revealed, the row is
   * the analyst's to scroll away from.
   * @type {string|null}
   */
  let renderedSelectedKey = null

  /**
   * Put one cell's content in place, accepting either a string or a node.
   * @param {HTMLTableCellElement} cell - Cell to fill
   * @param {string|Node} content - New content
   */
  function setCellContent(cell, content) {
    if (content instanceof Node) {
      cell.replaceChildren(content)
    } else if (cell.textContent !== content) {
      // Only touch the DOM when the text actually changed, so an update that
      // changes nothing performs no writes.
      cell.textContent = content
    }
  }

  /**
   * Mark a row as selected, or not. Selection *styling* is table mechanism —
   * shared by both tables through this one line — while what "selected" means
   * stays with the consumer, in `spec.isSelected` (T3).
   * @param {HTMLTableRowElement} tr - Row element
   * @param {string} key - Row identity
   */
  function applySelection(tr, key) {
    const selected = spec.isSelected ? spec.isSelected(key) : false
    tr.classList.toggle('gram-frame-selected-row', selected)
  }

  /**
   * Build a row element for one data row.
   * @param {any} row - Data row
   * @param {number} index - Row index
   * @returns {HTMLTableRowElement} The row element
   */
  function buildRow(row, index) {
    const key = spec.rowKey(row, index)
    const tr = document.createElement('tr')
    tr.setAttribute(spec.rowAttribute, key)
    if (spec.rowClassName) {
      tr.className = spec.rowClassName
    }
    applySelection(tr, key)

    spec.cells(row, index).forEach((content, column) => {
      const td = document.createElement('td')
      const className = spec.columns[column] && spec.columns[column].cellClassName
      if (className) {
        td.className = className
      }
      setCellContent(td, content)
      tr.appendChild(td)
    })

    return tr
  }

  /**
   * Update an existing row's cells in place, leaving the row element alone.
   * @param {HTMLTableRowElement} tr - Existing row element
   * @param {any} row - Data row
   * @param {number} index - Row index
   */
  function updateRow(tr, row, index) {
    applySelection(tr, spec.rowKey(row, index))
    spec.cells(row, index).forEach((content, column) => {
      const cell = tr.cells[column]
      if (cell) {
        setCellContent(cell, content)
      }
    })
  }

  /**
   * Rebuild every row from `startIndex` onward. Used when the keys diverge —
   * a row was added, removed or reordered — so updating in place would put the
   * wrong data in the wrong row.
   * @param {any[]} rows - The full row list
   * @param {number} startIndex - First index to rebuild
   */
  function rebuildFrom(rows, startIndex) {
    const existing = tbody.querySelectorAll('tr')
    for (let i = startIndex; i < existing.length; i++) {
      existing[i].remove()
    }
    for (let i = startIndex; i < rows.length; i++) {
      tbody.appendChild(buildRow(rows[i], i))
    }
  }

  /**
   * The instructional line shown in place of rows when there are none.
   *
   * An empty table used to be an empty rectangle, which says only that nothing
   * is there — not what to do about it. The line is a row of the table rather
   * than a sibling of it so it scrolls, aligns and disappears with the rest,
   * and it is only built when a consumer supplies the words.
   * @type {HTMLTableRowElement|null}
   */
  let emptyRow = null

  /**
   * Show or hide the empty-state line.
   * @param {boolean} empty - Whether there are no rows
   */
  function setEmptyState(empty) {
    if (!spec.emptyMessage) {
      return
    }
    if (!emptyRow) {
      emptyRow = document.createElement('tr')
      emptyRow.className = 'gram-frame-table-empty'
      const cell = document.createElement('td')
      cell.colSpan = spec.columns.length
      cell.textContent = spec.emptyMessage
      emptyRow.appendChild(cell)
    }
    if (empty) {
      tbody.appendChild(emptyRow)
    } else if (emptyRow.parentNode) {
      emptyRow.remove()
    }
  }

  /**
   * Bring the rendered rows into line with `currentRows`.
   *
   * Update in place while the keys agree; at the first disagreement rebuild the
   * tail, because from there on every row would otherwise show another row's
   * data. Idempotent: an update that changes nothing performs no DOM writes.
   */
  function applyDiff() {
    setEmptyState(false)
    const existing = tbody.querySelectorAll('tr')

    for (let index = 0; index < currentRows.length; index++) {
      const tr = /** @type {HTMLTableRowElement} */ (existing[index])
      const key = spec.rowKey(currentRows[index], index)

      if (tr && tr.getAttribute(spec.rowAttribute) === key) {
        updateRow(tr, currentRows[index], index)
      } else {
        // Keys diverged from here on; rebuild the tail and stop diffing
        rebuildFrom(currentRows, index)
        return
      }
    }

    // Trailing rows whose data is gone
    for (let i = currentRows.length; i < existing.length; i++) {
      existing[i].remove()
    }
  }

  /**
   * Per-row controls that act instead of selecting, in match order. Delete is
   * one of these — the original and, for the harmonics panel, the only one —
   * so it is folded into the same list rather than special-cased twice.
   * @type {Array<{selector: string, handler: function(string, any, number): void}>}
   */
  const rowActions = []
  if (spec.deleteSelector && spec.onDelete) {
    rowActions.push({ selector: spec.deleteSelector, handler: spec.onDelete })
  }
  if (spec.actions) {
    rowActions.push(...spec.actions)
  }

  /**
   * Row clicks: select, unless the click landed on one of the row's action
   * controls. Delegated from the body so rebuilt rows need no re-wiring.
   * @param {MouseEvent} event - Click event
   */
  function handleClick(event) {
    const target = /** @type {Element|null} */ (event.target)
    if (!target) return

    const tr = /** @type {HTMLTableRowElement|null} */ (target.closest('tr'))
    if (!tr || !tbody.contains(tr)) return

    const key = tr.getAttribute(spec.rowAttribute)
    if (key === null) return

    const index = Array.prototype.indexOf.call(tbody.children, tr)
    const row = currentRows[index]

    const action = rowActions.find(candidate => target.closest(candidate.selector))
    if (action) {
      event.preventDefault()
      event.stopPropagation()
      action.handler(key, row, index)
      return
    }

    if (spec.onSelect) {
      spec.onSelect(key, row, index)
    }
  }

  tbody.addEventListener('click', handleClick)

  return {
    element: table,

    /**
     * Diff `rows` against what is rendered, apply the difference, and keep any
     * newly added or newly selected row in view.
     *
     * Idempotent: calling it twice with equal input performs no DOM writes and
     * no scrolling.
     * @param {any[]} rows - The rows to render
     */
    update(rows) {
      currentRows = rows || []

      const keys = currentRows.map((row, index) => spec.rowKey(row, index))
      applyDiff()
      setEmptyState(currentRows.length === 0)

      // Keep the last row that wasn't there before in view. Adding a marker
      // when the list has already overflowed otherwise appends it out of sight,
      // and the only feedback is a scrollbar that got slightly shorter.
      let lastAdded = -1
      for (let index = 0; index < keys.length; index++) {
        if (!renderedKeys.has(keys[index])) {
          lastAdded = index
        }
      }
      if (renderedKeys.size > 0 && lastAdded !== -1) {
        revealTableRow(wrapper, headerRow, tbody, lastAdded)
      }

      // Keep a newly selected row in view too. Selecting a feature on the gram
      // (or with the keyboard) highlights its row, and once the list overflows
      // that highlight can be off the bottom — or above the top — of the
      // table, leaving the selection with no visible feedback at all.
      const isSelected = spec.isSelected
      const selectedIndex = isSelected ? keys.findIndex(key => isSelected(key)) : -1
      const selectedKey = selectedIndex === -1 ? null : keys[selectedIndex]
      if (renderedKeys.size > 0 && selectedKey !== null && selectedKey !== renderedSelectedKey) {
        revealTableRow(wrapper, headerRow, tbody, selectedIndex, true)
      }

      renderedKeys = new Set(keys)
      renderedSelectedKey = selectedKey
    },

    /**
     * Remove the table and its listener.
     */
    destroy() {
      tbody.removeEventListener('click', handleClick)
      if (area.parentNode) {
        area.parentNode.removeChild(area)
      }
    }
  }
}
