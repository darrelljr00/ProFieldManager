import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, MapPin, Clock, AlertTriangle, Navigation, Route as RouteIcon, Car } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function GPSAnalytics() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("7days");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Fetch vehicles
  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ['/api/vehicles'],
  });

  // Fetch trip analytics
  const { data: tripsData } = useQuery<any>({
    queryKey: ['/api/obd/trips'],
    select: (data) => data?.trips || []
  });

  // Fetch planned routes
  const { data: routes = [] } = useQuery<any[]>({
    queryKey: ['/api/routes'],
  });

  // Fetch live vehicle locations from OneStep GPS (poll every 30s)
  const { data: liveLocations = [] } = useQuery<any[]>({
    queryKey: ['/api/obd/latest-location'],
    refetchInterval: 30000, // Refresh every 30 seconds
    select: (data: any) => {
      // Handle both direct array and {locations: []} format
      const locations = data?.locations || data || [];
      if (!Array.isArray(locations)) return [];
      return locations.filter((loc: any) => loc.latitude && loc.longitude);
    }
  });

  // Fetch all projects to determine technician assignments
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['/api/projects'],
  });

  const trips = tripsData || [];
  const filteredTrips = selectedVehicleId 
    ? trips.filter((t: any) => t.vehicleId?.toString() === selectedVehicleId)
    : trips;

  // Calculate analytics
  const totalTrips = filteredTrips.length;
  const totalDistance = filteredTrips.reduce((sum: number, trip: any) => 
    sum + parseFloat(trip.distanceMiles || 0), 0);
  const totalDuration = filteredTrips.reduce((sum: number, trip: any) => 
    sum + (trip.durationMinutes || 0), 0);
  const avgSpeed = filteredTrips.length > 0 
    ? filteredTrips.reduce((sum: number, trip: any) => sum + parseFloat(trip.averageSpeed || 0), 0) / filteredTrips.length
    : 0;

  // Calculate route analytics
  const activeRoutes = routes.filter(r => r.status === 'in_progress');
  const completedRoutes = routes.filter(r => r.status === 'completed');
  const totalDeviations = routes.reduce((sum, r) => sum + (r.deviationCount || 0), 0);
  const liveVehicleCount = liveLocations.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold dark:text-white mb-2">GPS Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Vehicle tracking statistics and performance metrics</p>
        </div>

        <Tabs defaultValue="trips" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="trips" data-testid="tab-trips">
              <BarChart3 className="w-4 h-4 mr-2" />
              Trip History
            </TabsTrigger>
            <TabsTrigger value="routes" data-testid="tab-route-monitoring">
              <RouteIcon className="w-4 h-4 mr-2" />
              Route Monitoring
            </TabsTrigger>
          </TabsList>

          {/* Trip History Tab */}
          <TabsContent value="trips">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Select value={selectedVehicleId || "all"} onValueChange={(val) => setSelectedVehicleId(val === "all" ? null : val)}>
                <SelectTrigger data-testid="select-vehicle">
                  <SelectValue placeholder="All Vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicles</SelectItem>
                  {vehicles.map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      {vehicle.vehicleNumber} - {vehicle.licensePlate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger data-testid="select-time-range">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24hours">Last 24 Hours</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Trips</p>
                    <p className="text-2xl font-bold dark:text-white" data-testid="stat-total-trips">{totalTrips}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Distance</p>
                    <p className="text-2xl font-bold dark:text-white" data-testid="stat-total-distance">{totalDistance.toFixed(1)} mi</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Duration</p>
                    <p className="text-2xl font-bold dark:text-white" data-testid="stat-total-duration">{Math.round(totalDuration)} min</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg Speed</p>
                    <p className="text-2xl font-bold dark:text-white" data-testid="stat-avg-speed">{avgSpeed.toFixed(0)} mph</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Trip History Table */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">Recent Trips</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Vehicle</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Start Location</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">End Location</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Distance</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Duration</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Avg Speed</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrips.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No trips recorded yet
                        </td>
                      </tr>
                    ) : (
                      filteredTrips.slice(0, 20).map((trip: any) => {
                        const vehicle = vehicles.find(v => v.id === trip.vehicleId);
                        return (
                          <tr key={trip.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`trip-row-${trip.id}`}>
                            <td className="py-3 px-4 text-sm dark:text-white">
                              {vehicle?.vehicleNumber || `Vehicle ${trip.vehicleId}`}
                            </td>
                            <td className="py-3 px-4 text-sm dark:text-white">{trip.startLocation || 'N/A'}</td>
                            <td className="py-3 px-4 text-sm dark:text-white">{trip.endLocation || 'In Progress'}</td>
                            <td className="py-3 px-4 text-sm dark:text-white">
                              {trip.distanceMiles ? parseFloat(trip.distanceMiles).toFixed(1) : 0} mi
                            </td>
                            <td className="py-3 px-4 text-sm dark:text-white">{trip.durationMinutes || 0} min</td>
                            <td className="py-3 px-4 text-sm dark:text-white">
                              {trip.averageSpeed ? parseFloat(trip.averageSpeed).toFixed(0) : 0} mph
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                trip.status === 'active' 
                                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                              }`}>
                                {trip.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Route Monitoring Tab */}
          <TabsContent value="routes">
            {/* Route Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Navigation className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Active Routes</p>
                    <p className="text-2xl font-bold dark:text-white" data-testid="stat-active-routes">{activeRoutes.length}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <RouteIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Completed Routes</p>
                    <p className="text-2xl font-bold dark:text-white" data-testid="stat-completed-routes">{completedRoutes.length}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Car className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Live Vehicles</p>
                    <p className="text-2xl font-bold dark:text-white" data-testid="stat-live-vehicles">{liveVehicleCount}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Deviations</p>
                    <p className="text-2xl font-bold dark:text-white" data-testid="stat-total-deviations">{totalDeviations}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Route Map and List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Vehicle List */}
              <Card className="p-6 lg:col-span-1">
                <h2 className="text-lg font-semibold mb-4 dark:text-white">Live Vehicles</h2>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {liveLocations.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                      No vehicles detected. Vehicles will appear when GPS data is available.
                    </p>
                  ) : (
                    liveLocations.map((location: any) => (
                      <VehicleListItem
                        key={location.deviceId}
                        location={location}
                        vehicles={vehicles}
                        routes={routes}
                        projects={projects}
                      />
                    ))
                  )}
                </div>
              </Card>

              {/* Map */}
              <Card className="p-6 lg:col-span-2">
                <h2 className="text-lg font-semibold mb-4 dark:text-white">Live Route Map</h2>
                <RouteMap 
                  routes={routes} 
                  selectedRouteId={selectedRouteId} 
                  liveLocations={liveLocations}
                  vehicles={vehicles}
                  projects={projects}
                />
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function VehicleListItem({ location, vehicles, routes, projects }: any) {
  const [transitEta, setTransitEta] = useState<string | null>(null);
  const [transitDestination, setTransitDestination] = useState<string | null>(null);

  // Find the vehicle record from database
  const vehicle = vehicles.find((v: any) => v.oneStepGpsDeviceId === location.deviceId);
  const speed = location.speed || 0;
  const isMoving = speed >= 1;

  // Find active route for this vehicle (in transit)
  const activeRoute = routes.find((r: any) => r.vehicleId === vehicle?.id && r.status === 'in_progress');

  // Find all in-progress projects assigned to this vehicle, sorted by scheduledDate
  const activeProjects = projects
    .filter((p: any) => 
      p.vehicleId === vehicle?.id && 
      p.status === 'in_progress'
    )
    .sort((a: any, b: any) => {
      const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
      const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
      return dateA - dateB;
    });

  // Helper function to check if vehicle is at a job location (within 100m)
  const isAtLocation = (projectLat: number, projectLng: number) => {
    const vehicleLat = parseFloat(location.latitude);
    const vehicleLng = parseFloat(location.longitude);
    
    // Haversine formula for distance
    const R = 6371000; // Earth's radius in meters
    const dLat = (projectLat - vehicleLat) * Math.PI / 180;
    const dLon = (projectLng - vehicleLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(vehicleLat * Math.PI / 180) * Math.cos(projectLat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance < 100; // Within 100 meters
  };

  // Determine current job (vehicle is at location)
  const currentJob = activeProjects.find((p: any) => {
    if (p.latitude && p.longitude) {
      return isAtLocation(parseFloat(p.latitude), parseFloat(p.longitude));
    }
    return false;
  });

  // Determine next job(s) - all jobs that aren't the current one
  const upcomingJobs = activeProjects.filter((p: any) => p.id !== currentJob?.id);
  const nextJob = upcomingJobs[0]; // First upcoming job
  const transitJob = activeRoute?.project; // Job they're driving to

  // Get all unique technicians from active projects
  const assignedTechnicians = activeProjects.reduce((techs: any[], project: any) => {
    if (project.assignedUser) {
      const tech = {
        firstName: project.assignedUser.firstName,
        lastName: project.assignedUser.lastName,
      };
      // Avoid duplicates
      if (!techs.find(t => t.firstName === tech.firstName && t.lastName === tech.lastName)) {
        techs.push(tech);
      }
    }
    return techs;
  }, []);

  // Calculate ETA for in-transit job using Google Directions API
  useEffect(() => {
    if (!activeRoute || !location.latitude || !location.longitude) {
      setTransitEta(null);
      setTransitDestination(null);
      return;
    }
    if (!activeRoute.destinationLat || !activeRoute.destinationLng) return;

    const calculateETA = async () => {
      try {
        const response = await fetch('/api/google-maps/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: '/maps/api/directions/json',
            params: {
              origin: `${location.latitude},${location.longitude}`,
              destination: `${activeRoute.destinationLat},${activeRoute.destinationLng}`,
              mode: 'driving',
            },
          }),
        });

        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const leg = data.routes[0].legs[0];
          setTransitEta(leg.duration.text);
          setTransitDestination(leg.end_address);
        }
      } catch (error) {
        console.error('Error calculating ETA:', error);
      }
    };

    calculateETA();
    // Refresh ETA every 2 minutes
    const interval = setInterval(calculateETA, 120000);
    return () => clearInterval(interval);
  }, [location, activeRoute]);

  return (
    <div
      className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      data-testid={`vehicle-item-${location.deviceId}`}
    >
      {/* Vehicle Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="font-medium text-sm dark:text-white">
            {vehicle?.vehicleNumber || location.displayName || 'Unknown Vehicle'}
          </p>
          {vehicle?.licensePlate && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{vehicle.licensePlate}</p>
          )}
        </div>
        <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ml-2 ${
          isMoving
            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
        }`}>
          {speed.toFixed(0)} mph
        </span>
      </div>

      {/* Technicians Assigned */}
      {assignedTechnicians.length > 0 ? (
        <div className="mt-2 space-y-1">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">👥 Crew:</p>
          {assignedTechnicians.map((tech: any, idx: number) => (
            <div key={idx} className="text-xs text-gray-700 dark:text-gray-300 pl-4">
              • {tech.firstName} {tech.lastName}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">No crew assigned</p>
      )}

      {/* Current Job OR Previous Job */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        {currentJob ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-xs font-semibold text-green-700 dark:text-green-400">CURRENT JOB</p>
            </div>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 pl-4">
              {currentJob.jobName}
            </p>
            {currentJob.customer && (
              <p className="text-xs text-gray-500 dark:text-gray-400 pl-4">
                {currentJob.customer.companyName || `${currentJob.customer.firstName} ${currentJob.customer.lastName}`}
              </p>
            )}
          </>
        ) : activeProjects.length > 0 ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">PREVIOUS JOB</p>
            </div>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 pl-4">
              {activeProjects[0].jobName}
            </p>
            {activeProjects[0].customer && (
              <p className="text-xs text-gray-500 dark:text-gray-400 pl-4">
                {activeProjects[0].customer.companyName || `${activeProjects[0].customer.firstName} ${activeProjects[0].customer.lastName}`}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500">No current or previous job</p>
        )}
      </div>

      {/* In Transit - Show when moving with active route */}
      {isMoving && activeRoute && transitJob && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Navigation className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">IN TRANSIT</p>
          </div>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 pl-4">
            {transitJob.jobName}
          </p>
          {transitDestination && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1 pl-4">
              📍 {transitDestination}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 pl-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {activeRoute.estimatedDistance} mi
            </p>
            {transitEta && (
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                🕐 ETA: {transitEta}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Scheduled Job - Always show next scheduled job if exists */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        {nextJob ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3 h-3 text-gray-600 dark:text-gray-400" />
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">SCHEDULED JOB</p>
            </div>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 pl-4">
              {nextJob.jobName}
            </p>
            {nextJob.customer && (
              <p className="text-xs text-gray-500 dark:text-gray-400 pl-4">
                {nextJob.customer.companyName || `${nextJob.customer.firstName} ${nextJob.customer.lastName}`}
              </p>
            )}
            {nextJob.scheduledDate && (
              <p className="text-xs text-gray-500 dark:text-gray-400 pl-4">
                {new Date(nextJob.scheduledDate).toLocaleDateString()} {nextJob.scheduledTime || ''}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500">No scheduled jobs</p>
        )}
      </div>
    </div>
  );
}

function RouteListItem({ route, selectedRouteId, onSelect, vehicles, liveLocations }: any) {
  const [eta, setEta] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);

  // Find vehicle location if route has a vehicle assigned
  const vehicleLocation = route.vehicleId 
    ? liveLocations.find((loc: any) => {
        const vehicle = vehicles.find((v: any) => v.id === route.vehicleId);
        return vehicle && vehicle.oneStepGpsDeviceId === loc.deviceId;
      })
    : null;

  // Calculate ETA using Google Directions API
  useEffect(() => {
    if (!vehicleLocation || route.status !== 'in_progress') return;
    if (!route.destinationLat || !route.destinationLng) return;

    const calculateETA = async () => {
      try {
        const response = await fetch('/api/google-maps/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: '/maps/api/directions/json',
            params: {
              origin: `${vehicleLocation.latitude},${vehicleLocation.longitude}`,
              destination: `${route.destinationLat},${route.destinationLng}`,
              mode: 'driving',
            },
          }),
        });

        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const leg = data.routes[0].legs[0];
          setEta(leg.duration.text);
          setDestination(leg.end_address);
        }
      } catch (error) {
        console.error('Error calculating ETA:', error);
      }
    };

    calculateETA();
    // Refresh ETA every 2 minutes
    const interval = setInterval(calculateETA, 120000);
    return () => clearInterval(interval);
  }, [vehicleLocation, route]);

  return (
    <button
      onClick={() => onSelect(route.id.toString())}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        selectedRouteId === route.id.toString()
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
      data-testid={`route-item-${route.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium text-sm dark:text-white">
            {route.project?.jobName || `Route #${route.id}`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {route.user?.firstName} {route.user?.lastName}
          </p>
          {destination && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
              📍 {destination}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {route.estimatedDistance} mi
            </p>
            {eta && vehicleLocation && route.status === 'in_progress' && (
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                🕐 ETA: {eta}
              </p>
            )}
            {!vehicleLocation && route.status === 'in_progress' && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {Math.round(parseFloat(route.estimatedDuration) / 60)} min
              </p>
            )}
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ml-2 ${
          route.status === 'in_progress'
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
            : route.status === 'completed'
            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
        }`}>
          {route.status}
        </span>
      </div>
      {route.deviationCount > 0 && (
        <div className="mt-2 flex items-center text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {route.deviationCount} deviation{route.deviationCount > 1 ? 's' : ''}
        </div>
      )}
    </button>
  );
}

function RouteMap({ routes, selectedRouteId, liveLocations, vehicles, projects }: any) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routeLinesRef = useRef<Map<number, L.Polyline>>(new Map());
  const markersRef = useRef<Map<number, { start: L.Marker, end: L.Marker }>>(new Map());
  const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [40.7485, -73.9883],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update routes
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    
    // Clear existing routes
    routeLinesRef.current.forEach(line => map.removeLayer(line));
    markersRef.current.forEach(markers => {
      map.removeLayer(markers.start);
      map.removeLayer(markers.end);
    });
    routeLinesRef.current.clear();
    markersRef.current.clear();

    if (routes.length === 0 && liveLocations.length === 0) return;

    const bounds = L.latLngBounds([]);

    routes.forEach((route: any) => {
      const isSelected = selectedRouteId === route.id.toString();
      const originLat = parseFloat(route.originLat);
      const originLng = parseFloat(route.originLng);
      const destLat = parseFloat(route.destinationLat);
      const destLng = parseFloat(route.destinationLng);

      if (!originLat || !originLng || !destLat || !destLng) return;

      const routeColor = route.status === 'in_progress' 
        ? '#3b82f6' 
        : route.status === 'completed' 
        ? '#10b981' 
        : '#6b7280';

      const line = L.polyline(
        [[originLat, originLng], [destLat, destLng]], 
        { 
          color: routeColor,
          weight: isSelected ? 5 : 3,
          opacity: isSelected ? 1 : 0.6,
        }
      ).addTo(map);

      const startIcon = L.divIcon({
        html: `<div style="background-color: ${routeColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const endIcon = L.divIcon({
        html: `<div style="background-color: ${routeColor}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white;"></div>`,
        className: '',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const startMarker = L.marker([originLat, originLng], { icon: startIcon }).addTo(map);
      const endMarker = L.marker([destLat, destLng], { icon: endIcon }).addTo(map);

      startMarker.bindPopup(`<strong>Start:</strong> ${route.project?.jobName || 'Route #' + route.id}<br>${route.user?.firstName} ${route.user?.lastName}`);
      endMarker.bindPopup(`<strong>Destination:</strong> ${route.project?.jobName || 'Route #' + route.id}`);

      routeLinesRef.current.set(route.id, line);
      markersRef.current.set(route.id, { start: startMarker, end: endMarker });

      bounds.extend([originLat, originLng]);
      bounds.extend([destLat, destLng]);
    });

    // Add live vehicle markers with detailed info
    liveLocations.forEach((location: any) => {
      const lat = parseFloat(location.latitude);
      const lng = parseFloat(location.longitude);
      
      if (!lat || !lng) return;

      const vehicle = vehicles.find((v: any) => v.oneStepGpsDeviceId === location.deviceId);
      const speed = location.speed || 0;
      const isMoving = speed >= 1;

      // Find if this vehicle is assigned to any route
      const assignedRoute = routes.find((r: any) => r.vehicleId === vehicle?.id);
      
      // Create vehicle icon (car marker) with route indicator
      const hasRoute = assignedRoute && assignedRoute.status === 'in_progress';
      const vehicleIcon = L.divIcon({
        html: `<div style="
          background-color: ${isMoving ? '#22c55e' : '#ef4444'};
          width: ${hasRoute ? '32px' : '28px'};
          height: ${hasRoute ? '32px' : '28px'};
          border-radius: 50%;
          border: ${hasRoute ? '4px solid #3b82f6' : '3px solid white'};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 6px rgba(0,0,0,0.4);
          position: relative;
        ">
          <svg width="${hasRoute ? '18' : '16'}" height="${hasRoute ? '18' : '16'}" viewBox="0 0 24 24" fill="white">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
        </div>`,
        className: '',
        iconSize: [hasRoute ? 32 : 28, hasRoute ? 32 : 28],
        iconAnchor: [hasRoute ? 16 : 14, hasRoute ? 16 : 14],
      });

      // Remove old marker if exists
      const oldMarker = vehicleMarkersRef.current.get(location.deviceId);
      if (oldMarker) {
        map.removeLayer(oldMarker);
      }

      const marker = L.marker([lat, lng], { icon: vehicleIcon }).addTo(map);
      
      // Find all active projects assigned to this vehicle
      const activeProjects = projects.filter((p: any) => 
        p.vehicleId === vehicle?.id && 
        p.status === 'in_progress'
      );

      // Get all technicians assigned to active projects for this vehicle
      const assignedTechnicians = activeProjects.reduce((techs: any[], project: any) => {
        if (project.assignedUser) {
          const tech = {
            firstName: project.assignedUser.firstName,
            lastName: project.assignedUser.lastName
          };
          // Avoid duplicates
          if (!techs.find(t => t.firstName === tech.firstName && t.lastName === tech.lastName)) {
            techs.push(tech);
          }
        }
        return techs;
      }, []);
      
      // Enhanced popup with more details
      const lastUpdate = location.timestamp ? new Date(location.timestamp).toLocaleTimeString() : 'Unknown';
      let popupContent = `
        <div style="min-width: 220px;">
          <strong style="font-size: 14px;">${vehicle?.vehicleNumber || location.displayName || 'Unknown Vehicle'}</strong><br>
          ${vehicle ? `<div style="color: #666; font-size: 12px; margin: 4px 0;">${vehicle.licensePlate || 'No plate'}</div>` : ''}
          <hr style="margin: 6px 0; border: none; border-top: 1px solid #ddd;">
          <div style="font-size: 12px;">
            <strong>Status:</strong> ${isMoving ? '🟢 Moving' : '🔴 Stopped'}<br>
            <strong>Speed:</strong> ${speed.toFixed(0)} mph<br>
            ${vehicle?.fuelEconomyMpg ? `<strong>MPG:</strong> ${vehicle.fuelEconomyMpg}<br>` : ''}
            <strong>Last Update:</strong> ${lastUpdate}
          </div>
      `;
      
      // Show assigned crew
      if (assignedTechnicians.length > 0) {
        popupContent += `
          <hr style="margin: 6px 0; border: none; border-top: 1px solid #ddd;">
          <div style="font-size: 12px; margin-top: 6px;">
            <strong>👥 Crew:</strong><br>
            ${assignedTechnicians.map((tech: any) => 
              `<div style="margin-left: 12px;">• ${tech.firstName} ${tech.lastName}</div>`
            ).join('')}
          </div>
        `;
      }
      
      if (assignedRoute) {
        popupContent += `
          <hr style="margin: 6px 0; border: none; border-top: 1px solid #ddd;">
          <div style="font-size: 12px; background: #eff6ff; padding: 6px; border-radius: 4px; margin-top: 6px;">
            <strong style="color: #3b82f6;">📍 Active Route:</strong><br>
            ${assignedRoute.project?.jobName || 'Route #' + assignedRoute.id}<br>
            <span style="color: #666;">${assignedRoute.estimatedDistance} mi</span>
          </div>
        `;
      }
      
      popupContent += `</div>`;
      
      marker.bindPopup(popupContent);

      vehicleMarkersRef.current.set(location.deviceId, marker);
      bounds.extend([lat, lng]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routes, selectedRouteId, liveLocations, vehicles]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-[600px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
      data-testid="route-map"
    />
  );
}
