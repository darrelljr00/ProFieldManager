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
import { ScheduledJobsVehicleWindow } from "@/components/scheduled-jobs-vehicle-window";
import { DroppableVehicleContainer } from "@/components/droppable-vehicle-container";
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DraggableJobItem } from "@/components/draggable-job-item";
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
  Map,
  Grid3X3,
  ExternalLink
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
  vehicleId?: string;
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
  const [mapCount, setMapCount] = useState<'1' | '2' | '4'>('1');
  const [undoStack, setUndoStack] = useState<Array<{jobId: number, fromVehicle: string, toVehicle: string, timestamp: number}>>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch dispatch routing settings to determine if multi-map view should be shown
  const { data: dispatchSettings } = useQuery({
    queryKey: ['/api/settings/dispatch-routing'],
    queryFn: () => apiRequest('GET', '/api/settings/dispatch-routing')
  }) as { data: { showMultiMapView?: boolean; vehicleTabsCount?: number; maxJobsPerVehicle?: string | number } | undefined };

  // Handle date change
  const handleDateChange = (newDate: string) => {
    setSelectedDateState(newDate);
    setOptimization(null); // Clear any existing optimization when date changes
  };

  // Fetch scheduled jobs for the selected date
  const { data: scheduledJobsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/dispatch/scheduled-jobs', selectedDateState],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/dispatch/scheduled-jobs?date=${selectedDateState}`);
        // Check if response is already parsed JSON or needs parsing
        let data;
        if (response && typeof response === 'object' && 'json' in response) {
          data = await response.json();
        } else {
          data = response;
        }
        return Array.isArray(data) ? data as JobLocation[] : [];
      } catch (error) {
        console.error('Error fetching scheduled jobs:', error);
        return [];
      }
    },
  });

  // Fetch all vehicles
  const { data: vehiclesData } = useQuery({
    queryKey: ['/api/vehicles'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/vehicles');
        return response as any[];
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        return [];
      }
    },
  });

  // Fetch vehicle-to-technician mapping from pre-trip inspections
  const { data: inspectionAssignments } = useQuery({
    queryKey: ['/api/vehicles/inspection-assignments', selectedDateState],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/vehicles/inspection-assignments?date=${selectedDateState}`);
        return response as Record<number, number>; // vehicleId → userId
      } catch (error) {
        console.error('Error fetching inspection assignments:', error);
        return {};
      }
    },
    enabled: !!selectedDateState,
  });

  // Create reverse mapping: userId → vehicleId
  const techToVehicleMap: Record<number, number> = {};
  if (inspectionAssignments) {
    Object.entries(inspectionAssignments).forEach(([vehicleId, userId]) => {
      techToVehicleMap[userId as number] = parseInt(vehicleId);
    });
  }

  // Create mapping from vehicle index to actual vehicle data
  // MUST use the same ordering as job assignments to ensure alignment
  const getVehicleByIndex = (index: number) => {
    if (!vehiclesData || !Array.isArray(vehiclesData) || vehiclesData.length === 0) return null;
    
    // Use inspectionAssignments ordering (same as job assignment logic at line 187)
    if (inspectionAssignments && Object.keys(inspectionAssignments).length > 0) {
      const vehicleIds = Object.keys(inspectionAssignments).map(id => parseInt(id)).sort((a, b) => a - b);
      const actualVehicleId = vehicleIds[index - 1]; // index is 1-based
      return vehiclesData.find((v: any) => v.id === actualVehicleId) || null;
    }
    
    // Fallback: if no inspections, use all vehicles sorted by ID
    const sortedVehicles = [...vehiclesData].sort((a: any, b: any) => a.id - b.id);
    return sortedVehicles[index - 1] || null;
  };

  // Ensure scheduledJobs is always an array and auto-assign based on inspections
  const scheduledJobs = Array.isArray(scheduledJobsData) ? scheduledJobsData.map((job: any) => {
    // If job already has a vehicle assignment (and it's not the default), keep it
    if (job.vehicleId && job.vehicleId !== 'unassigned' && !job.vehicleId.startsWith('vehicle-')) {
      return job;
    }
    
    // If job has an assignedUserId, check if that tech inspected a vehicle today
    if (job.assignedUserId) {
      const techUserId = job.assignedUserId;
      const assignedVehicleId = techToVehicleMap[techUserId];
      
      if (assignedVehicleId) {
        // Find the vehicle index (1-based) to create vehicleId like "vehicle-1"
        const vehicleIds = Object.keys(inspectionAssignments || {}).map(id => parseInt(id)).sort((a, b) => a - b);
        const vehicleIndex = vehicleIds.indexOf(assignedVehicleId) + 1;
        
        if (vehicleIndex > 0) {
          return {
            ...job,
            vehicleId: `vehicle-${vehicleIndex}`
          };
        }
      }
    }
    
    // No assignment found, mark as unassigned
    return {
      ...job,
      vehicleId: job.vehicleId || 'unassigned'
    };
  }) : [];
  
  // Debug: Log scheduled jobs data to verify vehicleId assignments
  useEffect(() => {
    console.log('Inspection assignments:', inspectionAssignments);
    console.log('Tech to vehicle map:', techToVehicleMap);
    console.log('Scheduled jobs data:', scheduledJobs);
  }, [scheduledJobs, inspectionAssignments]);

  // Force refresh of data when component mounts to ensure fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/dispatch/scheduled-jobs'] });
  }, [queryClient]);

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
          } else if (message.type === 'job_vehicle_assigned') {
            // Handle job vehicle assignment updates
            toast({
              title: "Job Vehicle Assignment",
              description: `${message.data.updatedBy} assigned job to vehicle`,
            });
            // Refetch scheduled jobs to update dispatch routing
            queryClient.invalidateQueries({ queryKey: ['/api/dispatch/scheduled-jobs'] });
          } else if (message.type === 'job_status_changed') {
            // Handle job status changes that affect dispatch routing
            toast({
              title: "Job Status Changed",
              description: `${message.data.projectName} changed from ${message.data.oldStatus} to ${message.data.newStatus}`,
            });
            // Refetch scheduled jobs to update dispatch routing
            queryClient.invalidateQueries({ queryKey: ['/api/dispatch/scheduled-jobs'] });
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
      const response = await apiRequest('POST', '/api/dispatch/optimize-route', data);
      const result = await response.json();
      return result as RouteOptimization;
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
      const response = await apiRequest('PATCH', `/api/dispatch/jobs/${data.jobId}/status`, data);
      const result = await response.json();
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

  // Job vehicle assignment mutation
  const assignJobToVehicleMutation = useMutation({
    mutationFn: async (data: { jobId: number; vehicleId: string }) => {
      const response = await apiRequest('PATCH', `/api/dispatch/jobs/${data.jobId}/assign-vehicle`, data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Job Assigned",
        description: "Job successfully assigned to vehicle",
      });
      // Force a hard refresh of scheduled jobs data
      queryClient.invalidateQueries({ queryKey: ['/api/dispatch/scheduled-jobs'] });
      queryClient.refetchQueries({ queryKey: ['/api/dispatch/scheduled-jobs', selectedDateState] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign job to vehicle",
        variant: "destructive",
      });
    },
  });

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const jobId = active.id as number;
    const newVehicleId = over.id as string;

    // Find the job being dragged
    const draggedJob = scheduledJobs.find(job => job.id === jobId);
    if (!draggedJob) return;

    // If dropped in same vehicle, no action needed
    if (draggedJob.vehicleId === newVehicleId) return;

    // Check max jobs per vehicle limit (but not for unassigned)
    if (newVehicleId !== 'unassigned' && dispatchSettings?.maxJobsPerVehicle !== 'unlimited') {
      const maxJobs = parseInt(dispatchSettings.maxJobsPerVehicle as string);
      const currentJobsInVehicle = scheduledJobs.filter(job => job.vehicleId === newVehicleId).length;
      
      if (currentJobsInVehicle >= maxJobs) {
        toast({
          title: "Vehicle at Capacity",
          description: `Vehicle ${newVehicleId.replace('vehicle-', '')} already has ${maxJobs} job(s). Maximum capacity reached.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Track this change for undo functionality
    const undoAction = {
      jobId: draggedJob.projectId,
      fromVehicle: draggedJob.vehicleId || 'unassigned',
      toVehicle: newVehicleId,
      timestamp: Date.now()
    };

    // Add to undo stack (keep only last 14 actions)
    setUndoStack(prev => [undoAction, ...prev.slice(0, 13)]);

    // Update the job's vehicle assignment
    assignJobToVehicleMutation.mutate({
      jobId: draggedJob.projectId,
      vehicleId: newVehicleId
    });
  };

  // Handle undo last action
  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[0];
    
    // Revert the job assignment
    assignJobToVehicleMutation.mutate({
      jobId: lastAction.jobId,
      vehicleId: lastAction.fromVehicle
    });

    // Remove the action from undo stack
    setUndoStack(prev => prev.slice(1));

    toast({
      title: "Action Undone",
      description: "Job assignment has been reverted to previous vehicle.",
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

  // Function to open multiple maps in a new window
  const openMultipleMapWindow = () => {
    const count = parseInt(mapCount);
    const windowFeatures = 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes';
    const newWindow = window.open('about:blank', '_blank', windowFeatures);
    
    if (!newWindow) {
      toast({
        title: "Failed to open window",
        description: "Please allow popups for this site",
        variant: "destructive"
      });
      return;
    }

    // Create the HTML for the multi-map window
    const mapHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dispatch Routing - ${count} Map${count > 1 ? 's' : ''}</title>
          <script src="https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCy9lgjvkKV3vS_U1IIcmxJUC8q8yJaASI'}&libraries=places"></script>
          <style>
            body { 
              margin: 0; 
              padding: 10px; 
              font-family: Arial, sans-serif; 
              background: #f5f5f5; 
            }
            .maps-container { 
              display: ${count === 1 ? 'block' : count === 2 ? 'grid' : 'grid'};
              ${count === 2 ? 'grid-template-columns: 1fr 1fr;' : ''}
              ${count === 4 ? 'grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;' : ''}
              gap: 10px; 
              height: ${count === 1 ? '100vh' : count === 2 ? '95vh' : '90vh'};
            }
            .map-container { 
              border: 2px solid #ddd; 
              border-radius: 8px;
              overflow: hidden;
              background: white;
            }
            .map-title {
              background: #2563eb;
              color: white;
              padding: 8px 16px;
              font-weight: bold;
              font-size: 14px;
            }
            .map {
              height: ${count === 1 ? 'calc(100% - 40px)' : count === 2 ? 'calc(100% - 40px)' : 'calc(100% - 40px)'};
              width: 100%;
            }
            h1 {
              text-align: center;
              color: #1e293b;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <h1>Dispatch Routing Maps - ${new Date(selectedDateState).toLocaleDateString()}</h1>
          <div class="maps-container">
            ${Array.from({ length: count }, (_, i) => `
              <div class="map-container">
                <div class="map-title">Map ${i + 1}${count > 1 ? ` - Zone ${String.fromCharCode(65 + i)}` : ''}</div>
                <div class="map" id="map-${i}"></div>
              </div>
            `).join('')}
          </div>
          
          <script>
            const jobs = ${JSON.stringify(scheduledJobs)};
            const startLocation = "${startLocation}";
            const optimization = ${JSON.stringify(optimization)};
            
            // Initialize all maps
            const maps = [];
            const markers = [];
            
            function initMaps() {
              for (let i = 0; i < ${count}; i++) {
                const mapElement = document.getElementById('map-' + i);
                const map = new google.maps.Map(mapElement, {
                  zoom: 12,
                  center: { lat: 32.7767, lng: -96.7970 }, // Dallas default
                  mapTypeId: google.maps.MapTypeId.ROADMAP
                });
                maps.push(map);
                markers.push([]);
                
                // Add jobs to each map (for demo - you can customize job distribution)
                addJobsToMap(map, i);
              }
              
              if (jobs.length > 0) {
                fitMapToBounds();
              }
            }
            
            function addJobsToMap(map, mapIndex) {
              // For multiple maps, distribute jobs evenly
              const jobsPerMap = Math.ceil(jobs.length / ${count});
              const startIndex = mapIndex * jobsPerMap;
              const endIndex = Math.min(startIndex + jobsPerMap, jobs.length);
              const mapJobs = jobs.slice(startIndex, endIndex);
              
              mapJobs.forEach((job, index) => {
                if (job.address) {
                  const geocoder = new google.maps.Geocoder();
                  geocoder.geocode({ address: job.address }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                      const position = results[0].geometry.location;
                      
                      const marker = new google.maps.Marker({
                        position: position,
                        map: map,
                        title: job.projectName,
                        label: {
                          text: (startIndex + index + 1).toString(),
                          color: 'white',
                          fontWeight: 'bold'
                        },
                        icon: {
                          url: 'data:image/svg+xml,' + encodeURIComponent(\`
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                              <circle cx="16" cy="16" r="12" fill="\${getPriorityColor(job.priority)}" stroke="white" stroke-width="3"/>
                            </svg>
                          \`),
                          scaledSize: new google.maps.Size(32, 32)
                        }
                      });
                      
                      const infoWindow = new google.maps.InfoWindow({
                        content: \`
                          <div style="padding: 8px; max-width: 200px;">
                            <h3 style="margin: 0 0 8px 0; color: #1e293b;">\${job.projectName}</h3>
                            <p style="margin: 4px 0; font-size: 12px; color: #64748b;"><strong>Address:</strong> \${job.address}</p>
                            <p style="margin: 4px 0; font-size: 12px; color: #64748b;"><strong>Time:</strong> \${job.scheduledTime}</p>
                            <p style="margin: 4px 0; font-size: 12px; color: #64748b;"><strong>Duration:</strong> \${job.estimatedDuration} min</p>
                            <p style="margin: 4px 0; font-size: 12px; color: #64748b;"><strong>Priority:</strong> \${job.priority}</p>
                            <p style="margin: 4px 0; font-size: 12px; color: #64748b;"><strong>Status:</strong> \${job.status}</p>
                          </div>
                        \`
                      });
                      
                      marker.addListener('click', () => {
                        infoWindow.open(map, marker);
                      });
                      
                      markers[mapIndex].push(marker);
                    }
                  });
                }
              });
              
              // Add start location marker if provided
              if (startLocation && mapIndex === 0) {
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ address: startLocation }, (results, status) => {
                  if (status === 'OK' && results[0]) {
                    const position = results[0].geometry.location;
                    new google.maps.Marker({
                      position: position,
                      map: map,
                      title: 'Start Location',
                      icon: {
                        url: 'data:image/svg+xml,' + encodeURIComponent(\`
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                            <circle cx="16" cy="16" r="12" fill="#10b981" stroke="white" stroke-width="3"/>
                            <text x="16" y="20" text-anchor="middle" fill="white" font-weight="bold" font-size="12">S</text>
                          </svg>
                        \`),
                        scaledSize: new google.maps.Size(32, 32)
                      }
                    });
                  }
                });
              }
            }
            
            function getPriorityColor(priority) {
              const colors = {
                low: '#3b82f6',
                medium: '#f59e0b',
                high: '#f97316',
                urgent: '#ef4444'
              };
              return colors[priority] || colors.medium;
            }
            
            function fitMapToBounds() {
              // Fit first map to show all jobs (others will follow similar pattern)
              if (maps.length > 0 && jobs.length > 0) {
                const bounds = new google.maps.LatLngBounds();
                jobs.forEach(job => {
                  if (job.address) {
                    // This is a simplified approach - in practice you'd geocode first
                    bounds.extend(new google.maps.LatLng(32.7767, -96.7970));
                  }
                });
                maps.forEach(map => map.fitBounds(bounds));
              }
            }
            
            // Initialize when Google Maps is loaded
            if (typeof google !== 'undefined') {
              initMaps();
            } else {
              window.onload = initMaps;
            }
          </script>
        </body>
      </html>
    `;

    newWindow.document.write(mapHTML);
    newWindow.document.close();
    
    toast({
      title: "Maps opened",
      description: `${count} map${count > 1 ? 's' : ''} opened in new window`,
    });
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
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={handleOptimizeRoute}
              disabled={isOptimizing || scheduledJobs.length === 0}
              className="w-full sm:w-auto"
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
            
            {/* Multi-Map Controls - only show if enabled in settings */}
            {dispatchSettings?.showMultiMapView && (
              <div className="flex items-center gap-2">
                <Label htmlFor="mapCount" className="text-sm text-gray-600">
                  Maps:
                </Label>
                <Select value={mapCount} onValueChange={(value: '1' | '2' | '4') => setMapCount(value)}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      <div className="flex items-center gap-2">
                        <Map className="h-4 w-4" />
                        1
                      </div>
                    </SelectItem>
                    <SelectItem value="2">
                      <div className="flex items-center gap-2">
                        <Grid3X3 className="h-4 w-4" />
                        2
                      </div>
                    </SelectItem>
                    <SelectItem value="4">
                      <div className="flex items-center gap-2">
                        <Grid3X3 className="h-4 w-4" />
                        4
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={openMultipleMapWindow}
                  variant="outline"
                  size="sm"
                  disabled={scheduledJobs.length === 0}
                  className="whitespace-nowrap"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open {mapCount} Map{mapCount !== '1' ? 's' : ''}
                </Button>
              </div>
            )}
          </div>
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
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                            Job {index + 1}
                          </span>
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

      {/* Grid Layout with Vehicle Jobs Windows - Drag and Drop Enabled */}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className={`grid gap-6 ${
          (dispatchSettings?.vehicleTabsCount || 1) === 1 ? 'grid-cols-1' :
          (dispatchSettings?.vehicleTabsCount || 1) === 2 ? 'grid-cols-1 lg:grid-cols-2' :
          (dispatchSettings?.vehicleTabsCount || 1) === 3 ? 'grid-cols-1 lg:grid-cols-3' :
          'grid-cols-1 lg:grid-cols-2 xl:grid-cols-4'
        }`}>
          {/* Add Unassigned Jobs Pool */}
          <DroppableVehicleContainer
            vehicleId="unassigned"
            vehicleNumber="Unassigned"
            jobs={scheduledJobs}
            selectedDate={selectedDateState}
            onStatusUpdate={handleStatusUpdate}
            onUndo={handleUndo}
            canUndo={undoStack.length > 0}
            undoCount={undoStack.length}
          />
          
          {/* Dynamic Scheduled Jobs Vehicle Windows */}
          {Array.from({ length: dispatchSettings?.vehicleTabsCount || 1 }, (_, index) => {
            const vehicle = getVehicleByIndex(index + 1);
            const vehicleDisplay = vehicle 
              ? `${vehicle.vehicleNumber || (index + 1)} ${vehicle.make && vehicle.model ? `(${vehicle.make} ${vehicle.model})` : ''}`
              : String(index + 1);
            
            return (
              <DroppableVehicleContainer
                key={index + 1}
                vehicleId={`vehicle-${index + 1}`}
                vehicleNumber={vehicleDisplay}
                jobs={scheduledJobs}
                selectedDate={selectedDateState}
                onStatusUpdate={handleStatusUpdate}
                maxJobsPerVehicle={dispatchSettings?.maxJobsPerVehicle}
              />
            );
          })}
        
        {/* Multi-Map View Section - Only show if there's space or single column */}
        {((dispatchSettings?.vehicleTabsCount || 1) === 1 || (dispatchSettings?.vehicleTabsCount || 1) >= 3) && (
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Multi-Map View
            </CardTitle>
            <CardDescription>Open multiple map views in new window</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Open 1, 2, or 4 map views in a new window for better route planning.
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openMultipleMapWindow('1')}
                  className="flex-1"
                >
                  <Map className="h-4 w-4 mr-1" />
                  1 Map
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openMultipleMapWindow('2')}
                  className="flex-1"
                >
                  <Grid3X3 className="h-4 w-4 mr-1" />
                  2 Maps
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openMultipleMapWindow('4')}
                  className="flex-1"
                >
                  <Grid3X3 className="h-4 w-4 mr-1" />
                  4 Maps
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        )}
        </div>
      </DndContext>

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