import { BaseMode } from '../BaseMode.js'
import { updateLEDDisplays } from '../../components/UIComponents.js'
import { dispatch, markAnnotationsChanged } from '../../core/state.js'
// Rendering imports removed - no display element
import { calculateDopplerSpeed, calculateMidpoint } from '../../utils/doppler.js'
import { dataToSVG } from '../../utils/coordinates.js'
import { BaseDragHandler } from '../shared/BaseDragHandler.js'
import { getUniformTolerance, isWithinDataTolerance, findClosestTarget } from '../../utils/tolerance.js'

// Constants
const MS_TO_KNOTS_CONVERSION = 1.94384

// Doppler marker types
/** @type {Record<DopplerDraggedMarker, DopplerDraggedMarker>} */
const DopplerDraggedMarker = {
  fPlus: 'fPlus',
  fMinus: 'fMinus', 
  fZero: 'fZero'
}

/**
 * Doppler mode implementation
 * Handles Doppler marker placement, dragging, and speed calculations
 */
export class DopplerMode extends BaseMode {
  /**
   * Initialize DopplerMode with drag handler
   * @param {Object} instance - GramFrame instance
   */
  constructor(instance) {
    super(instance)
    
    // One handler for both doppler drags: moving a placed marker (`move`) and
    // laying down f+/f- by dragging (`place`). They differ only in how the
    // target is resolved (spec 166, FR-004).
    this.dragHandler = new BaseDragHandler(instance, {
      resolveTarget: (position) => this.resolveDopplerDrag(position),
      onDragStart: (target, position) => this.onMarkerDragStart(target, position),
      onDragMove: (target, currentPos, startPos) => this.onMarkerDragUpdate(target, currentPos, startPos),
      onDragEnd: (target, position) => this.onMarkerDragEnd(target, position),
      onDragCancel: (target) => this.onMarkerDragEnd(target, null),
      updateCursor: (style) => this.updateCursorStyle(style)
    }, 'doppler')
  }

  /**
   * Find doppler marker at given position
   * Returns a drag target object compatible with BaseDragHandler
   * @param {DataCoordinates} position - Position to check
   * @returns {Object|null} Drag target if found, null otherwise
   */
  findDopplerMarkerAtPosition(position) {
    const doppler = this.instance.state.doppler
    if (!doppler) return null

    const tolerance = getUniformTolerance(this.getViewport(), this.instance.spectrogramImage)

    // Grab region: the same per-axis tolerance box as before. Among the markers
    // inside it (they overlap when the curve is short) take the closest, falling
    // back to the first match for a position inside the box but outside the
    // tolerance circle — so the region an analyst can grab is unchanged.
    const targets = [
      DopplerDraggedMarker.fPlus,
      DopplerDraggedMarker.fMinus,
      DopplerDraggedMarker.fZero
    ]
      .filter(markerType => doppler[markerType])
      .map(markerType => ({
        kind: 'move',
        id: markerType,
        type: 'dopplerMarker',
        position: doppler[markerType],
        data: { markerType }
      }))
      .filter(target => isWithinDataTolerance(position, target.position, tolerance))

    return findClosestTarget(position, targets, tolerance) || targets[0] || null
  }

  /**
   * Start dragging a doppler marker
   * @param {Object} target - Drag target with id and type
   * @param {DataCoordinates} _position - Start position (unused)
   */
  onMarkerDragStart(target, _position) {
    // A `place` drag has already seeded f+ in the resolver; a `move` drag has
    // nothing to set up. Either way the drag record belongs to the engine.
    void target
  }

  /**
   * Update doppler marker position during drag
   * @param {DragTarget} target - Drag target
   * @param {DataCoordinates} currentPos - Current position
   * @param {DataCoordinates} _startPos - Start position (unused)
   */
  onMarkerDragUpdate(target, currentPos, _startPos) {
    const doppler = this.instance.state.doppler

    if (target.kind === 'place') {
      // Placement: f- follows the pointer while f+ stays where it was seeded
      this.handlePreviewDrag(currentPos, doppler)
      return
    }

    this.handleMarkerDrag(currentPos, doppler, target.id)
  }

  /**
   * End dragging a doppler marker
   * @param {DragTarget} target - Drag target
   * @param {DataCoordinates} _position - End position (unused)
   */
  onMarkerDragEnd(target, _position) {
    if (target && target.kind === 'place') {
      this.completeMarkerPlacement()
    }
    // Nothing else to unwind: the engine clears the drag record itself.
  }

  /**
   * Resolve what a mousedown in doppler mode starts: moving one of the placed
   * markers, or — with nothing placed yet — laying down f+ and dragging out f-.
   * @param {DataCoordinates} position - Position of the mousedown
   * @returns {DragTarget|null} A move- or place-kind target
   */
  resolveDopplerDrag(position) {
    const doppler = this.instance.state.doppler

    if (doppler.fPlus || doppler.fMinus || doppler.fZero) {
      return this.findDopplerMarkerAtPosition(position)
    }

    return this.startMarkerPlacement(position)
  }

  /**
   * Seed f+ at the mousedown position and return a `place`-kind target, so the
   * rest of the placement is an ordinary drag with f- following the pointer.
   *
   * `tempFirst` and `previewEnd` stay on state.doppler: they are placement
   * geometry the renderer needs, not drag bookkeeping (data-model.md §2).
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   * @returns {DragTarget} A place-kind target
   */
  startMarkerPlacement(dataCoords) {
    const doppler = this.instance.state.doppler

    // Immediately set f+ at the current position
    doppler.fPlus = { time: dataCoords.time, freq: dataCoords.freq }

    // f- will follow the mouse from here
    doppler.tempFirst = doppler.fPlus
    doppler.previewEnd = { time: dataCoords.time, freq: dataCoords.freq }

    // Render initial curve preview
    this.renderDopplerFeatures()

    return {
      kind: 'place',
      id: DopplerDraggedMarker.fMinus,
      type: 'dopplerMarker',
      position: dataCoords,
      data: { markerType: DopplerDraggedMarker.fMinus }
    }
  }

  /**
   * Finalise a placement drag: order the markers, derive f₀, and clear the
   * placement geometry.
   */
  completeMarkerPlacement() {
    const doppler = this.instance.state.doppler
    if (!doppler.tempFirst || !doppler.fPlus || !doppler.fMinus) {
      doppler.tempFirst = null
      doppler.previewEnd = null
      return
    }

    // Ensure f+ is the later marker (higher time), f- is the earlier marker
    if (doppler.fPlus.time <= doppler.fMinus.time) {
      const temp = doppler.fPlus
      doppler.fPlus = doppler.fMinus
      doppler.fMinus = temp
    }

    // Recalculate f₀ as midpoint for final placement
    doppler.fZero = this.calculateMidpoint(doppler.fPlus, doppler.fMinus)

    // Store the color for this doppler curve (only when first created)
    if (!doppler.color) {
      doppler.color = this.instance.state.selectedColor || '#ff0000'
    }

    // Clean up placement geometry
    doppler.tempFirst = null
    doppler.previewEnd = null

    markAnnotationsChanged(this.instance)

    // Calculate speed
    this.calculateAndUpdateDopplerSpeed()
    this.renderDopplerFeatures()
  }

  /**
   * Get guidance content for doppler mode
   * @returns {Object} Structured guidance content
   */
  getGuidanceText() {
    return {
      title: 'Doppler Mode',
      items: [
        'Click & drag to place markers for f+ and f-',
        'Drag markers to adjust positions',
        'f₀ marker shows automatically at the midpoint',
        'Right-click to reset all markers'
      ]
    }
  }

  /**
   * Handle preview drag when placing markers
   * @param {DataCoordinates} dataCoords - Data coordinates
   * @param {DopplerState} doppler - Doppler state
   */
  handlePreviewDrag(dataCoords, doppler) {
    // Update f- position to follow mouse during preview
    doppler.fMinus = {
      time: dataCoords.time,
      freq: dataCoords.freq
    }
    
    // Calculate f₀ as midpoint for preview
    doppler.fZero = this.calculateMidpoint(doppler.fPlus, doppler.fMinus)

    // Published for listeners watching an in-progress placement
    doppler.previewEnd = doppler.fMinus

    // Render the complete curve preview
    this.renderDopplerFeatures()
  }

  /**
   * Handle marker dragging
   * @param {DataCoordinates} dataCoords - Data coordinates
   * @param {DopplerState} doppler - Doppler state
   * @param {string|null} markerType - Which marker is being dragged
   */
  handleMarkerDrag(dataCoords, doppler, markerType) {
    const newPoint = {
      time: dataCoords.time,
      freq: dataCoords.freq
    }

    if (markerType === DopplerDraggedMarker.fPlus) {
      doppler.fPlus = newPoint
    } else if (markerType === DopplerDraggedMarker.fMinus) {
      doppler.fMinus = newPoint
    } else if (markerType === DopplerDraggedMarker.fZero) {
      doppler.fZero = newPoint
    }
    
    markAnnotationsChanged(this.instance)

    // f₀ remains fixed when dragging f+ or f- - only moves when directly dragged
    
    // Update speed calculation
    this.calculateAndUpdateDopplerSpeed()
    this.renderDopplerFeatures()
    dispatch(this.instance, { frame: true })
  }


  /**
   * Handle mouse move events in doppler mode
   * @param {MouseEvent} _event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseMove(_event, dataCoords) {
    const doppler = this.instance.state.doppler

    // Placement and marker moves both run through the one handler
    if (this.dragHandler.isDragging()) {
      this.dragHandler.handleMouseMove(dataCoords)
    } else if (doppler.fPlus || doppler.fMinus || doppler.fZero) {
      // Update cursor for hover when not dragging
      this.dragHandler.updateCursorForHover(dataCoords)
    }
  }

  /**
   * Handle mouse down events in doppler mode
   * @param {MouseEvent} event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseDown(event, dataCoords) {
    // The resolver decides whether this moves a marker or starts a placement
    if (this.dragHandler.startDrag(dataCoords, event)) {
      dispatch(this.instance, { frame: true })
    }
  }

  /**
   * Handle mouse up events in doppler mode
   * @param {MouseEvent} _event - Mouse event (unused)
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseUp(_event, dataCoords) {
    // One exit for both kinds; onDragEnd finalises a placement
    if (this.dragHandler.isDragging()) {
      this.dragHandler.endDrag(dataCoords)
      dispatch(this.instance, { frame: true })
    }
  }









  /**
   * Create UI elements for doppler mode
   * @param {HTMLElement} _leftColumn - Container for UI elements (unused)
   */
  createUI(_leftColumn) {
    // Initialize uiElements
    this.uiElements = {}
    
    // Speed LED is now managed centrally in the unified layout and always visible
    // Store references for central speed LED
    this.instance.speedLED = this.instance.speedLED || null
  }

  /**
   * Update LED displays for doppler mode
   * @param {CursorPosition} _coords - Current cursor coordinates
   */
  updateLEDs(_coords) {
    // Doppler mode shows Speed LED only (created in createUI)
    this.updateModeSpecificLEDs()
  }

  /**
   * Update mode-specific LED values based on current state
   */
  updateModeSpecificLEDs() {
    // Speed LED is updated via updateSpeedLED() when speed is calculated
    // No cursor-based updates needed for doppler mode
  }

  /**
   * Reset doppler-specific state
   */
  resetState() {
    this.instance.state.doppler.fPlus = null
    this.instance.state.doppler.fMinus = null
    this.instance.state.doppler.fZero = null
    this.instance.state.doppler.speed = null
    this.instance.state.doppler.color = null
    this.instance.state.doppler.tempFirst = null
    this.instance.state.doppler.previewEnd = null
    this.dragHandler.reset()

    // Visual updates removed - no display element
    dispatch(this.instance, { frame: true })
  }

  /**
   * Clean up doppler-specific state when switching away from doppler mode
   */
  cleanup() {
    // Only clear transient placement geometry, preserve marker positions
    this.instance.state.doppler.tempFirst = null
    this.instance.state.doppler.previewEnd = null
    this.dragHandler.reset()
  }
  
  /**
   * Deactivate doppler mode - hide speed LED
   */
  deactivate() {
    // Speed LED now stays visible across all modes
  }



  /**
   * Calculate and update Doppler speed
   */
  calculateAndUpdateDopplerSpeed() {
    const doppler = this.instance.state.doppler
    
    if (doppler.fPlus && doppler.fMinus && doppler.fZero) {
      const speed = calculateDopplerSpeed(doppler.fPlus, doppler.fMinus, doppler.fZero)
      this.instance.state.doppler.speed = speed
      
      // Update speed LED with calculated value
      this.updateSpeedLED()
      
      // Update LED displays with speed
      updateLEDDisplays(this.instance, this.instance.state)
      dispatch(this.instance, { frame: true })
    }
  }

  /**
   * Get initial state for doppler mode
   * @returns {DopplerInitialState} Doppler-specific initial state
   */
  static getInitialState() {
    return {
      doppler: {
        fPlus: null,  // DataCoordinates: { time, frequency }
        fMinus: null, // DataCoordinates: { time, frequency }
        fZero: null,  // DataCoordinates: { time, frequency }
        speed: null,  // calculated speed in m/s
        color: null,  // color used for this doppler curve
        // Placement geometry the renderer needs. Drag bookkeeping lives on
        // state.drag, owned by the drag engine.
        tempFirst: null, // temporary storage for first marker during placement
        previewEnd: null // end point for preview drag
      }
    }
  }

  /**
   * Update the speed LED display with current speed value
   */
  updateSpeedLED() {
    if (this.instance.speedLED && this.instance.state.doppler.speed !== null) {
      // Convert m/s to knots: 1 m/s = 1.94384 knots
      const speedInKnots = this.instance.state.doppler.speed * MS_TO_KNOTS_CONVERSION
      this.instance.speedLED.querySelector('.gram-frame-led-value').textContent = speedInKnots.toFixed(1)
    } else if (this.instance.speedLED) {
      this.instance.speedLED.querySelector('.gram-frame-led-value').textContent = '0.0'
    }
  }

  /**
   * Calculate midpoint between two markers
   * @param {DataCoordinates} fPlus - f+ marker
   * @param {DataCoordinates} fMinus - f- marker
   * @returns {DataCoordinates} Midpoint coordinates
   */
  calculateMidpoint(fPlus, fMinus) {
    return calculateMidpoint(fPlus, fMinus)
  }

  /**
   * Handle context menu (right-click) events in doppler mode
   * @param {MouseEvent} event - Mouse event
   * @param {DataCoordinates} _dataCoords - Data coordinates {freq, time} (unused)
   */
  handleContextMenu(event, _dataCoords) {
    event.preventDefault()
    this.resetState()
    this.updateSpeedLED() // Reset the speed LED display
    this.renderDopplerFeatures()
  }

  /**
   * Render all doppler features (markers and curves)
   */
  renderDopplerFeatures() {
    if (!this.instance.cursorGroup) return
    
    // Clear existing doppler features
    const existingFeatures = this.instance.cursorGroup.querySelectorAll('.doppler-feature, .gram-frame-doppler-preview, .gram-frame-doppler-curve, .gram-frame-doppler-extension, .gram-frame-doppler-fPlus, .gram-frame-doppler-fMinus, .gram-frame-doppler-crosshair')
    existingFeatures.forEach(element => element.remove())
    
    const doppler = this.instance.state.doppler
    
    // Render preview during placement OR final markers and curves
    if (doppler.fPlus && doppler.fMinus && doppler.fZero) {
      this.renderMarkers()
      this.renderDopplerCurve()
      
      // If in preview mode, render with preview styling
      if (doppler.tempFirst) {
        // Add preview styling to indicate this is temporary
        const elements = this.instance.cursorGroup.querySelectorAll('.gram-frame-doppler-curve, .gram-frame-doppler-extension')
        elements.forEach(element => {
          element.setAttribute('opacity', '0.8')
          element.setAttribute('stroke-dasharray', '5,5')
        })
      }
    }
  }

  /**
   * Render doppler markers (f+, f-, f₀) with zoom awareness
   */
  renderMarkers() {
    const doppler = this.instance.state.doppler
    
    // Use stored color for existing curve, or global selectedColor for new curves
    const color = doppler.color || this.instance.state.selectedColor || '#ff0000'
    
    // Check if we're in doppler mode to enable/disable pointer events
    const isInDopplerMode = this.instance.state.mode === 'doppler'
    const pointerEvents = isInDopplerMode ? 'auto' : 'none'
    
    // f+ marker (colored dot)
    if (doppler.fPlus) {
      const fPlusSVG = dataToSVG(doppler.fPlus, this.getViewport(), this.instance.spectrogramImage)
      const fPlusMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      fPlusMarker.setAttribute('class', 'gram-frame-doppler-fPlus')
      fPlusMarker.setAttribute('cx', fPlusSVG.x.toString())
      fPlusMarker.setAttribute('cy', fPlusSVG.y.toString())
      fPlusMarker.setAttribute('r', '4')
      fPlusMarker.setAttribute('fill', color)
      fPlusMarker.setAttribute('stroke', '#ffffff')
      fPlusMarker.setAttribute('stroke-width', '1')
      fPlusMarker.setAttribute('pointer-events', pointerEvents)
      this.instance.cursorGroup.appendChild(fPlusMarker)
    }
    
    // f- marker (colored dot)
    if (doppler.fMinus) {
      const fMinusSVG = dataToSVG(doppler.fMinus, this.getViewport(), this.instance.spectrogramImage)
      const fMinusMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      fMinusMarker.setAttribute('class', 'gram-frame-doppler-fMinus')
      fMinusMarker.setAttribute('cx', fMinusSVG.x.toString())
      fMinusMarker.setAttribute('cy', fMinusSVG.y.toString())
      fMinusMarker.setAttribute('r', '4')
      fMinusMarker.setAttribute('fill', color)
      fMinusMarker.setAttribute('stroke', '#ffffff')
      fMinusMarker.setAttribute('stroke-width', '1')
      fMinusMarker.setAttribute('pointer-events', pointerEvents)
      this.instance.cursorGroup.appendChild(fMinusMarker)
    }
    
    // f₀ marker (green crosshair) - keep green as it's the midpoint indicator
    if (doppler.fZero) {
      const fZeroSVG = dataToSVG(doppler.fZero, this.getViewport(), this.instance.spectrogramImage)
      
      // Horizontal line
      const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      hLine.setAttribute('class', 'gram-frame-doppler-crosshair')
      hLine.setAttribute('x1', (fZeroSVG.x - 8).toString())
      hLine.setAttribute('y1', fZeroSVG.y.toString())
      hLine.setAttribute('x2', (fZeroSVG.x + 8).toString())
      hLine.setAttribute('y2', fZeroSVG.y.toString())
      hLine.setAttribute('stroke', '#00ff00')
      hLine.setAttribute('stroke-width', '2')
      hLine.setAttribute('pointer-events', pointerEvents)
      this.instance.cursorGroup.appendChild(hLine)
      
      // Vertical line
      const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      vLine.setAttribute('class', 'gram-frame-doppler-crosshair')
      vLine.setAttribute('x1', fZeroSVG.x.toString())
      vLine.setAttribute('y1', (fZeroSVG.y - 8).toString())
      vLine.setAttribute('x2', fZeroSVG.x.toString())
      vLine.setAttribute('y2', (fZeroSVG.y + 8).toString())
      vLine.setAttribute('stroke', '#00ff00')
      vLine.setAttribute('stroke-width', '2')
      vLine.setAttribute('pointer-events', pointerEvents)
      this.instance.cursorGroup.appendChild(vLine)
    }
  }

  /**
   * Render Doppler curve between markers with vertical extensions (zoom-aware)
   */
  renderDopplerCurve() {
    const doppler = this.instance.state.doppler
    if (!doppler.fPlus || !doppler.fMinus || !doppler.fZero) return
    
    // Use stored color for existing curve, or global selectedColor for new curves
    const color = doppler.color || this.instance.state.selectedColor || '#ff0000'
    
    const fPlusSVG = dataToSVG(doppler.fPlus, this.getViewport(), this.instance.spectrogramImage)
    const fMinusSVG = dataToSVG(doppler.fMinus, this.getViewport(), this.instance.spectrogramImage)
    const fZeroSVG = dataToSVG(doppler.fZero, this.getViewport(), this.instance.spectrogramImage)
    
    // Create S-curve path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('class', 'gram-frame-doppler-curve')
    
    // Simple S-curve with vertical tangents (same logic as cursors.js but zoom-aware)
    const controlPoint1X = fMinusSVG.x
    const controlPoint1Y = fMinusSVG.y + (fZeroSVG.y - fMinusSVG.y) * 0.7
    const controlPoint2X = fPlusSVG.x  
    const controlPoint2Y = fPlusSVG.y + (fZeroSVG.y - fPlusSVG.y) * 0.7
    
    const pathData = `M ${fMinusSVG.x} ${fMinusSVG.y} C ${controlPoint1X} ${controlPoint1Y} ${controlPoint2X} ${controlPoint2Y} ${fPlusSVG.x} ${fPlusSVG.y}`
    
    path.setAttribute('d', pathData)
    path.setAttribute('stroke', color)
    path.setAttribute('stroke-width', '2')
    path.setAttribute('fill', 'none')
    
    this.instance.cursorGroup.appendChild(path)
    
    // Vertical extensions - clip to intersection of zoomed view and spectrogram data area
    const margins = this.instance.state.margins
    const { naturalHeight } = this.instance.state.imageDetails
    // Base render height (defaults to natural; grows when expanded)
    const renderHeight = this.instance.state.imageDetails.renderHeight || naturalHeight

    // Spectrogram data bounds at the current base render size
    const spectrogramTop = margins.top
    const spectrogramBottom = margins.top + renderHeight

    // Get the actual rendered view bounds (reflecting expand × zoom)
    let zoomedTop = spectrogramTop
    let zoomedBottom = spectrogramBottom

    if (this.instance.spectrogramImage) {
      const zoomedImageTop = parseFloat(this.instance.spectrogramImage.getAttribute('y') || String(margins.top))
      const zoomedImageHeight = parseFloat(this.instance.spectrogramImage.getAttribute('height') || String(renderHeight))
      zoomedTop = zoomedImageTop
      zoomedBottom = zoomedImageTop + zoomedImageHeight
    }
    
    // Calculate intersection bounds - extensions should not go beyond either limit
    const clippedTop = Math.max(spectrogramTop, zoomedTop)
    const clippedBottom = Math.min(spectrogramBottom, zoomedBottom)
    
    // Extension from f+ upward - only if f+ is below the clipped top
    if (fPlusSVG.y > clippedTop) {
      const fPlusExtension = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      fPlusExtension.setAttribute('class', 'gram-frame-doppler-extension')
      fPlusExtension.setAttribute('x1', fPlusSVG.x.toString())
      fPlusExtension.setAttribute('y1', fPlusSVG.y.toString())
      fPlusExtension.setAttribute('x2', fPlusSVG.x.toString())
      fPlusExtension.setAttribute('y2', clippedTop.toString())
      fPlusExtension.setAttribute('stroke', color)
      fPlusExtension.setAttribute('stroke-width', '2')
      this.instance.cursorGroup.appendChild(fPlusExtension)
    }
    
    // Extension from f- downward - only if f- is above the clipped bottom
    if (fMinusSVG.y < clippedBottom) {
      const fMinusExtension = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      fMinusExtension.setAttribute('class', 'gram-frame-doppler-extension')
      fMinusExtension.setAttribute('x1', fMinusSVG.x.toString())
      fMinusExtension.setAttribute('y1', fMinusSVG.y.toString())
      fMinusExtension.setAttribute('x2', fMinusSVG.x.toString())
      fMinusExtension.setAttribute('y2', clippedBottom.toString())
      fMinusExtension.setAttribute('stroke', color)
      fMinusExtension.setAttribute('stroke-width', '2')
      this.instance.cursorGroup.appendChild(fMinusExtension)
    }
  }


  /**
   * Whether this mode currently owns any persistent feature.
   *
   * Half of the `PersistentFeatureProvider` capability. Lived on
   * `FeatureRenderer` as `hasDopplerFeatures()` until spec 167 moved it onto
   * the mode that owns the state it reads.
   * @returns {boolean} True if any doppler marker has been placed
   */
  hasPersistentFeatures() {
    const doppler = this.instance.state.doppler
    return !!(doppler && (doppler.fPlus || doppler.fMinus || doppler.fZero))
  }

  /**
   * Render persistent features (for FeatureRenderer)
   */
  renderPersistentFeatures() {
    this.renderDopplerFeatures()
  }
}