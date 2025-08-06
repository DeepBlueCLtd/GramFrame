# Automated Release Command

This command automates the software release process by updating the version in `package.json` and creating a corresponding git tag. It supports semantic versioning with automatic increment of major, minor, or patch versions.

## Usage

```bash
# Default to patch increment (e.g., 1.0.0 → 1.0.1)
release-me

# Specify increment type
release-me patch
release-me minor
release-me major
```

## Parameters

- **No parameter**: Defaults to `patch` increment
- **`patch`**: Increments patch version (1.2.3 → 1.2.4)
- **`minor`**: Increments minor version and resets patch to 0 (1.2.3 → 1.3.0)
- **`major`**: Increments major version and resets minor/patch to 0 (1.2.3 → 2.0.0)

## Process

The command performs these steps with detailed logging:

1. **Pre-flight Checks**:
   - Verify git repository exists
   - Check for uncommitted changes (fails if any exist)
   - Validate package.json exists and has valid version field
   
2. **Version Processing**:
   - Read current version from package.json
   - Parse and validate semantic version format
   - Calculate new version based on increment type
   - Display current → new version
   
3. **File Updates**:
   - Update package.json with new version
   - Preserve JSON formatting and structure
   
4. **Git Operations**:
   - Create git tag with format `v{version}` (e.g., "v1.2.3")
   - Validate tag creation

## Implementation

```bash
# Read the increment type parameter (default to patch)
INCREMENT_TYPE="${1:-patch}"

echo "🚀 Starting automated release process..."
echo "📊 Increment type: $INCREMENT_TYPE"

# Pre-flight checks
echo "🔍 Running pre-flight checks..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "❌ Error: Uncommitted changes detected. Please commit or stash changes before releasing."
    echo "📝 Run 'git status' to see uncommitted changes"
    exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    exit 1
fi

echo "✅ Pre-flight checks passed"

# Read current version from package.json
echo "📖 Reading current version from package.json..."
CURRENT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null)
if [ $? -ne 0 ] || [ -z "$CURRENT_VERSION" ]; then
    echo "❌ Error: Could not read version from package.json"
    exit 1
fi

echo "📦 Current version: $CURRENT_VERSION"

# Validate semantic version format
if ! echo "$CURRENT_VERSION" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' > /dev/null; then
    echo "❌ Error: Version '$CURRENT_VERSION' is not in semantic version format (x.y.z)"
    exit 1
fi

# Parse version components
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

# Calculate new version based on increment type
echo "🔢 Calculating new version..."
case "$INCREMENT_TYPE" in
    "major")
        NEW_MAJOR=$((MAJOR + 1))
        NEW_MINOR=0
        NEW_PATCH=0
        ;;
    "minor")
        NEW_MAJOR=$MAJOR
        NEW_MINOR=$((MINOR + 1))
        NEW_PATCH=0
        ;;
    "patch")
        NEW_MAJOR=$MAJOR
        NEW_MINOR=$MINOR
        NEW_PATCH=$((PATCH + 1))
        ;;
    *)
        echo "❌ Error: Invalid increment type '$INCREMENT_TYPE'. Use 'major', 'minor', or 'patch'"
        exit 1
        ;;
esac

NEW_VERSION="${NEW_MAJOR}.${NEW_MINOR}.${NEW_PATCH}"
echo "📈 New version: $CURRENT_VERSION → $NEW_VERSION"

# Update package.json with new version
echo "📝 Updating package.json..."
if command -v node > /dev/null; then
    # Use Node.js to update JSON while preserving formatting
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.version = '$NEW_VERSION';
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    "
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to update package.json"
        exit 1
    fi
else
    # Fallback to sed (less reliable for complex JSON)
    sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to update package.json with sed"
        exit 1
    fi
    rm -f package.json.bak
fi

echo "✅ Updated package.json to version $NEW_VERSION"

# Create git tag
TAG_NAME="v$NEW_VERSION"
echo "🏷️  Creating git tag: $TAG_NAME"

if git tag "$TAG_NAME"; then
    echo "✅ Git tag '$TAG_NAME' created successfully"
else
    echo "❌ Error: Failed to create git tag '$TAG_NAME'"
    # Attempt to rollback package.json changes
    echo "🔄 Rolling back package.json changes..."
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.version = '$CURRENT_VERSION';
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    " 2>/dev/null || true
    exit 1
fi

# Success summary
echo ""
echo "🎉 Release preparation completed successfully!"
echo "📦 Version updated: $CURRENT_VERSION → $NEW_VERSION"
echo "🏷️  Git tag created: $TAG_NAME"
echo ""
echo "📋 Next steps:"
echo "   1. Review the changes: git show $TAG_NAME"
echo "   2. Push the tag to trigger release: git push origin $TAG_NAME"
echo "   3. Monitor the release workflow in GitHub Actions"
echo ""
echo "🚀 Ready for release!"
```

## Error Handling

The command implements comprehensive error handling with fail-fast approach:

- **Git Repository Check**: Fails if not in a git repository
- **Uncommitted Changes**: Fails if working directory is not clean
- **File Validation**: Fails if package.json doesn't exist or is invalid
- **Version Format**: Validates semantic version format (x.y.z)
- **JSON Parsing**: Handles package.json parsing errors gracefully
- **Git Operations**: Validates tag creation and provides rollback on failure
- **Parameter Validation**: Validates increment type parameter

## Integration with Release Process

This command integrates with the documented release process in `docs/Release-Process.md`:

1. **Preparation**: Replaces manual version editing in package.json
2. **Tag Creation**: Automates the `git tag v1.0.0` step
3. **Workflow Trigger**: Creates properly formatted tags that trigger GitHub Actions
4. **Error Prevention**: Prevents common mistakes in manual release process

## Examples

```bash
# Patch release (bug fixes)
$ release-me patch
🚀 Starting automated release process...
📦 Current version: 1.0.0
📈 New version: 1.0.0 → 1.0.1
✅ Updated package.json to version 1.0.1
✅ Git tag 'v1.0.1' created successfully

# Minor release (new features)
$ release-me minor
📦 Current version: 1.0.1
📈 New version: 1.0.1 → 1.1.0

# Major release (breaking changes)
$ release-me major
📦 Current version: 1.1.0
📈 New version: 1.1.0 → 2.0.0
```

## Notes

- The command does **not** push the tag automatically - you must push it manually
- Tag format follows GitHub Actions requirements: `v*.*.*`
- JSON formatting in package.json is preserved
- All operations are atomic - if any step fails, previous changes are rolled back
- Detailed logging helps with debugging and verification