# 📱 Pro Field Manager - OTA Updates Deployment Guide

## 🎯 Overview

This guide explains how to set up and use Over-The-Air (OTA) updates for Pro Field Manager mobile app. Once configured, you can deploy updates to users **without regenerating APK files**.

## ✨ Key Benefits

- 🚀 **Instant Updates**: Deploy changes immediately to user devices
- 📱 **No APK Rebuild**: JavaScript changes update without new app store releases
- 🔄 **Automatic Application**: Users get updates on next app launch
- 🎯 **Channel Control**: Deploy to specific user groups (dev/preview/production)
- ⚡ **Fast Deployment**: Updates deploy in seconds, not hours
- 🛡️ **Rollback Support**: Quickly revert problematic updates

## 🛠️ Initial Setup

### 1. Install Expo CLI and EAS CLI
```bash
# Install globally
npm install -g @expo/cli eas-cli

# Login to Expo
expo login
eas login
```

### 2. Initialize Expo Project
```bash
cd mobile/expo-app

# Configure EAS Build and Updates
npm run setup:eas

# This runs:
# eas build:configure
# eas update:configure
```

### 3. Configure Project ID
```bash
# Create new Expo project or link existing
eas init

# Update app.json with your project ID
# Replace [your-project-id] in app.json with actual project ID
```

### 4. First Build (One-time APK generation)
```bash
# Build for Android
npm run build:android

# Build for iOS  
npm run build:ios

# Or build both
npm run build:preview
```

### 5. Submit to App Stores (One-time)
```bash
# Submit to Google Play Store
npm run submit:android

# Submit to Apple App Store
npm run submit:ios
```

## 🚀 Deploying OTA Updates

### Quick Deployment
```bash
# Deploy to production (recommended)
node scripts/deploy-mobile-update.js

# Deploy with custom message
node scripts/deploy-mobile-update.js production "Bug fixes and performance improvements"

# Deploy to preview channel for testing
node scripts/deploy-mobile-update.js preview "Testing new dashboard features"
```

### Manual EAS Commands
```bash
cd mobile/expo-app

# Production update
npm run update:production

# Preview update  
npm run update:preview

# Custom update
eas update --branch production --message "Your custom message"
```

## 📋 Update Workflow

### 1. Development Process
```bash
# 1. Make changes to your React Native/Expo code
# 2. Test locally
npm start

# 3. Deploy to preview channel for testing
node scripts/deploy-mobile-update.js preview "Testing feature X"

# 4. After testing, deploy to production
node scripts/deploy-mobile-update.js production "Release feature X"
```

### 2. What Gets Updated
✅ **Automatically Updated (OTA)**:
- JavaScript code changes
- React component updates  
- App logic and UI modifications
- Image assets and configurations
- API integrations and business logic

❌ **Requires New Build**:
- Native module changes
- New permissions
- Expo SDK upgrades
- App icon/splash screen changes
- Native code modifications

### 3. User Experience
1. User opens the app
2. App automatically checks for updates (background)
3. If update available, downloads silently
4. User sees notification: "Update ready! Restart to apply changes"
5. User restarts app → new version loads instantly

## 🎛️ Channel Management

### Development Channel
- For active development and testing
- Frequent updates, may be unstable
- Only used by development team

### Preview Channel  
- For internal testing and QA
- More stable than development
- Used by internal testers and stakeholders

### Production Channel
- For live users
- Most stable, thoroughly tested updates
- Used by all end users

## 📊 Monitoring & Analytics

### Expo Dashboard
- View update adoption rates
- Monitor deployment status
- Track user engagement
- See error reports

### App Analytics
```javascript
// Check current update info
import * as Updates from 'expo-updates';

console.log('Update ID:', Updates.updateId);
console.log('Channel:', Updates.channel);
console.log('Runtime Version:', Updates.runtimeVersion);
```

## 🔧 Configuration Files

### app.json - Main App Configuration
```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/[your-project-id]",
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 30000,
      "enabled": true
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

### eas.json - Build & Update Configuration
```json
{
  "build": {
    "production": {
      "channel": "production",
      "autoIncrement": true
    }
  }
}
```

## 🚨 Troubleshooting

### Common Issues

**Update Not Appearing**
```bash
# Clear local cache
expo start --clear

# Check channel configuration
eas channel:list

# Verify project ID in app.json
```

**Build Failures**
```bash
# Clear EAS cache
eas build --clear-cache

# Check dependencies
npm audit fix
```

**Update Stuck**
```bash
# Force app restart
# In app: Settings → Force Restart
# Or reinstall app for testing
```

### Debug Commands
```bash
# Check update status
eas update:list --branch production

# View channel information  
eas channel:view production

# Check build status
eas build:list --platform android
```

## 📈 Best Practices

### 1. Update Frequency
- **Critical Bug Fixes**: Deploy immediately
- **Feature Updates**: Weekly/bi-weekly schedule
- **Major Releases**: Monthly with thorough testing

### 2. Testing Strategy
```bash
# 1. Test locally
npm start

# 2. Deploy to preview
node scripts/deploy-mobile-update.js preview "Testing XYZ"

# 3. Internal testing (24-48 hours)

# 4. Deploy to production
node scripts/deploy-mobile-update.js production "Release XYZ"
```

### 3. Rollback Strategy
```bash
# If issues arise, deploy previous working version
eas update --branch production --message "Rollback to stable version"
```

### 4. Version Management
- Automatic version bumping included in deployment script
- Semantic versioning (1.0.0 → 1.0.1 → 1.0.2)
- Clear commit messages for tracking

## 🎉 Success Metrics

After setup, you'll achieve:
- ⚡ **Sub-minute deployments** (vs hours for app store)
- 🎯 **100% deployment control** (vs app store approval)
- 📱 **Automatic user updates** (vs manual downloads)
- 🔄 **Instant bug fixes** (vs waiting for store approval)
- 📊 **Real-time adoption tracking** (vs delayed store analytics)

## 🆘 Support

### Getting Help
1. Check Expo documentation: https://docs.expo.dev/
2. Review EAS Update docs: https://docs.expo.dev/eas-update/
3. Expo Discord community: https://discord.gg/expo
4. Check project issues and logs in Expo dashboard

### Emergency Procedures
- **Critical Bug**: Deploy hotfix immediately to production
- **App Broken**: Rollback to last known good version
- **Store Rejection**: Use OTA updates to fix issues quickly

---

## 🎯 Quick Start Summary

1. **One-time setup**: Configure Expo, build APK, submit to stores
2. **Daily workflow**: Make changes → Deploy OTA update → Users get updates automatically
3. **Result**: No more APK regeneration for JavaScript changes!

Your mobile app now supports continuous deployment with automatic OTA updates! 🚀