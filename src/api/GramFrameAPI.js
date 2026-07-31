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
import { setImageExpanded, isLandscape } from '../components/ExpandToggle.js'
import { isBrowserSupported, showCompatibilityWarning, looksLikeMissingApiError } from '../core/browserCompatibility.js'

/**
 * Whether the host page opted into the debug/test API surface.
 *
 * A page enables it with `window.GRAMFRAME_DEBUG = true` before loading
 * GramFrame (see debug.html and the test fixtures). Published training material
 * does not set it, so the `__test__*` methods are absent there rather than
 * shipping on every page (spec 165, GF-23).
 * @returns {boolean} True when the debug API should be attached
 */
function isDebugEnabled() {
  return typeof window !== 'undefined' && /** @type {any} */ (window).GRAMFRAME_DEBUG === true
}

/**
 * The test-only API surface, attached to the public API only on pages that set
 * `window.GRAMFRAME_DEBUG`. These methods exist for the Playwright suite: they
 * reach into instances in ways no production caller should depend on.
 * @param {GramFrameAPI} api - The API object to attach to
 * @returns {void}
 */
function attachDebugAPI(api) {
  /**
   * Force a state broadcast on every instance.
   * @returns {void}
   */
  api.__test__forceUpdate = function () {
    this._getInstances().forEach(instance => {
      notifyStateListeners(instance.state, instance.stateListeners)
    })
  }

  /**
   * Get all active GramFrame instances.
   * @returns {GramFrame[]} Active instances
   */
  api.__test__getInstances = function () {
    return this._getInstances()
  }

  /**
   * Get an instance by its ID.
   * @param {string} instanceId - Instance ID to find
   * @returns {GramFrame|null} Instance or null if not found
   */
  api.__test__getInstance = function (instanceId) {
    return this._getInstances().find(instance => instance.instanceId === instanceId) || null
  }
}

/**
 * Creates the GramFrame public API object
 * @param {any} GramFrame - The GramFrame class constructor
 * @returns {GramFrameAPI} The GramFrame API object
 */
export function createGramFrameAPI(GramFrame) {
  /** @type {GramFrameAPI} */
  const api = {
    /**
     * Initialize all config tables on the page
     * @returns {GramFrame[]} Array of GramFrame instances
     */
    init() {
      return this.detectAndReplaceConfigTables(document)
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

      // Legacy-browser guard: check the required JS/DOM APIs are present before
      // any GramFrame is constructed. On an unsupported browser, show a clear
      // "please update your browser" warning in place of each config table
      // instead of letting the component fail silently mid-render. The check is
      // feature-detection based, so it runs without throwing on the very
      // browsers it is meant to catch.
      if (!isBrowserSupported()) {
        configTables.forEach(table => {
          showCompatibilityWarning(/** @type {HTMLElement} */ (table))
        })
        return instances
      }

      configTables.forEach((table, index) => {
        // Remember where the table sits so a failure part-way through
        // construction can be reported in place. Construction replaces the
        // table with the component container early on, so by the time a later
        // step (e.g. mode construction — GF-04) throws, the table is detached
        // and there is a half-built container in its place.
        const originalParent = table.parentNode
        const originalNextSibling = table.nextSibling

        try {
          // Generate unique ID for each component instance
          const instanceId = `gramframe-${Date.now()}-${index}`
          
          // Create GramFrame instance - extractConfigData will handle validation
          const instance = new GramFrame(/** @type {HTMLTableElement} */ (table))
          
          // Store instance ID for debugging and API access
          instance.instanceId = instanceId
          instance.state.instanceId = instanceId
          
          instances.push(instance)
          
        } catch (error) {
          const errorMsg = `Failed to initialize GramFrame for table ${index + 1}: ${error instanceof Error ? error.message : String(error)}`
          console.error('GramFrame Error:', errorMsg, error)
          errors.push({ table, error: errorMsg, index })

          // Undo a partial replacement so the page is left in a truthful state:
          // the config table back where it was, no dead component beside it.
          this._restoreConfigTable(/** @type {HTMLTableElement} */ (table), originalParent, originalNextSibling)

          // Reactive legacy-browser safety net. Explicit feature detection only
          // catches APIs we listed; an even-older browser might be missing a
          // different required method we did not anticipate. When the failure
          // looks like a missing method/constructor (rather than a config or
          // logic error), show the same "please update your browser" warning in
          // place of the component instead of the technical error indicator, so
          // the analyst gets an actionable message and never a silent failure.
          if (looksLikeMissingApiError(error)) {
            showCompatibilityWarning(/** @type {HTMLElement} */ (table))
          } else {
            // Add error indicator to the table (don't replace it)
            this._addErrorIndicator(/** @type {HTMLTableElement} */ (table), errorMsg)
          }
        }
      })
      
      // Register the new instances alongside any created by an earlier scan
      // (e.g. a second call for a container added after page load).
      this._instances = [...this._getInstances(), ...instances]

      return instances
    },

    /**
     * The live set of GramFrame instances — the API's single registry.
     *
     * Every API method reads instances through here. Previously some methods
     * walked `.gram-frame-container` elements in the DOM while others read the
     * `_instances` array, so the two could disagree about which instances
     * existed (GF-24). Instances whose container has left the document
     * (destroyed, or replaced by a re-initialization) are dropped on read.
     * @private
     * @returns {GramFrame[]} Live instances
     */
    _getInstances() {
      const live = (this._instances || []).filter(
        instance => instance && instance.container && instance.container.isConnected
      )
      this._instances = live
      return live
    },

    /**
     * Add a state listener that will be called whenever the component state changes
     * @param {Function} callback - Function to be called with the current state
     * @returns {Function} - Returns the callback function for chaining
     * @example
     * // Basic usage
     * GramFrame.addStateListener(state => {
     *   // State updated: state
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
      this._getInstances().forEach(instance => {
        if (!instance.stateListeners.includes(callback)) {
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
     *   // State updated: state
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
      this._getInstances().forEach(instance => {
        const index = instance.stateListeners.indexOf(callback)
        if (index !== -1) {
          instance.stateListeners.splice(index, 1)
          removed = true
        }
      })
      return removed
    },
    
    /**
     * Get the current expand state of the first GramFrame instance.
     * @returns {boolean} True if the image is currently expanded
     */
    getExpandState() {
      const instance = this._getInstances()[0]
      return !!(instance && instance.state && instance.state.imageExpanded)
    },

    /**
     * Programmatically expand or collapse all landscape GramFrame instances.
     * No-op for portrait/square images (mirrors the toggle's landscape gate).
     * @param {boolean} expanded - Desired expand state
     */
    setExpandState(expanded) {
      this._getInstances().forEach(instance => {
        if (isLandscape(instance)) {
          setImageExpanded(instance, expanded)
        }
      })
    },

    /**
     * Put a config table back where it started after a failed initialization,
     * removing the half-built component container that replaced it.
     *
     * Construction swaps the table for the component container before the mode
     * system is built, so a failure after that point leaves a container that
     * looks like a working component but cannot interact. Restoring the table
     * gives both the compatibility warning and the error indicator a live
     * anchor to attach to, and leaves nothing misleading on the page.
     * @private
     * @param {HTMLTableElement} table - Table that failed to initialize
     * @param {Node|null} originalParent - Parent the table had before construction
     * @param {Node|null} originalNextSibling - Sibling the table sat before
     */
    _restoreConfigTable(table, originalParent, originalNextSibling) {
      if (!originalParent || table.parentNode) {
        return // Never replaced, or already back in place — nothing to undo
      }
      try {
        // Whatever now occupies the table's old slot is the partial component.
        const replacement = originalNextSibling
          ? originalNextSibling.previousSibling
          : originalParent.lastChild
        if (
          replacement &&
          replacement instanceof Element &&
          replacement.classList.contains('gram-frame-container')
        ) {
          replacement.remove()
        }
        originalParent.insertBefore(table, originalNextSibling)
      } catch (e) {
        console.error('GramFrame: Failed to restore the config table after an initialization error:', e)
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
        // The table stays on the page next to the error, so drop the
        // pre-conversion placeholder styling and let its config show plainly
        table.classList.add('gram-frame-config-error')

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
        
        // Create content safely without innerHTML
        const strongElement = document.createElement('strong')
        strongElement.textContent = 'GramFrame Initialization Error:'
        
        const errorText = document.createElement('div')
        errorText.textContent = errorMsg
        
        const smallElement = document.createElement('small')
        smallElement.textContent = 'Check the browser console for detailed error information.'
        
        errorDiv.appendChild(strongElement)
        errorDiv.appendChild(document.createElement('br'))
        errorDiv.appendChild(errorText)
        errorDiv.appendChild(document.createElement('br'))
        errorDiv.appendChild(smallElement)
        
        // Insert error indicator after the table
        if (table.parentNode) {
          table.parentNode.insertBefore(errorDiv, table.nextSibling)
        }
        
      } catch (e) {
        console.error('GramFrame: Failed to add error indicator:', e)
      }
    }
  }

  // Test-only methods are attached only when the page opts in, so they are not
  // part of the API published pages see (GF-23).
  if (isDebugEnabled()) {
    attachDebugAPI(api)
  }

  return api
}