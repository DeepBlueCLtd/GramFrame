/**
 * Analysis Engine for GramFrame
 * 
 * This module provides analysis calculations for doppler measurements
 * and harmonics display functionality.
 */

/// <reference path="../types.js" />

import { calculateHarmonics } from '../utils/calculations.js'
import { dataToSVGCoordinates } from '../utils/coordinates.js'

/**
 * Calculate Doppler measurements from the fit points.
 * @param {GramFrameState} state - Current state object (will be modified)
 * @returns {void}
 */
export function calculateDopplerMeasurements(state) {
  if (!state.dopplerFit || !state.dopplerFit.fPlus || !state.dopplerFit.fMinus || !state.dopplerFit.fZero) {
    return
  }

  const { fPlus, fMinus, fZero } = state.dopplerFit
  const c = 1500 // Speed of sound in water (m/s)

  const deltaF = (fPlus.frequency - fMinus.frequency) / 2
  const speed = (c / fZero.frequency) * deltaF

  state.dopplerFit.speed = speed
}

/**
 * Trigger harmonics display calculation and state updates
 * @param {GramFrameState} state - Current state object (will be modified)
 * @param {Function} updateLEDDisplays - LED update callback function
 * @param {Function} updateCursorIndicators - Cursor update callback function
 * @param {Function} notifyStateListeners - State notification callback function
 * @param {Array} stateListeners - Array of state listeners
 * @returns {boolean} True if harmonics were calculated, false if conditions not met
 */
export function triggerHarmonicsDisplay(state, updateLEDDisplays, updateCursorIndicators, notifyStateListeners, stateListeners) {
  // Only trigger if we have a cursor position, are in harmonics mode, and are dragging
  if (!state.cursorPosition || state.mode !== 'harmonics' || !state.dragState.isDragging) {
    return false
  }
  
  const baseFrequency = state.cursorPosition.freq
  
  // Calculate harmonic frequencies and their positions
  const harmonics = calculateHarmonics(
    baseFrequency,
    state.config,
    state.displayDimensions,
    state.axes,
    (freq, time) => dataToSVGCoordinates(freq, time, state.config, state.imageDetails, state.rate)
  )
  
  // Update state with harmonic data
  state.harmonics.baseFrequency = baseFrequency
  state.harmonics.harmonicData = harmonics
  
  // Update LED displays to show base frequency
  updateLEDDisplays()
  
  // Redraw cursor indicators to show harmonics
  updateCursorIndicators()
  
  // Notify listeners of state change
  notifyStateListeners(state, stateListeners)
  
  return true
}