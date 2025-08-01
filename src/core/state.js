/**
 * State management for GramFrame
 * 
 * This module provides state initialization, listener management,
 * and state change notification functionality.
 */

/// <reference path="../types.js" />

import { AnalysisMode } from '../modes/analysis/AnalysisMode.js'
import { HarmonicsMode } from '../modes/harmonics/HarmonicsMode.js'
import { DopplerMode } from '../modes/doppler/DopplerMode.js'

/**
 * Build mode-specific initial state by collecting from all mode classes
 * @returns {GramFrameState} Combined initial state from all modes
 */
function buildModeInitialState() {
  // Get initial state from static methods (no need for temporary instances)
  const modeStates = [
    AnalysisMode.getInitialState(),
    HarmonicsMode.getInitialState(),
    DopplerMode.getInitialState()
  ]
  
  // Merge all mode states
  return Object.assign({}, ...modeStates)
}

/**
 * Initial state object for GramFrame component
 * @type {GramFrameState}
 */
export const initialState = {
  version: '0.0.1',
  timestamp: new Date().toISOString(),
  instanceId: '',
  mode: 'analysis', // 'analysis', 'harmonics', 'doppler'
  rate: 1,
  cursorPosition: null,
  cursors: [],
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
  },
  // Simple zoom state for transform-based zoom
  zoom: {
    level: 1.0,  // Current zoom level (1.0 = no zoom, 2.0 = 2x zoom)
    levelX: 1.0, // X-axis zoom level (for aspect ratio changes)
    levelY: 1.0, // Y-axis zoom level (for aspect ratio changes)
    centerX: 0.5, // Center point X (0-1 normalized)
    centerY: 0.5,  // Center point Y (0-1 normalized)
    panMode: false, // Whether pan mode is active
    regionMode: false, // Whether region selection mode is active
    isSelecting: false, // Whether user is actively selecting a region
    selectionStart: null, // Start point of region selection {x, y} in SVG coordinates
    selectionEnd: null, // End point of region selection {x, y} in SVG coordinates
    selectionBounds: null, // Normalized bounds of selected region {left, top, right, bottom}
    zoomHistory: [] // Stack of previous zoom states for zoom out functionality
  },
  // Selection state for keyboard fine control
  selection: {
    selectedType: null,  // 'marker' | 'harmonicSet' | null
    selectedId: null,    // ID of selected item
    selectedIndex: null  // Index in table for display purposes
  },
  // Add mode-specific state from mode classes
  ...buildModeInitialState()
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