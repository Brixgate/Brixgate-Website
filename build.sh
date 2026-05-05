#!/bin/bash
# ============================================================
#  Brixgate — Production Build Script
#  Minifies HTML/CSS, obfuscates JS, packages into a zip.
#  Run: bash build.sh
#  Output: brixgate-prod.zip (ready to upload to the server)
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST="$PROJECT_DIR/dist"
ZIP_OUT="$PROJECT_DIR/brixgate-prod.zip"

echo ""
echo "🔧 Brixgate Production Build"
echo "─────────────────────────────"

# ── 1. Clean and create dist folder ──────────────────────────
echo "► Cleaning dist folder..."
rm -rf "$DIST"
mkdir -p "$DIST"

# ── 2. Copy assets (images, fonts, favicons) ─────────────────
echo "► Copying assets..."
cp -r "$PROJECT_DIR/assets" "$DIST/assets"

# ── 3. Minify all HTML files ──────────────────────────────────
echo "► Minifying HTML..."
while IFS= read -r -d '' file; do
  filename=$(basename "$file")
  "$PROJECT_DIR/node_modules/.bin/html-minifier-terser" \
    --collapse-whitespace \
    --remove-comments \
    --remove-optional-tags \
    --remove-redundant-attributes \
    --remove-script-type-attributes \
    --remove-tag-whitespace \
    --minify-css true \
    --minify-js true \
    "$file" -o "$DIST/$filename"
  echo "   ✓ $filename"
done < <(find "$PROJECT_DIR" -maxdepth 1 -name "*.html" -print0)

# ── 4. Minify CSS ─────────────────────────────────────────────
echo "► Minifying CSS..."
node -e "
const fs = require('fs');
let css = fs.readFileSync('$PROJECT_DIR/styles.css', 'utf8');
// Remove comments
css = css.replace(/\/\*[\s\S]*?\*\//g, '');
// Collapse whitespace
css = css.replace(/\s+/g, ' ');
// Remove spaces around key chars
css = css.replace(/\s*([{}:;,>~+])\s*/g, '\$1');
// Remove trailing semicolons before }
css = css.replace(/;}/g, '}');
// Trim
css = css.trim();
fs.writeFileSync('$DIST/styles.css', css);
"
echo "   ✓ styles.css"

# ── 5. Obfuscate JS ───────────────────────────────────────────
echo "► Obfuscating JS..."
"$PROJECT_DIR/node_modules/.bin/javascript-obfuscator" \
  "$PROJECT_DIR/script.js" \
  --output "$DIST/script.js" \
  --compact true \
  --string-array true \
  --string-array-encoding base64 \
  --identifier-names-generator hexadecimal \
  --rename-globals false \
  --self-defending false 2>/dev/null
echo "   ✓ script.js"

# ── 6. Package into zip ───────────────────────────────────────
echo "► Creating zip..."
rm -f "$ZIP_OUT"
cd "$DIST"
zip -r "$ZIP_OUT" . -x "*.DS_Store" 2>/dev/null
cd "$PROJECT_DIR"

# ── 7. Summary ───────────────────────────────────────────────
ZIP_SIZE=$(du -sh "$ZIP_OUT" | cut -f1)
FILE_COUNT=$(find "$DIST" -type f | wc -l | tr -d ' ')

echo ""
echo "✅ Build complete!"
echo "   Files processed : $FILE_COUNT"
echo "   Output zip      : brixgate-prod.zip ($ZIP_SIZE)"
echo ""
echo "Next steps:"
echo "  1. Upload:  scp -i frontend-server.pem brixgate-prod.zip ec2-user@ec2-13-60-15-83.eu-north-1.compute.amazonaws.com:~/"
echo "  2. SSH in:  ssh -i \"frontend-server.pem\" ec2-user@ec2-13-60-15-83.eu-north-1.compute.amazonaws.com"
echo "  3. Deploy:  sudo unzip -o ~/brixgate-prod.zip -d /var/www/html/"
echo ""
