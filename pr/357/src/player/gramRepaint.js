/**
 * Repainting an audio-sourced gram without re-analysing it.
 *
 * The analysed grid is not kept, but the 8-bit levels the picture was painted
 * from are: they are what the colour map is applied to, so a change of map is
 * a repaint rather than a second pass over the recording. Held here, keyed by
 * instance, rather than in `state` — they are a few megabytes of pixels, not
 * something a listener should ever receive a deep copy of.
 */

/// <reference path="../types.js" />

import { paintGram } from '../audio/gramImage.js'

/**
 * @typedef {Object} PaintedLevels
 * @property {Uint8Array} levels - From `powerToLevels`
 * @property {number} frames - Rows
 * @property {number} columns - Columns
 * @property {import('../audio/colourMap.js').ColourMapName} map - The map the picture currently on screen was painted with
 */

/** @type {WeakMap<GramFrame, PaintedLevels>} */
const painted = new WeakMap()

/**
 * Keep the levels an instance's gram was painted from, for a later repaint.
 * @param {GramFrame} instance - The instance whose gram they are
 * @param {Uint8Array} levels - From `powerToLevels`
 * @param {number} frames - Rows
 * @param {number} columns - Columns
 * @param {import('../audio/colourMap.js').ColourMapName} map - The map they were painted with
 */
export function rememberPaintedLevels(instance, levels, frames, columns, map) {
  painted.set(instance, { levels, frames, columns, map })
}

/**
 * The map the picture on screen was painted with — what the contrast filter
 * needs to know, since it acts on the painted channels rather than on levels
 * and the grey ramp runs the other way up from every other map.
 * @param {GramFrame} instance - Any instance
 * @returns {import('../audio/colourMap.js').ColourMapName} The map, `colour` when nothing has been painted
 */
export function paintedMap(instance) {
  const kept = painted.get(instance)
  return kept ? kept.map : 'colour'
}

/**
 * Paint the remembered levels again with the given map and swap the image
 * over. Nothing about the gram's geometry changes, so no transform, axis or
 * annotation needs touching.
 * @param {GramFrame} instance - An audio-sourced instance that has been painted
 * @param {import('../audio/colourMap.js').ColourMapName} map - The map to paint with
 * @returns {boolean} Whether there were levels to repaint from
 */
export function repaintGram(instance, map) {
  const kept = painted.get(instance)
  if (!kept) {
    return false
  }
  const url = paintGram(kept.levels, kept.frames, kept.columns, map)
  kept.map = map
  instance.ui.spectrogramImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', url)
  return true
}
