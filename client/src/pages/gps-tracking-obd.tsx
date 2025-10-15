import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SimpleVehicleMap } from "@/components/map/simple-vehicle-map";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Bell, Gauge, Zap, Thermometer, Activity, Car, Play, Pause, RotateCcw } from "lucide-react";
import { getAuthHeaders } from "@/lib/api-config";

export default function GPSTrackingOBD() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [focusVehicleId, setFocusVehicleId] = useState<string | null>(null);
  
  // History playback state
  const [historyDeviceId, setHistoryDeviceId] = useState<string | null>(null);
  const [historyDate, setHistoryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [historyStartTime, setHistoryStartTime] = useState<string>("00:00");
  const [historyEndTime, setHistoryEndTime] = useState<string>("23:59");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [historyPoints, setHistoryPoints] = useState<any[]>([]);
  const [currentPointIndex, setCurrentPointIndex] = useState<number>(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch vehicles
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery<any[]>({
    queryKey: ['/api/vehicles'],
    refetchInterval: 5000,
  });

  // Fetch OBD locations for all vehicles
  const { data: obdLocationResponse } = useQuery<any>({
    queryKey: ['/api/obd/latest-location'],
    refetchInterval: 3000,
  });
  
  // Extract locations from response (API returns { locations: [...] } for all vehicles)
  const obdLocations = obdLocationResponse?.locations || [];

  // Fetch trips
  const { data: obdTripsResponse } = useQuery<any>({
    queryKey: ['/api/obd/trips'],
    refetchInterval: 10000,
  });
  
  // Extract trips from response (API returns { trips: [...] })
  const obdTrips = obdTripsResponse?.trips || [];

  // Fetch OBD diagnostics for selected vehicle
  const { data: diagnosticData } = useQuery<any>({
    queryKey: ['/api/obd/diagnostics', selectedVehicleId],
    enabled: !!selectedVehicleId,
    refetchInterval: 2000,
  });

  const effectiveVehicleId = selectedVehicleId || (vehicles.length > 0 ? vehicles[0].id.toString() : null);
  const selectedVehicle = vehicles.find(v => v.id.toString() === effectiveVehicleId);
  const selectedLocation = obdLocations.find(loc => loc.vehicleId?.toString() === effectiveVehicleId);
  const activeTrip = obdTrips.find((t: any) => t.vehicleId?.toString() === effectiveVehicleId && t.status === 'active');

  // Load historical data function
  const loadHistoricalData = async () => {
    console.log('🔍 Loading historical data...', { 
      historyDeviceId, 
      historyDate, 
      historyStartTime, 
      historyEndTime,
      obdLocations: obdLocations.length,
      availableDevices: obdLocations.map(l => l.deviceId)
    });
    
    if (!historyDeviceId) {
      console.warn('⚠️ No device ID selected');
      alert('Please select a vehicle first');
      return;
    }

    setIsLoadingHistory(true);
    try {
      const params = new URLSearchParams({
        deviceId: historyDeviceId,
        date: historyDate,
        startTime: historyStartTime,
        endTime: historyEndTime
      });

      console.log('📡 Fetching from:', `/api/obd/history?${params.toString()}`);
      const headers = getAuthHeaders();
      console.log('🔑 Auth headers:', headers);
      const response = await fetch(`/api/obd/history?${params}`, {
        headers,
        credentials: 'include'
      });
      
      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.message || 'Failed to fetch historical data');
      }

      const data = await response.json();
      console.log('✅ Received data:', data);
      
      setHistoryPoints(data.points || []);
      setCurrentPointIndex(0);
      setIsPlaying(false);
    } catch (error) {
      console.error('💥 Error loading historical data:', error);
      setHistoryPoints([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Playback animation
  useEffect(() => {
    if (!isPlaying || historyPoints.length === 0) return;

    const interval = setInterval(() => {
      setCurrentPointIndex((prevIndex) => {
        if (prevIndex >= historyPoints.length - 1) {
          setIsPlaying(false);
          return prevIndex;
        }
        return prevIndex + 1;
      });
    }, 1000 / playbackSpeed); // Adjust speed

    return () => clearInterval(interval);
  }, [isPlaying, historyPoints.length, playbackSpeed]);

  // Reset playback
  const resetPlayback = () => {
    setCurrentPointIndex(0);
    setIsPlaying(false);
  };

  // Get current playback location
  const selectedHistoryVehicle = obdLocations.find(loc => loc.deviceId === historyDeviceId);
  const playbackLocations = historyPoints.length > 0 ? [
    {
      ...historyPoints[currentPointIndex],
      deviceId: `history-${historyDeviceId}`,
      displayName: `${selectedHistoryVehicle?.displayName || historyDeviceId} (History)`
    }
  ] : [];

  if (vehiclesLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading vehicles...</p>
        </div>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2 dark:text-white">No Vehicles Found</p>
          <p className="text-muted-foreground">Please add a vehicle with OBD tracking to start monitoring.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold dark:text-white">Live Vehicle Tracking</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Real-time GPS monitoring and trip analytics</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Vehicle Selector */}
              <div className="relative">
                <Select 
                  value={effectiveVehicleId || ""} 
                  onValueChange={setSelectedVehicleId}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map(vehicle => (
                      <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                        {vehicle.vehicleNumber} - {vehicle.licensePlate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Today
              </Button>
            </div>
          </div>
        </header>
        
        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="grid grid-cols-12 gap-6 h-full">
            
            {/* Map Section (70%) */}
            <div className="col-span-8 flex flex-col space-y-4">
              
              {/* Real-time Metrics Strip */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Gauge className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Speed</p>
                      <p className="text-xl font-bold dark:text-white">
                        {selectedLocation ? Math.round(selectedLocation.speed) : 0} mph
                      </p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">RPM</p>
                      <p className="text-xl font-bold dark:text-white">
                        {diagnosticData?.rpm || 0}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Fuel</p>
                      <p className="text-xl font-bold dark:text-white">
                        {diagnosticData?.fuelLevel ? `${Math.round(parseFloat(diagnosticData.fuelLevel))}%` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                      <Thermometer className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Temp</p>
                      <p className="text-xl font-bold dark:text-white">
                        {diagnosticData?.engineTemp ? `${Math.round(parseFloat(diagnosticData.engineTemp))}°F` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
              
              {/* Map Container */}
              <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <SimpleVehicleMap 
                  locations={historyPoints.length > 0 ? playbackLocations : obdLocations}
                  selectedVehicleId={effectiveVehicleId}
                  focusVehicleId={historyPoints.length > 0 ? historyDeviceId : focusVehicleId}
                />
              </div>
              
              {/* Current Location Info */}
              <Card className="p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Location</p>
                    <p className="text-sm font-medium dark:text-white">
                      {activeTrip?.startLocation || selectedLocation ? "On Route" : "Location not available"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Coordinates</p>
                    <p className="text-sm font-mono dark:text-white">
                      {selectedLocation ? `${parseFloat(selectedLocation.latitude).toFixed(4)}°, ${parseFloat(selectedLocation.longitude).toFixed(4)}°` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Last Update</p>
                    <p className="text-sm dark:text-white">
                      {selectedLocation ? 
                        new Date(selectedLocation.timestamp).toLocaleTimeString() : 
                        "No recent updates"
                      }
                    </p>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Right Panel - Vehicles List & History (30%) */}
            <div className="col-span-4">
              <Card className="p-4 h-full overflow-hidden flex flex-col">
                <Tabs defaultValue="vehicles" className="flex-1 flex flex-col">
                  <TabsList className="w-full grid grid-cols-2 mb-4">
                    <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>
                  
                  {/* Vehicles Tab */}
                  <TabsContent value="vehicles" className="flex-1 overflow-auto mt-0">
                    <div className="space-y-3">
                      {obdLocations.length === 0 ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400">No vehicles tracking</p>
                      ) : (
                        obdLocations.map((location: any) => {
                          const vehicleId = location.vehicleId?.toString() || location.deviceId || 'unknown';
                          const vehicle = vehicles.find(v => v.id.toString() === vehicleId);
                          const speed = parseFloat(location.speed) || 0;
                          const isMoving = speed >= 1;
                          
                          return (
                            <div 
                              key={vehicleId}
                              onClick={() => setFocusVehicleId(vehicleId)}
                              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              data-testid={`vehicle-item-${vehicleId}`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div className={`p-2 rounded-lg ${isMoving ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                                    <Car className={`w-4 h-4 ${isMoving ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm dark:text-white">
                                      {location.displayName || vehicle?.vehicleNumber || `Vehicle ${vehicleId}`}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      {vehicle?.licensePlate || `Device ${location.deviceId}`}
                                    </p>
                                  </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  isMoving 
                                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                }`}>
                                  {isMoving ? 'Moving' : 'Stopped'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <p className="text-gray-600 dark:text-gray-400">Speed</p>
                                  <p className="font-medium dark:text-white">{Math.round(speed)} mph</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 dark:text-gray-400">Last Update</p>
                                  <p className="font-medium dark:text-white">
                                    {location.timestamp ? new Date(location.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </TabsContent>
                  
                  {/* History Tab */}
                  <TabsContent value="history" className="flex-1 overflow-auto mt-0">
                    <div className="space-y-4">
                      {/* Vehicle Selection */}
                      <div>
                        <Label htmlFor="history-vehicle" className="text-sm font-medium mb-2 block">
                          Select Vehicle
                        </Label>
                        <Select 
                          value={historyDeviceId || ""} 
                          onValueChange={(value) => {
                            console.log('📍 Selected history device:', value);
                            setHistoryDeviceId(value);
                          }}
                        >
                          <SelectTrigger id="history-vehicle">
                            <SelectValue placeholder="Choose a vehicle" />
                          </SelectTrigger>
                          <SelectContent>
                            {obdLocations.map(location => (
                              <SelectItem key={location.deviceId} value={location.deviceId}>
                                {location.displayName || location.deviceId}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Date Selection */}
                      <div>
                        <Label htmlFor="history-date" className="text-sm font-medium mb-2 block">
                          Date
                        </Label>
                        <Input
                          id="history-date"
                          type="date"
                          value={historyDate}
                          onChange={(e) => setHistoryDate(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>

                      {/* Time Range */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="start-time" className="text-sm font-medium mb-2 block">
                            Start Time
                          </Label>
                          <Input
                            id="start-time"
                            type="time"
                            value={historyStartTime}
                            onChange={(e) => setHistoryStartTime(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="end-time" className="text-sm font-medium mb-2 block">
                            End Time
                          </Label>
                          <Input
                            id="end-time"
                            type="time"
                            value={historyEndTime}
                            onChange={(e) => setHistoryEndTime(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Load Button */}
                      <Button 
                        className="w-full"
                        disabled={!historyDeviceId || isLoadingHistory}
                        onClick={() => {
                          console.log('🎯 LOAD HISTORY BUTTON CLICKED!', {
                            historyDeviceId,
                            historyDate,
                            historyStartTime,
                            historyEndTime,
                            isLoadingHistory,
                            buttonDisabled: !historyDeviceId || isLoadingHistory
                          });
                          loadHistoricalData();
                        }}
                        data-testid="load-history-btn"
                      >
                        {isLoadingHistory ? 'Loading...' : 'Load History'}
                      </Button>

                      {/* Playback Controls */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <Label className="text-sm font-medium mb-3 block">
                          Playback Controls
                        </Label>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setIsPlaying(!isPlaying)}
                            disabled={historyPoints.length === 0}
                            data-testid="play-pause-btn"
                          >
                            {isPlaying ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={resetPlayback}
                            disabled={historyPoints.length === 0}
                            data-testid="reset-btn"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Select 
                            value={playbackSpeed.toString()} 
                            onValueChange={(value) => setPlaybackSpeed(parseFloat(value))}
                            disabled={!historyDeviceId}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0.5">0.5x</SelectItem>
                              <SelectItem value="1">1x</SelectItem>
                              <SelectItem value="2">2x</SelectItem>
                              <SelectItem value="5">5x</SelectItem>
                              <SelectItem value="10">10x</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Playback Progress */}
                      {historyPoints.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                            <span>Point {currentPointIndex + 1} of {historyPoints.length}</span>
                            <span>{Math.round((currentPointIndex / historyPoints.length) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(currentPointIndex / historyPoints.length) * 100}%` }}
                            />
                          </div>
                          {historyPoints[currentPointIndex] && (
                            <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                              <div>Time: {new Date(historyPoints[currentPointIndex].timestamp).toLocaleString()}</div>
                              <div>Speed: {Math.round(historyPoints[currentPointIndex].speed || 0)} mph</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Info Message */}
                      {!historyDeviceId && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                          Select a vehicle and date range to view historical movement data.
                        </div>
                      )}
                      
                      {historyPoints.length > 0 && (
                        <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                          ✓ Loaded {historyPoints.length} location points
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
