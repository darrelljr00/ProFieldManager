# 📱 Pro Field Manager - Android Studio Export Guide

## Overview
This guide helps you export the Pro Field Manager project for local Android Studio development and manual APK generation.

## 🎯 Export Strategy

Since you're moving from Expo to React Native CLI + Android Studio, you have two main approaches:

### Option 1: React Native CLI from Scratch (Recommended)
Create a new React Native CLI project and migrate your business logic.

### Option 2: Expo Eject/Prebuild
Use Expo's prebuild to generate native Android/iOS projects.

## 🚀 Option 1: React Native CLI Setup (Recommended)

### 1. Prerequisites Installation
```bash
# Install Android Studio
# Download from: https://developer.android.com/studio

# Install Node.js (if not already installed)
# Download from: https://nodejs.org/

# Install React Native CLI
npm install -g react-native-cli

# Install Java Development Kit (JDK 11 or newer)
# For Windows: Download from Oracle or use OpenJDK
# For macOS: brew install openjdk@11
# For Linux: sudo apt install openjdk-11-jdk
```

### 2. Android Studio Configuration
```bash
# 1. Open Android Studio
# 2. Go to Tools → SDK Manager
# 3. Install Android SDK Platform 31 or newer
# 4. Install Android SDK Build-Tools
# 5. Install Android Emulator (optional, for testing)

# Set environment variables (add to ~/.bashrc or ~/.zshrc):
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### 3. Create New React Native Project
```bash
# Create new React Native project
npx react-native init ProFieldManagerMobile
cd ProFieldManagerMobile

# Install essential dependencies
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install react-native-gesture-handler react-native-reanimated
npm install @tanstack/react-query
npm install axios
npm install react-native-vector-icons
npm install react-native-permissions
npm install @react-native-geolocation/geolocation
npm install react-native-device-info
npm install react-native-fs
npm install react-native-image-picker
```

### 4. Core Business Logic Migration

#### A. API Configuration
```javascript
// src/config/api.js
const API_BASE_URL = 'https://your-replit-app.replit.dev/api';

export const apiClient = {
  get: (endpoint) => fetch(`${API_BASE_URL}${endpoint}`),
  post: (endpoint, data) => fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  // Add other HTTP methods as needed
};
```

#### B. Authentication
```javascript
// src/services/auth.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials);
    const data = await response.json();
    if (data.token) {
      await AsyncStorage.setItem('auth_token', data.token);
    }
    return data;
  },
  
  async logout() {
    await AsyncStorage.removeItem('auth_token');
  },
  
  async getToken() {
    return await AsyncStorage.getItem('auth_token');
  }
};
```

#### C. GPS Tracking
```javascript
// src/services/gps.js
import Geolocation from '@react-native-geolocation/geolocation';

export const gpsService = {
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => resolve(position),
        error => reject(error),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  },
  
  async trackLocation() {
    try {
      const position = await this.getCurrentLocation();
      await apiClient.post('/gps-tracking/update', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('GPS tracking failed:', error);
    }
  }
};
```

### 5. Project Structure
```
ProFieldManagerMobile/
├── android/                 # Android native code
├── ios/                     # iOS native code (if needed)
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/             # Screen components
│   ├── services/            # API and business logic
│   ├── config/              # Configuration files
│   ├── utils/               # Utility functions
│   └── types/               # TypeScript type definitions
├── App.js                   # Main app component
└── package.json
```

## 🚀 Option 2: Expo Prebuild (Alternative)

### 1. Expo Prebuild Setup
```bash
# Navigate to your expo app directory
cd mobile/expo-app

# Install latest Expo CLI
npm install -g @expo/cli

# Generate native projects
npx expo prebuild --platform android

# This creates an 'android' folder with native Android project
```

### 2. Open in Android Studio
```bash
# Open the android folder in Android Studio
# File → Open → Navigate to mobile/expo-app/android
```

## 📱 APK Generation Process

### 1. Build Debug APK
```bash
# Navigate to android folder
cd android

# Build debug APK
./gradlew assembleDebug

# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

### 2. Build Release APK
```bash
# Generate signing key (one-time setup)
keytool -genkey -v -keystore pro-field-manager-key.keystore -alias pro-field-manager -keyalg RSA -keysize 2048 -validity 10000

# Configure signing in android/app/build.gradle
# Add signing config section

# Build release APK
./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/app-release.apk
```

### 3. Android Studio Build
```bash
# 1. Open Android Studio
# 2. Open your project folder
# 3. Go to Build → Build Bundle(s)/APK(s) → Build APK(s)
# 4. Wait for build completion
# 5. Click "locate" to find the generated APK
```

## 📋 Files to Export from Replit

### 1. Core Business Logic
- All API service files from your React web app
- Authentication logic
- GPS tracking implementation
- Business rules and validation

### 2. UI Components (Convert to React Native)
- Form components
- List components
- Navigation structure
- Styling (convert CSS to React Native styles)

### 3. Configuration Files
- API endpoints
- Environment variables
- App configuration

### 4. Assets
- Images, icons, logos
- Sound files
- Any other media assets

## 🔧 Key Migration Steps

### 1. Download Project Files
```bash
# Option A: Git clone (if you have Git setup)
git clone [your-replit-git-url]

# Option B: Download ZIP
# Use Replit's export feature or download individual files

# Option C: Manual file copy
# Copy all relevant source files to your local machine
```

### 2. Adapt Web Components to React Native
```javascript
// Web (React) to React Native conversion examples:

// Web div → React Native View
<div style={{...}}> → <View style={{...}}>

// Web button → React Native TouchableOpacity/Pressable
<button onClick={...}> → <TouchableOpacity onPress={...}>

// Web CSS → React Native StyleSheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  }
});
```

### 3. Replace Web-Specific Libraries
```bash
# Web → React Native equivalents:
# fetch → @react-native-async-storage/async-storage for local storage
# localStorage → AsyncStorage
# window.location → react-navigation
# CSS files → StyleSheet.create()
```

## 🎯 Manual APK Benefits

### Advantages
- Complete control over build process
- No Expo build limitations
- Direct access to native Android features
- Custom native modules support
- Smaller APK size (no Expo overhead)

### Considerations
- More setup complexity
- Manual dependency management
- Need Android development knowledge
- Manual app store submission process

## 📊 Build Configuration

### Release APK Configuration
```gradle
// android/app/build.gradle
android {
    compileSdkVersion 33
    buildToolsVersion "33.0.0"
    
    defaultConfig {
        applicationId "com.profieldmanager.app"
        minSdkVersion 21
        targetSdkVersion 33
        versionCode 1
        versionName "1.0.0"
    }
    
    signingConfigs {
        release {
            storeFile file('pro-field-manager-key.keystore')
            storePassword 'your-store-password'
            keyAlias 'pro-field-manager'
            keyPassword 'your-key-password'
        }
    }
    
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
}
```

## 🆘 Troubleshooting

### Common Issues
1. **Build Errors**: Check Android SDK installation and environment variables
2. **Permission Issues**: Update Android permissions in AndroidManifest.xml
3. **Dependency Conflicts**: Use exact versions and check compatibility
4. **Signing Issues**: Verify keystore path and credentials

### Support Resources
- React Native Documentation: https://reactnative.dev/
- Android Developer Docs: https://developer.android.com/
- Stack Overflow React Native tag
- React Native Community Discord

## 🎉 Next Steps

1. **Setup Environment**: Install Android Studio and React Native CLI
2. **Create Project**: Initialize new React Native project
3. **Migrate Logic**: Copy and adapt your business logic
4. **Test Locally**: Use Android emulator for testing
5. **Build APK**: Generate release APK for distribution
6. **Deploy**: Upload to Google Play Store or distribute directly

Your project is ready for Android Studio migration! This approach gives you complete control over the build process and removes all Expo limitations.