# ADR-005: HTML Table Configuration System

## Status
Accepted

## Context
GramFrame needed a way to configure spectrograms directly in HTML without requiring JavaScript configuration objects. The system needed to be simple for content authors while supporting multiple instances per page.

## Decision
Use HTML tables with class `gram-config` for component configuration, with automatic detection and replacement on page load.

## Rationale
- **Content Author Friendly**: HTML tables are familiar to content creators
- **Declarative**: Configuration is visible in the HTML markup
- **No JavaScript Required**: Content authors don't need to write JavaScript
- **Multiple Instances**: Supports multiple components on the same page
- **Standard HTML**: Uses semantic table structure

## Consequences
### Positive
- Easy for content authors to create and modify configurations
- Self-documenting configuration directly in HTML
- Automatic initialization without manual JavaScript calls
- Support for multiple instances with unique IDs

### Negative
- Less flexible than JavaScript configuration objects
- Requires HTML parsing and validation
- Table structure changes affect the entire system

## Implementation
Configuration format (evolved from three-column to two-column):
```html
<table class="gram-config">
  <tr><td colspan="2"><img src="/sample/mock-gram.png"></td></tr>
  <tr><td>time-start</td><td>0</td></tr>
  <tr><td>time-end</td><td>60</td></tr>
  <tr><td>freq-start</td><td>0</td></tr>
  <tr><td>freq-end</td><td>100</td></tr>
</table>
```

Auto-detection system implemented in src/api/GramFrameAPI.js:
- `detectAndReplaceConfigTables()` - Scans DOM for config tables
- Comprehensive validation and error handling
- Unique instance ID generation
- Public API for manual initialization

## Related Decisions
- ADR-009: Legacy Configuration Parameter Structure
- ADR-004: Centralized State Management