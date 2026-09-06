/**
 * Redrawing the persistent panels.
 *
 * "The tables are stale" is asked from three places — the selection layer, the
 * restyle layer and the control row — and answered the same way each time: ask
 * every mode that owns a panel to refresh it, then bring the count chips into
 * line. It lived in two of them as a copy, with a comment in each explaining
 * that importing the other would close a cycle. This module imports nothing
 * that imports it, which is the actual fix.
 */

/// <reference path="../types.js" />

import { isPanelOwner } from '../modes/capabilities.js'
import { refreshTableCounts } from '../components/AnnotationTables.js'

/**
 * Ask every mode that owns a persistent panel to refresh it, and rewrite the
 * count chips above them in the same pass, so a chip can never disagree with
 * the rows beneath it.
 *
 * Modes are discovered by capability, not by name: a fifth mode owning a panel
 * refreshes here with no edit to this file (spec 167, FR-006, AS-4.2, SC-003).
 * @param {GramFrame} instance - GramFrame instance
 * @returns {void}
 */
export function refreshPanels(instance) {
  Object.values(instance.modes)
    .filter(isPanelOwner)
    .forEach(mode => mode.refreshPanel())
  refreshTableCounts(instance)
}
