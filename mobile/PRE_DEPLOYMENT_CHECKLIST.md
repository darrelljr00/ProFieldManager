# Pre-Deployment Checklist for Pro Field Manager Mobile

## Essential Steps Before Building APK/IPA

### 1. Developer Account Setup ✅
- [ ] Google Play Console account ($25 one-time fee)
- [ ] Apple Developer Program account ($99/year)
- [ ] Both accounts verified and active

### 2. App Store Preparation
- [ ] App icons ready (1024x1024 for iOS, various sizes for Android)
- [ ] Screenshots taken on different device sizes
- [ ] App description written (under 4000 characters)
- [ ] Privacy policy URL available
- [ ] Support email address configured

### 3. Technical Prerequisites
- [ ] EAS CLI installed: `npm install -g @expo/eas-cli`
- [ ] Expo account created and logged in: `eas login`
- [ ] Run setup script: `./setup-deployment.sh`

### 4. Final Testing Required
- [ ] Test login with real credentials
- [ ] Test camera photo upload to Cloudinary
- [ ] Test GPS tracking functionality
- [ ] Test job management features
- [ ] Test offline capability
- [ ] Verify all API endpoints work

### 5. Build Configuration Check
- [ ] Bundle ID: `com.profieldmanager.mobile`
- [ ] App version: 1.0.0
- [ ] Build profiles configured in eas.json
- [ ] All required permissions listed in app.json

## Quick Deployment Commands

### For Testing (APK)
```bash
cd mobile
npm run build:android
```

### For App Stores
```bash
# Android (Google Play Store)
npm run build:android  # For AAB file
npm run submit:android # Auto-submit

# iOS (Apple App Store) 
npm run build:ios      # For IPA file
npm run submit:ios     # Auto-submit
```

## Post-Build Steps

### Google Play Store
1. Download AAB from EAS dashboard
2. Upload to Play Console
3. Complete store listing
4. Submit for review

### Apple App Store
1. Download IPA from EAS dashboard
2. Upload via App Store Connect
3. Complete app information
4. Submit for review

## Estimated Timeline
- **Build time**: 10-20 minutes per platform
- **Google Play review**: 1-3 days
- **Apple App Store review**: 1-7 days

## Important Notes
- The mobile app connects to your web app's API
- Ensure your web server is accessible from mobile devices
- Test with real user credentials before submission
- Both stores require privacy policies for business apps

## Support
If you encounter issues:
1. Check EAS build logs in Expo dashboard
2. Verify all dependencies are installed
3. Ensure bundle identifiers match across all config files