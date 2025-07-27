import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoText}>PFM</Text>
        </View>
        <Text style={styles.appTitle}>Pro Field Manager</Text>
      </View>
      
      <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  loader: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
});