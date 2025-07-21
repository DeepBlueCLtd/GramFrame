/**
 * GramFrame - Main entry point
 * 
 * A JavaScript component for interactive spectrogram analysis that transforms 
 * HTML config tables into interactive SVG-based overlays for sonar training materials.
 */

/// <reference path="./types.js" />

// Import the main GramFrame class
import './main.js'

// The main.js file exports GramFrame as a global, so it's available as window.GramFrame
// This preserves backward compatibility with existing usage patterns

// @ts-ignore - GramFrame is added to global by main.js
export default window.GramFrame