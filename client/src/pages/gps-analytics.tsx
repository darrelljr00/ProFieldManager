import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, MapPin, Clock, AlertTriangle, Navigation, Route as RouteIcon } from "lucide-react";
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
              {/* Route List */}
              <Card className="p-6 lg:col-span-1">
                <h2 className="text-lg font-semibold mb-4 dark:text-white">Routes</h2>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {routes.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                      No routes yet. Click "Directions" on a job to create a route.
                    </p>
                  ) : (
                    routes.map((route: any) => (
                      <button
                        key={route.id}
                        onClick={() => setSelectedRouteId(route.id.toString())}
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
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {route.estimatedDistance} mi • {Math.round(parseFloat(route.estimatedDuration) / 60)} min
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
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
                    ))
                  )}
                </div>
              </Card>

              {/* Map */}
              <Card className="p-6 lg:col-span-2">
                <h2 className="text-lg font-semibold mb-4 dark:text-white">Route Map</h2>
                <RouteMap routes={routes} selectedRouteId={selectedRouteId} />
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function RouteMap({ routes, selectedRouteId }: { routes: any[], selectedRouteId: string | null }) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routeLinesRef = useRef<Map<number, L.Polyline>>(new Map());
  const markersRef = useRef<Map<number, { start: L.Marker, end: L.Marker }>>(new Map());

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

  useEffect(() => {
    if (!mapRef.current || routes.length === 0) return;

    const map = mapRef.current;
    
    // Clear existing routes
    routeLinesRef.current.forEach(line => map.removeLayer(line));
    markersRef.current.forEach(markers => {
      map.removeLayer(markers.start);
      map.removeLayer(markers.end);
    });
    routeLinesRef.current.clear();
    markersRef.current.clear();

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

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routes, selectedRouteId]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-[600px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
      data-testid="route-map"
    />
  );
}
