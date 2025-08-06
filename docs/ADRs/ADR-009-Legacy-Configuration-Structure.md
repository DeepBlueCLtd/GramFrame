# ADR-009: Legacy Configuration Parameter Structure

## Status
Accepted

## Context
GramFrame's initial configuration used a three-column table format (param, min, max) but needed to align with legacy HTML parameter structures that use individual parameters for start/end values.

## Decision
Refactor configuration from three-column format to two-column format using separate parameters for time-start/time-end and freq-start/freq-end.

## Rationale
- **Legacy Compatibility**: Aligns with existing HTML parameter conventions
- **Simplicity**: Two-column format is simpler for content authors
- **Explicit Parameters**: Individual start/end parameters are more explicit
- **Standard Practice**: Matches common HTML form parameter patterns

## Consequences
### Positive
- Better alignment with legacy systems and conventions
- Simpler table structure for content authors
- More explicit parameter naming
- Easier to validate individual parameters

### Negative
- Breaking change from previous three-column format
- More table rows required (4 vs 2 data rows)
- Need to update all existing configurations

## Implementation
DO NOT USE THE THREE-COLUMN FORMAT. IT IS NOT SUPPORTED ANYMORE.

Configuration format change:
```html
<!-- Before: Three-column format -->
<table class="gram-config">
  <tr><td colspan="3"><img src="..."></td></tr>
  <tr><th>param</th><th>min</th><th>max</th></tr>
  <tr><td>time</td><td>0</td><td>60</td></tr>
  <tr><td>freq</td><td>0</td><td>100</td></tr>
</table>

<!-- After: Two-column format -->
<table class="gram-config">
  <tr><td colspan="2"><img src="..."></td></tr>
  <tr><td>time-start</td><td>0</td></tr>
  <tr><td>time-end</td><td>60</td></tr>
  <tr><td>freq-start</td><td>0</td></tr>
  <tr><td>freq-end</td><td>100</td></tr>
</table>
```

Updated parsing logic in src/core/configuration.js:
- Modified `extractConfigData` to parse individual start/end parameters
- Updated validation to check for all four required parameters
- Maintained backward-compatible internal state structure

## Related Decisions
- ADR-005: HTML Table Configuration System