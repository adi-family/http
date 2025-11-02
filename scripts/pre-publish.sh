#!/bin/bash
# Pre-publish validation script
# Runs checks before publishing packages

set -e

echo "🔍 Running pre-publish checks..."
echo ""

# Check if on main branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  echo "❌ Not on main branch (currently on: $BRANCH)"
  echo "   Switch to main branch before publishing"
  exit 1
fi
echo "✅ On main branch"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "❌ Uncommitted changes detected"
  echo "   Commit or stash changes before publishing"
  exit 1
fi
echo "✅ No uncommitted changes"

# Check if npm is logged in
if ! npm whoami &> /dev/null; then
  echo "❌ Not logged in to npm"
  echo "   Run: npm login"
  exit 1
fi
NPM_USER=$(npm whoami)
echo "✅ Logged in to npm as: $NPM_USER"

# Clean previous builds
echo ""
echo "🧹 Cleaning previous builds..."
bun run clean
echo "✅ Cleaned"

# Run type checking
echo ""
echo "🔧 Running type check..."
if ! bun run typecheck; then
  echo "❌ Type check failed"
  exit 1
fi
echo "✅ Type check passed"

# Build all packages
echo ""
echo "🏗️  Building all packages..."
if ! bun run build; then
  echo "❌ Build failed"
  exit 1
fi
echo "✅ Build successful"

# Check package sizes
echo ""
echo "📦 Package sizes:"
echo "  @adi-family/http:"
du -sh packages/http/dist | awk '{print "    " $1}'
echo "  @adi-family/http-express:"
du -sh packages/http-express/dist | awk '{print "    " $1}'
echo "  @adi-family/http-native:"
du -sh packages/http-native/dist | awk '{print "    " $1}'

echo ""
echo "✅ All pre-publish checks passed!"
echo ""
echo "Ready to publish. Run:"
echo "  ./scripts/publish.sh"
