/**
 * DOM Setup module for GramFrame initialization
 *
 * Builds the component's DOM structure and hands it back. It assigns nothing to
 * the instance: the constructor does that, which is what lets the fields carry
 * non-null types and what makes a reordered step a missing-argument error
 * rather than a silent `undefined` (spec 167, FR-009).
 *
 * The module used to open with `initializeDOMProperties`, which set 33 fields
 * to `null` — including `modes`, `currentMode` and `featureRenderer`, which
 * `initializeModeInfrastructure` then re-created. That double-nulling is gone.
 */

/// <reference path="../../types.js" />

import { extractConfigData } from '../configuration.js'
import { setupComponentTable } from '../../components/table.js'

/**
 * Extract the config data and build the component's DOM and SVG structure.
 * @param {GramFrame} instance - GramFrame instance
 * @param {HTMLTableElement} configTable - Configuration table to read and replace
 * @returns {TableElements} The elements just created
 */
export function setupSpectrogramComponents(instance, configTable) {
  // Extract config data from table BEFORE replacing it
  extractConfigData(instance)

  // Create complete component table structure including DOM and SVG
  return setupComponentTable(instance, configTable)
}
