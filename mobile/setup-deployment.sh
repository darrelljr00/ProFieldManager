#!/bin/bash

# Pro Field Manager Mobile App - Deployment Setup Script
# This script prepares your environment for app store deployment

set -e

echo "🚀 Pro Field Manager Mobile - Deployment Setup"
echo "==============================================="

# Check Node.js version
echo "📋 Checking Node.js version..."
node_version=$(node -v)
echo "Node.js version: $node_version"

# Install global dependencies
echo "📦 Installing global dependencies..."
npm install -g @expo/eas-cli expo-cli

# Navigate to mobile directory
cd "$(dirname "$0")"
echo "📁 Current directory: $(pwd)"

# Install project dependencies
echo "📦 Installing project dependencies..."
npm install

# Check if user is logged into EAS
echo "🔐 Checking EAS authentication..."
if eas whoami &> /dev/null; then
    echo "✅ Already logged into EAS"
else
    echo "❌ Not logged into EAS. Please run: eas login"
    exit 1
fi

# Initialize EAS project if needed
if [ ! -f "eas.json" ]; then
    echo "🎯 Initializing EAS project..."
    eas init
else
    echo "✅ EAS project already initialized"
fi

# Validate app configuration
echo "📱 Validating app configuration..."
if grep -q "com.profieldmanager.mobile" app.json; then
    echo "✅ Bundle ID configured correctly"
else
    echo "❌ Bundle ID not found in app.json"
fi

# Check build profiles
echo "🔧 Checking build profiles..."
if grep -q "production" eas.json; then
    echo "✅ Production build profile configured"
else
    echo "❌ Production build profile missing"
fi

echo ""
echo "🎉 Setup complete! Next steps:"
echo "1. Test the app: npm run start"
echo "2. Build APK: npm run build:android"
echo "3. Build IPA: npm run build:ios"
echo "4. Submit to stores: npm run submit:android or npm run submit:ios"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT_GUIDE.md"