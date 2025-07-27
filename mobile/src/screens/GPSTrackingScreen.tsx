import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Card, Button, Switch, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { ApiService } from '../services/ApiService';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  address?: string;
}

export default function GPSTrackingScreen({ navigation }: any) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [trackingHistory, setTrackingHistory] = useState<LocationData[]>([]);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isTracking && hasPermission) {
      interval = setInterval(updateLocation, 30000); // Update every 30 seconds
      updateLocation(); // Initial update
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking, hasPermission]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status === 'granted') {
        const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus.status !== 'granted') {
          Alert.alert(
            'Background Location',
            'For continuous tracking, please enable background location access in settings.'
          );
        }
      }
    } catch (error) {
      console.error('Permission request error:', error);
      setHasPermission(false);
    }
  };

  const updateLocation = async () => {
    if (!hasPermission) return;

    try {
      setIsLoading(true);
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: new Date().toISOString(),
      };

      // Get reverse geocoding
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        });

        if (reverseGeocode.length > 0) {
          const address = reverseGeocode[0];
          locationData.address = `${address.street || ''} ${address.city || ''}, ${address.region || ''} ${address.postalCode || ''}`.trim();
        }
      } catch (geoError) {
        console.error('Reverse geocoding error:', geoError);
      }

      setCurrentLocation(locationData);
      setTrackingHistory(prev => [...prev.slice(-49), locationData]); // Keep last 50 locations

      // Send to server
      if (isTracking) {
        await sendLocationToServer(locationData);
      }
    } catch (error) {
      console.error('Location update error:', error);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setIsLoading(false);
    }
  };

  const sendLocationToServer = async (locationData: LocationData) => {
    try {
      await ApiService.post('/api/gps/location', locationData);
    } catch (error) {
      console.error('Failed to send location to server:', error);
    }
  };

  const toggleTracking = async () => {
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Location permission is required for GPS tracking');
      return;
    }

    if (isTracking) {
      setIsTracking(false);
      Alert.alert('GPS Tracking', 'Location tracking has been stopped');
    } else {
      setIsTracking(true);
      Alert.alert('GPS Tracking', 'Location tracking has been started');
      await updateLocation();
    }
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const formatAccuracy = (accuracy: number) => {
    return `±${Math.round(accuracy)}m`;
  };

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.permissionText}>Requesting location permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Icon name="map-marker-off" size={64} color="#dc2626" />
        <Text style={styles.permissionTitle}>Location Access Required</Text>
        <Text style={styles.permissionText}>
          Please enable location permissions in your device settings to use GPS tracking.
        </Text>
        <Button
          mode="contained"
          onPress={requestLocationPermission}
          style={styles.permissionButton}
        >
          Grant Permission
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.controlCard}>
        <Card.Content>
          <View style={styles.controlHeader}>
            <Icon name="map-marker" size={32} color="#2563eb" />
            <Text style={styles.controlTitle}>GPS Tracking</Text>
            {isLoading && <ActivityIndicator size="small" />}
          </View>

          <View style={styles.trackingToggle}>
            <Text style={styles.toggleLabel}>
              {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
            </Text>
            <Switch
              value={isTracking}
              onValueChange={toggleTracking}
              disabled={isLoading}
            />
          </View>

          {currentLocation && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationTitle}>Current Location:</Text>
              <Text style={styles.coordinates}>
                {formatCoordinates(currentLocation.latitude, currentLocation.longitude)}
              </Text>
              <Text style={styles.accuracy}>
                Accuracy: {formatAccuracy(currentLocation.accuracy)}
              </Text>
              {currentLocation.address && (
                <Text style={styles.address}>{currentLocation.address}</Text>
              )}
              <Text style={styles.timestamp}>
                Updated: {new Date(currentLocation.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {currentLocation && (
        <Card style={styles.mapCard}>
          <Card.Content style={styles.mapContent}>
            <MapView
              style={styles.map}
              region={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
              followsUserLocation={isTracking}
            >
              <Marker
                coordinate={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }}
                title="Current Location"
                description={currentLocation.address || 'Your current position'}
              />
              
              {trackingHistory.map((location, index) => (
                <Marker
                  key={index}
                  coordinate={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }}
                  pinColor="orange"
                  title={`History ${index + 1}`}
                  description={new Date(location.timestamp).toLocaleTimeString()}
                />
              ))}
            </MapView>
          </Card.Content>
        </Card>
      )}

      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          icon="refresh"
          onPress={updateLocation}
          style={styles.actionButton}
          disabled={isLoading || !hasPermission}
        >
          Refresh Location
        </Button>
        <Button
          mode="contained"
          icon="navigation"
          onPress={() => navigation.navigate('Jobs')}
          style={styles.actionButton}
        >
          View Jobs
        </Button>
      </View>

      {isTracking && (
        <Card style={styles.warningCard}>
          <Card.Content style={styles.warningContent}>
            <Icon name="information" size={20} color="#ca8a04" />
            <Text style={styles.warningText}>
              GPS tracking is active. Location updates are being sent every 30 seconds.
              This may affect battery life.
            </Text>
          </Card.Content>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  permissionButton: {
    paddingHorizontal: 24,
  },
  controlCard: {
    marginBottom: 16,
    elevation: 2,
  },
  controlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 12,
    flex: 1,
  },
  trackingToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  locationInfo: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 8,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  coordinates: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#2563eb',
    marginBottom: 4,
  },
  accuracy: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 12,
    color: '#94a3b8',
  },
  mapCard: {
    flex: 1,
    marginBottom: 16,
    elevation: 2,
  },
  mapContent: {
    padding: 0,
    height: 300,
  },
  map: {
    flex: 1,
    borderRadius: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 0.48,
  },
  warningCard: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde047',
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningText: {
    fontSize: 14,
    color: '#ca8a04',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
});