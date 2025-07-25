import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, 
  Truck, 
  MapPin, 
  Calendar, 
  Clock,
  CheckCircle,
  RefreshCw,
  Users,
  CarIcon,
  Zap,
  ExternalLink
} from "lucide-react";

interface VehicleJobAssignment {
  id: number;
  userId: number;
  vehicleId: number;
  projectId: number;
  inspectionDate: string;
  assignmentDate: string;
  isActive: boolean;
  notes?: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  vehicleNumber: string;
  licensePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  projectName: string;
  projectDescription: string;
  projectAddress: string;
  projectStatus: string;
}

interface ScheduledJobsVehicleWindowProps {
  selectedDate: string;
  vehicleNumber?: string;
}

export function ScheduledJobsVehicleWindow({ selectedDate, vehicleNumber = "1" }: ScheduledJobsVehicleWindowProps) {
  const [autoConnectDialogOpen, setAutoConnectDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch vehicle job assignments for the selected date
  const { data: assignments = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/vehicle-job-assignments', selectedDate],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/vehicle-job-assignments?date=${selectedDate}`);
      return response as VehicleJobAssignment[];
    },
  });

  // Fetch users with vehicle inspections for the selected date
  const { data: inspectionUsers = [] } = useQuery({
    queryKey: ['/api/users-with-inspections', selectedDate],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users-with-inspections?date=${selectedDate}`);
      return response;
    },
  });

  // Auto-connect mutation
  const autoConnectMutation = useMutation({
    mutationFn: async (date: string) => {
      return await apiRequest('POST', '/api/vehicle-job-assignments/auto-connect', { date });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Auto-Connect Complete",
        description: `Created ${data.assignments?.length || 0} vehicle job assignments`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/vehicle-job-assignments'] });
      setAutoConnectDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Auto-Connect Failed",
        description: error.message || "Failed to auto-connect users to vehicle jobs",
        variant: "destructive",
      });
    },
  });

  // WebSocket listeners for real-time updates
  useEffect(() => {
    const handleVehicleJobAssignmentCreated = (data: any) => {
      toast({
        title: "Vehicle Job Assignment Created",
        description: `${data.createdBy} created a new vehicle job assignment`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/vehicle-job-assignments'] });
    };

    const handleVehicleJobAutoConnectCompleted = (data: any) => {
      toast({
        title: "Auto-Connect Complete",
        description: `${data.triggeredBy} auto-connected ${data.assignments?.length || 0} assignments`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/vehicle-job-assignments'] });
    };

    // Add WebSocket event listeners here if needed
    // For now, we'll rely on manual refresh and mutations
    
    return () => {
      // Cleanup WebSocket listeners
    };
  }, [queryClient, toast]);

  const handleAutoConnect = () => {
    autoConnectMutation.mutate(selectedDate);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'default';
      case 'in-progress':
        return 'secondary';
      case 'scheduled':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getPriorityColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-600';
      case 'in-progress':
        return 'text-blue-600';
      case 'scheduled':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const groupedAssignments = assignments.reduce((groups, assignment) => {
    const vehicleKey = `${assignment.vehicleNumber} (${assignment.licensePlate})`;
    if (!groups[vehicleKey]) {
      groups[vehicleKey] = [];
    }
    groups[vehicleKey].push(assignment);
    return groups;
  }, {} as Record<string, VehicleJobAssignment[]>);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Scheduled Jobs Vehicle {vehicleNumber}
          </CardTitle>
          <CardDescription>Loading vehicle job assignments...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Scheduled Jobs Vehicle {vehicleNumber}
            </CardTitle>
            <CardDescription>
              {selectedDate} • {assignments.length} assignments • {Object.keys(groupedAssignments).length} vehicles
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={autoConnectDialogOpen} onOpenChange={setAutoConnectDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Zap className="h-4 w-4 mr-1" />
                  Auto-Connect
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Auto-Connect Vehicle Jobs</DialogTitle>
                  <DialogDescription>
                    This will automatically connect users to jobs based on vehicle inspections they completed on {selectedDate}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Users with Vehicle Inspections Today:</h4>
                    {inspectionUsers.length > 0 ? (
                      <ul className="space-y-1 text-sm text-blue-800">
                        {inspectionUsers.map((user: any, index: number) => (
                          <li key={index} className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            {user.userFirstName} {user.userLastName} - {user.vehicleNumber} ({user.licensePlate})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-blue-800">No vehicle inspections found for this date.</p>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setAutoConnectDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAutoConnect}
                      disabled={autoConnectMutation.isPending || inspectionUsers.length === 0}
                    >
                      {autoConnectMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                      Connect Jobs
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {assignments.length === 0 ? (
          <div className="text-center py-8">
            <CarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Vehicle Job Assignments</h3>
            <p className="text-sm text-muted-foreground mt-2">
              No users are connected to vehicle jobs for {selectedDate}.
            </p>
            <p className="text-sm text-muted-foreground">
              Use Auto-Connect to link users to jobs based on their vehicle inspections.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAssignments).map(([vehicleKey, vehicleAssignments]) => (
              <div key={vehicleKey} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <h3 className="font-medium text-blue-900">Vehicle {vehicleKey}</h3>
                  <Badge variant="secondary">{vehicleAssignments.length} jobs</Badge>
                </div>
                <div className="space-y-3">
                  {vehicleAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="border border-gray-200 rounded-md p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{assignment.projectName}</h4>
                            <Badge variant={getStatusBadgeVariant(assignment.projectStatus)}>
                              {assignment.projectStatus}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {assignment.userFirstName} {assignment.userLastName}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {assignment.projectAddress}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(assignment.inspectionDate).toLocaleDateString()}
                            </div>
                          </div>
                          {assignment.projectDescription && (
                            <p className="text-sm text-gray-500">{assignment.projectDescription}</p>
                          )}
                          {assignment.notes && (
                            <div className="bg-blue-50 border border-blue-200 rounded p-2">
                              <p className="text-xs text-blue-800">{assignment.notes}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-4">
                          <div className={`text-sm font-medium ${getPriorityColor(assignment.projectStatus)}`}>
                            {assignment.projectStatus.toUpperCase()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(assignment.assignmentDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}