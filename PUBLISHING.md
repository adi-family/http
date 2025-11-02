# Publishing Guide

publishing-guide, npm, release-process

This guide explains how to publish new versions of @adi-family/http packages to npm.

## Prerequisites

Before publishing, ensure you have:

1. **npm account** with access to @adi-family organization
2. **Logged in to npm**: `npm login`
3. **Clean git state**: All changes committed
4. **On main branch**: `git checkout main`

## Quick Publish

For a quick publish of the current version:

```bash
# Run pre-publish checks and publish all packages
bun run publish:all
```

This will:
- ✅ Verify you're on main branch
- ✅ Check for uncommitted changes
- ✅ Verify npm login
- ✅ Clean old builds
- ✅ Run type checking
- ✅ Build all packages
- ✅ Publish to npm in correct order

## Dry Run

To test the publishing process without actually publishing:

```bash
bun run publish:dry-run
```

This shows exactly what would be published without making any changes to npm.

## Version Management

### Bump Version

To bump the version of all packages:

```bash
# Patch version (1.0.0 -> 1.0.1)
bun run version:bump patch

# Minor version (1.0.0 -> 1.1.0)
bun run version:bump minor

# Major version (1.0.0 -> 2.0.0)
bun run version:bump major
```

Or use the script directly:

```bash
./scripts/version-bump.sh patch
./scripts/version-bump.sh minor
./scripts/version-bump.sh major
```

### Full Release Process

1. **Bump version**
   ```bash
   bun run version:bump patch
   ```

2. **Review changes**
   ```bash
   git diff
   ```

3. **Commit version bump**
   ```bash
   git add .
   git commit -m "🔖 Bump version to 1.0.1"
   ```

4. **Create git tag**
   ```bash
   git tag v1.0.1
   ```

5. **Push to GitHub**
   ```bash
   git push && git push --tags
   ```

6. **Publish to npm**
   ```bash
   bun run publish:all
   ```

## Check Package Contents

To see what files will be included in each package:

```bash
bun run check:packages
```

This shows:
- List of files to be published
- Package size (packed)
- Unpacked size

## Manual Publishing

If you need to publish packages individually:

```bash
# 1. Run pre-publish checks
./scripts/pre-publish.sh

# 2. Publish core package first
cd packages/http
npm publish --access public

# 3. Publish Express adapter
cd ../http-express
npm publish --access public

# 4. Publish Native adapter
cd ../http-native
npm publish --access public
```

**Important:** Always publish `@adi-family/http` first, as other packages depend on it.

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run prepublish` | Run all pre-publish checks |
| `bun run publish:all` | Publish all packages to npm |
| `bun run publish:dry-run` | Test publish without uploading |
| `bun run version:bump [type]` | Bump version (patch/minor/major) |
| `bun run check:packages` | Check package contents |
| `bun run build` | Build all packages |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run clean` | Remove all build artifacts |

## Troubleshooting

### "Not logged in to npm"

```bash
npm login
# Follow the prompts
```

### "Uncommitted changes"

```bash
git status
git add .
git commit -m "Your message"
```

### "Not on main branch"

```bash
git checkout main
```

### "Package already exists"

If you're trying to publish a version that already exists:

```bash
# Bump the version first
bun run version:bump patch
git add .
git commit -m "🔖 Bump version"
git push
bun run publish:all
```

### "Build failed"

```bash
# Clean and rebuild
bun run clean
bun run build
```

## Publishing Order

The packages must be published in this specific order:

1. **@adi-family/http** - Core library (no dependencies)
2. **@adi-family/http-express** - Depends on core
3. **@adi-family/http-native** - Depends on core

The `publish.sh` script handles this automatically.

## Verification

After publishing, verify the packages:

```bash
# Check package info
npm info @adi-family/http
npm info @adi-family/http-express
npm info @adi-family/http-native

# Test installation in a new directory
mkdir test-install && cd test-install
npm init -y
npm install @adi-family/http @adi-family/http-express @adi-family/http-native
```

## Version Strategy

We follow [Semantic Versioning](https://semver.org/):

- **Patch (x.x.X)**: Bug fixes, documentation updates
- **Minor (x.X.0)**: New features, backward compatible
- **Major (X.0.0)**: Breaking changes

## Pre-release Versions

For beta or alpha releases:

```bash
# Manually set version in package.json files
# Example: 1.1.0-beta.1

npm publish --tag beta
```

## Post-Publishing

After successful publishing:

1. ✅ Verify packages on npm: https://www.npmjs.com/org/adi-family
2. ✅ Test installation in a clean project
3. ✅ Update GitHub release notes (optional)
4. ✅ Announce release (optional)

## Security

- Never publish with `--force`
- Always use `--access public` for public packages
- Keep npm credentials secure
- Review package contents before publishing

## Support

For issues or questions:
- GitHub Issues: https://github.com/adi-family/http/issues
- npm packages: https://www.npmjs.com/org/adi-family
