# Quickstart: Enrich Repository Documentation

**Branch**: `154-enrich-docs`

## Verify Environment

```bash
# Ensure you're on the feature branch
git checkout 154-enrich-docs

# Confirm existing tests pass (no regressions from doc changes)
yarn test
yarn typecheck
yarn build
```

## Document Authoring Conventions

1. **Location**: All docs in `docs/` directory
2. **Format**: GitHub-flavored Markdown
3. **Cross-references**: Link to ADRs as `[ADR-NNN](ADRs/ADR-NNN-Title.md)` using relative paths
4. **Code references**: Use `src/path/to/file.js` format for source file pointers
5. **Date stamps**: Include `**Last updated**: YYYY-MM-DD` at top of each document
6. **Diagrams**: Use ASCII/text diagrams (no external image dependencies)

## Implementation Order

1. **US1**: Enrich `docs/Tech-Architecture.md` (architecture overview)
2. **US2**: Create `docs/Getting-Started.md` (setup guide)
3. **US3**: Enrich `docs/HTML-Integration-Guide.md` (embedding guide)
4. **US4**: Create `docs/Adding-Graphical-Features.md` (code area guide)
5. **US5**: Create `docs/Data-and-State-Guide.md` (state/persistence)
6. **US6**: Create `docs/Rendering-Troubleshooting.md` (debugging guide)
7. **README**: Add documentation index section

## Validation

After each document:
- Verify all file paths referenced actually exist in the repo
- Verify all ADR cross-references link to real files
- Verify code examples match current API/patterns
- Run `yarn test` to confirm no regressions
