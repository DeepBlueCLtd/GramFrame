/**
 * GramFrame Public API
 * 
 * Provides the public interface for initializing and managing GramFrame instances
 */

/// <reference path="../types.js" />

import {
  addGlobalStateListener,
  removeGlobalStateListener,
  notifyStateListeners
} from '../core/state.js'

/**
 * Creates the GramFrame public API object
 * @param {any} GramFrame - The GramFrame class constructor
 * @returns {Object} The GramFrame API object
 */
export function createGramFrameAPI(GramFrame) {
  return {
    /**
     * Initialize all config tables on the page
     * @returns {GramFrame[]} Array of GramFrame instances
     */
    init() {
      return this.detectAndReplaceConfigTables()
    },
    
    /**
     * Detect and replace all config tables with interactive GramFrame components
     * @param {Document|HTMLElement} [container=document] - Container to search within
     * @returns {GramFrame[]} Array of GramFrame instances created
     */
    detectAndReplaceConfigTables(container = document) {
      const configTables = container.querySelectorAll('table.gram-config')
      /** @type {GramFrame[]} */
      const instances = []
      const errors = []
      
      configTables.forEach((table, index) => {
        try {
          // Generate unique ID for each component instance
          const instanceId = `gramframe-${Date.now()}-${index}`
          
          // Validate table structure before processing
          const validationResult = this._validateConfigTable(table)
          if (!validationResult.isValid) {
            throw new Error(`Invalid config table structure: ${validationResult.errors.join(', ')}`)
          }
          
          // Create GramFrame instance
          const instance = new GramFrame(/** @type {HTMLTableElement} */ (table))
          
          // Store instance ID for debugging and API access
          instance.instanceId = instanceId
          instance.state.metadata = {
            ...instance.state.metadata,
            instanceId: instanceId
          }
          
          instances.push(instance)
          
        } catch (error) {
          const errorMsg = `Failed to initialize GramFrame for table ${index + 1}: ${error.message}`
          console.error('GramFrame Error:', errorMsg, error)
          errors.push({ table, error: errorMsg, index })
          
          // Add error indicator to the table (don't replace it)
          this._addErrorIndicator(table, errorMsg)
        }
      })
      
      // Log summary
      if (instances.length > 0) {
        console.log(`GramFrame: Successfully initialized ${instances.length} component${instances.length === 1 ? '' : 's'}`)
      }
      
      if (errors.length > 0) {
        console.warn(`GramFrame: ${errors.length} error${errors.length === 1 ? '' : 's'} encountered during initialization`, errors)
      }
      
      // Store instances for global access
      this._instances = instances
      
      return instances
    },
        
    /**
     * Add a state listener that will be called whenever the component state changes
     * @param {Function} callback - Function to be called with the current state
     * @returns {Function} - Returns the callback function for chaining
     * @example
     * // Basic usage
     * GramFrame.addStateListener(state => {
     *   console.log('State updated:', state)
     * })
     * 
     * // With error handling
     * GramFrame.addStateListener(state => {
     *   try {
     *     // Process state
     *     updateUI(state.cursorPosition)
     *   } catch (err) {
     *     console.error('Error processing state:', err)
     *   }
     * })
     */
    /**
     * Add a state listener that will be called whenever the component state changes
     * @param {StateListener} callback - Function to be called with the current state
     * @returns {StateListener} Returns the callback function for chaining
     */
    addStateListener(callback) {
      if (typeof callback !== 'function') {
        throw new Error('State listener must be a function')
      }
      
      // Add to global registry for future instances
      addGlobalStateListener(callback)
      
      // Add the listener to all existing instances
      const instances = document.querySelectorAll('.gram-frame-container')
      instances.forEach(container => {
        // @ts-ignore - Custom property on DOM element
        const instance = container.__gramFrameInstance
        if (instance && !instance.stateListeners.includes(callback)) {
          instance.stateListeners.push(callback)
          
          // Immediately call the listener with the current state
          if (instance.state) {
            try {
              // Create a deep copy of the state
              const stateCopy = JSON.parse(JSON.stringify(instance.state))
              // Call the listener with the current state
              callback(stateCopy)
            } catch (error) {
              console.error('Error calling state listener with initial state:', error)
            }
          }
        }
      })
      
      return callback
    },
    
    /**
     * Remove a previously added state listener
     * @param {Function} callback - The callback function to remove
     * @returns {boolean} - Returns true if the listener was found and removed, false otherwise
     * @example
     * // Add a listener and store the reference
     * const myListener = GramFrame.addStateListener(state => {
     *   console.log('State updated:', state)
     * })
     * 
     * // Later, remove the listener
     * GramFrame.removeStateListener(myListener)
     */
    /**
     * Remove a previously added state listener
     * @param {StateListener} callback - The callback function to remove
     * @returns {boolean} Returns true if the listener was found and removed, false otherwise
     */
    removeStateListener(callback) {
      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function')
      }
      
      let removed = false
      
      // Remove from global registry
      const wasRemoved = removeGlobalStateListener(callback)
      if (wasRemoved) {
        removed = true
      }
      
      // Remove the listener from all instances
      const instances = document.querySelectorAll('.gram-frame-container')
      instances.forEach(container => {
        // @ts-ignore - Custom property on DOM element
        const instance = container.__gramFrameInstance
        if (instance) {
          const index = instance.stateListeners.indexOf(callback)
          if (index !== -1) {
            instance.stateListeners.splice(index, 1)
            removed = true
          }
        }
      })
      return removed
    },
    
    /**
     * Toggle canvas bounds overlay (future implementation)
     */
    toggleCanvasBoundsOverlay() {
      // This will be implemented in Phase 5

    },
    
    /**
     * Set debug grid visibility (future implementation)
     * @param {boolean} visible - Whether to show the debug grid
     */
    setDebugGrid(visible) {
      // This will be implemented in Phase 5

    },
    
    /**
     * Force update of the component state
     * @__test__ This method is only used for testing purposes
     */
    __test__forceUpdate() {
      // Trigger state update on all GramFrame instances
      const instances = document.querySelectorAll('.gram-frame-container')
      instances.forEach(container => {
        // @ts-ignore - Custom property on DOM element
        const instance = container.__gramFrameInstance
        if (instance) {
          // Trigger a state update by calling notifyStateListeners
          notifyStateListeners(instance.state, instance.stateListeners)
        }
      })
    },
    
    /**
     * Get all active GramFrame instances
     * @__test__ This method is only used for testing purposes
     * @returns {GramFrame[]} Array of active instances
     */
    __test__getInstances() {
      return this._instances || []
    },
    
    /**
     * Get instance by ID
     * @__test__ This method is only used for testing purposes
     * @param {string} instanceId - Instance ID to find
     * @returns {GramFrame|null} Instance or null if not found
     */
    __test__getInstance(instanceId) {
      if (!this._instances) return null
      return this._instances.find(instance => instance.instanceId === instanceId) || null
    },
    
    /**
     * Validate config table structure
     * @private
     * @param {HTMLTableElement} table - Table to validate
     * @returns {{isValid: boolean, errors: string[]}} Validation result
     */
    _validateConfigTable(table) {
      const errors = []
      
      // Check if table exists
      if (!table) {
        errors.push('Table element is null or undefined')
        return { isValid: false, errors }
      }
      
      // Check if it's actually a table
      if (!(table instanceof HTMLTableElement)) {
        errors.push('Element is not a table')
        return { isValid: false, errors }
      }
      
      // Check for image
      const imgElement = table.querySelector('img')
      if (!imgElement) {
        errors.push('No image found in table')
      } else if (!imgElement.src) {
        errors.push('Image has no src attribute')
      }
      
      // Check for parameter rows
      const rows = table.querySelectorAll('tr')
      let hasTimeRow = false
      let hasFreqRow = false
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td')
        if (cells.length >= 3) {
          const param = cells[0].textContent?.trim().toLowerCase()
          const min = cells[1].textContent?.trim()
          const max = cells[2].textContent?.trim()
          
          if (param === 'time') {
            hasTimeRow = true
            if (isNaN(parseFloat(min)) || isNaN(parseFloat(max))) {
              errors.push('Time row has invalid numeric values')
            }
          } else if (param === 'freq') {
            hasFreqRow = true
            if (isNaN(parseFloat(min)) || isNaN(parseFloat(max))) {
              errors.push('Frequency row has invalid numeric values')
            }
          }
        }
      })
      
      if (!hasTimeRow) {
        errors.push('Missing time parameter row')
      }
      
      if (!hasFreqRow) {
        errors.push('Missing frequency parameter row')
      }
      
      return {
        isValid: errors.length === 0,
        errors
      }
    },
    
    /**
     * Add error indicator to a table that failed to initialize
     * @private
     * @param {HTMLTableElement} table - Table that failed
     * @param {string} errorMsg - Error message to display
     */
    _addErrorIndicator(table, errorMsg) {
      try {
        // Create error overlay
        const errorDiv = document.createElement('div')
        errorDiv.className = 'gramframe-error-indicator'
        errorDiv.style.cssText = `
          position: relative;
          background-color: #ffe6e6;
          border: 2px solid #ff6b6b;
          border-radius: 4px;
          padding: 10px;
          margin: 10px 0;
          color: #d32f2f;
          font-family: monospace;
          font-size: 14px;
        `
        
        errorDiv.innerHTML = `
          <strong>GramFrame Initialization Error:</strong><br>
          ${errorMsg}<br>
          <small>Check the browser console for detailed error information.</small>
        `
        
        // Insert error indicator after the table
        if (table.parentNode) {
          table.parentNode.insertBefore(errorDiv, table.nextSibling)
        }
        
      } catch (e) {
        console.error('GramFrame: Failed to add error indicator:', e)
      }
    }
  }
}