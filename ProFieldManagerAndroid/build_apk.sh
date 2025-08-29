#!/bin/bash

echo "🔧 Pro Field Manager - Android APK Build Script"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "build.gradle" ]; then
    echo "❌ Error: Must run from ProFieldManagerAndroid root directory"
    exit 1
fi

# Make gradlew executable
chmod +x gradlew

echo "🧹 Cleaning previous builds..."
./gradlew clean

echo "📦 Building debug APK with 16 KB page alignment..."
./gradlew assembleDebug

if [ $? -eq 0 ]; then
    echo "✅ APK build successful!"
    echo ""
    echo "📱 APK Location:"
    echo "   app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "📋 Installation Instructions:"
    echo "   1. Connect Android device via USB (with USB debugging enabled)"
    echo "   2. Run: adb install app/build/outputs/apk/debug/app-debug.apk"
    echo "   3. Or drag & drop APK onto Android emulator"
    echo ""
    echo "🔍 APK Details:"
    ls -lh app/build/outputs/apk/debug/app-debug.apk 2>/dev/null || echo "   APK file not found in expected location"
    echo ""
    echo "✅ 16 KB Page Alignment:"
    echo "   This APK includes fixes for Google Play's 16 KB page requirement"
    echo "   All native libraries are built with -Wl,-z,max-page-size=16384"
    echo "   Compatible with Android 15+ devices (starting Nov 1, 2025)"
else
    echo "❌ APK build failed!"
    echo "Check the error messages above for details."
    exit 1
fi