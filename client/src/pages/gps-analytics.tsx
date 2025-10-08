import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, MapPin, Clock, Fuel, AlertTriangle } from "lucide-react";
import { useState } from "react";

export default function GPSAnalytics() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("7days");

  // Fetch vehicles
  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ['/api/vehicles'],
  });

  // Fetch trip analytics
  const { data: tripsData } = useQuery<any>({
    queryKey: ['/api/obd/trips'],
    select: (data) => data?.trips || []
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold dark:text-white mb-2">GPS Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Vehicle tracking statistics and performance metrics</p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Select value={selectedVehicleId || "all"} onValueChange={(val) => setSelectedVehicleId(val === "all" ? null : val)}>
            <SelectTrigger>
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
            <SelectTrigger>
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
                <p className="text-2xl font-bold dark:text-white">{totalTrips}</p>
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
                <p className="text-2xl font-bold dark:text-white">{totalDistance.toFixed(1)} mi</p>
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
                <p className="text-2xl font-bold dark:text-white">{Math.round(totalDuration)} min</p>
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
                <p className="text-2xl font-bold dark:text-white">{avgSpeed.toFixed(0)} mph</p>
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
                      <tr key={trip.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
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
      </div>
    </div>
  );
}
