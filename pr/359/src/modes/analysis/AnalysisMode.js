import { BaseMode } from '../BaseMode.js'
import { dispatch, markAnnotationsChanged, recordDeletion } from '../../core/state.js'
import { commitAnnotationChange } from '../../core/annotationCommit.js'
import { createDiffingTable } from '../../components/DiffingTable.js'

/**
 * Build a marker row's delete button.
 *
 * Its nine lines of inline styling went with the control-row redesign: they
 * hard-coded a red the panel's own palette does not use, and being inline they
 * could not be overridden by the stylesheet that governs the other two tables'
 * delete buttons. It now looks like its counterparts because it is styled with
 * them.
 * @returns {HTMLButtonElement} The delete button
 */
function createMarkerDeleteButton() {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = '×'
  button.className = 'gram-frame-marker-delete-btn'
  button.title = 'Delete marker'
  return button
}

/**
 * Build the Label cell's content: the abbreviated label text.
 *
 * The cell used to carry a luggage-tag button opening a dialog. The label is
 * now edited in the style panel, in a field beside the colour and symbol of the
 * same marker — one place where everything about a selected feature is changed,
 * rather than a dialog for the text and a panel for the rest.
 *
 * @param {AnalysisMarker} marker - The row's marker
 * @returns {HTMLSpanElement} The label text
 */
function createMarkerLabelCell(marker) {
  const text = document.createElement('span')
  text.className = 'gram-frame-marker-label-text'
  text.textContent = formatMarkerLabelForTable(marker.label)
  return text
}
import { formatTime } from '../../utils/timeFormatter.js'
import { dataToSVG } from '../../utils/coordinates.js'
import { BaseDragHandler } from '../shared/BaseDragHandler.js'
import { getUniformTolerance, isWithinToleranceRadius } from '../../utils/tolerance.js'
import { createColorIndicator } from '../../rendering/symbols.js'
import { createMarkerMarks, markerSymbolSize, drawsCrosshair, CROSSHAIR_SIZE } from '../../rendering/markerGlyph.js'
import { createMarkerLabel } from '../../rendering/labels.js'
import { formatMarkerLabelForTable, normalizeMarkerLabel } from '../../utils/markerLabel.js'

/**
 * Analysis mode implementation
 * Provides crosshair rendering, basic time/frequency display, and persistent markers
 */
export class AnalysisMode extends BaseMode {
  /**
   * Initialize AnalysisMode with drag handler
   * @param {GramFrame} instance - GramFrame instance
   */
  constructor(instance) {
    super(instance)
    
    // Initialize drag handler with analysis-specific callbacks
    this.dragHandler = new BaseDragHandler(instance, {
      // A feature drag always carries a data position. Only the pan drag passes
      // null, and it runs on its own handler in `core/events.js`.
      resolveTarget: (position) => this.findMarkerAtPosition(/** @type {DataCoordinates} */ (position)),
      onDragStart: (target, position) => this.onMarkerDragStart(target, /** @type {DataCoordinates} */ (position)),
      onDragMove: (target, currentPos, startPos) => this.onMarkerDragUpdate(target, /** @type {DataCoordinates} */ (currentPos), /** @type {DataCoordinates} */ (startPos)),
      onDragEnd: (target, position) => this.onMarkerDragEnd(target, position),
      updateCursor: (style) => this.updateCursorStyle(style)
    }, 'analysis')
  }

  /**
   * This mode's markers, as the live array state holds.
   *
   * The single reach-in for marker data (spec 167, Story 5): every read below
   * goes through here rather than walking `instance.state.analysis.markers`
   * again. Yields an empty array before the slice exists, which reads the same
   * as "no markers" for every caller.
   * @returns {AnalysisMarker[]} The markers
   */
  get markers() {
    const analysis = this.instance.state.analysis
    return (analysis && analysis.markers) || []
  }

  /**
   * Find one of this mode's markers by id.
   * @param {string|null|undefined} markerId - Marker id to look for
   * @returns {AnalysisMarker|undefined} The marker, or `undefined` if it has gone
   */
  findMarker(markerId) {
    return this.markers.find(m => m.id === markerId)
  }

  /**
   * Start dragging a marker
   * @param {DragTarget} target - Drag target with id and type
   * @param {DataCoordinates} position - Start position
   */
  onMarkerDragStart(target, position) {
    // Drag bookkeeping belongs to the engine (state.drag); this callback only
    // does the mode-specific part.
    void position

    // Auto-select the marker being dragged
    const markers = this.markers
    const marker = markers.find(m => m.id === target.id)
    if (marker) {
      const index = markers.findIndex(m => m.id === target.id)
      // Non-null: a marker was found by matching this id, so it is a real one.
      this.instance.interaction.setSelection('marker', /** @type {string} */ (target.id), index)
    }
  }

  /**
   * Update marker position during drag
   * @param {DragTarget} target - Drag target with id and type
   * @param {DataCoordinates} currentPos - Current position
   * @param {DataCoordinates} _startPos - Start position (unused)
   */
  onMarkerDragUpdate(target, currentPos, _startPos) {
    const marker = this.findMarker(target.id)
    if (marker) {
      // Update marker position
      marker.freq = currentPos.freq
      marker.time = currentPos.time
      markAnnotationsChanged(this.instance)
      
      // Re-render persistent features
      if (this.instance.featureRenderer) {
        this.instance.featureRenderer.renderAllPersistentFeatures()
      }
      
      // Throttle table updates - use requestAnimationFrame
      if (!this.updateTableScheduled) {
        this.updateTableScheduled = true
        requestAnimationFrame(() => {
          this.updateMarkersTable()
          this.updateTableScheduled = false
        })
      }
      
      // Notify listeners
      dispatch(this.instance, { frame: true })
    }
  }

  /**
   * End dragging a marker
   * @param {Object} _target - Drag target with id and type (unused)
   * @param {DataCoordinates|null} _position - End position (unused)
   */
  onMarkerDragEnd(_target, _position) {
    // Nothing to unwind: the engine clears the drag record itself.
  }

  /**
   * Get guidance content for analysis mode
   * @returns {Object} Structured guidance content
   */
  getGuidanceText() {
    return {
      items: [
        { trigger: 'Click', outcome: 'to add a persistent cross' },
        { trigger: 'Drag', outcome: 'an existing cross to reposition it' },
        { trigger: 'Right-click', outcome: 'a cross to delete it' },
        { trigger: 'Row + \u2190 \u2192', outcome: 'to nudge (Shift for larger steps)' }
      ]
    }
  }

  /**
   * Handle mouse move events in analysis mode
   * @param {MouseEvent} _event - Mouse event (unused in current implementation)
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseMove(_event, dataCoords) {
    // Handle drag operations through drag handler
    if (this.dragHandler.isDragging()) {
      this.dragHandler.handleMouseMove(dataCoords)
    } else {
      // Update cursor style for hover
      this.dragHandler.updateCursorForHover(dataCoords)
    }
    
    // Universal cursor readouts are now handled centrally in main.js
    // Analysis mode specific handling can be added here if needed
  }

  /**
   * Handle mouse down events in analysis mode
   * @param {MouseEvent} event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseDown(event, dataCoords) {
    // Only handle left clicks
    if (event.button !== 0) {
      return
    }
    
    // Try to start drag on existing marker
    const dragStarted = this.dragHandler.startDrag(dataCoords)
    
    if (!dragStarted) {
      // No marker found, create new marker at click location
      this.createMarkerAtPosition(dataCoords)
    }
  }

  /**
   * Handle mouse up events in analysis mode
   * @param {MouseEvent} _event - Mouse event (unused in current implementation)
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleMouseUp(_event, dataCoords) {
    // End drag operation through drag handler
    this.dragHandler.endDrag(dataCoords)
  }

  /**
   * Handle mouse leave events in analysis mode
   */
  handleMouseLeave() {
    // Universal cursor clearing is now handled centrally
    // Analysis mode specific cleanup can be added here if needed
  }

  /**
   * Handle context menu (right-click) events in analysis mode
   * @param {MouseEvent} event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  handleContextMenu(event, dataCoords) {
    event.preventDefault() // Prevent default context menu
    
    // Find marker at right-click position
    const target = this.findMarkerAtPosition(dataCoords)
    if (target) {
      // `findMarkerAtPosition` only ever returns a move-kind target, which
      // always carries the id of the marker it found.
      this.removeMarker(/** @type {string} */ (target.id))
    }
  }

  // Cursor position updates are now handled universally in main.js
  // No need for mode-specific cursor position management

  /**
   * Create a marker at the specified position
   * @param {DataCoordinates} dataCoords - Data coordinates {freq, time}
   */
  createMarkerAtPosition(dataCoords) {
    // Get the current marker color and symbol from global state
    const { selectedColor, selectedSymbol, largeSymbols } = this.instance.state
    const color = selectedColor || '#ff6b6b'
    const symbol = selectedSymbol || 'cross'

    // Create marker object (we only need time/freq for positioning)
    /** @type {AnalysisMarker} */
    const marker = {
      id: `marker-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      color,
      time: dataCoords.time,
      freq: dataCoords.freq,
      symbol,
      // EXPERIMENT (temporary): symbol size is carried per marker, seeded from
      // the toggle's next-feature default, so both sizes can coexist.
      largeSymbols: !!largeSymbols
    }
    
    // Add marker to state
    this.addMarker(marker)
  }

  /**
   * Whether this mode currently owns any persistent feature.
   *
   * Half of the `PersistentFeatureProvider` capability. Lived on
   * `FeatureRenderer` as `hasAnalysisFeatures()` until spec 167 moved it onto
   * the mode that owns the state it reads.
   * @returns {boolean} True if at least one marker exists
   */
  hasPersistentFeatures() {
    return this.markers.length > 0
  }

  /**
   * Render persistent features for analysis mode
   */
  renderPersistentFeatures() {
    if (!this.instance.ui.cursorGroup) {
      return
    }
    
    // Clear existing analysis markers
    const existingMarkers = this.instance.ui.cursorGroup.querySelectorAll('.gram-frame-analysis-marker')
    existingMarkers.forEach(marker => marker.remove())
    
    // Render all markers, wherever they sit in time: an audio-sourced gram is
    // drawn for the whole recording, so nothing is hidden by the playhead
    // (spec 171, FR-006).
    this.markers.forEach(marker => this.renderMarker(marker))
  }

  /**
   * Render a single marker as a crosshair
   * @param {AnalysisMarker} marker - Marker object
   */
  renderMarker(marker) {
    if (!this.instance.ui.cursorGroup) {
      return
    }
    
    // Calculate current position based on time/freq values and current zoom/pan state using utility
    const markerPoint = { freq: marker.freq, time: marker.time }
    const markerSVG = dataToSVG(markerPoint, this.getViewport(), this.instance.ui.spectrogramImage)
    const currentX = markerSVG.x
    const currentY = markerSVG.y
    
    // Create marker group
    const markerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    markerGroup.setAttribute('class', 'gram-frame-analysis-marker')
    markerGroup.setAttribute('data-marker-id', marker.id)

    // What a marker looks like -- symbol or crosshair -- is the rendering
    // layer's business, beside the symbol and label renderers (issue #273).
    const symbolSize = markerSymbolSize(marker)
    for (const mark of createMarkerMarks(marker, currentX, currentY)) {
      markerGroup.appendChild(mark)
    }

    // The marker's label, if it carries one (feature 231). Appended last so the
    // haloed text sits above the crosshair or symbol it annotates.
    const label = createMarkerLabel(marker, currentX, currentY, symbolSize)
    if (label) {
      markerGroup.appendChild(label)
    }

    this.instance.ui.cursorGroup.appendChild(markerGroup)
  }









  /**
   * Create UI elements for analysis mode
   * @param {HTMLElement} markersContainer - Persistent container for markers table
   */
  createUI(markersContainer) {
    // Initialize uiElements
    this.uiElements = {}
    
    // Use the provided persistent markers container (already has label)
    this.uiElements.markersContainer = markersContainer
    
    // Create markers table in the persistent container
    this.createMarkersTable(markersContainer)
    
    // Store references to existing table elements if they exist
    this.uiElements.markersTable = markersContainer.querySelector('.gram-frame-table')
    
    // Store references for central color picker and LEDs (managed by unified layout)
    this.instance.ui.colorPicker = this.instance.ui.colorPicker || null
    this.instance.ui.timeLED = this.instance.ui.timeLED || null
    this.instance.ui.freqLED = this.instance.ui.freqLED || null
  }

  /**
   * Create markers table for displaying active markers
   *
   * The table wrapper sits inside a `gram-frame-table-area` element that claims
   * the column's remaining height; the wrapper fills it absolutely and scrolls,
   * so adding markers never grows the surrounding layout (the header row stays
   * pinned via sticky `th`).
   *
   * @param {HTMLElement} markersContainer - Persistent container for markers (already has label)
   */
  createMarkersTable(markersContainer) {
    // Check if table already exists to prevent duplicates
    if (markersContainer.querySelector('.gram-frame-table')) {
      return
    }

    // The container already has a label, so we just add the table wrapper.
    // Mechanism (scroll wrapper, header, row diffing, click-to-select, delete
    // propagation) comes from the shared component; everything below is what
    // makes this the *markers* table (spec 166, FR-009).
    this.markersTable = createDiffingTable(markersContainer, {
      // The only five-column table in the panel, and it sits in the narrowest
      // of the three columns, so the tracks are deliberately tight. Time and
      // Freq both show five characters ("00:42", "24.71") and are right-aligned
      // and tabular; the units moved out of the headings, which had to carry
      // "Time (mm:ss)" across 23% of a third of the tables' width.
      columns: [
        { label: '', width: '10%', cellClassName: 'gram-frame-marker-color' },
        { label: 'Label', width: '32%', cellClassName: 'gram-frame-marker-label-cell' },
        { label: 'Time', width: '24%', cellClassName: 'gram-frame-cell-numeric' },
        { label: 'Freq', width: '24%', cellClassName: 'gram-frame-cell-numeric' },
        { label: '', width: '10%', cellClassName: 'gram-frame-cell-action' }
      ],
      emptyMessage: 'Click the gram to add a cross',
      rowAttribute: 'data-marker-id',
      rowKey: (marker) => marker.id,
      cells: (marker) => [
        // Colour/symbol cell — a shaped symbol shows the colour-coded symbol;
        // the cross (symbol-less) style shows a filled colour rectangle (FR-010).
        createColorIndicator(marker.symbol, marker.color, 20),
        // Label cell — abbreviated so the column keeps its width; the full text
        // stays on the gram and in the edit dialog (feature 231). Also carries
        // the label button, floated top-right.
        createMarkerLabelCell(marker),
        formatTime(marker.time),
        marker.freq.toFixed(2),
        createMarkerDeleteButton()
      ],
      deleteSelector: '.gram-frame-marker-delete-btn',
      onSelect: (markerId, _marker, index) =>
        this.instance.interaction.toggleSelection('marker', markerId, index),
      onDelete: (markerId) => this.removeMarker(markerId),
      isSelected: (markerId) => this.instance.interaction.isFeatureSelected('marker', markerId)
    })

    // Store all UI elements for proper cleanup
    this.uiElements.markersTable = this.markersTable.element

    // Populate table with existing markers when UI is created
    this.updateMarkersTable()
  }

  /**
   * Re-render this mode's persistent panel from current state.
   *
   * The `PanelOwner` capability. `MainUI` used to reach in by name and call
   * `updateMarkersTable` through an `any` cast; it now asks every mode that
   * owns a panel to refresh it (spec 167, FR-006, AS-4.2).
   */
  refreshPanel() {
    this.updateMarkersTable()
  }

  /**
   * Update markers table with current markers
   */
  updateMarkersTable() {
    if (!this.markersTable) return

    this.markersTable.update(this.markers)
  }

  /**
   * Update LED displays for analysis mode
   * @param {CursorPosition} _coords - Current cursor coordinates
   */
  updateLEDs(_coords) {
    // Time and Frequency LEDs are now managed centrally
    // Analysis mode specific LED updates can be added here if needed
  }

  /**
   * Get initial state for analysis mode
   * @returns {AnalysisInitialState} Analysis mode state including markers
   */
  static getInitialState() {
    return {
      analysis: {
        markers: []
      }
    }
  }

  /**
   * Add a new persistent marker
   * @param {AnalysisMarker} marker - Marker object with all properties
   */
  addMarker(marker) {
    const state = this.instance.state
    if (!state.analysis) {
      state.analysis = { markers: [] }
    }

    state.analysis.markers.push(marker)

    // Auto-select the newly created marker, before the commit refreshes the
    // table that draws the selection.
    const index = state.analysis.markers.length - 1
    this.instance.interaction.setSelection('marker', marker.id, index)

    commitAnnotationChange(this.instance, () => this.updateMarkersTable(), { frame: true })
  }

  /**
   * Remove a marker by ID
   * @param {string} markerId - ID of marker to remove
   */
  removeMarker(markerId) {
    const markers = this.markers
    const index = markers.findIndex(m => m.id === markerId)
    if (index !== -1) {
      // Clear selection if removing the selected marker
      if (this.instance.interaction.isFeatureSelected('marker', markerId)) {
        this.instance.interaction.clearSelection()
      }
      
      markers.splice(index, 1)
      // Deleting is the one change a merge cannot infer from the result, so it
      // is recorded explicitly (issue #269).
      recordDeletion(this.instance, 'markers', markerId)

      commitAnnotationChange(this.instance, () => this.updateMarkersTable(), { frame: true })
    }
  }

  /**
   * Set (or clear) a marker's label and re-render everything that shows it.
   *
   * Passing an empty or whitespace-only label removes it, so "clear the field
   * and save" is how a label is deleted.
   * @param {string} markerId - ID of the marker to update
   * @param {string|undefined} label - New label, or `undefined`/empty to remove it
   */
  setMarkerLabel(markerId, label) {
    const marker = this.findMarker(markerId)
    if (!marker) return

    const normalized = normalizeMarkerLabel(label)
    if (normalized) {
      marker.label = normalized
    } else {
      // Absent rather than empty: "no label" has exactly one representation.
      delete marker.label
    }
    commitAnnotationChange(this.instance, () => this.updateMarkersTable())
  }

  /**
   * Find marker at given position (with tolerance)
   * Returns a drag target object compatible with BaseDragHandler
   * @param {DataCoordinates} position - Position to check
   * @returns {DragTarget|null} Drag target if found, null otherwise
   */
  findMarkerAtPosition(position) {
    const tolerance = getUniformTolerance(this.getViewport(), this.instance.ui.spectrogramImage)
    
    // Check each marker to see if position hits the crosshair lines
    const marker = this.markers.find(candidate => {
      // Check if we're close to the marker center (original behavior)
      if (isWithinToleranceRadius(
        position,
        { freq: candidate.freq, time: candidate.time },
        tolerance
      )) {
        return true
      }
      
      // Additionally check the crosshair arms -- but only on a marker that
      // draws them. Testing them for every marker made a symbol marker
      // grabbable along an invisible 30x30 px cross (issue #273).
      if (!drawsCrosshair(candidate)) {
        return false
      }

      // Convert marker position to SVG coordinates
      const markerPoint = { freq: candidate.freq, time: candidate.time }
      const markerSVG = dataToSVG(markerPoint, this.getViewport(), this.instance.ui.spectrogramImage)
      
      // Convert click position to SVG coordinates
      const clickSVG = dataToSVG(position, this.getViewport(), this.instance.ui.spectrogramImage)
      
      const crosshairSize = CROSSHAIR_SIZE // pixels in SVG space
      const lineThickness = 3 // effective hit area around the line (half of stroke-width + tolerance)
      
      // Check horizontal line: Y must be close, X must be within crosshair extent
      const onHorizontalLine = 
        Math.abs(clickSVG.y - markerSVG.y) <= lineThickness &&
        Math.abs(clickSVG.x - markerSVG.x) <= crosshairSize
      
      // Check vertical line: X must be close, Y must be within crosshair extent  
      const onVerticalLine = 
        Math.abs(clickSVG.x - markerSVG.x) <= lineThickness &&
        Math.abs(clickSVG.y - markerSVG.y) <= crosshairSize
      
      return onHorizontalLine || onVerticalLine
    })
    
    if (marker) {
      return {
        kind: 'move',
        id: marker.id,
        type: 'marker',
        position: { freq: marker.freq, time: marker.time },
        data: marker
      }
    }
    
    return null
  }

  /**
   * Update mode-specific LED values based on cursor position
   */
  updateModeSpecificLEDs() {
    // Time and frequency LEDs are now managed centrally
    // Analysis mode doesn't have mode-specific LEDs
  }

  /**
   * Clean up analysis mode state
   */
  cleanup() {
  }

  /**
   * Destroy mode-specific UI elements when leaving this mode
   */
  destroyUI() {
    // Central LEDs and color picker are managed by unified layout
    // Markers table and container are persistent and should not be removed
    
    // Don't call super.destroyUI() because it removes persistent elements from DOM
    // Analysis mode elements are all persistent, so no cleanup needed
  }

  /**
   * Reset analysis mode state
   */
  resetState() {
  }
}