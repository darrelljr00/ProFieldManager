# Pro Field Manager Mobile App - Deployment Guide

## Prerequisites for App Store Deployment

### 1. Developer Accounts Required
- **Google Play Console**: $25 one-time registration fee
- **Apple Developer Program**: $99/year subscription

### 2. Required Tools Installation
```bash
# Install EAS CLI globally
npm install -g @expo/eas-cli

# Install Expo CLI (if not already installed)
npm install -g expo-cli
```

### 3. Expo Account Setup
```bash
# Login or create Expo account
eas login

# Initialize EAS project (if not done)
cd mobile
eas init
```

## Building APK/IPA Files

### Android APK Build (for testing)
```bash
cd mobile
npm run build:android
```

### Android AAB Build (for Google Play Store)
```bash
cd mobile
eas build --platform android --profile production
```

### iOS IPA Build (for App Store)
```bash
cd mobile
npm run build:ios
```

### Build Both Platforms
```bash
cd mobile
npm run build:all
```

## Google Play Store Deployment

### 1. Prepare Store Listing
- **App Name**: Pro Field Manager
- **Description**: Professional field service management mobile app
- **Category**: Business
- **Content Rating**: Everyone
- **Screenshots**: Take screenshots from Android emulator/device
- **Feature Graphic**: 1024 x 500px banner image

### 2. Upload to Google Play Console
```bash
# Automatic submission via EAS
eas submit --platform android

# Or manual upload:
# 1. Download AAB file from EAS dashboard
# 2. Upload to Play Console > App releases > Production
```

### 3. Release Process
1. Upload AAB file
2. Complete store listing
3. Set pricing (free)
4. Review and publish

## Apple App Store Deployment

### 1. App Store Connect Setup
- Create app record in App Store Connect
- Set bundle ID: `com.profieldmanager.mobile`
- Configure app information and pricing

### 2. Upload IPA
```bash
# Automatic submission via EAS
eas submit --platform ios

# Or use Xcode:
# 1. Download IPA from EAS dashboard
# 2. Use Application Loader or Xcode Organizer
```

### 3. App Review Requirements
- Privacy Policy URL (required)
- App description and keywords
- Screenshots for all device sizes
- App icon (1024x1024px)

## Pre-Deployment Checklist

### 1. App Configuration
- [x] Bundle ID configured: `com.profieldmanager.mobile`
- [x] App version: 1.0.0
- [x] Build number: Auto-incremented by EAS
- [x] App name and description
- [x] Icons and splash screens

### 2. Permissions Configured
- [x] Camera access (for photo capture)
- [x] Location access (for GPS tracking)
- [x] Storage access (for file management)
- [x] Network access (for API calls)

### 3. API Integration
- [x] Authentication system
- [x] Cloudinary file upload
- [x] Real-time API calls
- [x] WebSocket connection (if needed)

### 4. Testing Required
- [ ] Test on physical Android device
- [ ] Test on physical iOS device
- [ ] Verify all features work offline/online
- [ ] Test camera functionality
- [ ] Test GPS tracking
- [ ] Verify login/logout flow

## Build Command Reference

```bash
# Development builds
npm run start          # Start development server
npm run android        # Run on Android emulator
npm run ios           # Run on iOS simulator

# Production builds
npm run build:android  # Build APK for testing
npm run build:ios     # Build IPA for App Store
npm run build:all     # Build both platforms

# Preview builds (internal distribution)
npm run preview       # Build preview versions

# Submission
npm run submit:android # Submit to Google Play
npm run submit:ios    # Submit to App Store
```

## Expected Build Times
- **Android APK**: 5-10 minutes
- **Android AAB**: 8-15 minutes  
- **iOS IPA**: 10-20 minutes

## App Store Review Process
- **Google Play**: 1-3 days (faster for updates)
- **Apple App Store**: 1-7 days (24-48 hours typical)

## Post-Deployment
1. Monitor crash reports
2. Track user feedback
3. Plan feature updates
4. Monitor performance metrics

## Support Links
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com)