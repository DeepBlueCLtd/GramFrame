# GramFrame Zoom Integration - Migration Guide

## Overview

This guide provides step-by-step instructions for integrating the zoom demonstrator functionality into the main GramFrame codebase. All components have been validated and tested for API compliance.

## Migration Checklist

### ✅ Phase 1: Coordinate System Validated
- Direct SVG-to-data coordinate mapping (1:1)
- Transform-based zoom/pan (not viewBox manipulation)
- Separate X/Y zoom levels for aspect-ratio changes
- Pan limits prevent showing beyond boundaries

### ✅ Phase 2: BaseMode Architecture Implemented
- BaseMode pattern matching GramFrame exactly
- PanMode and ZoomMode with proper lifecycle
- StateManager with listener pattern
- ModeManager for switching and delegation

### ✅ Phase 3: API Compliance Verified
- All required BaseMode methods implemented
- State management follows GramFrame patterns
- Coordinate transformations tested across all images
- Reusable functions extracted and documented

## Step-by-Step Migration Instructions

### Step 1: Copy Core Utilities

Copy these files to GramFrame's core utilities:

```bash
# Coordinate utilities
cp zoom-demonstrator/coordinates.js src/core/coordinates.js
cp zoom-demonstrator/transformManager.js src/core/transformManager.js

# Type definitions
cp zoom-demonstrator/types.js src/types/zoom-types.js
```

### Step 2: Integrate Mode Classes

Add zoom modes to GramFrame's mode system:

```bash
# Create zoom modes directory
mkdir -p src/modes/zoom

# Copy mode implementations
cp zoom-demonstrator/PanMode.js src/modes/zoom/PanMode.js
cp zoom-demonstrator/ZoomMode.js src/modes/zoom/ZoomMode.js
```

### Step 3: Update Mode Factory

Edit `src/modes/ModeFactory.js`:

```javascript
import { PanMode } from './zoom/PanMode.js';
import { ZoomMode } from './zoom/ZoomMode.js';

// In createMode method, add:
case 'pan':
  return new PanMode(instance, state);
case 'zoom':
  return new ZoomMode(instance, state);
```

### Step 4: Update Initial State

Edit `src/core/state.js`:

```javascript
// Add to buildModeInitialState
import { PanMode } from '../modes/zoom/PanMode.js';
import { ZoomMode } from '../modes/zoom/ZoomMode.js';

const modeStates = [
  // ... existing modes
  PanMode.getInitialState(),
  ZoomMode.getInitialState()
];

// Add to initialState object
zoomState: {
  scaleX: 1.0,
  scaleY: 1.0,
  panX: 0,
  panY: 0
}
```

### Step 5: Update Main GramFrame Component

Edit `src/main.js`:

```javascript
import { TransformManager } from './core/transformManager.js';

// In constructor, after coordinate system initialization:
this.transformManager = new TransformManager(
  this.coordinateSystem,
  this.container
);

// Add zoom/pan methods
zoomByFactor(factor) {
  this.transformManager.zoomByFactor(factor);
  this.applyTransform();
}

resetZoom() {
  this.transformManager.resetTransform();
  this.applyTransform();
}

applyTransform() {
  const transform = this.transformManager.getTransformString();
  // Apply to your SVG content group
  this.contentGroup.setAttribute('transform', transform);
}
```

### Step 6: Update UI Components

Add zoom controls to `src/components/UIComponents.js`:

```javascript
// Add zoom control buttons
const zoomControls = `
  <div class="zoom-controls">
    <button id="${this.instance.instanceId}-zoom-in">Zoom In</button>
    <button id="${this.instance.instanceId}-zoom-out">Zoom Out</button>
    <button id="${this.instance.instanceId}-zoom-reset">Reset</button>
  </div>
`;

// Add event listeners
document.getElementById(`${this.instance.instanceId}-zoom-in`)
  .addEventListener('click', () => this.instance.zoomByFactor(2.0));
document.getElementById(`${this.instance.instanceId}-zoom-out`)
  .addEventListener('click', () => this.instance.zoomByFactor(0.5));
document.getElementById(`${this.instance.instanceId}-zoom-reset`)
  .addEventListener('click', () => this.instance.resetZoom());
```

### Step 7: Update Mode Switching UI

Add pan/zoom mode buttons to mode switcher:

```javascript
// In ModeButtons.js
const modes = [
  // ... existing modes
  { name: 'pan', label: 'Pan', icon: '🤚' },
  { name: 'zoom', label: 'Zoom', icon: '🔍' }
];
```

### Step 8: Update Event Handling

Modify event delegation in main component to use TransformManager:

```javascript
// In handleMouseMove
const coords = this.transformManager.getAllCoordinates(screenX, screenY);
// Pass coords to active mode
```

### Step 9: Update Axis Rendering

Integrate HTMLAxisRenderer updates:

```javascript
// After zoom/pan operations
this.axisRenderer.updateAxes();
```

### Step 10: Add ResizeObserver

Add responsive behavior:

```javascript
// In constructor
this.setupResizeObserver();

setupResizeObserver() {
  this.resizeObserver = new ResizeObserver(entries => {
    this.coordinateSystem.updateContainerSize();
    this.axisRenderer.updateAxes();
  });
  this.resizeObserver.observe(this.container);
}
```

## Testing After Migration

### 1. Coordinate Transformation Tests

Run the comprehensive tests:

```javascript
import { runCoordinateTests } from './test/coordinateTests.js';
const results = runCoordinateTests();
```

### 2. Mode Switching Tests

Verify mode switching:
- Pan mode allows dragging
- Zoom mode shows selection rectangle
- Modes properly activate/deactivate

### 3. State Management Tests

Verify state updates:
- Zoom state changes notify listeners
- State is properly deep-copied
- Mode states are preserved

### 4. API Compliance Tests

```javascript
import { testAPICompliance } from './test/apiComplianceTests.js';
const results = testAPICompliance();
```

## Common Issues and Solutions

### Issue: Coordinate Transformations Off

**Solution**: Ensure you're using the TransformManager's coordinate methods, not direct calculations.

### Issue: Modes Not Switching

**Solution**: Check that ModeFactory has been updated with new mode cases.

### Issue: State Not Updating

**Solution**: Ensure state listeners are set up and modes are using `stateManager.notifyStateChange()`.

### Issue: Pan Limits Not Working

**Solution**: TransformManager must be updated when image dimensions change.

## Performance Considerations

1. **Transform Caching**: TransformManager caches transform strings
2. **Event Throttling**: Consider throttling mousemove events for large spectrograms
3. **State Updates**: Batch state updates when possible
4. **Memory Cleanup**: Ensure modes properly cleanup in `deactivate()`

## Additional Features to Consider

1. **Zoom to Selection**: Double-click to zoom to specific area
2. **Zoom History**: Undo/redo zoom operations
3. **Zoom Presets**: 100%, 200%, Fit to Window
4. **Mouse Wheel Zoom**: Zoom with scroll wheel
5. **Touch Support**: Pinch-to-zoom on touch devices

## Validation Checklist

Before considering migration complete:

- [ ] All coordinate tests pass
- [ ] Mode switching works correctly
- [ ] State updates propagate to listeners
- [ ] Zoom/pan limits are enforced
- [ ] Axes update correctly after zoom/pan
- [ ] ResizeObserver handles container changes
- [ ] Memory is properly cleaned up on destroy
- [ ] Performance is acceptable with large images

## Support

For questions or issues during migration:
1. Review test files for usage examples
2. Check INTEGRATION.md for architecture details
3. Run validation tests to identify issues
4. Review reusableFunctions.js for utility usage

The zoom demonstrator has been thoroughly tested and validated. Following this guide should result in a smooth integration into the GramFrame codebase.