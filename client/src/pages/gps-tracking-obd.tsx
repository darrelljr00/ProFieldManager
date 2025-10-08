import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SimpleVehicleMap } from "@/components/map/simple-vehicle-map";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Bell, Gauge, Zap, Thermometer, Activity } from "lucide-react";

export default function GPSTrackingOBD() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

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
                  locations={obdLocations}
                  selectedVehicleId={effectiveVehicleId}
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
            
            {/* Right Panel - Trip History (30%) */}
            <div className="col-span-4">
              <Card className="p-4 h-full overflow-auto">
                <h3 className="text-lg font-semibold mb-4 dark:text-white">Trip History</h3>
                <div className="space-y-3">
                  {obdTrips.filter((t: any) => t.vehicleId?.toString() === effectiveVehicleId).length === 0 ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">No trips recorded yet</p>
                  ) : (
                    obdTrips
                      .filter((t: any) => t.vehicleId?.toString() === effectiveVehicleId)
                      .map((trip: any) => (
                        <div key={trip.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-sm dark:text-white">{trip.startLocation || 'Trip'}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{trip.endLocation || 'In Progress'}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              trip.status === 'active' 
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            }`}>
                              {trip.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">Distance</p>
                              <p className="font-medium dark:text-white">{trip.distanceMiles ? parseFloat(trip.distanceMiles).toFixed(1) : 0} mi</p>
                            </div>
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">Duration</p>
                              <p className="font-medium dark:text-white">{trip.durationMinutes || 0} min</p>
                            </div>
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">Avg Speed</p>
                              <p className="font-medium dark:text-white">{trip.averageSpeed ? parseFloat(trip.averageSpeed).toFixed(0) : 0} mph</p>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
