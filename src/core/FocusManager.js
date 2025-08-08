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
let currentFocusedInstance = null
let registeredInstances = new Set()

/**
 * Register a GramFrame instance for focus management
 * @param {GramFrame} instance - GramFrame instance to register
 */
export function registerInstance(instance) {
  registeredInstances.add(instance)
  
  // If this is the first instance, make it focused by default
  if (registeredInstances.size === 1 && !currentFocusedInstance) {
    setFocusedInstance(instance)
  }
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
      setFocusedInstance(firstInstance)
    } else {
      currentFocusedInstance = null
    }
  }
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
 * Check if the given instance is currently focused
 * @param {GramFrame} instance - Instance to check
 * @returns {boolean} True if instance is focused
 */
export function isInstanceFocused(instance) {
  return currentFocusedInstance === instance
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
  const currentIndex = instancesArray.indexOf(currentFocusedInstance)
  const nextIndex = (currentIndex + 1) % instancesArray.length
  
  setFocusedInstance(instancesArray[nextIndex])
}

/**
 * Focus on the previous instance in sequence (for Shift+Tab navigation)
 */
export function focusPreviousInstance() {
  if (registeredInstances.size <= 1) return
  
  const instancesArray = Array.from(registeredInstances)
  const currentIndex = instancesArray.indexOf(currentFocusedInstance)
  const prevIndex = currentIndex === 0 ? instancesArray.length - 1 : currentIndex - 1
  
  setFocusedInstance(instancesArray[prevIndex])
}