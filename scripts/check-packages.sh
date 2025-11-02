#!/bin/bash
# Check what files will be published in each package
# Usage: ./scripts/check-packages.sh

set -e

echo "📦 Checking package contents..."
echo ""

check_package() {
  local package_name=$1
  local package_dir=$2

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 $package_name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  cd "$package_dir"

  echo ""
  echo "Files to be published:"
  npm pack --dry-run 2>&1 | grep -E '^\s+[0-9]' || echo "  (none)"

  echo ""
  echo "Package size:"
  SIZE=$(npm pack --dry-run 2>&1 | grep 'package size:' | awk '{print $3, $4}')
  echo "  $SIZE"

  echo ""
  echo "Unpacked size:"
  UNPACKED=$(npm pack --dry-run 2>&1 | grep 'unpacked size:' | awk '{print $3, $4}')
  echo "  $UNPACKED"

  cd - > /dev/null
  echo ""
}

# Check each package
check_package "@adi-family/http" "packages/http"
check_package "@adi-family/http-express" "packages/http-express"
check_package "@adi-family/http-native" "packages/http-native"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Package check complete"
echo ""
echo "To see full details for a specific package:"
echo "  cd packages/http && npm pack --dry-run"
