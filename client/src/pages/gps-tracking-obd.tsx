import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SimpleVehicleMap } from "@/components/map/simple-vehicle-map";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Bell, Gauge, Zap, Thermometer, Activity, Car, Play, Pause, RotateCcw, Save, Download, Trash2, FolderOpen } from "lucide-react";
import { getAuthHeaders } from "@/lib/api-config";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function GPSTrackingOBD() {
  const { toast } = useToast();
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
  
  // Save/Download state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [replayName, setReplayName] = useState<string>("");

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

  // Fetch saved route replays
  const { data: savedReplaysResponse } = useQuery<any>({
    queryKey: ['/api/obd/saved-replays'],
    refetchInterval: 10000,
  });
  
  const savedReplays = savedReplaysResponse?.replays || [];

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
      console.log('📊 Points count:', data.points?.length);
      console.log('📅 First point timestamp:', data.points?.[0]?.timestamp);
      console.log('📅 Last point timestamp:', data.points?.[data.points.length - 1]?.timestamp);
      
      setHistoryPoints(data.points || []);
      setCurrentPointIndex(0);
      setIsPlaying(false);
      console.log('🎬 Reset playback to index 0');
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

  // Save replay mutation
  const saveReplayMutation = useMutation({
    mutationFn: async (data: { name: string; deviceId: string; vehicleId?: number; startTime: string; endTime: string; routeData: any[]; distanceMiles?: number; durationMinutes?: number }) => {
      return await apiRequest('/api/obd/save-route-replay', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Route Replay Saved",
        description: "Your route replay has been saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/obd/saved-replays'] });
      setShowSaveDialog(false);
      setReplayName("");
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Replay",
        description: error.message || "Failed to save route replay",
        variant: "destructive",
      });
    },
  });

  // Handle save replay
  const handleSaveReplay = () => {
    if (historyPoints.length === 0) {
      toast({
        title: "No Route Data",
        description: "Please load historical data first before saving",
        variant: "destructive",
      });
      return;
    }
    // Generate default name
    const vehicle = vehicles.find(v => obdLocations.find(loc => loc.deviceId === historyDeviceId)?.vehicleId === v.id);
    const defaultName = `${vehicle?.vehicleNumber || 'Route'} - ${historyDate}`;
    setReplayName(defaultName);
    setShowSaveDialog(true);
  };

  // Confirm save replay with name
  const confirmSaveReplay = () => {
    if (!replayName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for this route replay",
        variant: "destructive",
      });
      return;
    }

    if (!historyDeviceId || historyPoints.length === 0) {
      toast({
        title: "Invalid Data",
        description: "Missing device ID or route data",
        variant: "destructive",
      });
      return;
    }

    const selectedLocation = obdLocations.find(loc => loc.deviceId === historyDeviceId);
    const startTime = historyPoints[0]?.timestamp || new Date(`${historyDate} ${historyStartTime}`).toISOString();
    const endTime = historyPoints[historyPoints.length - 1]?.timestamp || new Date(`${historyDate} ${historyEndTime}`).toISOString();
    
    // Calculate duration in minutes
    const duration = Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000 / 60);

    saveReplayMutation.mutate({
      name: replayName.trim(),
      deviceId: historyDeviceId,
      vehicleId: selectedLocation?.vehicleId,
      startTime,
      endTime,
      routeData: historyPoints,
      durationMinutes: duration,
    });
  };

  // Download replay directly (without saving)
  const downloadReplay = async (format: 'json' | 'gpx' | 'kml' = 'json') => {
    if (historyPoints.length === 0) {
      toast({
        title: "No Route Data",
        description: "Please load historical data first before downloading",
        variant: "destructive",
      });
      return;
    }

    const vehicle = vehicles.find(v => obdLocations.find(loc => loc.deviceId === historyDeviceId)?.vehicleId === v.id);
    const fileName = `${vehicle?.vehicleNumber || 'route'}_${historyDate}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    if (format === 'json') {
      const jsonData = {
        name: `${vehicle?.vehicleNumber || 'Route'} - ${historyDate}`,
        deviceId: historyDeviceId,
        startTime: historyPoints[0]?.timestamp || new Date(`${historyDate} ${historyStartTime}`).toISOString(),
        endTime: historyPoints[historyPoints.length - 1]?.timestamp || new Date(`${historyDate} ${historyEndTime}`).toISOString(),
        pointCount: historyPoints.length,
        routeData: historyPoints,
      };
      
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: `Route replay downloaded as ${fileName}.json`,
      });
    }
  };

  // Load saved replay
  const loadSavedReplay = async (replayId: number) => {
    try {
      setIsLoadingHistory(true);
      const headers = getAuthHeaders();
      const response = await fetch(`/api/obd/saved-replays/${replayId}`, {
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load saved replay');
      }

      const data = await response.json();
      const replay = data.replay;

      // Set up the playback with the saved data
      setHistoryDeviceId(replay.deviceId);
      setHistoryPoints(replay.routeData);
      setCurrentPointIndex(0);
      setIsPlaying(false);

      toast({
        title: "Replay Loaded",
        description: `Loaded ${replay.pointCount} points from "${replay.name}"`,
      });
    } catch (error: any) {
      toast({
        title: "Error Loading Replay",
        description: error.message || "Failed to load saved replay",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Delete saved replay mutation
  const deleteSavedReplayMutation = useMutation({
    mutationFn: async (replayId: number) => {
      return await apiRequest(`/api/obd/saved-replays/${replayId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Replay Deleted",
        description: "Saved replay has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/obd/saved-replays'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Deleting Replay",
        description: error.message || "Failed to delete saved replay",
        variant: "destructive",
      });
    },
  });

  // Debug playback progress
  useEffect(() => {
    if (historyPoints.length > 0) {
      const percent = (currentPointIndex / historyPoints.length) * 100;
      console.log('📊 Playback Progress:', { 
        currentPointIndex, 
        total: historyPoints.length, 
        point: `${currentPointIndex + 1} of ${historyPoints.length}`,
        percent: `${Math.round(percent)}%`,
        actualPercent: percent
      });
    }
  }, [currentPointIndex, historyPoints.length]);

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
                        {vehicle.vehicleNumber} 
                        {vehicle.year || vehicle.make || vehicle.model ? 
                          ` (${[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')})` : 
                          ''} - {vehicle.licensePlate}
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
              
              {/* Map Container - LIVE TRACKING ONLY */}
              <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <SimpleVehicleMap 
                  locations={obdLocations}
                  selectedVehicleId={effectiveVehicleId}
                  focusVehicleId={focusVehicleId}
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
                  <TabsList className="w-full grid grid-cols-3 mb-4">
                    <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                    <TabsTrigger value="saved">Saved</TabsTrigger>
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
                                      {vehicle ? (
                                        <>
                                          {vehicle.year || vehicle.make || vehicle.model ? 
                                            `${[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')} • ` : 
                                            ''
                                          }
                                          {vehicle.licensePlate}
                                        </>
                                      ) : (
                                        `Device ${location.deviceId}`
                                      )}
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
                            {obdLocations.map(location => {
                              const vehicle = vehicles.find(v => v.id === location.vehicleId);
                              return (
                                <SelectItem key={location.deviceId} value={location.deviceId}>
                                  {vehicle ? (
                                    `${vehicle.vehicleNumber}${vehicle.year || vehicle.make || vehicle.model ? 
                                      ` (${[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')})` : 
                                      ''} - ${vehicle.licensePlate}`
                                  ) : (
                                    location.displayName || location.deviceId
                                  )}
                                </SelectItem>
                              );
                            })}
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

                      {/* Save and Download Controls */}
                      {historyPoints.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                          <Label className="text-sm font-medium mb-3 block">
                            Save & Download
                          </Label>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              className="flex-1"
                              onClick={handleSaveReplay}
                              disabled={saveReplayMutation.isPending}
                              data-testid="save-replay-btn"
                            >
                              <Save className="w-4 h-4 mr-2" />
                              {saveReplayMutation.isPending ? 'Saving...' : 'Save Replay'}
                            </Button>
                            <Button 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => downloadReplay('json')}
                              data-testid="download-replay-btn"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download JSON
                            </Button>
                          </div>
                        </div>
                      )}

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
                        <>
                          <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                            ✓ Loaded {historyPoints.length} location points
                          </div>
                          
                          {/* Replay Map - Shows ONLY historical route */}
                          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                              <h3 className="text-sm font-semibold dark:text-white">Route Replay</h3>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                Watch the vehicle's journey play back in real-time
                              </p>
                            </div>
                            <div className="h-96">
                              <SimpleVehicleMap 
                                key={`replay-${historyDeviceId}-${historyPoints.length}`}
                                locations={playbackLocations}
                                selectedVehicleId={null}
                                focusVehicleId={historyDeviceId}
                                replayMode={true}
                                fullRoute={historyPoints}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </TabsContent>

                  {/* Saved Replays Tab */}
                  <TabsContent value="saved" className="flex-1 overflow-auto mt-0">
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <FolderOpen className="w-4 h-4 inline mr-2" />
                        {savedReplays.length} saved {savedReplays.length === 1 ? 'replay' : 'replays'}
                      </div>
                      
                      {savedReplays.length === 0 ? (
                        <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-center">
                          No saved replays yet. Load historical data and click "Save Replay" to save routes for later viewing.
                        </div>
                      ) : (
                        savedReplays.map((replay: any) => {
                          const vehicle = replay.vehicle;
                          return (
                            <div 
                              key={replay.id}
                              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 hover:border-primary dark:hover:border-primary transition-colors"
                              data-testid={`saved-replay-${replay.id}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-semibold dark:text-white truncate">
                                    {replay.name}
                                  </h3>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {vehicle ? (
                                      `${vehicle.vehicleNumber}${vehicle.year || vehicle.make ? 
                                        ` (${[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')})` : 
                                        ''}`
                                    ) : (
                                      replay.deviceId
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    {new Date(replay.startTime).toLocaleDateString()} • {replay.pointCount} points
                                    {replay.durationMinutes && ` • ${Math.round(replay.durationMinutes)} min`}
                                  </p>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => loadSavedReplay(replay.id)}
                                    disabled={isLoadingHistory}
                                    data-testid={`load-replay-${replay.id}`}
                                    className="h-8 px-2"
                                  >
                                    <Play className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteSavedReplayMutation.mutate(replay.id)}
                                    disabled={deleteSavedReplayMutation.isPending}
                                    data-testid={`delete-replay-${replay.id}`}
                                    className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Save Replay Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Route Replay</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="replay-name" className="text-sm font-medium mb-2 block">
                Replay Name
              </Label>
              <Input
                id="replay-name"
                type="text"
                value={replayName}
                onChange={(e) => setReplayName(e.target.value)}
                placeholder="Enter a name for this route replay"
                data-testid="replay-name-input"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Choose a descriptive name to help you identify this route later
              </p>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <div>Device: {historyDeviceId}</div>
              <div>Date: {historyDate}</div>
              <div>Points: {historyPoints.length}</div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              disabled={saveReplayMutation.isPending}
              data-testid="cancel-save-btn"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSaveReplay}
              disabled={saveReplayMutation.isPending || !replayName.trim()}
              data-testid="confirm-save-btn"
            >
              {saveReplayMutation.isPending ? 'Saving...' : 'Save Replay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
