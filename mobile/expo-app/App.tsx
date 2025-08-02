import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  StatusBar,
  Platform,
  SafeAreaView
} from 'react-native';
import * as Updates from 'expo-updates';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

interface UpdateState {
  isChecking: boolean;
  isDownloading: boolean;
  updateAvailable: boolean;
  error: string | null;
}

export default function App() {
  const [updateState, setUpdateState] = useState<UpdateState>({
    isChecking: false,
    isDownloading: false,
    updateAvailable: false,
    error: null
  });

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      // Skip update checks in development mode
      if (__DEV__) {
        console.log('🔧 Development mode - skipping update check');
        return;
      }

      setUpdateState(prev => ({ ...prev, isChecking: true, error: null }));

      // Check for available updates
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        console.log('📦 Update available, downloading...');
        setUpdateState(prev => ({ 
          ...prev, 
          isChecking: false, 
          isDownloading: true,
          updateAvailable: true 
        }));

        // Download the update
        await Updates.fetchUpdateAsync();
        
        setUpdateState(prev => ({ ...prev, isDownloading: false }));
        
        // Show update notification
        showUpdateAlert();
      } else {
        console.log('✅ App is up to date');
        setUpdateState(prev => ({ ...prev, isChecking: false }));
      }
    } catch (error) {
      console.error('❌ Update check failed:', error);
      setUpdateState(prev => ({ 
        ...prev, 
        isChecking: false, 
        isDownloading: false,
        error: error instanceof Error ? error.message : 'Update check failed'
      }));
    }
  };

  const showUpdateAlert = () => {
    Alert.alert(
      '🚀 Update Ready!',
      'A new version of Pro Field Manager is ready. Restart the app to apply the latest features and improvements.',
      [
        { 
          text: 'Later', 
          style: 'cancel',
          onPress: () => console.log('User chose to update later')
        },
        { 
          text: 'Restart Now', 
          style: 'default',
          onPress: restartApp 
        }
      ],
      { cancelable: false }
    );
  };

  const restartApp = async () => {
    try {
      console.log('🔄 Restarting app to apply update...');
      await Updates.reloadAsync();
    } catch (error) {
      console.error('❌ Restart failed:', error);
      Alert.alert(
        'Restart Failed',
        'Unable to restart the app. Please close and reopen the app manually.',
        [{ text: 'OK' }]
      );
    }
  };

  const manualUpdateCheck = async () => {
    if (updateState.isChecking || updateState.isDownloading) return;
    await checkForUpdates();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Pro Field Manager</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.welcomeText}>
          Welcome to your field service management platform
        </Text>

        {/* Update Status Indicator */}
        <View style={styles.updateContainer}>
          {updateState.isChecking && (
            <View style={styles.updateStatus}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.updateText}>Checking for updates...</Text>
            </View>
          )}

          {updateState.isDownloading && (
            <View style={styles.updateStatus}>
              <ActivityIndicator size="small" color="#FF9500" />
              <Text style={styles.updateText}>Downloading update...</Text>
            </View>
          )}

          {updateState.updateAvailable && !updateState.isDownloading && (
            <View style={[styles.updateStatus, styles.updateReady]}>
              <Text style={styles.updateReadyText}>
                ✨ Update ready! Restart to apply changes.
              </Text>
            </View>
          )}

          {updateState.error && (
            <View style={[styles.updateStatus, styles.updateError]}>
              <Text style={styles.errorText}>
                ⚠️ Update check failed: {updateState.error}
              </Text>
            </View>
          )}

          {!updateState.isChecking && !updateState.isDownloading && !updateState.updateAvailable && !updateState.error && (
            <View style={styles.updateStatus}>
              <Text style={styles.upToDateText}>✅ App is up to date</Text>
            </View>
          )}
        </View>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Key Features:</Text>
          <Text style={styles.feature}>📋 Job Management & Scheduling</Text>
          <Text style={styles.feature}>💰 Invoicing & Expense Tracking</Text>
          <Text style={styles.feature}>📍 GPS Tracking & Time Clock</Text>
          <Text style={styles.feature}>👥 Team Communication</Text>
          <Text style={styles.feature}>📊 Real-time Analytics</Text>
          <Text style={styles.feature}>🔄 Automatic Updates (OTA)</Text>
        </View>

        {/* Manual Update Button */}
        <View style={styles.buttonContainer}>
          <Text 
            style={[
              styles.button, 
              (updateState.isChecking || updateState.isDownloading) && styles.buttonDisabled
            ]}
            onPress={manualUpdateCheck}
          >
            🔄 Check for Updates
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by Replit & Expo OTA Updates
        </Text>
        <Text style={styles.buildInfo}>
          Build: {Updates.manifest?.revisionId?.substring(0, 8) || 'dev'} | 
          Channel: {Updates.channel || 'development'}
        </Text>
      </View>
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
  version: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
    marginBottom: 30,
    lineHeight: 22,
  },
  updateContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  updateStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  updateReady: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  updateReadyText: {
    color: '#2e7d32',
    fontWeight: '500',
    textAlign: 'center',
  },
  updateError: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 12,
    textAlign: 'center',
  },
  upToDateText: {
    color: '#4caf50',
    fontWeight: '500',
    textAlign: 'center',
  },
  featuresContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  featuresTitle: {
    fontSize: 16,
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
  buttonContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    color: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    overflow: 'hidden',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  footerText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  buildInfo: {
    fontSize: 10,
    color: '#aaa',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});