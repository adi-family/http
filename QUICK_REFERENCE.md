# Quick Reference

quick-reference, cheat-sheet, commands

Essential commands and workflows for @adi-family/http development and publishing.

## Development Commands

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Clean build artifacts
bun run clean

# Type checking
bun run typecheck

# Run example server
bun run dev:example
```

## Publishing Commands

```bash
# Check what will be published
bun run check:packages

# Dry run (test without publishing)
bun run publish:dry-run

# Publish all packages to npm
bun run publish:all

# Bump version
bun run version:bump patch   # 1.0.0 -> 1.0.1
bun run version:bump minor   # 1.0.0 -> 1.1.0
bun run version:bump major   # 1.0.0 -> 2.0.0
```

## Full Release Workflow

```bash
# 1. Bump version
bun run version:bump patch

# 2. Commit and tag
git add .
git commit -m "🔖 Bump version to 1.0.1"
git tag v1.0.1

# 3. Push to GitHub
git push && git push --tags

# 4. Publish to npm
bun run publish:all
```

## Package Structure

```
@adi-family/http/
├── packages/
│   ├── http/              # Core library
│   ├── http-express/      # Express adapter
│   └── http-native/       # Native Node.js adapter
├── examples/              # Example code
└── scripts/               # Publishing automation
```

## npm Package Names

- **@adi-family/http** - Core library
- **@adi-family/http-express** - Express adapter
- **@adi-family/http-native** - Native HTTP adapter

## Installation (for users)

```bash
# Core + Express
npm install @adi-family/http @adi-family/http-express zod

# Core + Native
npm install @adi-family/http @adi-family/http-native zod
```

## Links

- **GitHub**: https://github.com/adi-family/http
- **npm org**: https://www.npmjs.com/org/adi-family
- **Issues**: https://github.com/adi-family/http/issues

## Important Notes

- Always publish from `main` branch
- Ensure all changes are committed before publishing
- Core package must be published first (automated in scripts)
- Use `--dry-run` to test before real publishing
- Version must be bumped before each publish

## Documentation Files

- **README.md** - Main project documentation
- **QUICKSTART.md** - Getting started guide
- **STRUCTURE.md** - Project structure explanation
- **PUBLISHING.md** - Detailed publishing guide (you're here!)
- **LICENSE** - MIT License

## Pre-requisites for Publishing

1. npm account with @adi-family access
2. Logged in: `npm login`
3. Clean git state
4. On main branch
