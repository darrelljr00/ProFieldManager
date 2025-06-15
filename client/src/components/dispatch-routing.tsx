import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Route, 
  Navigation, 
  MapPin, 
  Clock, 
  Truck, 
  Zap as Optimize,
  RefreshCw,
  Calendar,
  User,
  Building
} from "lucide-react";

interface JobLocation {
  id: number;
  projectId: number;
  projectName: string;
  address: string;
  lat: number;
  lng: number;
  scheduledTime: string;
  estimatedDuration: number;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in-progress' | 'completed';
}

interface RouteOptimization {
  optimizedOrder: number[];
  totalDistance: number;
  totalDuration: number;
  routeLegs: {
    from: JobLocation;
    to: JobLocation;
    distance: number;
    duration: number;
    directions: string;
  }[];
}

interface DispatchRoutingProps {
  selectedDate?: string;
}

export function DispatchRouting({ selectedDate }: DispatchRoutingProps) {
  const [selectedDateState, setSelectedDateState] = useState(
    selectedDate || new Date().toISOString().split('T')[0]
  );
  const [startLocation, setStartLocation] = useState('');
  const [optimization, setOptimization] = useState<RouteOptimization | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { toast } = useToast();

  // Fetch scheduled jobs for the selected date
  const { data: scheduledJobsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/dispatch/jobs', selectedDateState],
    queryFn: async () => {
      const response = await apiRequest(`/api/dispatch/jobs?date=${selectedDateState}`, 'GET');
      return response as unknown as JobLocation[];
    },
  });

  // Ensure scheduledJobs is always an array
  const scheduledJobs = Array.isArray(scheduledJobsData) ? scheduledJobsData : [];

  const optimizeRouteMutation = useMutation({
    mutationFn: async (data: { jobs: JobLocation[]; startLocation: string }) => {
      setIsOptimizing(true);
      const result = await apiRequest('/api/dispatch/optimize-route', 'POST', data);
      return result as unknown as RouteOptimization;
    },
    onSuccess: (data: RouteOptimization) => {
      setOptimization(data);
      setIsOptimizing(false);
      toast({
        title: "Route Optimized",
        description: `Found optimal route visiting ${data.optimizedOrder.length} locations`,
      });
    },
    onError: (error: any) => {
      setIsOptimizing(false);
      toast({
        title: "Optimization Failed",
        description: error.message || "Failed to optimize route",
        variant: "destructive",
      });
    },
  });

  const handleOptimizeRoute = () => {
    if (scheduledJobs.length === 0) {
      toast({
        title: "No Jobs Available",
        description: "No scheduled jobs found for the selected date",
        variant: "destructive",
      });
      return;
    }

    if (!startLocation.trim()) {
      toast({
        title: "Start Location Required",
        description: "Please enter a starting location for the route",
        variant: "destructive",
      });
      return;
    }

    optimizeRouteMutation.mutate({
      jobs: scheduledJobs,
      startLocation: startLocation.trim(),
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDistance = (meters: number) => {
    const km = meters / 1000;
    return km < 1 ? `${meters}m` : `${km.toFixed(1)}km`;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: 'bg-gray-100 text-gray-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
    };
    return colors[status as keyof typeof colors] || colors.scheduled;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dispatch Routing</h2>
          <p className="text-gray-600">Optimize routes for scheduled jobs using Google Maps</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Date Selection and Start Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Route Configuration
          </CardTitle>
          <CardDescription>
            Select date and starting location for route optimization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDateState}
                onChange={(e) => setSelectedDateState(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startLocation">Starting Location</Label>
              <Input
                id="startLocation"
                placeholder="Enter starting address (e.g., office, warehouse)"
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
              />
            </div>
          </div>
          <Button 
            onClick={handleOptimizeRoute}
            disabled={isOptimizing || scheduledJobs.length === 0}
            className="w-full md:w-auto"
          >
            {isOptimizing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Optimizing Route...
              </>
            ) : (
              <>
                <Optimize className="h-4 w-4 mr-2" />
                Optimize Route ({scheduledJobs.length} jobs)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Scheduled Jobs ({scheduledJobs.length})
          </CardTitle>
          <CardDescription>
            Jobs scheduled for {new Date(selectedDateState).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading jobs...</span>
            </div>
          ) : scheduledJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No scheduled jobs found for this date</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledJobs.map((job: JobLocation, index: number) => (
                <div key={job.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-lg">{job.projectName}</span>
                        <Badge className={getPriorityColor(job.priority)}>
                          {job.priority}
                        </Badge>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          <span>{job.address}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(job.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{job.assignedTo || 'Unassigned'}</span>
                          </div>
                          <span>Est. {formatDuration(job.estimatedDuration)}</span>
                        </div>
                      </div>
                    </div>
                    {optimization && (
                      <div className="ml-4 text-center">
                        <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold">
                          {optimization.optimizedOrder.indexOf(index) + 1}
                        </div>
                        <span className="text-xs text-gray-500 mt-1 block">Route Order</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimized Route Results */}
      {optimization && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              Optimized Route
            </CardTitle>
            <CardDescription>
              Best route calculated by Google Maps API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Route Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{formatDistance(optimization.totalDistance)}</div>
                <div className="text-sm text-gray-600">Total Distance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{formatDuration(optimization.totalDuration)}</div>
                <div className="text-sm text-gray-600">Travel Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{optimization.optimizedOrder.length}</div>
                <div className="text-sm text-gray-600">Stops</div>
              </div>
            </div>

            {/* Route Steps */}
            <div className="space-y-3">
              <h4 className="font-semibold">Route Steps</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-green-100 rounded-lg">
                  <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                    S
                  </div>
                  <div>
                    <div className="font-medium">Start: {startLocation}</div>
                    <div className="text-sm text-gray-600">Beginning of route</div>
                  </div>
                </div>

                {optimization.routeLegs.map((leg, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{leg.to.projectName}</div>
                      <div className="text-sm text-gray-600">{leg.to.address}</div>
                      <div className="text-sm text-blue-600 mt-1">
                        {formatDistance(leg.distance)} • {formatDuration(leg.duration)}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getPriorityColor(leg.to.priority)}>
                        {leg.to.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button className="flex-1">
                <Navigation className="h-4 w-4 mr-2" />
                Start Navigation
              </Button>
              <Button variant="outline" className="flex-1">
                <Truck className="h-4 w-4 mr-2" />
                Assign Driver
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}