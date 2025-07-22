/**
 * State management for GramFrame
 * 
 * This module provides state initialization, listener management,
 * and state change notification functionality.
 */

/// <reference path="../types.js" />

/**
 * Initial state object for GramFrame component
 * @type {GramFrameState}
 */
export const initialState = {
  version: '0.0.1',
  timestamp: new Date().toISOString(),
  metadata: {
    instanceId: ''
  },
  mode: 'analysis', // 'analysis', 'harmonics'
  rate: 1,
  cursorPosition: null,
  cursors: [],
  harmonics: {
    baseFrequency: null,
    harmonicData: [],
    harmonicSets: []
  },
  dragState: {
    isDragging: false,
    dragStartPosition: null,
    draggedHarmonicSetId: null,
    originalSpacing: null,
    originalAnchorTime: null,
    clickedHarmonicNumber: null,
    isCreatingNewHarmonicSet: false
  },
  imageDetails: {
    url: '',
    naturalWidth: 0,  // Original dimensions of the image
    naturalHeight: 0
  },
  config: {
    timeMin: 0,
    timeMax: 0,
    freqMin: 0,
    freqMax: 0
  },
  displayDimensions: {  // Current display dimensions (responsive)
    width: 0,
    height: 0
  },
  axes: {
    margins: {
      left: 60,    // Space for time axis labels
      bottom: 50,  // Space for frequency axis labels  
      right: 15,   // Small right margin
      top: 15      // Small top margin
    }
  }
}

/**
 * Global registry of listeners that should be applied to all instances
 * @type {StateListener[]}
 */
export const globalStateListeners = []

/**
 * Create a deep copy of the initial state for new instances
 * @returns {GramFrameState} Deep copy of initial state
 */
export function createInitialState() {
  return JSON.parse(JSON.stringify(initialState))
}

/**
 * Notify state listeners of state changes
 * @param {GramFrameState} state - Current state object
 * @param {StateListener[]} listeners - Array of listener functions
 */
export function notifyStateListeners(state, listeners) {
  // Create a deep copy of the state to prevent direct modification
  const stateCopy = JSON.parse(JSON.stringify(state))
  
  // Notify all registered state listeners for this instance
  listeners.forEach(listener => {
    try {
      listener(stateCopy)
    } catch (error) {
      console.error('Error in state listener:', error)
    }
  })
}

/**
 * Add a state listener to the global registry
 * @param {StateListener} callback - Listener function to add
 * @returns {boolean} True if added, false if already exists
 */
export function addGlobalStateListener(callback) {
  if (!globalStateListeners.includes(callback)) {
    globalStateListeners.push(callback)
    return true
  }
  return false
}

/**
 * Remove a state listener from the global registry
 * @param {StateListener} callback - Listener function to remove
 * @returns {boolean} True if removed, false if not found
 */
export function removeGlobalStateListener(callback) {
  const index = globalStateListeners.indexOf(callback)
  if (index !== -1) {
    globalStateListeners.splice(index, 1)
    return true
  }
  return false
}

/**
 * Get all global state listeners (for applying to new instances)
 * @returns {StateListener[]} Array of global listener functions
 */
export function getGlobalStateListeners() {
  return [...globalStateListeners]
}

/**
 * Clear all global state listeners (used in testing)
 */
export function clearGlobalStateListeners() {
  globalStateListeners.length = 0
}