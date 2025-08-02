# 📱 Pro Field Manager - Mobile App (Expo)

## Overview
This is the mobile version of Pro Field Manager built with Expo and React Native, featuring **Over-The-Air (OTA) updates** for continuous deployment without APK regeneration.

## 🚀 Quick Start

### Development
```bash
cd mobile/expo-app
npm install
npm start
```

### First-Time Setup
```bash
# Install dependencies
npm install

# Setup EAS (one-time)
npm run setup:eas

# Build first APK/IPA (one-time)
npm run build:android  # for Android
npm run build:ios      # for iOS
```

### OTA Updates (Daily Workflow)
```bash
# Deploy update to production (automatic version bump)
npm run update:production

# Deploy to preview for testing
npm run update:preview

# Deploy with custom message
eas update --branch production --message "Bug fixes and improvements"
```

## 📦 Key Features

### OTA Update System
- ✅ **Automatic Updates**: Users receive updates without manual app store downloads
- ✅ **Instant Deployment**: Deploy JavaScript changes in seconds
- ✅ **Channel Control**: Separate development/preview/production channels
- ✅ **Auto-Restart**: Smart app restart prompts for seamless updates
- ✅ **Rollback Support**: Quick revert of problematic updates

### App Features
- 📋 Field service management interface
- 📍 GPS tracking and location services
- ⏰ Time clock and attendance tracking  
- 💰 Expense and invoice management
- 👥 Team communication tools
- 🔄 Real-time sync with web platform

## 🛠️ Configuration Files

### app.json
Main Expo configuration with OTA update settings:
- Update URL and project ID
- Automatic update checking
- Runtime version management
- Platform-specific settings

### eas.json
EAS Build and Update configuration:
- Build profiles (development/preview/production)
- Channel management
- Environment variables

### App.tsx
React Native app with built-in OTA update logic:
- Automatic update checking on app launch
- Background update downloading
- User-friendly update notifications
- Manual update checking capability

## 📋 Available Commands

### Development
- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run web version

### Building
- `npm run build:android` - Build Android APK/AAB
- `npm run build:ios` - Build iOS IPA
- `npm run build:preview` - Build preview version for testing

### OTA Updates
- `npm run update:production` - Deploy to production users
- `npm run update:preview` - Deploy to preview channel
- `npm run setup:eas` - One-time EAS configuration

### App Store Submission
- `npm run submit:android` - Submit to Google Play Store
- `npm run submit:ios` - Submit to Apple App Store

## 🎯 Update Workflow

### 1. One-Time Setup (First Deploy)
```bash
# 1. Configure project
npm run setup:eas

# 2. Build apps for stores
npm run build:android
npm run build:ios

# 3. Submit to app stores
npm run submit:android
npm run submit:ios
```

### 2. Regular Updates (No APK Rebuild)
```bash
# 1. Make code changes
# 2. Test locally with npm start
# 3. Deploy OTA update
npm run update:production
```

### 3. What Updates Automatically
✅ **JavaScript/TypeScript code changes**
✅ **React Native component updates**
✅ **App logic and business rules**
✅ **UI changes and styling**
✅ **API integrations**
✅ **Configuration changes**

❌ **Requires new build:**
- Native module changes
- New permissions
- Expo SDK upgrades
- App icon changes

## 🔧 Troubleshooting

### Update Not Working
```bash
# Clear cache and restart
npm start -- --clear

# Check update status
eas update:list --branch production

# Verify project configuration
cat app.json | grep projectId
```

### Build Issues
```bash
# Clear EAS cache
eas build --clear-cache

# Check dependencies
npm audit fix
npm install
```

## 📊 Monitoring

### Expo Dashboard
- View update adoption rates
- Monitor deployment status
- Track user engagement
- Error reporting and analytics

### App Analytics
The app includes built-in update monitoring that shows:
- Current update ID and channel
- Update check status
- Download progress
- User notification preferences

## 🎉 Benefits Achieved

With this OTA setup, you get:
- **⚡ Instant Deployments**: Updates deploy in seconds vs hours
- **🎯 Full Control**: No app store approval delays
- **📱 Automatic Updates**: Users get updates without manual downloads
- **🔄 Easy Rollbacks**: Quick revert of problematic updates
- **📊 Real-time Tracking**: Monitor adoption and engagement
- **🚀 Continuous Deployment**: True CI/CD for mobile apps

## 🆘 Support

For issues or questions:
1. Check the main [OTA Deployment Guide](../../OTA_DEPLOYMENT_GUIDE.md)
2. Review Expo documentation: https://docs.expo.dev/
3. Check EAS Update docs: https://docs.expo.dev/eas-update/
4. Contact the development team

---

**Result: Your mobile app now supports continuous deployment with automatic OTA updates!** 🚀