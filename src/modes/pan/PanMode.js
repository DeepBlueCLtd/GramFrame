import { BaseMode } from '../BaseMode.js'
import { BaseDragHandler } from '../shared/BaseDragHandler.js'
import { getVersion } from '../../utils/version.js'
import { pixelDeltaToNormalizedPan, panByNormalized, zoomIn, zoomOut, fitView, isZoomedIn, zoomLevel } from '../../core/viewport.js'
import { IDLE_CURSOR, PAN_IDLE_CURSOR, PAN_DRAG_CURSOR } from '../../utils/cursors.js'
import { NAVIGATION_GUIDANCE } from '../../utils/navigationGuidance.js'
import { isPlayerActive } from '../../player/playerView.js'

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
      updateCursor: (style) => this.updateCursorStyle(style),
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
    if (!this.canPan()) {
      return null
    }
    return { kind: 'pan', id: null, type: null }
  }

  /**
   * Whether there is anything to pan: an image zoomed in, or an audio-sourced
   * gram at any zoom — its view is a window onto the recording, so a paused
   * analyst can always scroll back through what has played (spec 168, FR-016).
   * @returns {boolean} True when a drag would move the view
   */
  canPan() {
    return isZoomedIn(this.instance) || isPlayerActive(this.instance)
  }

  /**
   * The cursor pan mode rests at: a grab hand when there is something to pan.
   * @returns {string} Cursor style
   */
  idleCursor() {
    return this.canPan() ? PAN_IDLE_CURSOR : IDLE_CURSOR
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
    if (!event || !this.canPan()) {
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
    this.updateCursorStyle(this.idleCursor())
  }

  /**
   * Activate pan mode
   */
  activate() {
    // Set cursor to grab if there is something to pan
    if (this.canPan()) {
      this.updateCursorStyle(PAN_IDLE_CURSOR)
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
    this.updateCursorStyle(IDLE_CURSOR)
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
   * Pan is the initial mode, so its guidance carries the global navigation
   * gestures (which apply in every mode) as their own titled section, plus a
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
          title: 'Navigation',
          qualifier: 'available in all modes',
          items: NAVIGATION_GUIDANCE
        },
        {
          title: 'Pan Mode',
          items: [
            'Click and drag to pan the view (when zoomed in)',
            // Named by shape, not by the glyph itself: a character in the
            // guidance would depend on the reader's font, which is the reason
            // the button draws its own (issue #310).
            'Use + / − to zoom, and the corner-frame button to fit the whole gram',
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
        isEnabled: () => isZoomedIn(this.instance)
      },
      {
        label: '+',
        title: 'Zoom In',
        action: () => zoomIn(this.instance),
        isEnabled: () => zoomLevel(this.instance) < 10.0
      },
      {
        // The exit from a region zoom: one gesture in, one click out (spec 170,
        // FR-014). Disabled at 1x, where the whole gram is already shown (FR-015).
        label: 'Fit',
        icon: 'fit',
        title: 'Fit Whole Gram',
        action: () => fitView(this.instance),
        isEnabled: () => isZoomedIn(this.instance)
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