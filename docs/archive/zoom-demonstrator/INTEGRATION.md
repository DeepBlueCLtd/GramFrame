# Zoom Demonstrator Integration Guide

## Phase 2 Complete - BaseMode Architecture

This document outlines the integration approach for incorporating the zoom demonstrator functionality into the main GramFrame codebase.

## Architecture Overview

### Phase 2 Achievements
✅ **BaseMode Pattern**: Implemented following GramFrame's BaseMode.js patterns  
✅ **State Management**: Centralized StateManager with listener pattern matching GramFrame's state.js  
✅ **Mode System**: PanMode and ZoomMode extending BaseMode with proper lifecycle methods  
✅ **ResizeObserver**: Responsive behavior for container changes  
✅ **Coordinate Preservation**: All Phase 1 coordinate transformations maintained  

### Key Components

1. **BaseMode.js** - Abstract base class following GramFrame patterns
2. **PanMode.js** - Pan mode implementation with drag-to-move functionality
3. **ZoomMode.js** - Zoom mode with rectangle selection
4. **StateManager.js** - Centralized state with listener pattern
5. **ModeManager.js** - Mode switching and event delegation
6. **ZoomPanel.js** - Main component orchestrating all functionality

## Integration Strategy

### Step 1: Core Coordinate Functions
Extract and integrate these coordinate transformation utilities:
- `coordinates.js` - Core coordinate math (tested and validated)
- `transformManager.js` - Centralized transform handling
- `types.js` - Type definitions for consistency

### Step 2: Mode Integration
Integrate zoom modes into GramFrame's existing mode system:

```javascript
// In GramFrame's mode factory
import { PanMode } from './zoom-demonstrator/PanMode.js';
import { ZoomMode } from './zoom-demonstrator/ZoomMode.js';

// Add to mode registry
this.modes.pan = new PanMode(gramFrameInstance, state);
this.modes.zoom = new ZoomMode(gramFrameInstance, state);
```

### Step 3: State Management Integration
Merge zoom state into GramFrame's existing state structure:

```javascript
// Add to GramFrame's initialState
const initialState = {
  // ... existing state
  zoomState: {
    scaleX: 1.0,
    scaleY: 1.0,
    panX: 0,
    panY: 0
  },
  // ... mode-specific states from PanMode/ZoomMode getInitialState()
};
```

### Step 4: UI Component Integration
Adapt UI components for GramFrame's component structure:
- Extract coordinate display logic
- Integrate with existing GramFrame UI patterns
- Maintain axis rendering capabilities

## API Compatibility

### GramFrame BaseMode Interface Compliance
Both PanMode and ZoomMode implement all required BaseMode methods:
- `activate()` / `deactivate()` - Mode lifecycle
- `handleMouseDown/Move/Up()` - Event handling
- `renderPersistentFeatures()` - Feature rendering
- `getGuidanceText()` - User guidance
- `resetState()` / `cleanup()` - State management

### State Listener Pattern
StateManager follows GramFrame's state notification pattern:
```javascript
// Matches GramFrame's notifyStateListeners approach
notifyStateChange(changeData) {
  const stateCopy = JSON.parse(JSON.stringify(this.state));
  this.listeners.forEach(listener => listener(stateCopy));
}
```

### ResizeObserver Integration
Responsive behavior handles container changes:
```javascript
setupResizeObserver() {
  this.resizeObserver = new ResizeObserver(entries => {
    this.coordinateSystem.updateContainerSize();
    this.axisRenderer.updateAxes();
  });
}
```

## Data Flow Architecture

```
User Interaction → ModeManager → ActiveMode → StateManager → Listeners
                                     ↓
                            TransformManager → CoordinateSystem
                                     ↓
                            Apply Transform → Update Display
```

## Coordinate System Validation

### Test Cases Verified
- **Offset-axes image**: 100-900 Hz, 100-500 time → 1000×500 pixels ✅
- **Original image**: 0-800 Hz, 0-400 time → 800×400 pixels ✅  
- **Scaled image**: 0-800 Hz, 0-400 time → 900×300 pixels ✅

### Transformation Accuracy
- Screen ↔ SVG coordinate mapping
- SVG ↔ Data coordinate 1:1 alignment  
- Pan limits prevent showing beyond image boundaries
- Separate X/Y zoom levels for aspect-ratio changes

## Migration Steps

### 1. Extract Reusable Functions
```javascript
// Core coordinate utilities (ready for extraction)
export { CoordinateSystem } from './coordinates.js';
export { TransformManager } from './transformManager.js';

// Mode implementations
export { PanMode, ZoomMode } from './modes/';
```

### 2. Adapt Existing GramFrame Components
```javascript
// In GramFrame main component
import { TransformManager } from './core/TransformManager.js';

// Initialize in GramFrame constructor
this.transformManager = new TransformManager(
  this.coordinateSystem, 
  this.container
);
```

### 3. Update GramFrame Mode Factory
```javascript
// Add zoom modes to existing mode factory
import { ModeFactory } from './modes/ModeFactory.js';

ModeFactory.registerMode('pan', PanMode);
ModeFactory.registerMode('zoom', ZoomMode);
```

## Testing Strategy

### Phase 1 Tests (Validated)
- Direct SVG-to-data coordinate mapping (1:1)
- Transform-based zoom/pan (not viewBox)
- Separate X/Y zoom levels
- Pan limits and boundary checking

### Phase 2 Tests (Ready)
- Mode switching preserves coordinate accuracy
- State listeners receive proper notifications
- ResizeObserver handles container changes
- BaseMode lifecycle methods work correctly

## Performance Considerations

### Optimizations Implemented
- Deep state copying only when needed
- Event listener cleanup on mode deactivation
- ResizeObserver for efficient resize handling
- Transform caching in TransformManager

### Memory Management
- Proper cleanup in destroy() methods
- State listener removal
- ResizeObserver disconnection
- Mode-specific resource cleanup

## Next Steps for Integration

1. **Code Review**: Review BaseMode implementations against GramFrame standards
2. **Unit Tests**: Add comprehensive tests for mode switching and state management  
3. **Performance Testing**: Validate with large spectrograms
4. **UI Integration**: Adapt UI components to GramFrame's component patterns
5. **Documentation**: Update GramFrame documentation with zoom functionality

## Success Criteria Met

✅ **Phase 2 Complete**: BaseMode-compatible architecture ready for integration  
✅ **API Compliance**: Full GramFrame architecture compatibility  
✅ **State Management**: Centralized state with listener pattern  
✅ **Coordinate Accuracy**: All transformations validated across test images  
✅ **Responsive Design**: ResizeObserver integration  
✅ **Clean Architecture**: Minimal, maintainable code structure  

The zoom demonstrator is now ready for integration into the main GramFrame codebase following established patterns and maintaining all coordinate transformation accuracy.