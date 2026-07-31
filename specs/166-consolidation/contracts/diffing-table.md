# Contract — Shared diffing table

**Module**: `src/components/DiffingTable.js` (new)
**Replaces**: the row-diffing engine in `AnalysisMode.js:577-717` (markers
table) and `HarmonicPanel.js:62-232` (harmonics panel), including the
fixed-height scroll wrapper duplicated at `AnalysisMode.js:373-377` /
`HarmonicPanel.js:32-36`.

## Division of responsibility

**The component owns** (the part that is provably identical today):

- fixed-height scroll wrapper and header construction
- update-in-place for rows whose key is unchanged
- rebuild-from-index when keys diverge
- trailing-row removal when the list shrinks
- click-to-select row handling and selected-row styling
- delete-button rendering and click propagation

**The consumer owns** (the part that legitimately differs):

- column labels and order
- cell content and formatting
- row identity (`rowKey`)
- what selection and deletion *mean*

## Surface

```js
/**
 * @param {HTMLElement} container
 * @param {TableSpec} spec   // see data-model.md §3
 * @returns {{ update(rows: any[]): void, destroy(): void, element: HTMLTableElement }}
 */
export function createDiffingTable(container, spec)
```

`update(rows)` is idempotent and diff-based: calling it twice with equal input
performs no DOM writes.

## Invariants

- **T1** One engine serves both tables (FR-009).
- **T2** Rendered DOM structure — element tags, class names, row/cell order — is
  unchanged for both tables, so existing specs and CSS selectors keep working
  (AS-5.1).
- **T3** A change to table *mechanism* is made in one module and appears in both
  tables (AS-5.2). Demonstrated in the PR by making one such change (selected-row
  styling) once.
- **T4** No cell formatting lives in the component.

## Gate

Existing markers-table and harmonics-panel specs pass **unchanged** across add,
update, remove, select and delete in both tables. `yarn hygiene` baselines
lowered by the deletion where applicable; net lines removed (SC-006).
