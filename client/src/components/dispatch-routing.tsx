import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DispatchMap } from "@/components/dispatch-map";
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
  Building,
  Play,
  Square,
  CheckCircle,
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
    trafficDelay?: number;
    trafficCondition?: 'normal' | 'light' | 'moderate' | 'heavy' | 'unknown';
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
  const queryClient = useQueryClient();

  // Handle date change
  const handleDateChange = (newDate: string) => {
    setSelectedDateState(newDate);
    setOptimization(null); // Clear any existing optimization when date changes
  };

  // Fetch scheduled jobs for the selected date
  const { data: scheduledJobsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/dispatch/scheduled-jobs', selectedDateState],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/dispatch/scheduled-jobs?date=${selectedDateState}`);
      return response as unknown as JobLocation[];
    },
  });

  // Ensure scheduledJobs is always an array
  const scheduledJobs = Array.isArray(scheduledJobsData) ? scheduledJobsData : [];

  // WebSocket listeners for real-time job updates
  useEffect(() => {
    const handleJobStatusUpdate = (data: any) => {
      toast({
        title: "Job Status Updated",
        description: `${data.updatedBy} updated job status to ${data.status}`,
      });
      // Invalidate and refetch jobs
      queryClient.invalidateQueries({ queryKey: ['/api/dispatch/scheduled-jobs'] });
    };

    const handleJobScheduled = (data: any) => {
      toast({
        title: "Job Scheduled",
        description: `${data.scheduledBy} scheduled a new job`,
      });
      // Invalidate and refetch jobs
      queryClient.invalidateQueries({ queryKey: ['/api/dispatch/scheduled-jobs'] });
    };

    // Add WebSocket event listeners
    if (typeof window !== 'undefined' && (window as any).ws) {
      const ws = (window as any).ws;
      ws.addEventListener('message', (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'job_status_updated') {
            handleJobStatusUpdate(message.data);
          } else if (message.type === 'job_scheduled') {
            handleJobScheduled(message.data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
    }

    return () => {
      // Cleanup event listeners if needed
    };
  }, [queryClient, toast]);

  const optimizeRouteMutation = useMutation({
    mutationFn: async (data: { jobs: JobLocation[]; startLocation: string }) => {
      setIsOptimizing(true);
      const result = await apiRequest('POST', '/api/dispatch/optimize-route', data);
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

  // Job status update mutation
  const updateJobStatusMutation = useMutation({
    mutationFn: async (data: { jobId: number; status: string; location?: string; notes?: string }) => {
      const result = await apiRequest('PATCH', `/api/dispatch/jobs/${data.jobId}/status`, data);
      return result;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Job Status Updated",
        description: data.message || "Job status updated successfully",
      });
      // Refresh jobs list
      queryClient.invalidateQueries({ queryKey: ['/api/dispatch/scheduled-jobs'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update job status",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (jobId: number, newStatus: string) => {
    updateJobStatusMutation.mutate({
      jobId,
      status: newStatus,
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
        <div className="flex items-center gap-4">
          {/* Date Picker for Scheduled Jobs */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Label htmlFor="dispatch-date" className="text-sm font-medium text-gray-700">
              Date:
            </Label>
            <Input
              id="dispatch-date"
              type="date"
              value={selectedDateState}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Date Selection and Start Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Route Configuration
          </CardTitle>
          <CardDescription>
            Set starting location for route optimization (date selected above)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="startLocation">Starting Location</Label>
            <Input
              id="startLocation"
              placeholder="Enter starting address (e.g., office, warehouse)"
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
            />
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

      {/* Map and Jobs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Google Maps */}
        <DispatchMap 
          jobs={scheduledJobs} 
          optimization={optimization} 
          startLocation={startLocation}
        />

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
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-lg">{job.projectName}</span>
                          <Badge className={getPriorityColor(job.priority)}>
                            {job.priority}
                          </Badge>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                        </div>
                        
                        {/* Status Update Buttons */}
                        <div className="flex gap-1">
                          {job.status === 'scheduled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusUpdate(job.id, 'in-progress')}
                              disabled={updateJobStatusMutation.isPending}
                              className="h-7 px-2"
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Start
                            </Button>
                          )}
                          {job.status === 'in-progress' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(job.id, 'scheduled')}
                                disabled={updateJobStatusMutation.isPending}
                                className="h-7 px-2"
                              >
                                <Square className="h-3 w-3 mr-1" />
                                Pause
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(job.id, 'completed')}
                                disabled={updateJobStatusMutation.isPending}
                                className="h-7 px-2"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Complete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          <span>{job.address}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{job.scheduledTime}</span>
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
      </div>

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
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
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {optimization.routeLegs.reduce((sum, leg) => sum + (leg.trafficDelay || 0), 0).toFixed(0)}m
                </div>
                <div className="text-sm text-gray-600">Traffic Delay</div>
              </div>
            </div>

            {/* Real-time Traffic Status */}
            <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Real-time Traffic Conditions
                </h4>
                <div className="text-xs text-gray-500">Updated 30s ago</div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {optimization.routeLegs.map((leg, index) => {
                  const condition = leg.trafficCondition || 'normal';
                  const colorMap = {
                    'heavy': 'bg-red-500 text-red-700',
                    'moderate': 'bg-yellow-500 text-yellow-700', 
                    'light': 'bg-orange-400 text-orange-700',
                    'normal': 'bg-green-500 text-green-700',
                    'unknown': 'bg-gray-400 text-gray-700'
                  };
                  return (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div className={`w-3 h-3 rounded-full ${colorMap[condition]?.split(' ')[0] || 'bg-gray-400'}`}></div>
                      <span className="text-xs">Leg {index + 1}: {condition}</span>
                    </div>
                  );
                })}
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

                {optimization.routeLegs.map((leg, index) => {
                  const condition = leg.trafficCondition || 'normal';
                  const delay = leg.trafficDelay || 0;
                  const trafficColor = condition === 'heavy' ? 'text-red-600' : 
                                     condition === 'moderate' ? 'text-yellow-600' :
                                     condition === 'light' ? 'text-orange-600' : 'text-green-600';
                  
                  return (
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
                        {delay > 0 && (
                          <div className="text-xs text-orange-600 mt-1">
                            +{Math.round(delay)} min traffic delay
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge className={getPriorityColor(leg.to.priority)}>
                          {leg.to.priority}
                        </Badge>
                        <div className={`text-xs mt-1 font-medium ${trafficColor}`}>
                          {condition} traffic
                        </div>
                      </div>
                    </div>
                  );
                })}
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