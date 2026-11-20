# GramFrame Release Process

This document describes the automated release process for GramFrame using GitHub Actions.

## Overview

Every merge to `main` is released automatically. When the **Tests** workflow
passes on a push to `main`, the **Release** workflow (`.github/workflows/release.yml`)
decides the next semantic version, sets it in `package.json`, builds the
standalone bundle, tags the commit and publishes a GitHub release. There is no
tag to push by hand.

## Release Workflow

1. **Gate**: the Tests run on the merged commit *is* the gate — hygiene, lint,
   typecheck, unit tests, both builds, the bundle floor, Playwright and the
   WebKit smoke. A failed Tests run releases nothing.
2. **Still the tip?** If `main` has moved on since, this run stands down: the
   newer commit's run releases both.
3. **Version decision**: `scripts/release-evidence.js` gathers the PRs merged
   and files changed since the last `vX.Y.Z` tag; `scripts/release-version.js`
   decides (rules below; unit-tested in `tests/unit/release-version.test.js`).
   The decision and its reason are shown on the run's summary page.
4. **Build and assets**: the standalone bundle is rebuilt carrying the new
   version, checked, and archived with the demo page.
5. **Commit, tag, release**: a `chore(release): vX.Y.Z [skip ci]` commit bumps
   `package.json` on `main`; it and the tag are pushed atomically, then the
   GitHub release is created with notes listing the merged PRs.
6. **Notification** via ntfy.

## How the version is chosen

The release takes the **largest** bump any merged PR asks for. For each PR,
strongest signal first:

| Signal | Major | Minor | Patch |
|---|---|---|---|
| PR label | `release:major`, `major`, `breaking` | `release:minor`, `minor`, `feature`, `enhancement` | `release:patch`, `patch`, `bug`, `fix` |
| Conventional Commits PR title | `feat!:` / `fix!:` …, or a `BREAKING CHANGE:` footer in the body | `feat:` | any other `type:` |
| Repository convention | — | the PR adds `specs/<n>-<name>/spec.md` | — |
| Nothing above | | | **patch** (the default) |

Commits pushed straight to `main` (no PR) count through their Conventional
Commits messages.

### When nothing is released

- **Nothing that ships changed** since the last tag. Only `src/`,
  `package.json`, `yarn.lock`, `vite.config.js`, `test-release.html` and
  `sample/demo-gram.png` count — a docs-, test- or CI-only merge would publish
  a byte-identical bundle under a new number.
- **Every merged PR is labelled** `release:skip`, `no-release` or `skip-release`.
- **The head commit message contains `[skip release]`.**

### Choosing a version by hand

- **Set it in `package.json`** in a PR. A version ahead of the last tag is
  released exactly as written, not bumped past.
- **Run the workflow manually** (Actions → Release → *Run workflow*) with a
  forced `patch`/`minor`/`major`. This releases `main`'s tip even if nothing
  that ships has changed.

While the project is on `0.x`, a major bump goes to `1.0.0`; label PRs
`release:major` only when that is intended.

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

Release notes list the merged PRs by title and number (or, with no PRs, the
commit subjects), the bump and the reason for it, quick-start steps, and a
compare link to the previous tag.

## Error Handling

- **Tests failed on the merge**: no Release run happens.
- **Bundle missing, under 100KB, or not carrying the new version**: the run fails before anything is pushed.
- **Bundle floor or archive budget exceeded**: likewise fails before pushing.
- **Tag already exists**: the run fails at the decision step.

## Troubleshooting

- **No release after a merge**: open the Release run's summary — it states the
  decision and why (nothing shipped, every PR skipped, or superseded by a
  newer merge). A Tests failure on `main` also means no Release run.
- **A release step failed after the decision**: nothing is pushed until the
  commit-and-tag step, so fix the cause and either merge the fix or re-run the
  workflow manually.
- **The push was refused**: `main` moved during the run. Nothing was tagged;
  the newer commit's run releases everything.
- **A wrong version was published**: delete the release and its tag on GitHub,
  revert the `chore(release)` commit, and re-run manually with the right bump.

## Workflow Permissions

The release workflow requires:
- **`contents: write`**: To push the version commit and tag, and create the release
- **`pull-requests: read`**: To read merged PRs' labels and titles
- **Access to GITHUB_TOKEN**: Automatically provided by GitHub Actions

## Notification System

The workflow sends notifications to `ntfy.sh/iancc2025` for:
- **Successful Releases**: Includes release URL and version
- **Failed Releases**: Alerts about failure with workflow details

## Best Practices

1. **Label PRs that add features** (`enhancement`) or break things (`release:major`); unlabelled PRs ship as patches
2. **Descriptive PR titles**: they are the release notes
3. **Never edit `package.json`'s version casually**: a version ahead of the last tag is released as written
4. **Review Assets**: Verify release assets work correctly by testing the sample files

## Integration with Development Workflow

The release process integrates seamlessly with existing development practices:
- **No Build Changes**: Uses existing `yarn build` command
- **Existing Tests**: Runs the standard `yarn test` suite
- **Current Structure**: Works with current project file organization
- **HMR Compatible**: Doesn't interfere with development hot module reload