# GramFrame Release Process

This document describes the automated release process for GramFrame using GitHub Actions.

## Overview

The release system automatically creates GitHub releases when version tags are pushed to the repository. It builds the project, bundles assets, generates release notes, and notifies about completion.

## Release Workflow

### Automated Process

The release workflow (`.github/workflows/release.yml`) is triggered when you push a version tag:

1. **Tag Validation**: Ensures tag follows semantic versioning format (`v*.*.*.`)
2. **Quality gate**: Runs the same five checks the PR gate runs — `yarn hygiene`, `yarn lint`, `yarn typecheck`, `yarn test:unit` — then builds the standalone bundle
3. **Testing**: Executes the full Playwright suite to ensure quality
4. **Asset Bundling**: Creates a release archive with:
   - The standalone bundle (`gramframe.bundle.js`) — the only build users need
   - Sample `index.html` for testing (a copy of `test-release.html`)
   - Synthetic demo spectrogram (`demo-gram.png`)
   - Generated `README.md` quick-start guide
5. **Release Creation**: Automatically generates release notes and creates GitHub release
6. **Notification**: Sends completion status via ntfy

### Creating a Release

To create a new release, follow these steps:

#### 1. Prepare the Release

```bash
# Ensure you're on the main branch and up to date
git checkout main
git pull origin main

# Ensure all gates pass — the same five the release workflow runs
yarn hygiene
yarn lint
yarn typecheck
yarn test:unit
yarn test
yarn build
```

#### 2. Update Version (if needed)

Update the version in `package.json` if not already done:

```bash
# Example: updating to version 1.0.0
vim package.json
# Change "version": "0.0.1" to "version": "1.0.0"
```

#### 3. Create and Push Version Tag

```bash
# Create a version tag (replace 1.0.0 with desired version)
git tag v1.0.0

# Push the tag to trigger the release workflow
git push origin v1.0.0
```

#### 4. Monitor the Release

- Check the [Actions tab](../../actions) to monitor the release workflow
- The workflow will automatically create a release when successful
- You'll receive a notification via ntfy when the release completes

## Tag Format Requirements

**Required Format**: `v*.*.*` (semantic versioning with 'v' prefix)

**Valid Examples**:
- `v1.0.0`
- `v2.1.3`
- `v0.5.10`

**Invalid Examples**:
- `v1.0` (missing patch version)
- `1.0.0` (missing 'v' prefix)
- `v1.0.0-beta` (pre-release identifiers not supported)

## Release Assets

Each release includes a compressed archive (`gramframe-{version}.zip`, ~88KB) containing:

### Component Files
- **`gramframe.bundle.js`** - Complete standalone component (~347KB unminified per
  [ADR-010](ADRs/ADR-010-Unminified-Production-Build.md); ~78KB once deflated into the archive)
- **`index.html`** - Ready-to-use HTML sample page
- **`demo-gram.png`** - Synthetic demo spectrogram (~9KB) for verification
- **`README.md`** - Usage guide with integration examples

### Why the demo gram is synthetic

The archive was 561KB, 86% of which was `sample/mock-gram.png` — a 482KB
photographic image included solely so the demo page rendered. A zip cannot
compress a PNG, so it was the whole download. `sample/demo-gram.png` is drawn
instead: a harmonic stack, a carrier with sidebands, a Doppler curve, isolated
tonals and broadband transients, so the demo exercises every mode in ~9KB. It
is generated once by `scripts/make-demo-gram.js` and committed — that script is
not part of any build. Run it by hand and commit the new PNG if the demo needs
to change.

The release workflow fails if the archive exceeds 150,000 bytes, so a large
asset cannot creep back in unnoticed.

## Release Notes Generation

Release notes are automatically generated and include:

- **Changes Since Last Release**: Commit messages from the previous tag
- **Quick Start Instructions**: How to use the release assets
- **Verification Steps**: Testing guidance
- **Full Changelog Link**: GitHub compare view between versions

## Error Handling

The workflow includes comprehensive error handling:

### Build Failures
- **Type Check Errors**: Workflow fails if TypeScript checking fails
- **Standalone Build Errors**: Workflow fails if standalone bundle creation fails
- **Missing Bundle**: Workflow validates that `dist/gramframe.bundle.js` exists
- **Bundle Size Validation**: Workflow fails if standalone bundle is unexpectedly small (< 100KB)
- **Test Failures**: Workflow fails if any tests fail

### Tag Format Errors
- **Invalid Format**: Workflow fails immediately if tag doesn't match `v*.*.*` pattern
- **Clear Error Messages**: Provides specific feedback about expected format

### Asset Preparation Errors
- **Missing Files**: Workflow validates all required files exist before bundling
- **Archive Creation**: Fails gracefully if archive creation fails

## Troubleshooting

### Release Workflow Failed

1. **Check Action Logs**: Visit [Actions tab](../../actions) and review the failed workflow
2. **Common Issues**:
   - Test failures: Fix tests and create a new tag
   - Build errors: Fix build issues and create a new tag
   - Invalid tag format: Delete the tag, fix format, and push again

### Deleting and Recreating Tags

```bash
# Delete local tag
git tag -d v1.0.0

# Delete remote tag
git push --delete origin v1.0.0

# Create new tag and push
git tag v1.0.0
git push origin v1.0.0
```

### Manual Release Creation

If the automated workflow fails, you can create a release manually:

1. Build standalone version locally:
   ```bash
   yarn build:standalone      # File protocol compatible build
   ```
2. Create release archive manually with standalone bundle
3. Use GitHub web interface to create release
4. Upload the archive as a release asset

## Future Enhancements

### Planned Features
- **PR Label-Based Versioning**: Automatic version bumping based on PR labels
- **Pre-release Support**: Support for beta/alpha releases
- **Multiple Asset Formats**: Additional distribution formats (zip, standalone)
- **Release Approval**: Optional manual approval step for production releases

### PR Label Integration (Preparation)

The workflow is prepared for future PR label-based version increment:

- **`major`**: For breaking changes (1.0.0 → 2.0.0)
- **`minor`**: For new features (1.0.0 → 1.1.0)  
- **`patch`**: For bug fixes (1.0.0 → 1.0.1)

This feature will automatically determine the next version based on merged PR labels.

## Workflow Permissions

The release workflow requires:
- **`contents: write`**: To create releases and upload assets
- **Access to GITHUB_TOKEN**: Automatically provided by GitHub Actions

## Notification System

The workflow sends notifications to `ntfy.sh/iancc2025` for:
- **Successful Releases**: Includes release URL and version
- **Failed Releases**: Alerts about failure with workflow details

## Best Practices

1. **Test Before Tagging**: Always run full test suite locally before creating tags
2. **Descriptive Commits**: Write clear commit messages as they appear in release notes
3. **Version Consistency**: Ensure package.json version matches the git tag
4. **Regular Releases**: Create releases frequently to keep changes manageable
5. **Review Assets**: Verify release assets work correctly by testing the sample files

## Integration with Development Workflow

The release process integrates seamlessly with existing development practices:
- **No Build Changes**: Uses existing `yarn build` command
- **Existing Tests**: Runs the standard `yarn test` suite
- **Current Structure**: Works with current project file organization
- **HMR Compatible**: Doesn't interfere with development hot module reload