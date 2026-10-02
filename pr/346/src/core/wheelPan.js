/**
 * The middle-button pan (contract: drag-engine.md, "Middle-button pan").
 *
 * Split out of `core/events.js`, which owns *which* gesture happens rather
 * than how each one behaves, and which had no room left under its line cap.
 * Nothing else changed with the move.
 */

/// <reference path="../types.js" />

import { BaseDragHandler } from '../modes/shared/BaseDragHandler.js'
import { pixelDeltaToNormalizedPan, panByNormalized, isZoomedIn } from './viewport.js'
import { IDLE_CURSOR, PAN_DRAG_CURSOR } from '../utils/cursors.js'

/**
 * The middle-button pan, as a `pan`-kind drag on the shared engine.
 *
 * It differs from PanMode's drag only in its trigger (button 1, with
 * preventDefault to suppress browser autoscroll) and in being available in
 * *every* mode. Resolving it centrally, ahead of the mode's own handlers, is
 * what stops a middle-click ever reaching a mode and placing something
 * (contract: drag-engine.md, "Middle-button pan").
 * @param {GramFrame} instance - GramFrame instance
 * @returns {BaseDragHandler} The instance's wheel-pan handler
 */
export function wheelPanHandler(instance) {
  if (!instance.interaction._wheelPanHandler) {
    let previousCursor = ''

    instance.interaction._wheelPanHandler = new BaseDragHandler(instance, {
      resolveTarget: () => (isZoomedIn(instance) ? { kind: 'pan', id: null, type: null } : null),
      onDragStart: (_target, _position, event) => {
        previousCursor = instance.ui.svg ? instance.ui.svg.style.cursor : ''
        if (event) {
          instance.interaction._wheelPanLast = { x: event.clientX, y: event.clientY }
        }
      },
      onDragMove: (_target, _position, _startPosition, event) => {
        if (!event || !instance.interaction._wheelPanLast) return
        const dx = event.clientX - instance.interaction._wheelPanLast.x
        const dy = event.clientY - instance.interaction._wheelPanLast.y
        const { normalizedDeltaX, normalizedDeltaY } = pixelDeltaToNormalizedPan(instance, dx, dy)
        panByNormalized(instance, normalizedDeltaX, normalizedDeltaY)
        instance.interaction._wheelPanLast = { x: event.clientX, y: event.clientY }
      },
      onDragEnd: () => { instance.interaction._wheelPanLast = null },
      onDragCancel: () => { instance.interaction._wheelPanLast = null },
      updateCursor: (style) => {
        if (instance.ui.svg) {
          instance.ui.svg.style.cursor = style
        }
      },
      // The middle-button pan is a pan, so it keeps the hand. On release it
      // restores whatever cursor the mode had, rather than forcing a crosshair.
      cursorFor: (_kind, phase) => (
        phase === 'drag' ? PAN_DRAG_CURSOR : (previousCursor || IDLE_CURSOR)
      )
    }, null)
  }
  return instance.interaction._wheelPanHandler
}
