# Data Model: Store User Contributions in Browser Storage

**Feature**: 155-browser-storage
**Date**: 2026-03-27

## Entities

### StoredAnnotations

The root object persisted in browser storage for a single GramFrame instance on a single page.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| version | integer | yes | Schema version (currently `1`). Used for migration/discard decisions on load |
| savedAt | string (ISO 8601) | yes | Timestamp of last save, for debugging purposes |
| analysis | AnalysisData | yes | Stored analysis mode annotations |
| harmonics | HarmonicsData | yes | Stored harmonics mode annotations |
| doppler | DopplerData | yes | Stored doppler mode annotations |

### AnalysisData

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| markers | array of Marker | yes | All analysis markers placed by the user |

### Marker

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Unique identifier (format: `marker-{timestamp}-{random}`) |
| color | string (hex) | yes | Marker colour |
| time | number | yes | Time position in seconds |
| freq | number | yes | Frequency position in Hz |

### HarmonicsData

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| harmonicSets | array of HarmonicSet | yes | All harmonic sets placed by the user |

### HarmonicSet

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Unique identifier (format: `harmonic-{timestamp}-{random}`) |
| color | string (hex) | yes | Harmonic set colour |
| anchorTime | number | yes | Y-axis position in seconds |
| spacing | number | yes | Frequency spacing between harmonics in Hz |

### DopplerData

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| fPlus | DataCoordinates or null | yes | Upper frequency marker position |
| fMinus | DataCoordinates or null | yes | Lower frequency marker position |
| fZero | DataCoordinates or null | yes | Centre frequency marker position (auto-calculated) |
| color | string (hex) or null | yes | Curve colour |

### DataCoordinates

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| time | number | yes | Time position in seconds |
| freq | number | yes | Frequency position in Hz |

## Storage Key

**Format**: `gramframe::{pathname}` or `gramframe::{pathname}::{instanceIndex}`

- `pathname`: `window.location.pathname`
- `instanceIndex`: Zero-based index, appended only when multiple GramFrame instances exist on the same page

## Relationships

```
StoredAnnotations
├── AnalysisData
│   └── Marker[] (0..n)
├── HarmonicsData
│   └── HarmonicSet[] (0..n)
└── DopplerData
    ├── DataCoordinates (fPlus, optional)
    ├── DataCoordinates (fMinus, optional)
    └── DataCoordinates (fZero, optional)
```

## Validation Rules

1. On load, if `version` is absent or !== `1`, discard entire stored object and log console warning
2. On load, if JSON parsing fails, discard and log console warning
3. Empty arrays/null markers are valid (represent "no annotations of that type")
4. Marker IDs are not validated on load — they are opaque identifiers
5. Coordinate values (time, freq) are not range-checked against the current config — mismatched annotations will simply appear off-screen

## State Transitions

```
[No Storage Entry] ---(user adds first annotation)---> [Stored]
[Stored] ---(user modifies annotation)---> [Stored] (updated)
[Stored] ---(user clicks Clear gram)---> [No Storage Entry]
[Stored] ---(page loads, version match)---> [Restored to state]
[Stored] ---(page loads, version mismatch)---> [No Storage Entry] (discarded)
[Stored] ---(browser closed, sessionStorage)---> [No Storage Entry] (auto-cleared)
```
