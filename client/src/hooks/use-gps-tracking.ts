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

export function useGPSTracking() {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [lastPosition, setLastPosition] = useState<GPSPosition | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  
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

      await apiRequest('POST', '/api/gps-tracking/update', {
        latitude: newPosition.latitude,
        longitude: newPosition.longitude,
        accuracy: newPosition.accuracy,
        deviceType: isMobileDevice() ? 'mobile' : 'desktop',
        locationTimestamp: new Date(now).toISOString(),
      });

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
      startTracking();
    } else {
      stopTracking();
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
    startTracking,
    stopTracking
  };
}