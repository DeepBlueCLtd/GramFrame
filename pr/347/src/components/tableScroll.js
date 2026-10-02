/**
 * Keeping a row of an annotation table in view.
 *
 * Separated from the diffing engine because it is a different question:
 * `DiffingTable.js` answers "what does this table show", this answers "where is
 * the scrollport". The two changed for different reasons and, together, put
 * that module over the size the project holds its modules to.
 */

/**
 * Scroll the row at `index` into view, if it is outside the visible band.
 *
 * Sets `scrollTop` on the scroll wrapper rather than calling
 * `Element.scrollIntoView`, which would also scroll every scrollable ancestor
 * — including the host page — to bring the table into view. A new marker
 * should move the table's own scrollbar and nothing else.
 *
 * The scroll is minimal, and never happens at all when the row is already
 * visible: the wrapper is then left exactly where the user put it. Upward
 * scrolling is opt-in (`allowUpward`) because an *addition* only ever appears
 * below the fold, whereas a *selection* can be anywhere in the list.
 * @param {HTMLElement} wrapper - The scrollport
 * @param {HTMLElement} headerRow - The sticky header row
 * @param {HTMLElement} tbody - The row container
 * @param {number} index - Index of the row to reveal
 * @param {boolean} [allowUpward] - Also scroll up for a row above the fold
 * @returns {void}
 */
export function revealTableRow(wrapper, headerRow, tbody, index, allowUpward = false) {
  const tr = /** @type {HTMLElement|undefined} */ (tbody.children[index])
  if (!tr) return

  // offsetTop is measured against the wrapper, which is the nearest positioned
  // ancestor (it is absolutely positioned over the table area).
  const bottom = tr.offsetTop + tr.offsetHeight - wrapper.clientHeight
  if (bottom > wrapper.scrollTop) {
    wrapper.scrollTop = bottom
    return
  }

  if (!allowUpward) return

  // The header is sticky at the top of the scrollport, so it floats over the
  // first rows of the scrolled body: scrolling to the row's own offsetTop would
  // park it underneath the header rather than beside it.
  const headerCell = /** @type {HTMLElement|null} */ (headerRow.firstElementChild)
  const top = tr.offsetTop - (headerCell ? headerCell.offsetHeight : 0)
  if (top < wrapper.scrollTop) {
    wrapper.scrollTop = Math.max(0, top)
  }
}
