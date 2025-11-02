#!/bin/bash
# Bump version for all packages
# Usage: ./scripts/version-bump.sh [major|minor|patch]

set -e

VERSION_TYPE=${1:-patch}

if [[ ! "$VERSION_TYPE" =~ ^(major|minor|patch)$ ]]; then
  echo "❌ Invalid version type: $VERSION_TYPE"
  echo "Usage: ./scripts/version-bump.sh [major|minor|patch]"
  exit 1
fi

echo "📦 Bumping $VERSION_TYPE version for all packages..."
echo ""

# Get current version from first package
CURRENT_VERSION=$(node -p "require('./packages/http/package.json').version")
echo "Current version: $CURRENT_VERSION"

# Calculate new version
case $VERSION_TYPE in
  major)
    NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{print $1+1".0.0"}')
    ;;
  minor)
    NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{print $1"."$2+1".0"}')
    ;;
  patch)
    NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{print $1"."$2"."$3+1}')
    ;;
esac

echo "New version: $NEW_VERSION"
echo ""

# Confirm
read -p "Proceed with version bump to $NEW_VERSION? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled"
  exit 1
fi

# Update package.json files
echo "Updating package.json files..."

# Update @adi-family/http
sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" packages/http/package.json
rm packages/http/package.json.bak
echo "✅ Updated @adi-family/http"

# Update @adi-family/http-express
sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" packages/http-express/package.json
rm packages/http-express/package.json.bak
echo "✅ Updated @adi-family/http-express"

# Update @adi-family/http-native
sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" packages/http-native/package.json
rm packages/http-native/package.json.bak
echo "✅ Updated @adi-family/http-native"

echo ""
echo "🏷️  Version bumped to $NEW_VERSION"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Commit changes: git add . && git commit -m \"🔖 Bump version to $NEW_VERSION\""
echo "  3. Tag release: git tag v$NEW_VERSION"
echo "  4. Push: git push && git push --tags"
echo "  5. Publish: ./scripts/publish.sh"
