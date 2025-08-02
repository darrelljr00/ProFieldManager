import { useState, useEffect } from 'react';
import { useGPSTracking } from '@/hooks/use-gps-tracking';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, Smartphone, Signal, Clock, Send } from "lucide-react";

export default function MobileTest() {
  const { isTracking, lastPosition, startTracking, stopTracking } = useGPSTracking();
  const [currentPosition, setCurrentPosition] = useState<GeolocationPosition | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPosition(position);
        setGpsError(null);
      },
      (error) => {
        setGpsError(`GPS Error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const sendTestLocation = async () => {
    if (!currentPosition) {
      toast({
        title: "No Location",
        description: "Please get your current location first",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      await apiRequest('POST', '/api/gps-tracking/update', {
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
        accuracy: currentPosition.coords.accuracy,
        deviceType: isMobile ? 'mobile' : 'desktop',
        locationTimestamp: new Date().toISOString(),
      });

      toast({
        title: "Location Sent",
        description: "GPS location successfully sent to server",
      });
    } catch (error: any) {
      toast({
        title: "Failed to Send",
        description: error.message || "Failed to send location to server",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mobile GPS Test</h1>
          <p className="text-muted-foreground">
            Test GPS tracking functionality for mobile devices
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Device Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Device Type:</span>
              <Badge variant={isMobile ? "default" : "secondary"}>
                {isMobile ? "Mobile" : "Desktop"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>GPS Tracking:</span>
              <Badge variant={isTracking ? "default" : "destructive"}>
                {isTracking ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Geolocation Support:</span>
              <Badge variant={navigator.geolocation ? "default" : "destructive"}>
                {navigator.geolocation ? "Yes" : "No"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Current Position
            </CardTitle>
            <CardDescription>
              Your current GPS coordinates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {gpsError && (
              <div className="text-red-500 text-sm">{gpsError}</div>
            )}
            
            {currentPosition && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Latitude:</span>
                    <div>{currentPosition.coords.latitude.toFixed(6)}</div>
                  </div>
                  <div>
                    <span className="font-medium">Longitude:</span>
                    <div>{currentPosition.coords.longitude.toFixed(6)}</div>
                  </div>
                  <div>
                    <span className="font-medium">Accuracy:</span>
                    <div>{Math.round(currentPosition.coords.accuracy)}m</div>
                  </div>
                  <div>
                    <span className="font-medium">Timestamp:</span>
                    <div>{new Date(currentPosition.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button onClick={getCurrentLocation} variant="outline">
                <Signal className="h-4 w-4 mr-2" />
                Get Location
              </Button>
              <Button 
                onClick={sendTestLocation} 
                disabled={!currentPosition || isSending}
                variant="default"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSending ? "Sending..." : "Send Test Location"}
              </Button>
              {isTracking ? (
                <Button onClick={stopTracking} variant="destructive">
                  Stop Tracking
                </Button>
              ) : (
                <Button onClick={startTracking}>
                  Start Tracking
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {lastPosition && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Last Tracked Position
              </CardTitle>
              <CardDescription>
                Last position sent to server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Latitude:</span>
                  <div>{lastPosition.latitude.toFixed(6)}</div>
                </div>
                <div>
                  <span className="font-medium">Longitude:</span>
                  <div>{lastPosition.longitude.toFixed(6)}</div>
                </div>
                <div>
                  <span className="font-medium">Accuracy:</span>
                  <div>{Math.round(lastPosition.accuracy)}m</div>
                </div>
                <div>
                  <span className="font-medium">Updated:</span>
                  <div>{new Date(lastPosition.timestamp).toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1. Enable location services in your browser when prompted</p>
            <p>2. For mobile testing, use a mobile device or browser developer tools</p>
            <p>3. The GPS tracking hook automatically starts when authenticated on mobile</p>
            <p>4. Location updates are sent every minute when moving more than 50 meters</p>
            <p>5. Check the GPS Tracking page to see recorded sessions</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}