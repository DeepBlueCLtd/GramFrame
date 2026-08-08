import { BaseMode } from '../BaseMode.js'
import { BaseDragHandler } from '../shared/BaseDragHandler.js'
import { getVersion } from '../../utils/version.js'
import { pixelDeltaToNormalizedPan, panByNormalized, zoomIn, zoomOut } from '../../core/viewport.js'
import { IDLE_CURSOR, PAN_IDLE_CURSOR, PAN_DRAG_CURSOR } from '../../utils/cursors.js'
import { WHEEL_NAV_GUIDANCE } from '../../utils/wheelGuidance.js'

/**
 * Pan mode - allows users to pan around the spectrogram when zoomed in
 * Extends BaseMode to provide pan functionality as a proper interaction mode
 */
export class PanMode extends BaseMode {
  /**
   * Constructor for pan mode
   * @param {GramFrame} instance - GramFrame instance
   */
  constructor(instance) {
    super(instance)

    // Panning is a `pan`-kind drag: it has no feature target, and its move
    // callback writes viewport state rather than feature state. The engine
    // accommodates that by allowing a null target id/type (spec 166, FR-004).
    this.lastPointer = { x: 0, y: 0 }
    this.dragHandler = new BaseDragHandler(instance, {
      resolveTarget: () => this.resolvePanDrag(),
      onDragStart: (_target, _position, event) => this.onPanStart(event),
      onDragMove: (_target, _position, _startPosition, event) => this.onPanMove(event),
      onDragEnd: () => this.onPanEnd(),
      onDragCancel: () => this.onPanEnd(),
      updateCursor: (style) => this.applyCursor(style),
      // A pan keeps the hand, rather than the hollow brackets feature drags use:
      // there is no target under the pointer for it to obscure.
      cursorFor: (kind, phase) => {
        if (kind !== 'pan') return null
        return phase === 'drag' ? PAN_DRAG_CURSOR : this.idleCursor()
      }
    }, 'pan')
  }

  /**
   * Decide whether a mousedown starts a pan. Panning is only meaningful when
   * zoomed in; at zoom 1 the click falls through and does nothing.
   * @returns {DragTarget|null} A pan-kind target, or null to decline
   */
  resolvePanDrag() {
    if (this.instance.state.zoom.level <= 1.0) {
      return null
    }
    return { kind: 'pan', id: null, type: null }
  }

  /**
   * The cursor pan mode rests at: a grab hand when there is something to pan.
   * @returns {string} Cursor style
   */
  idleCursor() {
    return this.instance.state.zoom.level > 1.0 ? PAN_IDLE_CURSOR : IDLE_CURSOR
  }

  /**
   * Apply a cursor style to the SVG.
   * @param {string} style - Cursor style
   */
  applyCursor(style) {
    if (this.instance.ui.svg) {
      this.instance.ui.svg.style.cursor = style
    }
  }

  /**
   * Record where the pan began, in screen pixels.
   * @param {MouseEvent} [event] - Originating mousedown
   */
  onPanStart(event) {
    if (event) {
      this.lastPointer = { x: event.clientX, y: event.clientY }
      // Prevent default to avoid text selection
      event.preventDefault()
    }
  }

  /**
   * Pan the viewport by the pointer delta since the last move.
   * @param {MouseEvent} [event] - Originating mousemove
   */
  onPanMove(event) {
    if (!event || this.instance.state.zoom.level <= 1.0) {
      return
    }

    const deltaX = event.clientX - this.lastPointer.x
    const deltaY = event.clientY - this.lastPointer.y

    // Convert pixel delta to normalized delta (shared with wheel-pan) and apply
    const { normalizedDeltaX, normalizedDeltaY } = pixelDeltaToNormalizedPan(this.instance, deltaX, deltaY)
    panByNormalized(this.instance, normalizedDeltaX, normalizedDeltaY)

    this.lastPointer = { x: event.clientX, y: event.clientY }
  }

  /**
   * Restore the resting cursor when the pan finishes.
   */
  onPanEnd() {
    this.applyCursor(this.idleCursor())
  }

  /**
   * Activate pan mode
   */
  activate() {
    // Set cursor to grab if zoomed
    if (this.instance.state.zoom.level > 1.0) {
      this.applyCursor(PAN_IDLE_CURSOR)
    }

    // Reset any existing drag state
    this.dragHandler.reset()
  }

  /**
   * Deactivate pan mode
   */
  deactivate() {
    // Clear drag state, then reset the cursor
    this.dragHandler.reset()
    this.applyCursor(IDLE_CURSOR)
  }

  /**
   * Handle mouse down events - start pan drag
   * @param {MouseEvent} event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates
   */
  handleMouseDown(event, dataCoords) {
    this.dragHandler.startDrag(dataCoords, event)
  }

  /**
   * Handle mouse move events - perform pan if dragging
   * @param {MouseEvent} event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates
   */
  handleMouseMove(event, dataCoords) {
    this.dragHandler.handleMouseMove(dataCoords, event)
  }

  /**
   * Handle mouse up events - end pan drag
   * @param {MouseEvent} event - Mouse event
   * @param {DataCoordinates} dataCoords - Data coordinates
   */
  handleMouseUp(event, dataCoords) {
    this.dragHandler.endDrag(dataCoords, event)
  }

  /**
   * Handle mouse leave events
   */
  handleMouseLeave() {
    // End drag if mouse leaves the SVG area
    this.dragHandler.cancelDrag()
  }

  /**
   * Get guidance content for pan mode.
   *
   * Pan is the initial mode, so its guidance carries the global mouse-wheel
   * instructions (which apply in every mode) as their own titled section, plus a
   * section for the pan-specific interactions.
   *
   * "available in all modes" is a heading qualifier, not a bullet: it qualifies
   * the whole section rather than standing beside the individual instructions,
   * and folding it into the heading buys back a line of the control row's
   * height.
   * @returns {Object} Structured guidance content (multi-section)
   */
  getGuidanceText() {
    return {
      sections: [
        {
          title: 'Mouse-Wheel',
          qualifier: 'available in all modes',
          items: WHEEL_NAV_GUIDANCE
        },
        {
          title: 'Pan Mode',
          items: [
            'Click and drag to pan the view (when zoomed in)',
            'Use + / − to zoom in and out',
            `GramFrame v${getVersion()}`
          ]
        }
      ]
    }
  }

  /**
   * Reset pan-specific state
   */
  resetState() {
    this.dragHandler.reset()
  }

  /**
   * Check if pan mode is enabled.
   *
   * Pan mode is always selectable — it is the initial mode, and staying in it at
   * zoom level 1 is the intended way to avoid accidentally placing markers on a
   * click. Panning itself is still gated on being zoomed in (see handleMouseDown
   * / panByNormalized); at zoom 1 a click simply does nothing.
   * @returns {boolean} Always true
   */
  isEnabled() {
    return true
  }

  /**
   * Get command buttons for pan mode
   * @returns {Array<CommandButton>} Array of command button definitions
   */
  getCommandButtons() {
    return [
      {
        label: '−',
        title: 'Zoom Out',
        action: () => zoomOut(this.instance),
        isEnabled: () => this.instance.state.zoom.level > 1.0
      },
      {
        label: '+',
        title: 'Zoom In',
        action: () => zoomIn(this.instance),
        isEnabled: () => this.instance.state.zoom.level < 10.0
      }
    ]
  }

  /**
   * Get initial state for pan mode
   * @returns {Object} Pan mode initial state
   */
  static getInitialState() {
    return {
      // Pan mode doesn't need persistent state
      // Pan position is stored in zoom.centerX/centerY
    }
  }
}