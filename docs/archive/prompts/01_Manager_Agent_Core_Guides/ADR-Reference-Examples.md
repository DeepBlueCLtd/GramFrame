# ADR Reference Examples for Task Assignments

This document provides examples of how to reference Architectural Decision Records (ADRs) in task assignment prompts to provide Implementation Agents with proper architectural context.

## Example 1: Rendering System Task

When assigning tasks that involve SVG rendering or coordinate transformations:

```markdown
### Architectural Context
This task builds upon our established rendering architecture. Before proceeding, review the following ADRs:
- **ADR-001: SVG-Based Rendering Architecture** - Understand why we use SVG and the coordinate transformation requirements
- **ADR-002: Multiple Coordinate Systems Architecture** - Review the coordinate transformation methods you'll need to use
```

## Example 2: State Management Task

When assigning tasks that involve component state or listener patterns:

```markdown
### Architectural Context
This task involves our centralized state management system. Review:
- **ADR-004: Centralized State Management with Listener Pattern** - Understand the state structure and listener notification requirements
- Review the existing state structure in `src/core/state.js`
```

## Example 3: Mode System Task

When assigning tasks that involve creating new modes or modifying mode behavior:

```markdown
### Architectural Context
This task extends our modular mode system. Essential reading:
- **ADR-008: Modular Mode System Architecture** - Understand the BaseMode interface and factory pattern
- **ADR-011: Feature Renderer for Cross-Mode Coordination** - How modes coordinate with persistent features
- Review existing mode implementations in `src/modes/`
```

## Example 4: Configuration System Task

When assigning tasks that involve configuration parsing or validation:

```markdown
### Architectural Context
This task works with our HTML table configuration system:
- **ADR-005: HTML Table Configuration System** - Understand the auto-detection and replacement mechanism
- **ADR-009: Legacy Configuration Parameter Structure** - Why we use the two-column format and parameter naming
```

## Example 5: Responsive Design Task

When assigning tasks that involve component resizing or responsive behavior:

```markdown
### Architectural Context
This task involves our responsive design system:
- **ADR-003: Responsive Design with ResizeObserver** - Understand why we use ResizeObserver over window events
- **ADR-012: Scale-Adjusted Font Sizing** - How text scaling works in our SVG system
```

## Best Practices

1. **Be Specific**: Only reference ADRs that are directly relevant to the task
2. **Explain Relevance**: Briefly explain why each ADR is important for the task
3. **Provide Context**: Help agents understand how the ADRs relate to their specific work
4. **Update as Needed**: As new ADRs are created, update task templates to reference them appropriately

## ADR Quick Reference

For quick reference when crafting task assignments:

- **ADR-001**: SVG rendering and coordinate systems
- **ADR-002**: Coordinate transformation methods  
- **ADR-003**: ResizeObserver for responsive design
- **ADR-004**: State management and listeners
- **ADR-005**: HTML table configuration
- **ADR-006**: Hot module reload support
- **ADR-007**: JSDoc/TypeScript integration
- **ADR-008**: Modular mode system
- **ADR-009**: Legacy configuration structure
- **ADR-010**: Unminified builds for debugging
- **ADR-011**: Cross-mode feature coordination
- **ADR-012**: Scale-adjusted font sizing