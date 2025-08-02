import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { gpsService } from './src/services/gps';
import { apiService } from './src/services/api';

function App(): React.JSX.Element {
  const [isGpsTracking, setIsGpsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Request permissions on app start
    requestInitialPermissions();
  }, []);

  const requestInitialPermissions = async () => {
    try {
      await gpsService.requestLocationPermission();
      await gpsService.requestBackgroundLocationPermission();
    } catch (error) {
      console.error('Permission request failed:', error);
    }
  };

  const handleGpsTest = async () => {
    setIsLoading(true);
    try {
      const position = await gpsService.trackLocation();
      setCurrentLocation(position);
      Alert.alert(
        'GPS Success', 
        `Location: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}\nAccuracy: ${position.coords.accuracy}m`
      );
    } catch (error) {
      Alert.alert('GPS Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGpsTracking = () => {
    if (isGpsTracking) {
      gpsService.stopTracking();
      setIsGpsTracking(false);
      Alert.alert('GPS Tracking', 'Tracking stopped');
    } else {
      gpsService.startTracking(30000); // Track every 30 seconds
      setIsGpsTracking(true);
      Alert.alert('GPS Tracking', 'Tracking started');
    }
  };

  const testApiConnection = async () => {
    setIsLoading(true);
    try {
      // Test API connection (you may need to adjust this endpoint)
      const response = await apiService.get('/auth/me');
      Alert.alert('API Success', 'Connected to Pro Field Manager server');
    } catch (error) {
      Alert.alert('API Error', `Connection failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.container}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Pro Field Manager</Text>
          <Text style={styles.subtitle}>Mobile Field Service Management</Text>
          <Text style={styles.version}>Version 1.0.0 - React Native CLI</Text>
        </View>
        
        <View style={styles.content}>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏗️ Complete Android Studio Project</Text>
            <Text style={styles.description}>
              This React Native CLI project includes the complete /android folder 
              with all Gradle files necessary for APK generation in Android Studio.
            </Text>
            <View style={styles.checklistItem}>
              <Text style={styles.checkmark}>✅</Text>
              <Text style={styles.checklistText}>Complete /android folder structure</Text>
            </View>
            <View style={styles.checklistItem}>
              <Text style={styles.checkmark}>✅</Text>
              <Text style={styles.checklistText}>build.gradle and settings.gradle files</Text>
            </View>
            <View style={styles.checklistItem}>
              <Text style={styles.checkmark}>✅</Text>
              <Text style={styles.checklistText}>Android manifest with permissions</Text>
            </View>
            <View style={styles.checklistItem}>
              <Text style={styles.checkmark}>✅</Text>
              <Text style={styles.checklistText}>Field service dependencies included</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📱 Field Service Features</Text>
            <Text style={styles.feature}>📋 Job Management & Scheduling</Text>
            <Text style={styles.feature}>💰 Invoicing & Expense Tracking</Text>
            <Text style={styles.feature}>📍 GPS Tracking & Time Clock</Text>
            <Text style={styles.feature}>👥 Team Communication</Text>
            <Text style={styles.feature}>📊 Real-time Analytics</Text>
            <Text style={styles.feature}>📷 Photo Capture & File Upload</Text>
            <Text style={styles.feature}>🗺️ Interactive Maps</Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]} 
              onPress={handleGpsTest}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>📍 Test GPS Location</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, isGpsTracking ? styles.stopButton : styles.successButton]} 
              onPress={toggleGpsTracking}
            >
              <Text style={styles.buttonText}>
                {isGpsTracking ? '⏹️ Stop Tracking' : '▶️ Start GPS Tracking'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={testApiConnection}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>🌐 Test API Connection</Text>
            </TouchableOpacity>
          </View>
          
          {currentLocation && (
            <View style={styles.locationCard}>
              <Text style={styles.cardTitle}>📍 Current Location</Text>
              <Text style={styles.locationText}>
                Lat: {currentLocation.coords.latitude.toFixed(6)}
              </Text>
              <Text style={styles.locationText}>
                Lng: {currentLocation.coords.longitude.toFixed(6)}
              </Text>
              <Text style={styles.locationText}>
                Accuracy: {currentLocation.coords.accuracy}m
              </Text>
              <Text style={styles.locationText}>
                Time: {new Date(currentLocation.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          )}
          
          <View style={styles.info}>
            <Text style={styles.infoTitle}>🚀 Ready for Android Studio</Text>
            <Text style={styles.infoText}>
              1. Open Android Studio{'\n'}
              2. Open the /android folder from this project{'\n'}
              3. Build → Build Bundle(s)/APK(s) → Build APK(s){'\n'}
              4. Your APK will be generated successfully!
            </Text>
          </View>
          
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  version: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
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
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkmark: {
    fontSize: 16,
    marginRight: 8,
  },
  checklistText: {
    fontSize: 14,
    color: '#333',
  },
  feature: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  successButton: {
    backgroundColor: '#28a745',
  },
  stopButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  locationCard: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  info: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  infoText: {
    color: '#856404',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default App;