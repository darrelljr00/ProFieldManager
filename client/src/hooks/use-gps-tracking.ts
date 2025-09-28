import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { isMobileDevice } from '@/utils/mobile-fixes';

interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface Geofence {
  id: number;
  projectId: number;
  centerLatitude: number;
  centerLongitude: number;
  radius: number;
  address: string;
  isActive: boolean;
}

export function useGPSTracking() {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [lastPosition, setLastPosition] = useState<GPSPosition | null>(null);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [currentJobSite, setCurrentJobSite] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const geofenceCheckRef = useRef<Set<number>>(new Set()); // Track which geofences user is currently inside
  
  const MIN_UPDATE_INTERVAL = 60000; // 1 minute between updates
  const MIN_DISTANCE_THRESHOLD = 50; // 50 meters minimum movement

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Load active geofences for the user's organization
  const loadGeofences = async () => {
    try {
      const response = await apiRequest('GET', '/api/geofences');
      setGeofences(response.geofences || []);
    } catch (error) {
      console.warn('Failed to load geofences:', error);
    }
  };

  // Check if user is within any geofences and trigger arrival/departure events
  const checkGeofences = async (position: GPSPosition) => {
    const currentlyInside = new Set<number>();

    for (const geofence of geofences) {
      if (!geofence.isActive) continue;

      const distance = calculateDistance(
        position.latitude,
        position.longitude,
        geofence.centerLatitude,
        geofence.centerLongitude
      );

      if (distance <= geofence.radius) {
        currentlyInside.add(geofence.id);

        // Check if this is a new arrival
        if (!geofenceCheckRef.current.has(geofence.id)) {
          console.log(`🎯 ARRIVAL detected at ${geofence.address}`);
          await triggerJobSiteEvent(geofence, 'arrival', position);
          setCurrentJobSite(geofence.projectId);
        }
      }
    }

    // Check for departures
    for (const geofenceId of geofenceCheckRef.current) {
      if (!currentlyInside.has(geofenceId)) {
        const geofence = geofences.find(g => g.id === geofenceId);
        if (geofence) {
          console.log(`🚪 DEPARTURE detected from ${geofence.address}`);
          await triggerJobSiteEvent(geofence, 'departure', position);
          if (currentJobSite === geofence.projectId) {
            setCurrentJobSite(null);
          }
        }
      }
    }

    geofenceCheckRef.current = currentlyInside;
  };

  // Trigger job site arrival/departure event
  const triggerJobSiteEvent = async (geofence: Geofence, eventType: 'arrival' | 'departure', position: GPSPosition) => {
    try {
      await apiRequest('POST', '/api/job-site-events', {
        projectId: geofence.projectId,
        geofenceId: geofence.id,
        eventType,
        eventTime: new Date().toISOString(),
        latitude: position.latitude.toString(),
        longitude: position.longitude.toString(),
        accuracy: position.accuracy?.toString(),
      });
    } catch (error) {
      console.warn(`Failed to record ${eventType} event:`, error);
    }
  };

  const sendLocationUpdate = async (position: GeolocationPosition) => {
    try {
      const now = Date.now();
      const newPosition: GPSPosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: now
      };

      // Check if enough time has passed
      if (now - lastUpdateRef.current < MIN_UPDATE_INTERVAL) {
        return;
      }

      // Check if user has moved enough distance
      if (lastPosition) {
        const distance = calculateDistance(
          lastPosition.latitude,
          lastPosition.longitude,
          newPosition.latitude,
          newPosition.longitude
        );
        
        if (distance < MIN_DISTANCE_THRESHOLD) {
          return;
        }
      }

      // Send GPS update to server
      await apiRequest('POST', '/api/gps-tracking/update', {
        latitude: newPosition.latitude,
        longitude: newPosition.longitude,
        accuracy: newPosition.accuracy,
        deviceType: isMobileDevice() ? 'mobile' : 'desktop',
        locationTimestamp: new Date(now).toISOString(),
      });

      // Check for geofence events (arrival/departure)
      await checkGeofences(newPosition);

      setLastPosition(newPosition);
      lastUpdateRef.current = now;
    } catch (error) {
      console.warn('Failed to send location update:', error);
    }
  };

  const startTracking = () => {
    if (!user || !navigator.geolocation) {
      console.log('GPS tracking not started:', { hasUser: !!user, hasGeolocation: !!navigator.geolocation, isMobile: isMobileDevice() });
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocationUpdate,
      (error) => {
        console.warn('GPS tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000,
      }
    );

    setIsTracking(true);
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  useEffect(() => {
    if (user) {
      console.log('Starting GPS tracking for user:', user.username);
      loadGeofences(); // Load geofences when user is authenticated
      startTracking();
    } else {
      stopTracking();
      setGeofences([]);
      setCurrentJobSite(null);
      geofenceCheckRef.current.clear();
    }

    return () => stopTracking();
  }, [user]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTracking();
      } else if (user) {
        startTracking();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  return {
    isTracking,
    lastPosition,
    geofences,
    currentJobSite,
    startTracking,
    stopTracking,
    loadGeofences
  };
}