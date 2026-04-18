#!/bin/bash
export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin

# Configuration
SOURCE_DIR="backend/lambdas"
BUILD_DIR="infrastructure/terraform/environments/dev/build"
COMMON_DIR="common"
PACKAGE_JSON="package.json"

echo "🚀 Starting Lambda packaging process..."

# Create build directory if it doesn't exist
mkdir -p "$BUILD_DIR"

# Clean old builds
rm -f "$BUILD_DIR"/*.zip

# Iterate through each lambda directory
for dir in "$SOURCE_DIR"/*/; do
    # Skip the common and dist directories
    DIR_NAME=$(basename "$dir")
    if [ "$DIR_NAME" == "$COMMON_DIR" ]; then
        continue
    fi

    echo "📦 Packaging $DIR_NAME..."

    # Create a temporary staging directory
    STAGING_DIR="backend/temp_$DIR_NAME"
    mkdir -p "$STAGING_DIR"

    # Copy handler code
    cp -r "$dir"* "$STAGING_DIR/"
    
    # Copy common code
    cp -r "$SOURCE_DIR/$COMMON_DIR" "$STAGING_DIR/"
    
    # Copy package.json
    cp "$SOURCE_DIR/$PACKAGE_JSON" "$STAGING_DIR/"
    
    # Rewrite relative imports in index.js to match the flattened zip structure
    if [ -f "$STAGING_DIR/index.js" ]; then
        # Ensure compatibility with macOS sed by providing backup extension
        sed -i.bak 's/\.\.\/common/\.\/common/g' "$STAGING_DIR/index.js"
        rm -f "$STAGING_DIR/index.js.bak"
    fi
    
    # Install dependencies
    echo "  📦 Installing dependencies for $DIR_NAME..."
    (cd "$STAGING_DIR" && npm install --production --no-package-lock --no-audit)

    # Zip the contents
    (cd "$STAGING_DIR" && zip -r "../../$BUILD_DIR/$DIR_NAME.zip" .)

    # Clean up staging
    rm -rf "$STAGING_DIR"
done

echo "✅ All Lambdas packaged successfully in $BUILD_DIR"
ls -lh "$BUILD_DIR"
