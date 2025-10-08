import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MapPin, 
  Navigation, 
  Gauge, 
  Zap, 
  Thermometer,
  Activity,
  Clock,
  Car,
  TrendingUp,
  Route,
  Calendar,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { queryClient } from '@/lib/queryClient';

interface ObdLocationData {
  id: number;
  deviceId: string;
  vehicleId: number | null;
  latitude: string;
  longitude: string;
  speed: string | null;
  heading: string | null;
  altitude: string | null;
  accuracy: string | null;
  timestamp: string;
  createdAt: string;
}

interface ObdDiagnosticData {
  id: number;
  deviceId: string;
  vehicleId: number | null;
  rpm: number | null;
  engineTemp: string | null;
  coolantTemp: string | null;
  fuelLevel: string | null;
  batteryVoltage: string | null;
  throttlePosition: string | null;
  engineLoad: string | null;
  maf: string | null;
  timestamp: string;
}

interface ObdTrip {
  id: number;
  deviceId: string;
  vehicleId: number | null;
  startTime: string;
  endTime: string | null;
  startLatitude: string | null;
  startLongitude: string | null;
  endLatitude: string | null;
  endLongitude: string | null;
  startLocation: string | null;
  endLocation: string | null;
  distanceMiles: string | null;
  durationMinutes: number | null;
  averageSpeed: string | null;
  maxSpeed: string | null;
  status: string;
}

interface WeeklySummary {
  totalTrips: number;
  totalDistance: string;
  totalDuration: number;
  averageSpeed: string;
  period: string;
}

interface Vehicle {
  id: number;
  name: string;
  vin?: string;
}

export default function GPSTrackingOBD() {
  const { toast } = useToast();
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [latestLocation, setLatestLocation] = useState<ObdLocationData | null>(null);
  const [latestDiagnostics, setLatestDiagnostics] = useState<ObdDiagnosticData | null>(null);
  const [isReplayActive, setIsReplayActive] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);
  const [selectedTripForReplay, setSelectedTripForReplay] = useState<ObdTrip | null>(null);
  const [replayLocations, setReplayLocations] = useState<ObdLocationData[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any | null>(null);
  const markerRef = useRef<any | null>(null);

  // Fetch vehicles
  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['/api/vehicles']
  });

  // Fetch latest location
  const { data: locationResponse, refetch: refetchLocation } = useQuery<{ location: ObdLocationData | null }>({
    queryKey: ['/api/obd/latest-location', selectedDeviceId, selectedVehicleId],
    enabled: !!selectedDeviceId || !!selectedVehicleId,
    refetchInterval: 5000, // Fallback polling
  });

  // Fetch trips
  const { data: tripsResponse } = useQuery<{ trips: ObdTrip[] }>({
    queryKey: ['/api/obd/trips', selectedDeviceId, selectedVehicleId],
    enabled: !!selectedDeviceId || !!selectedVehicleId,
  });

  // Fetch weekly summary
  const { data: summaryResponse } = useQuery<{ summary: WeeklySummary }>({
    queryKey: ['/api/obd/weekly-summary', selectedDeviceId, selectedVehicleId],
    enabled: !!selectedDeviceId || !!selectedVehicleId,
  });

  const trips = tripsResponse?.trips || [];
  const summary = summaryResponse?.summary;

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected for OBD tracking');
      // Authenticate WebSocket
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id) {
        ws.send(JSON.stringify({
          type: 'auth',
          userId: user.id,
          username: user.username,
          organizationId: user.organizationId,
          userType: 'web'
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'obd_location_update') {
          const locationData = message.data;
          
          // Check if this update is for our selected device/vehicle
          if (
            (selectedDeviceId && locationData.deviceId === selectedDeviceId) ||
            (selectedVehicleId && locationData.vehicleId === selectedVehicleId)
          ) {
            // Update location state
            setLatestLocation({
              id: 0,
              deviceId: locationData.deviceId,
              vehicleId: locationData.vehicleId,
              latitude: locationData.latitude.toString(),
              longitude: locationData.longitude.toString(),
              speed: locationData.speed?.toString() || null,
              heading: locationData.heading?.toString() || null,
              altitude: null,
              accuracy: null,
              timestamp: locationData.timestamp,
              createdAt: new Date().toISOString(),
            });

            // Update map marker
            if (googleMapRef.current && markerRef.current) {
              const newPosition = { 
                lat: parseFloat(locationData.latitude), 
                lng: parseFloat(locationData.longitude) 
              };
              markerRef.current.setPosition(newPosition);
              googleMapRef.current.panTo(newPosition);
            }

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['/api/obd/latest-location'] });
            queryClient.invalidateQueries({ queryKey: ['/api/obd/trips'] });
          }
        } else if (message.type === 'obd_diagnostic_update') {
          const diagData = message.data;
          
          if (
            (selectedDeviceId && diagData.deviceId === selectedDeviceId) ||
            (selectedVehicleId && diagData.vehicleId === selectedVehicleId)
          ) {
            setLatestDiagnostics({
              id: 0,
              deviceId: diagData.deviceId,
              vehicleId: diagData.vehicleId,
              rpm: diagData.rpm,
              engineTemp: diagData.engineTemp?.toString() || null,
              coolantTemp: diagData.coolantTemp?.toString() || null,
              fuelLevel: diagData.fuelLevel?.toString() || null,
              batteryVoltage: diagData.batteryVoltage?.toString() || null,
              throttlePosition: diagData.throttlePosition?.toString() || null,
              engineLoad: diagData.engineLoad?.toString() || null,
              maf: diagData.maf?.toString() || null,
              timestamp: diagData.timestamp,
            });
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, [selectedDeviceId, selectedVehicleId]);

  // Update location from query response
  useEffect(() => {
    if (locationResponse?.location) {
      setLatestLocation(locationResponse.location);
    }
  }, [locationResponse]);

  // Initialize Google Map
  useEffect(() => {
    if (mapRef.current && !googleMapRef.current && latestLocation) {
      const lat = parseFloat(latestLocation.latitude);
      const lng = parseFloat(latestLocation.longitude);

      const map = new google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: 14,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      });

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: 'Vehicle Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      });

      googleMapRef.current = map;
      markerRef.current = marker;
    }
  }, [latestLocation]);

  // Update map when location changes
  useEffect(() => {
    if (googleMapRef.current && markerRef.current && latestLocation) {
      const lat = parseFloat(latestLocation.latitude);
      const lng = parseFloat(latestLocation.longitude);
      const newPosition = { lat, lng };
      
      markerRef.current.setPosition(newPosition);
      googleMapRef.current.panTo(newPosition);
    }
  }, [latestLocation]);

  const handleVehicleChange = (vehicleId: string) => {
    const id = parseInt(vehicleId);
    setSelectedVehicleId(id);
    
    // Find the device ID for this vehicle from the latest location data
    if (locationResponse?.location?.vehicleId === id) {
      setSelectedDeviceId(locationResponse.location.deviceId);
    }
  };

  const centerMap = () => {
    if (googleMapRef.current && latestLocation) {
      const lat = parseFloat(latestLocation.latitude);
      const lng = parseFloat(latestLocation.longitude);
      googleMapRef.current.panTo({ lat, lng });
      googleMapRef.current.setZoom(16);
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const completedTrips = trips.filter((trip: ObdTrip) => trip.status === 'completed');
  const activeTrip = trips.find((trip: ObdTrip) => trip.status === 'active');

  return (
    <div className="flex-1 p-6 space-y-6 bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">GPS Tracking - OBD Devices</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Real-time vehicle tracking with cellular OBD GPS trackers</p>
        </div>
        
        <div className="w-64">
          <Select value={selectedVehicleId?.toString() || ''} onValueChange={handleVehicleChange}>
            <SelectTrigger data-testid="select-vehicle-obd">
              <SelectValue placeholder="Select vehicle..." />
            </SelectTrigger>
            <SelectContent>
              {vehicles?.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    {vehicle.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Live Dashboard */}
      {latestLocation && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map Card */}
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Live Vehicle Location
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={centerMap} data-testid="button-center-map">
                    <Navigation className="h-4 w-4 mr-2" />
                    Center Map
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild
                    data-testid="button-open-google-maps"
                  >
                    <a
                      href={`https://www.google.com/maps?q=${latestLocation.latitude},${latestLocation.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Open in Maps
                    </a>
                  </Button>
                </div>
              </div>
              <CardDescription>
                Last updated: {format(new Date(latestLocation.timestamp), 'PPp')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                ref={mapRef} 
                className="w-full h-[400px] rounded-lg border border-gray-200 dark:border-gray-700"
                data-testid="map-container"
              />
            </CardContent>
          </Card>

          {/* Live Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Live Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Speed</p>
                <p className="text-2xl font-bold dark:text-white">
                  {latestLocation.speed ? `${parseFloat(latestLocation.speed).toFixed(1)} mph` : 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Heading</p>
                <p className="text-2xl font-bold dark:text-white">
                  {latestLocation.heading ? `${parseFloat(latestLocation.heading).toFixed(0)}°` : 'N/A'}
                </p>
              </div>
              {latestDiagnostics && (
                <>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      RPM
                    </p>
                    <p className="text-2xl font-bold dark:text-white">
                      {latestDiagnostics.rpm?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Fuel
                    </p>
                    <p className="text-2xl font-bold dark:text-white">
                      {latestDiagnostics.fuelLevel ? `${parseFloat(latestDiagnostics.fuelLevel).toFixed(0)}%` : 'N/A'}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* OBD Diagnostics */}
          {latestDiagnostics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Thermometer className="h-5 w-5" />
                  Engine Diagnostics
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Coolant Temp</p>
                  <p className="text-xl font-bold dark:text-white">
                    {latestDiagnostics.coolantTemp ? `${parseFloat(latestDiagnostics.coolantTemp).toFixed(1)}°C` : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Battery</p>
                  <p className="text-xl font-bold dark:text-white">
                    {latestDiagnostics.batteryVoltage ? `${parseFloat(latestDiagnostics.batteryVoltage).toFixed(1)}V` : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Throttle</p>
                  <p className="text-xl font-bold dark:text-white">
                    {latestDiagnostics.throttlePosition ? `${parseFloat(latestDiagnostics.throttlePosition).toFixed(0)}%` : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Engine Load</p>
                  <p className="text-xl font-bold dark:text-white">
                    {latestDiagnostics.engineLoad ? `${parseFloat(latestDiagnostics.engineLoad).toFixed(0)}%` : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Weekly Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Summary
            </CardTitle>
            <CardDescription>{summary.period}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Trips</p>
                <p className="text-3xl font-bold mt-2 dark:text-white">{summary.totalTrips}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Distance</p>
                <p className="text-3xl font-bold mt-2 dark:text-white">{summary.totalDistance} mi</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Driving Time</p>
                <p className="text-3xl font-bold mt-2 dark:text-white">{formatDuration(summary.totalDuration)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Speed</p>
                <p className="text-3xl font-bold mt-2 dark:text-white">{summary.averageSpeed} mph</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trip History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Trip History
          </CardTitle>
          <CardDescription>Recent trips and journey details</CardDescription>
        </CardHeader>
        <CardContent>
          {activeTrip && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-500">Active Trip</Badge>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Started {format(new Date(activeTrip.startTime), 'p')}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Trip in progress from {activeTrip.startLocation || 'Unknown location'}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {completedTrips.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No completed trips yet</p>
              </div>
            ) : (
              completedTrips.slice(0, 10).map((trip: ObdTrip) => (
                <div 
                  key={trip.id} 
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Route className="h-4 w-4 text-gray-400" />
                      <span className="font-medium dark:text-white">
                        {trip.startLocation || 'Unknown'} → {trip.endLocation || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>{format(new Date(trip.startTime), 'MMM d, p')}</span>
                      {trip.distanceMiles && (
                        <span className="flex items-center gap-1">
                          <Navigation className="h-3 w-3" />
                          {parseFloat(trip.distanceMiles).toFixed(1)} mi
                        </span>
                      )}
                      {trip.durationMinutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(trip.durationMinutes)}
                        </span>
                      )}
                      {trip.averageSpeed && (
                        <span className="flex items-center gap-1">
                          <Gauge className="h-3 w-3" />
                          {parseFloat(trip.averageSpeed).toFixed(0)} mph avg
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      {!latestLocation && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">OBD GPS Tracker Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-blue-800 dark:text-blue-200">
              <p className="font-medium">Your OBD devices can send data to these endpoints:</p>
              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                <code className="text-sm">POST /api/obd/location</code> - Send GPS coordinates and movement data
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                <code className="text-sm">POST /api/obd/data</code> - Send engine diagnostics and vehicle telemetry
              </div>
              <p className="text-sm mt-4">
                Configure your OBD GPS tracker to send data to these endpoints. Once data starts flowing, 
                you'll see real-time location updates, vehicle diagnostics, and trip history here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
