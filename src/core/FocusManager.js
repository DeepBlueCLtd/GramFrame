/**
 * Focus Manager for GramFrame instances
 * 
 * Manages which GramFrame instance should receive keyboard input
 * when multiple instances exist on the same page.
 */

/// <reference path="../types.js" />

/**
 * Global focus tracking
 */
/** @type {GramFrame|null} */
let currentFocusedInstance = null
/** @type {Set<GramFrame>} */
const registeredInstances = new Set()

/**
 * Drop registered instances whose container has left the document.
 *
 * The registry is a strong Set that used to shrink only via `destroy()`, so a
 * host page swapping `innerHTML` stranded the instance — and its whole DOM
 * subtree via the `ui.*` handles — forever (M2). Pruning on every read keeps
 * this registry's liveness model consistent with the API's `_getInstances()`,
 * which also drops disconnected instances on read.
 */
function pruneDisconnectedInstances() {
  for (const instance of Array.from(registeredInstances)) {
    if (!instance.ui || !instance.ui.container || !instance.ui.container.isConnected) {
      registeredInstances.delete(instance)
      if (currentFocusedInstance === instance) {
        currentFocusedInstance = null
      }
    }
  }
}

/**
 * Register a GramFrame instance for focus management
 * @param {GramFrame} instance - GramFrame instance to register
 */
export function registerInstance(instance) {
  pruneDisconnectedInstances()
  registeredInstances.add(instance)

  // Don't auto-focus the first instance - let user explicitly interact to focus
  // This prevents unwanted focus behavior when multiple instances exist on a page
}

/**
 * Unregister a GramFrame instance from focus management
 * @param {GramFrame} instance - GramFrame instance to unregister
 */
export function unregisterInstance(instance) {
  registeredInstances.delete(instance)
  
  // If we're removing the focused instance, focus another one or clear focus
  if (currentFocusedInstance === instance) {
    if (registeredInstances.size > 0) {
      // Focus on the first remaining instance
      const firstInstance = registeredInstances.values().next().value
      if (firstInstance) {
        setFocusedInstance(firstInstance)
      }
    } else {
      currentFocusedInstance = null
    }
  }
}

/**
 * How many instances are currently registered for focus management.
 * Used to decide when the shared document-level keydown handler can be
 * uninstalled (spec 165, GF-14).
 * @returns {number} Registered instance count
 */
export function getRegisteredInstanceCount() {
  pruneDisconnectedInstances()
  return registeredInstances.size
}

/**
 * Set which instance should receive keyboard focus
 * @param {GramFrame} instance - GramFrame instance to focus
 */
export function setFocusedInstance(instance) {
  // Remove focus from previous instance
  if (currentFocusedInstance && currentFocusedInstance !== instance) {
    removeFocusIndicator(currentFocusedInstance)
  }
  
  currentFocusedInstance = instance
  
  if (instance) {
    addFocusIndicator(instance)
  }
}

/**
 * Get the currently focused instance
 * @returns {GramFrame|null} Currently focused instance or null
 */
export function getFocusedInstance() {
  pruneDisconnectedInstances()
  return currentFocusedInstance
}

/**
 * Clear keyboard focus entirely, so no instance receives keyboard input.
 *
 * Focus used to be set on every SVG mousedown and never cleared, which left
 * one click on a gram permanently swallowing Tab and arrow keys page-wide
 * (BH-3). Called when the user clicks outside every registered instance.
 */
export function clearFocusedInstance() {
  if (currentFocusedInstance) {
    removeFocusIndicator(currentFocusedInstance)
  }
  currentFocusedInstance = null
}

/**
 * Whether a DOM node sits inside any registered instance's container.
 * Used to decide if a click landed outside every GramFrame.
 * @param {EventTarget|null} node - Event target to test
 * @returns {boolean} True when the node is inside a registered instance
 */
export function isNodeInsideAnyInstance(node) {
  if (!(node instanceof Node)) {
    return false
  }
  pruneDisconnectedInstances()
  // Array.from rather than for-of over the Set: the tsc target predates
  // downlevelIteration (same note as core/state.js).
  return Array.from(registeredInstances).some(
    instance => !!(instance.ui && instance.ui.container && instance.ui.container.contains(node))
  )
}

/**
 * Add visual focus indicator to an instance
 * @param {GramFrame} instance - Instance to add indicator to
 */
function addFocusIndicator(instance) {
  if (instance.ui.container) {
    instance.ui.container.classList.add('gram-frame-focused')
  }
}

/**
 * Remove visual focus indicator from an instance
 * @param {GramFrame} instance - Instance to remove indicator from
 */
function removeFocusIndicator(instance) {
  if (instance.ui.container) {
    instance.ui.container.classList.remove('gram-frame-focused')
  }
}

/**
 * Focus on the next instance in sequence (for Tab navigation)
 */
export function focusNextInstance() {
  pruneDisconnectedInstances()
  if (registeredInstances.size <= 1) return
  
  const instancesArray = Array.from(registeredInstances)
  // -1 when nothing is focused, which the arithmetic below already handles:
  // it lands on the first instance.
  const currentIndex = currentFocusedInstance ? instancesArray.indexOf(currentFocusedInstance) : -1
  const nextIndex = (currentIndex + 1) % instancesArray.length
  
  const next = instancesArray[nextIndex]
  if (next) {
    setFocusedInstance(next)
  }
}

/**
 * Focus on the previous instance in sequence (for Shift+Tab navigation)
 */
export function focusPreviousInstance() {
  pruneDisconnectedInstances()
  if (registeredInstances.size <= 1) return
  
  const instancesArray = Array.from(registeredInstances)
  // -1 when nothing is focused, so this wraps to the last instance.
  const currentIndex = currentFocusedInstance ? instancesArray.indexOf(currentFocusedInstance) : -1
  const prevIndex = currentIndex === 0 ? instancesArray.length - 1 : currentIndex - 1
  
  const next = instancesArray[prevIndex]
  if (next) {
    setFocusedInstance(next)
  }
}