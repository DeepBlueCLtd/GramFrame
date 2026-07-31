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
 * Register a GramFrame instance for focus management
 * @param {GramFrame} instance - GramFrame instance to register
 */
export function registerInstance(instance) {
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
  return currentFocusedInstance
}

/**
 * Add visual focus indicator to an instance
 * @param {GramFrame} instance - Instance to add indicator to
 */
function addFocusIndicator(instance) {
  if (instance.container) {
    instance.container.classList.add('gram-frame-focused')
  }
}

/**
 * Remove visual focus indicator from an instance
 * @param {GramFrame} instance - Instance to remove indicator from
 */
function removeFocusIndicator(instance) {
  if (instance.container) {
    instance.container.classList.remove('gram-frame-focused')
  }
}

/**
 * Focus on the next instance in sequence (for Tab navigation)
 */
export function focusNextInstance() {
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