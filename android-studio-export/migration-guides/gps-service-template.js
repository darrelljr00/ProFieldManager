// src/services/gps.js
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
