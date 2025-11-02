#!/bin/bash
# Publish all packages to npm
# Usage: ./scripts/publish.sh [--dry-run]

set -e

DRY_RUN=""
if [ "$1" = "--dry-run" ]; then
  DRY_RUN="--dry-run"
  echo "🔍 Running in DRY RUN mode (no actual publishing)"
  echo ""
fi

# Run pre-publish checks
echo "Running pre-publish checks..."
./scripts/pre-publish.sh

echo ""
echo "📦 Publishing packages to npm..."
echo ""

# Publish @adi-family/http (core must be published first)
echo "1️⃣  Publishing @adi-family/http..."
cd packages/http
if [ -n "$DRY_RUN" ]; then
  npm publish --access public $DRY_RUN
else
  npm publish --access public
fi
cd ../..
echo "✅ @adi-family/http published"
echo ""

# Small delay to ensure npm registry updates
if [ -z "$DRY_RUN" ]; then
  echo "⏳ Waiting 5 seconds for npm registry to update..."
  sleep 5
  echo ""
fi

# Publish @adi-family/http-express
echo "2️⃣  Publishing @adi-family/http-express..."
cd packages/http-express
if [ -n "$DRY_RUN" ]; then
  npm publish --access public $DRY_RUN
else
  npm publish --access public
fi
cd ../..
echo "✅ @adi-family/http-express published"
echo ""

# Publish @adi-family/http-native
echo "3️⃣  Publishing @adi-family/http-native..."
cd packages/http-native
if [ -n "$DRY_RUN" ]; then
  npm publish --access public $DRY_RUN
else
  npm publish --access public
fi
cd ../..
echo "✅ @adi-family/http-native published"
echo ""

if [ -n "$DRY_RUN" ]; then
  echo "✅ Dry run completed successfully!"
  echo ""
  echo "To publish for real, run:"
  echo "  ./scripts/publish.sh"
else
  echo "🎉 All packages published successfully!"
  echo ""
  echo "Published packages:"
  echo "  📦 @adi-family/http"
  echo "  📦 @adi-family/http-express"
  echo "  📦 @adi-family/http-native"
  echo ""
  echo "Verify at:"
  echo "  🔗 https://www.npmjs.com/package/@adi-family/http"
  echo "  🔗 https://www.npmjs.com/package/@adi-family/http-express"
  echo "  🔗 https://www.npmjs.com/package/@adi-family/http-native"
fi
