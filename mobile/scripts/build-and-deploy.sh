#!/bin/bash

# Pro Field Manager Mobile App - Build and Deploy Script
# This script builds APK and IPA files for app store deployment

set -e

echo "🚀 Pro Field Manager Mobile App - Build & Deploy"
echo "=================================================="

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g @expo/eas-cli
fi

# Login to EAS (if not already logged in)
echo "🔐 Checking EAS authentication..."
eas whoami || eas login

# Build for Android (APK for testing, AAB for store)
echo "🤖 Building Android APK..."
eas build --platform android --profile production-apk --non-interactive

echo "🤖 Building Android AAB for Play Store..."
eas build --platform android --profile production --non-interactive

# Build for iOS
echo "🍎 Building iOS IPA..."
eas build --platform ios --profile production --non-interactive

echo "✅ Build process completed!"
echo ""
echo "📱 Next Steps:"
echo "1. Download APK from EAS dashboard for testing"
echo "2. Submit AAB to Google Play Store: eas submit --platform android"
echo "3. Submit IPA to App Store: eas submit --platform ios"
echo ""
echo "🔗 EAS Dashboard: https://expo.dev/accounts/[your-username]/projects/ProFieldManagerMobile/builds"