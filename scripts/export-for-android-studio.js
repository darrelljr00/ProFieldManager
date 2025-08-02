#!/usr/bin/env node

/**
 * Pro Field Manager - Android Studio Export Script
 * 
 * This script helps export the project for Android Studio development
 * by organizing files and providing migration instructions.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  EXPORT_DIR: path.join(__dirname, '../android-studio-export'),
  SOURCE_DIRS: [
    'client/src',
    'shared',
    'mobile/expo-app/assets'
  ],
  IMPORTANT_FILES: [
    'replit.md',
    'package.json',
    'OTA_DEPLOYMENT_GUIDE.md',
    'ANDROID_STUDIO_EXPORT_GUIDE.md'
  ]
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`Created directory: ${dirPath}`, 'green');
  }
}

function copyFileOrDirectory(source, destination) {
  try {
    if (fs.statSync(source).isDirectory()) {
      copyDirectory(source, destination);
    } else {
      const destDir = path.dirname(destination);
      createDirectory(destDir);
      fs.copyFileSync(source, destination);
      log(`Copied file: ${source} → ${destination}`, 'cyan');
    }
  } catch (error) {
    log(`Failed to copy ${source}: ${error.message}`, 'red');
  }
}

function copyDirectory(source, destination) {
  createDirectory(destination);
  const items = fs.readdirSync(source);
  
  for (const item of items) {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);
    copyFileOrDirectory(sourcePath, destPath);
  }
}

function extractBusinessLogic() {
  log('\n📋 Extracting business logic and API services...', 'blue');
  
  const businessLogicDir = path.join(CONFIG.EXPORT_DIR, 'business-logic');
  createDirectory(businessLogicDir);
  
  // Copy shared schemas and types
  const sharedSrc = 'shared';
  const sharedDest = path.join(businessLogicDir, 'shared');
  if (fs.existsSync(sharedSrc)) {
    copyDirectory(sharedSrc, sharedDest);
  }
  
  // Copy client-side business logic
  const clientSrc = 'client/src';
  const clientDest = path.join(businessLogicDir, 'client-logic');
  if (fs.existsSync(clientSrc)) {
    copyDirectory(clientSrc, clientDest);
  }
}

function extractAssets() {
  log('\n🎨 Extracting assets and media files...', 'blue');
  
  const assetsDir = path.join(CONFIG.EXPORT_DIR, 'assets');
  createDirectory(assetsDir);
  
  // Copy attached assets
  const attachedAssetsDir = 'attached_assets';
  if (fs.existsSync(attachedAssetsDir)) {
    copyDirectory(attachedAssetsDir, path.join(assetsDir, 'attached_assets'));
  }
  
  // Copy expo assets if they exist
  const expoAssetsDir = 'mobile/expo-app/assets';
  if (fs.existsSync(expoAssetsDir)) {
    copyDirectory(expoAssetsDir, path.join(assetsDir, 'expo_assets'));
  }
}

function createReactNativeBoilerplate() {
  log('\n⚛️ Creating React Native boilerplate structure...', 'blue');
  
  const rnDir = path.join(CONFIG.EXPORT_DIR, 'react-native-template');
  createDirectory(rnDir);
  
  // Create package.json for React Native project
  const packageJson = {
    name: "ProFieldManagerMobile",
    version: "1.0.0",
    private: true,
    scripts: {
      "android": "react-native run-android",
      "ios": "react-native run-ios",
      "start": "react-native start",
      "test": "jest",
      "lint": "eslint .",
      "build:android": "cd android && ./gradlew assembleRelease",
      "build:debug": "cd android && ./gradlew assembleDebug"
    },
    dependencies: {
      "react": "18.2.0",
      "react-native": "0.72.6",
      "@react-navigation/native": "^6.1.9",
      "@react-navigation/stack": "^6.3.20",
      "react-native-screens": "^3.27.0",
      "react-native-safe-area-context": "^4.7.4",
      "react-native-gesture-handler": "^2.13.4",
      "react-native-reanimated": "^3.5.4",
      "@tanstack/react-query": "^5.8.4",
      "axios": "^1.6.0",
      "react-native-vector-icons": "^10.0.2",
      "@react-native-async-storage/async-storage": "^1.19.5",
      "@react-native-geolocation/geolocation": "^3.1.0",
      "react-native-device-info": "^10.11.0",
      "react-native-permissions": "^3.10.1",
      "react-native-image-picker": "^7.0.3",
      "react-native-fs": "^2.20.0"
    },
    devDependencies: {
      "@babel/core": "^7.20.0",
      "@babel/preset-env": "^7.20.0",
      "@babel/runtime": "^7.20.0",
      "@react-native/eslint-config": "^0.72.2",
      "@react-native/metro-config": "^0.72.11",
      "@tsconfig/react-native": "^3.0.0",
      "@types/react": "^18.0.24",
      "@types/react-test-renderer": "^18.0.0",
      "babel-jest": "^29.2.1",
      "eslint": "^8.19.0",
      "jest": "^29.2.1",
      "metro-react-native-babel-preset": "0.76.8",
      "prettier": "^2.4.1",
      "react-test-renderer": "18.2.0",
      "typescript": "4.8.4"
    },
    jest: {
      preset: "react-native"
    }
  };
  
  fs.writeFileSync(
    path.join(rnDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Create basic App.js template
  const appJsTemplate = `import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const App = () => {
  return (
    <SafeAreaView style={styles.backgroundStyle}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.backgroundStyle}>
        <View style={styles.container}>
          <Text style={styles.title}>Pro Field Manager</Text>
          <Text style={styles.subtitle}>Mobile App</Text>
          <Text style={styles.description}>
            Welcome to Pro Field Manager mobile app. This is the starting point
            for your React Native implementation.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  backgroundStyle: {
    backgroundColor: '#fff',
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default App;
`;
  
  fs.writeFileSync(path.join(rnDir, 'App.js'), appJsTemplate);
  
  // Create src directory structure
  const srcDirs = [
    'src/components',
    'src/screens',
    'src/services',
    'src/config',
    'src/utils',
    'src/types',
    'src/navigation'
  ];
  
  srcDirs.forEach(dir => {
    createDirectory(path.join(rnDir, dir));
    fs.writeFileSync(
      path.join(rnDir, dir, '.gitkeep'),
      '# This file keeps the directory in version control\n'
    );
  });
}

function createMigrationGuides() {
  log('\n📚 Creating migration guides and templates...', 'blue');
  
  const guidesDir = path.join(CONFIG.EXPORT_DIR, 'migration-guides');
  createDirectory(guidesDir);
  
  // API service template
  const apiServiceTemplate = `// src/services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://your-replit-app.replit.dev/api';

class ApiService {
  async getAuthToken() {
    return await AsyncStorage.getItem('auth_token');
  }
  
  async request(endpoint, options = {}) {
    const token = await this.getAuthToken();
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': \`Bearer \${token}\` }),
        ...options.headers,
      },
    };
    
    const response = await fetch(\`\${API_BASE_URL}\${endpoint}\`, config);
    
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    
    return response.json();
  }
  
  get(endpoint) {
    return this.request(endpoint);
  }
  
  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  
  delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();
`;
  
  fs.writeFileSync(
    path.join(guidesDir, 'api-service-template.js'),
    apiServiceTemplate
  );
  
  // GPS service template
  const gpsServiceTemplate = `// src/services/gps.js
import Geolocation from '@react-native-geolocation/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';
import { apiService } from './api';

class GpsService {
  async requestLocationPermission() {
    if (Platform.OS === 'ios') {
      return true; // iOS handles permissions automatically
    }
    
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Access Required',
          message: 'This app needs to access your location for GPS tracking.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => resolve(position),
        error => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }
  
  async trackLocation() {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }
      
      const position = await this.getCurrentLocation();
      
      await apiService.post('/gps-tracking/update', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString(),
      });
      
      return position;
    } catch (error) {
      console.error('GPS tracking failed:', error);
      throw error;
    }
  }
  
  startTracking(intervalMs = 30000) {
    return setInterval(async () => {
      try {
        await this.trackLocation();
      } catch (error) {
        console.error('Periodic GPS tracking failed:', error);
      }
    }, intervalMs);
  }
  
  stopTracking(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
}

export const gpsService = new GpsService();
`;
  
  fs.writeFileSync(
    path.join(guidesDir, 'gps-service-template.js'),
    gpsServiceTemplate
  );
}

function copyImportantFiles() {
  log('\n📄 Copying important project files...', 'blue');
  
  CONFIG.IMPORTANT_FILES.forEach(file => {
    if (fs.existsSync(file)) {
      copyFileOrDirectory(file, path.join(CONFIG.EXPORT_DIR, path.basename(file)));
    }
  });
}

function createExportSummary() {
  log('\n📋 Creating export summary...', 'blue');
  
  const summary = `# Pro Field Manager - Android Studio Export Summary

## Export Date
${new Date().toISOString()}

## What's Included

### 1. Business Logic (/business-logic/)
- Shared schemas and types from /shared/
- Client-side logic from /client/src/
- API service patterns and data models

### 2. Assets (/assets/)
- All attached assets and media files
- Expo app assets (if available)
- Images, icons, and other resources

### 3. React Native Template (/react-native-template/)
- Complete package.json with all necessary dependencies
- Basic App.js starter template
- Organized src/ directory structure
- Ready-to-use project template

### 4. Migration Guides (/migration-guides/)
- API service template for React Native
- GPS tracking service implementation
- Authentication patterns
- Code conversion examples

### 5. Documentation
- Complete Android Studio setup guide
- Migration instructions
- APK building process
- Troubleshooting tips

## Next Steps

1. **Setup Environment**
   - Install Android Studio
   - Install React Native CLI
   - Configure Android SDK

2. **Create Project**
   \`\`\`bash
   npx react-native init ProFieldManagerMobile
   cd ProFieldManagerMobile
   \`\`\`

3. **Install Dependencies**
   \`\`\`bash
   # Copy package.json from react-native-template/
   npm install
   \`\`\`

4. **Migrate Business Logic**
   - Copy API services from business-logic/
   - Adapt UI components for React Native
   - Implement navigation structure

5. **Build APK**
   \`\`\`bash
   cd android
   ./gradlew assembleRelease
   \`\`\`

## Key Migration Points

### Web → React Native Conversions
- \`<div>\` → \`<View>\`
- \`<button>\` → \`<TouchableOpacity>\`
- CSS classes → StyleSheet objects
- localStorage → AsyncStorage
- fetch → API service with token management

### Important Dependencies
- @react-navigation/native - Navigation
- @react-native-async-storage/async-storage - Local storage
- @react-native-geolocation/geolocation - GPS tracking
- react-native-permissions - Permission management
- @tanstack/react-query - State management

## Support Resources
- Android Studio Guide: ANDROID_STUDIO_EXPORT_GUIDE.md
- React Native Docs: https://reactnative.dev/
- Migration templates in /migration-guides/

Your project is ready for Android Studio development! 🚀
`;
  
  fs.writeFileSync(path.join(CONFIG.EXPORT_DIR, 'EXPORT_SUMMARY.md'), summary);
}

function main() {
  log('📱 Pro Field Manager - Android Studio Export Tool\n', 'magenta');
  
  // Clean and create export directory
  if (fs.existsSync(CONFIG.EXPORT_DIR)) {
    log('Cleaning existing export directory...', 'yellow');
    fs.rmSync(CONFIG.EXPORT_DIR, { recursive: true, force: true });
  }
  
  createDirectory(CONFIG.EXPORT_DIR);
  
  // Run export steps
  extractBusinessLogic();
  extractAssets();
  createReactNativeBoilerplate();
  createMigrationGuides();
  copyImportantFiles();
  createExportSummary();
  
  // Final summary
  log('\n🎉 Export Complete!', 'green');
  log(`📁 Export location: ${CONFIG.EXPORT_DIR}`, 'cyan');
  log('\n📋 Next Steps:', 'yellow');
  log('1. Review EXPORT_SUMMARY.md for complete migration guide', 'cyan');
  log('2. Follow ANDROID_STUDIO_EXPORT_GUIDE.md for setup instructions', 'cyan');
  log('3. Use react-native-template/ as your project starting point', 'cyan');
  log('4. Migrate business logic from business-logic/ directory', 'cyan');
  log('5. Build your APK with Android Studio', 'cyan');
  
  log('\n💡 Pro Tip:', 'yellow');
  log('Start with the React Native template and gradually migrate features', 'cyan');
  log('Test each component as you add it to ensure compatibility', 'cyan');
  
  log('\n🚀 Your project is ready for Android Studio development!', 'green');
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  log(`❌ Uncaught Exception: ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled Rejection: ${reason}`, 'red');
  process.exit(1);
});

// Run the export
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, CONFIG };