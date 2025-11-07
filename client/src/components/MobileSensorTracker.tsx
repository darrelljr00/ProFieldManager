import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SensorData {
  activityType?: string;
  activityConfidence?: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  screenOn: boolean;
  screenTimeSeconds: number;
  stepCount: number;
  distanceMeters?: number;
  batteryLevel?: number;
  isCharging?: boolean;
  productivityLevel?: string;
  idleTimeSeconds: number;
}

export function MobileSensorTracker() {
  const { toast } = useToast();
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const screenTimeRef = useRef(0);
  const idleTimeRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const stepCountRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  // Detect if user is on mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Request permissions and start tracking
  const requestPermissions = async () => {
    if (!isMobile) {
      toast({
        title: "Desktop Device Detected",
        description: "Pro Field Sense tracking is optimized for mobile devices.",
        variant: "default",
      });
      return;
    }

    try {
      // Request location permission
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
        });
      });

      // Request motion permission (iOS 13+)
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission !== 'granted') {
          throw new Error('Motion permission denied');
        }
      }

      setHasPermissions(true);
      setIsTracking(true);
      
      toast({
        title: "Tracking Enabled",
        description: "Pro Field Sense is now monitoring your productivity.",
      });
    } catch (error) {
      toast({
        title: "Permission Denied",
        description: "Unable to access device sensors. Please enable location and motion permissions.",
        variant: "destructive",
      });
    }
  };

  // Track screen visibility for screen time
  useEffect(() => {
    if (!isTracking) return;

    let lastVisibilityChange = Date.now();
    let isVisible = !document.hidden;

    const handleVisibilityChange = () => {
      const now = Date.now();
      const elapsed = (now - lastVisibilityChange) / 1000;

      if (isVisible) {
        // Was visible, now hidden
        screenTimeRef.current += elapsed;
      }

      isVisible = !document.hidden;
      lastVisibilityChange = now;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isTracking]);

  // Track user activity (detect idle time)
  useEffect(() => {
    if (!isTracking) return;

    const resetActivity = () => {
      const now = Date.now();
      const idle = (now - lastActivityRef.current) / 1000;
      idleTimeRef.current += idle;
      lastActivityRef.current = now;
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetActivity));

    return () => {
      events.forEach(event => document.removeEventListener(event, resetActivity));
    };
  }, [isTracking]);

  // Collect and send sensor data periodically
  useEffect(() => {
    if (!isTracking || !hasPermissions) return;

    const collectAndSendData = async () => {
      try {
        const sensorData: SensorData = {
          screenOn: !document.hidden,
          screenTimeSeconds: Math.round(screenTimeRef.current),
          stepCount: stepCountRef.current,
          idleTimeSeconds: Math.round(idleTimeRef.current),
        };

        // Get GPS location
        navigator.geolocation.getCurrentPosition(
          (position) => {
            sensorData.latitude = position.coords.latitude;
            sensorData.longitude = position.coords.longitude;
            sensorData.accuracy = position.coords.accuracy;
          },
          () => {
            // Location error - continue without GPS
          },
          { enableHighAccuracy: true }
        );

        // Get battery status
        if ('getBattery' in navigator) {
          const battery = await (navigator as any).getBattery();
          sensorData.batteryLevel = Math.round(battery.level * 100);
          sensorData.isCharging = battery.charging;
        }

        // Estimate activity type based on motion
        const activityEstimate = estimateActivity();
        sensorData.activityType = activityEstimate.type;
        sensorData.activityConfidence = activityEstimate.confidence;
        sensorData.productivityLevel = activityEstimate.productivity;

        // Send to backend
        await fetch('/api/phone-sensors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(sensorData),
        });

      } catch (error) {
        console.error('Failed to send sensor data:', error);
      }
    };

    // Send data every 5 minutes
    const interval = setInterval(collectAndSendData, 5 * 60 * 1000);
    
    // Send initial data immediately
    collectAndSendData();

    return () => clearInterval(interval);
  }, [isTracking, hasPermissions]);

  // Listen to device motion to estimate activity
  useEffect(() => {
    if (!isTracking || !hasPermissions) return;

    let motionSamples: number[] = [];

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (acceleration) {
        const magnitude = Math.sqrt(
          (acceleration.x || 0) ** 2 +
          (acceleration.y || 0) ** 2 +
          (acceleration.z || 0) ** 2
        );
        motionSamples.push(magnitude);
        
        // Keep only last 100 samples
        if (motionSamples.length > 100) {
          motionSamples.shift();
        }

        // Rough step detection (simplified)
        if (magnitude > 15) {
          stepCountRef.current++;
        }
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isTracking, hasPermissions]);

  // Estimate activity type based on collected motion data
  const estimateActivity = () => {
    const sessionDuration = (Date.now() - startTimeRef.current) / 1000;
    const avgScreenTime = sessionDuration > 0 ? screenTimeRef.current / sessionDuration : 0;
    const avgIdleTime = sessionDuration > 0 ? idleTimeRef.current / sessionDuration : 0;

    let type = 'stationary';
    let confidence = 50;
    let productivity = 'medium';

    // Simple heuristics
    if (stepCountRef.current > 100) {
      type = 'walking';
      confidence = 75;
      productivity = 'high';
    } else if (avgIdleTime > 0.5) {
      type = 'sitting';
      confidence = 70;
      productivity = 'low';
    } else if (avgScreenTime > 0.6) {
      type = 'standing';
      confidence = 65;
      productivity = 'medium';
    }

    return { type, confidence, productivity };
  };

  // Auto-start tracking on component mount for mobile users
  useEffect(() => {
    if (isMobile && !hasPermissions) {
      // You can auto-request or wait for user action
      // For now, we'll wait for explicit user action
    }
  }, [isMobile, hasPermissions]);

  // Don't render UI - this is a background tracker
  // However, we can expose a button for users to enable tracking
  if (!isMobile) {
    return null;
  }

  if (!isTracking) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={requestPermissions}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
          data-testid="button-enable-tracking"
        >
          Enable Pro Field Sense
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span className="text-sm">Tracking Active</span>
      </div>
    </div>
  );
}
