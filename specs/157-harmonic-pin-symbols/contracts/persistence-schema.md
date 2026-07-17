# Contract: Persistence Schema (Backward-Compatible)

## Storage module — `src/core/storage.js`

### SCHEMA_VERSION

**Unchanged: `SCHEMA_VERSION = 1`.**

> ⚠️ `loadAnnotations` discards data with a **strict** check
> `data.version !== SCHEMA_VERSION`. Bumping the version would DELETE all
> existing v1 annotations on first load. The `symbol` field is therefore added
> additively **without** a version bump.

### Save — `saveAnnotations`

Extend the harmonic-set mapping to include the symbol:

```js
harmonicSets: (state.harmonics?.harmonicSets || []).map(hs => ({
  id: hs.id,
  color: hs.color,
  anchorTime: hs.anchorTime,
  spacing: hs.spacing,
  symbol: hs.symbol || 'circle'   // NEW
}))
```

### Load — `loadAnnotations`

No change. Returns the raw `StoredAnnotations` (version `1`), including any
`symbol` present. Legacy records simply lack the key.

## Restore — `src/main.js` `_restoreAnnotations`

Apply the default when the field is absent (legacy data):

```js
if (saved.harmonics && Array.isArray(saved.harmonics.harmonicSets)) {
  this.state.harmonics.harmonicSets = saved.harmonics.harmonicSets.map(hs => ({
    ...hs,
    symbol: hs.symbol || 'circle'   // legacy → circle
  }))
}
```

## Compatibility matrix

| Stored data | Loaded by | Result |
|-------------|-----------|--------|
| v1 **without** `symbol` (legacy) | new build | loads; each set → `circle` |
| v1 **with** `symbol` (new) | new build | loads; symbol preserved |
| v1 **with** `symbol` (new) | old build | loads; unknown `symbol` key ignored |
| v1 without `symbol` | old build | loads unchanged (baseline) |

All four cases load successfully — no data loss in any direction.

## Round-trip invariant

> For any harmonic set created and saved by the new build, reloading yields a
> harmonic set whose `symbol` equals the saved value (FR-008 / SC-004).

## Test hooks

- Seed storage with a legacy blob (no `symbol`) → reload → assert every pin/table
  swatch is `circle` (SC-005).
- Create sets with distinct symbols → save → reload → assert each `symbol`
  survives (SC-004).
