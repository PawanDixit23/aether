#!/bin/bash
# 📦 Script to Build Optimized Android APK for Aether
set -e

echo "⚡ Starting Aether Android APK Build via EAS..."
cd "$(dirname "$0")/mobile"

# Ensure dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing mobile dependencies..."
    npm install
fi

echo "🚀 Launching EAS APK Build (Profile: preview)..."
echo "👉 When prompted to generate a new Keystore, select 'Y' (Yes)!"
eas build -p android --profile preview
