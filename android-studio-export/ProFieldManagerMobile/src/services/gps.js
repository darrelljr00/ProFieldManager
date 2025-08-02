// src/services/gps.js
import Geolocation from '@react-native-geolocation/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';
import { apiService } from './api';

class GpsService {
  constructor() {
    this.watchId = null;
    this.trackingInterval = null;
  }

  async requestLocationPermission() {
    if (Platform.OS === 'ios') {
      return true; // iOS handles permissions automatically
    }
    
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Access Required',
          message: 'Pro Field Manager needs location access for GPS tracking and job management.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Permission request error:', err);
      return false;
    }
  }
  
  async requestBackgroundLocationPermission() {
    if (Platform.OS === 'ios') {
      return true;
    }
    
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        {
          title: 'Background Location Access',
          message: 'Pro Field Manager needs background location access for continuous GPS tracking.',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Background permission request error:', err);
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
      
      // Send location to server
      await apiService.post('/gps-tracking/update', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: new Date().toISOString(),
      });
      
      return position;
    } catch (error) {
      console.error('GPS tracking failed:', error);
      throw error;
    }
  }
  
  startTracking(intervalMs = 30000) {
    if (this.trackingInterval) {
      this.stopTracking();
    }
    
    this.trackingInterval = setInterval(async () => {
      try {
        await this.trackLocation();
        console.log('GPS location updated');
      } catch (error) {
        console.error('Periodic GPS tracking failed:', error);
      }
    }, intervalMs);
    
    return this.trackingInterval;
  }
  
  stopTracking() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    if (this.watchId) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
  
  watchPosition(callback, errorCallback) {
    this.watchId = Geolocation.watchPosition(
      callback,
      errorCallback,
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 1000,
        distanceFilter: 10, // Update every 10 meters
      }
    );
    
    return this.watchId;
  }
  
  async getAddressFromCoordinates(latitude, longitude) {
    // You can integrate with Google Maps Geocoding API here
    // For now, return coordinates as string
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
}

export const gpsService = new GpsService();