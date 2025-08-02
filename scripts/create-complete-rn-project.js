#!/usr/bin/env node

/**
 * Create Complete React Native CLI Project for Android Studio
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function execCommand(command, cwd = process.cwd()) {
  try {
    log(`Executing: ${command}`, 'blue');
    const result = execSync(command, { 
      stdio: 'inherit',
      cwd
    });
    return result;
  } catch (error) {
    log(`Command failed: ${command}`, 'red');
    log(`Error: ${error.message}`, 'red');
    throw error;
  }
}

function createCompleteProject() {
  const projectDir = path.join(__dirname, '../complete-rn-project');
  
  // Clean existing directory
  if (fs.existsSync(projectDir)) {
    log('Removing existing project directory...', 'yellow');
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
  
  fs.mkdirSync(projectDir, { recursive: true });
  
  log('Creating complete React Native CLI project...', 'magenta');
  
  // Create React Native project
  execCommand(`npx react-native@latest init ProFieldManagerMobile --version 0.72.6`, projectDir);
  
  const rnProjectDir = path.join(projectDir, 'ProFieldManagerMobile');
  
  // Verify Android folder exists
  const androidDir = path.join(rnProjectDir, 'android');
  if (fs.existsSync(androidDir)) {
    log('✅ Android folder structure created successfully', 'green');
  } else {
    throw new Error('❌ Android folder not created - React Native init failed');
  }
  
  // Update package.json with field service dependencies
  const packageJsonPath = path.join(rnProjectDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Add field service specific dependencies
  packageJson.dependencies = {
    ...packageJson.dependencies,
    '@react-navigation/native': '^6.1.9',
    '@react-navigation/stack': '^6.3.20',
    '@react-navigation/bottom-tabs': '^6.5.11',
    'react-native-screens': '^3.27.0',
    'react-native-safe-area-context': '^4.7.4',
    'react-native-gesture-handler': '^2.13.4',
    'react-native-reanimated': '^3.5.4',
    '@tanstack/react-query': '^5.8.4',
    'axios': '^1.6.0',
    'react-native-vector-icons': '^10.0.2',
    '@react-native-async-storage/async-storage': '^1.19.5',
    '@react-native-geolocation/geolocation': '^3.1.0',
    'react-native-device-info': '^10.11.0',
    'react-native-permissions': '^3.10.1',
    'react-native-image-picker': '^7.0.3',
    'react-native-fs': '^2.20.0',
    'react-native-maps': '^1.8.0',
    'react-native-svg': '^13.14.0',
    'react-native-modal': '^13.0.1',
    'react-native-paper': '^5.11.6',
    'react-native-elements': '^3.4.3'
  };
  
  // Add build scripts
  packageJson.scripts = {
    ...packageJson.scripts,
    'build:android:debug': 'cd android && ./gradlew assembleDebug',
    'build:android:release': 'cd android && ./gradlew assembleRelease',
    'clean:android': 'cd android && ./gradlew clean',
    'install:android': 'react-native run-android'
  };
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  // Install dependencies
  log('Installing dependencies...', 'blue');
  execCommand('npm install', rnProjectDir);
  
  // Update Android configuration for field service app
  updateAndroidConfig(rnProjectDir);
  
  // Create field service specific components
  createFieldServiceComponents(rnProjectDir);
  
  log('✅ Complete React Native project created successfully!', 'green');
  log(`📁 Project location: ${rnProjectDir}`, 'cyan');
  
  return rnProjectDir;
}

function updateAndroidConfig(projectDir) {
  log('Configuring Android for field service app...', 'blue');
  
  // Update app build.gradle
  const buildGradlePath = path.join(projectDir, 'android/app/build.gradle');
  let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
  
  // Update application ID and app details
  buildGradle = buildGradle.replace(
    /applicationId "com\.profieldmanagermobile"/g,
    'applicationId "com.profieldmanager.app"'
  );
  
  // Add version details
  buildGradle = buildGradle.replace(
    /versionCode 1/g,
    'versionCode 1'
  );
  
  buildGradle = buildGradle.replace(
    /versionName "1\.0"/g,
    'versionName "1.0.0"'
  );
  
  fs.writeFileSync(buildGradlePath, buildGradle);
  
  // Update AndroidManifest.xml for GPS and camera permissions
  const manifestPath = path.join(projectDir, 'android/app/src/main/AndroidManifest.xml');
  let manifest = fs.readFileSync(manifestPath, 'utf8');
  
  // Add permissions
  const permissions = `
    <!-- Location permissions for GPS tracking -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    
    <!-- Camera permissions for photo capture -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    
    <!-- Network permissions for API calls -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Background location for GPS tracking -->
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />`;
  
  manifest = manifest.replace(
    '<uses-permission android:name="android.permission.INTERNET" />',
    permissions
  );
  
  fs.writeFileSync(manifestPath, manifest);
  
  // Update strings.xml
  const stringsPath = path.join(projectDir, 'android/app/src/main/res/values/strings.xml');
  const strings = `<resources>
    <string name="app_name">Pro Field Manager</string>
</resources>`;
  fs.writeFileSync(stringsPath, strings);
}

function createFieldServiceComponents(projectDir) {
  log('Creating field service components...', 'blue');
  
  const srcDir = path.join(projectDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });
  
  // Create directory structure
  const dirs = [
    'src/components',
    'src/screens',
    'src/services',
    'src/navigation',
    'src/utils',
    'src/config'
  ];
  
  dirs.forEach(dir => {
    fs.mkdirSync(path.join(projectDir, dir), { recursive: true });
  });
  
  // Create API service
  const apiService = `// src/services/api.js
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
  
  get(endpoint) { return this.request(endpoint); }
  post(endpoint, data) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) }); }
  put(endpoint, data) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) }); }
  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
}

export const apiService = new ApiService();`;
  
  fs.writeFileSync(path.join(projectDir, 'src/services/api.js'), apiService);
  
  // Create GPS service
  const gpsService = `// src/services/gps.js
import Geolocation from '@react-native-geolocation/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';
import { apiService } from './api';

class GpsService {
  async requestLocationPermission() {
    if (Platform.OS === 'ios') return true;
    
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Access Required',
          message: 'Pro Field Manager needs location access for GPS tracking.',
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
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  }
  
  async trackLocation() {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) throw new Error('Location permission denied');
      
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
}

export const gpsService = new GpsService();`;
  
  fs.writeFileSync(path.join(projectDir, 'src/services/gps.js'), gpsService);
  
  // Update App.js with field service structure
  const appJs = `import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { gpsService } from './src/services/gps';

const App = () => {
  const handleGpsTest = async () => {
    try {
      const position = await gpsService.trackLocation();
      Alert.alert('GPS Success', \`Location: \${position.coords.latitude}, \${position.coords.longitude}\`);
    } catch (error) {
      Alert.alert('GPS Error', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Pro Field Manager</Text>
          <Text style={styles.subtitle}>Mobile Field Service Management</Text>
        </View>
        
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Field Service Features</Text>
            <Text style={styles.feature}>📋 Job Management & Scheduling</Text>
            <Text style={styles.feature}>💰 Invoicing & Expense Tracking</Text>
            <Text style={styles.feature}>📍 GPS Tracking & Time Clock</Text>
            <Text style={styles.feature}>👥 Team Communication</Text>
            <Text style={styles.feature}>📊 Real-time Analytics</Text>
          </View>
          
          <TouchableOpacity style={styles.button} onPress={handleGpsTest}>
            <Text style={styles.buttonText}>Test GPS Tracking</Text>
          </TouchableOpacity>
          
          <View style={styles.info}>
            <Text style={styles.infoText}>
              This is your complete React Native CLI project ready for Android Studio.
              The /android folder contains all necessary Gradle files for APK generation.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  feature: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  infoText: {
    color: '#2e7d32',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default App;`;
  
  fs.writeFileSync(path.join(projectDir, 'App.js'), appJs);
}

// Run the creation process
createCompleteProject()
  .then(projectPath => {
    log('\n🎉 Complete React Native CLI project created!', 'green');
    log(`📁 Project path: ${projectPath}`, 'cyan');
    log('\n📋 Next steps:', 'yellow');
    log('1. Open Android Studio', 'cyan');
    log('2. Open the android/ folder in the project', 'cyan');
    log('3. Build → Build Bundle(s)/APK(s) → Build APK(s)', 'cyan');
    log('4. Your APK will be generated successfully!', 'cyan');
  })
  .catch(error => {
    log(`❌ Failed to create project: ${error.message}`, 'red');
    process.exit(1);
  });