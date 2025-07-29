import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import GoogleMaps from "@/components/google-maps";
import { 
  Clock, 
  Play, 
  Square, 
  Coffee, 
  MapPin, 
  Calendar,
  Timer,
  User,
  Settings,
  Users,
  Eye,
  Download,
  Filter,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  PlayCircle
} from "lucide-react";

interface TimeClockEntry {
  id: number;
  clockInTime: string;
  clockOutTime?: string;
  totalHours?: string;
  breakDuration?: string;
  status: string;
  notes?: string;
  supervisorApproval: boolean;
  createdAt: string;
  clockInLocation?: string;
  clockOutLocation?: string;
  userName?: string;
  userLastName?: string;
  userId?: number;
}

interface CurrentEntry {
  id: number;
  clockInTime: string;
  status: string;
  breakStart?: string;
  clockInLocation?: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
  address?: string;
}

interface TimeClockTaskTrigger {
  id: number;
  organizationId: number;
  userId?: number;
  triggerEvent: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  isActive: boolean;
  taskTitle: string;
  taskDescription: string;
  taskType: string;
  isRequired: boolean;
  priority: 'low' | 'medium' | 'high';
  assignToMode: 'trigger_user' | 'specific_user' | 'manager' | 'admin';
  assignToUserId?: number;
  projectId?: number;
  createProjectIfNone: boolean;
  projectTemplate?: string;
  delayMinutes: number;
  daysOfWeek: string[];
  timeRange?: { start: string; end: string };
  frequency: 'every_time' | 'once_per_day' | 'once_per_week';
  lastTriggered?: string;
  triggerCount: number;
  createdBy: number;
  createdAt: string;
  creatorName?: string;
  creatorLastName?: string;
  assignedUserName?: string;
  assignedUserLastName?: string;
  projectName?: string;
}

export default function TimeClock() {
  const [clockOutNotes, setClockOutNotes] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [selectedEntryLocations, setSelectedEntryLocations] = useState<LocationData[]>([]);
  const [showTriggerDialog, setShowTriggerDialog] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<TimeClockTaskTrigger | null>(null);
  const [triggerForm, setTriggerForm] = useState({
    triggerEvent: 'clock_in' as const,
    isActive: true,
    taskTitle: '',
    taskDescription: '',
    taskType: 'general',
    isRequired: false,
    priority: 'medium' as const,
    assignToMode: 'trigger_user' as const,
    assignToUserId: undefined as number | undefined,
    projectId: undefined as number | undefined,
    createProjectIfNone: false,
    projectTemplate: '',
    delayMinutes: 0,
    daysOfWeek: [] as string[],
    timeRange: undefined as { start: string; end: string } | undefined,
    frequency: 'every_time' as const
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get current clock status
  const { data: currentEntry, isLoading: currentLoading } = useQuery({
    queryKey: ["/api/time-clock/current"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get users for manager view
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: isManager,
  });

  // Get time clock entries (user or organization based on role)
  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: isManager 
      ? ["/api/time-clock/organization-entries", dateFilter.startDate, dateFilter.endDate]
      : ["/api/time-clock/entries", dateFilter.startDate, dateFilter.endDate],
    queryFn: () => {
      const params = new URLSearchParams({
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate
      });
      
      const endpoint = isManager 
        ? `/api/time-clock/organization-entries?${params}`
        : `/api/time-clock/entries?${params}`;
      
      return apiRequest("GET", endpoint).then(res => res.json());
    },
  });

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      let location = "";
      
      // Try to get current location
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 300000 // 5 minutes
            });
          });
          location = `${position.coords.latitude},${position.coords.longitude}`;
        } catch (error) {
          console.warn("Could not get location:", error);
        }
      }

      return apiRequest("POST", "/api/time-clock/clock-in", { location });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock/organization-entries"] });
      toast({
        title: "Clocked In",
        description: "Successfully clocked in for work",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Clock In Failed",
        description: error.message || "Failed to clock in",
        variant: "destructive",
      });
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      let location = "";
      
      // Try to get current location for clock out
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 300000 // 5 minutes
            });
          });
          location = `${position.coords.latitude},${position.coords.longitude}`;
        } catch (error) {
          console.warn("Could not get location for clock out:", error);
        }
      }

      return apiRequest("POST", "/api/time-clock/clock-out", { 
        notes: clockOutNotes,
        location 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock/organization-entries"] });
      setClockOutNotes("");
      toast({
        title: "Clocked Out",
        description: "Successfully clocked out",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Clock Out Failed", 
        description: error.message || "Failed to clock out",
        variant: "destructive",
      });
    },
  });

  // Start break mutation
  const startBreakMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/time-clock/start-break"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock/organization-entries"] });
      toast({
        title: "Break Started",
        description: "You are now on break",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Break Failed",
        description: error.message || "Failed to start break",
        variant: "destructive",
      });
    },
  });

  // End break mutation  
  const endBreakMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/time-clock/end-break"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock/organization-entries"] });
      toast({
        title: "Break Ended",
        description: "You are back to work",
      });
    },
    onError: (error: any) => {
      toast({
        title: "End Break Failed",
        description: error.message || "Failed to end break",
        variant: "destructive",
      });
    },
  });

  // Task triggers queries and mutations
  const { data: triggers = [], isLoading: triggersLoading, refetch: refetchTriggers } = useQuery({
    queryKey: ["/api/timeclock/triggers"],
    enabled: isManager || isAdmin,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isManager || isAdmin,
  });

  const createTriggerMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/timeclock/triggers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeclock/triggers"] });
      setShowTriggerDialog(false);
      resetTriggerForm();
      toast({
        title: "Trigger Created",
        description: "Task trigger has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Trigger",
        description: error.message || "Failed to create task trigger",
        variant: "destructive",
      });
    },
  });

  const updateTriggerMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest("PUT", `/api/timeclock/triggers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeclock/triggers"] });
      setShowTriggerDialog(false);
      setEditingTrigger(null);
      resetTriggerForm();
      toast({
        title: "Trigger Updated",
        description: "Task trigger has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Trigger",
        description: error.message || "Failed to update task trigger",
        variant: "destructive",
      });
    },
  });

  const deleteTriggerMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/timeclock/triggers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeclock/triggers"] });
      toast({
        title: "Trigger Deleted",
        description: "Task trigger has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Trigger",
        description: error.message || "Failed to delete task trigger",
        variant: "destructive",
      });
    },
  });

  const executeTriggerMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data?: any }) => 
      apiRequest("POST", `/api/timeclock/triggers/${id}/execute`, data || {}),
    onSuccess: () => {
      toast({
        title: "Trigger Executed",
        description: "Task trigger has been executed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Execute Trigger",
        description: error.message || "Failed to execute task trigger",
        variant: "destructive",
      });
    },
  });

  const resetTriggerForm = () => {
    setTriggerForm({
      triggerEvent: 'clock_in',
      isActive: true,
      taskTitle: '',
      taskDescription: '',
      taskType: 'general',
      isRequired: false,
      priority: 'medium',
      assignToMode: 'trigger_user',
      assignToUserId: undefined,
      projectId: undefined,
      createProjectIfNone: false,
      projectTemplate: '',
      delayMinutes: 0,
      daysOfWeek: [],
      timeRange: undefined,
      frequency: 'every_time'
    });
  };

  const handleCreateTrigger = () => {
    setEditingTrigger(null);
    resetTriggerForm();
    setShowTriggerDialog(true);
  };

  const handleEditTrigger = (trigger: TimeClockTaskTrigger) => {
    setEditingTrigger(trigger);
    setTriggerForm({
      triggerEvent: trigger.triggerEvent,
      isActive: trigger.isActive,
      taskTitle: trigger.taskTitle,
      taskDescription: trigger.taskDescription,
      taskType: trigger.taskType,
      isRequired: trigger.isRequired,
      priority: trigger.priority,
      assignToMode: trigger.assignToMode,
      assignToUserId: trigger.assignToUserId,
      projectId: trigger.projectId,
      createProjectIfNone: trigger.createProjectIfNone,
      projectTemplate: trigger.projectTemplate || '',
      delayMinutes: trigger.delayMinutes,
      daysOfWeek: trigger.daysOfWeek,
      timeRange: trigger.timeRange,
      frequency: trigger.frequency
    });
    setShowTriggerDialog(true);
  };

  const handleSaveTrigger = () => {
    if (editingTrigger) {
      updateTriggerMutation.mutate({ id: editingTrigger.id, data: triggerForm });
    } else {
      createTriggerMutation.mutate(triggerForm);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = end.getTime() - start.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'clocked_in':
        return <Badge className="bg-green-500">Clocked In</Badge>;
      case 'on_break':
        return <Badge className="bg-yellow-500">On Break</Badge>;
      case 'clocked_out':
        return <Badge variant="outline">Clocked Out</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const parseLocation = (locationString?: string): LocationData | null => {
    if (!locationString) return null;
    try {
      const [lat, lng] = locationString.split(',').map(Number);
      return {
        latitude: lat,
        longitude: lng,
        timestamp: new Date().toISOString()
      };
    } catch {
      return null;
    }
  };

  const viewLocationOnMap = (entry: TimeClockEntry) => {
    const locations: LocationData[] = [];
    
    if (entry.clockInLocation) {
      const loc = parseLocation(entry.clockInLocation);
      if (loc) {
        locations.push({
          ...loc,
          address: `Clock In - ${new Date(entry.clockInTime).toLocaleString()}`
        });
      }
    }
    
    if (entry.clockOutLocation && entry.clockOutTime) {
      const loc = parseLocation(entry.clockOutLocation);
      if (loc) {
        locations.push({
          ...loc,
          address: `Clock Out - ${new Date(entry.clockOutTime).toLocaleString()}`
        });
      }
    }

    setSelectedEntryLocations(locations);
    setShowLocationMap(true);
  };

  const filteredEntries = entries.filter((entry: TimeClockEntry) => {
    if (selectedUser === "all") return true;
    return entry.userId?.toString() === selectedUser;
  });

  const exportTimeData = () => {
    const csvContent = [
      ['Date', 'Employee', 'Clock In', 'Clock Out', 'Total Hours', 'Break Duration', 'Status', 'Notes'].join(','),
      ...filteredEntries.map((entry: TimeClockEntry) => [
        formatDate(entry.clockInTime),
        isManager ? `${entry.userName || ''} ${entry.userLastName || ''}`.trim() : 'Current User',
        new Date(entry.clockInTime).toLocaleTimeString(),
        entry.clockOutTime ? new Date(entry.clockOutTime).toLocaleTimeString() : '',
        entry.totalHours ? `${parseFloat(entry.totalHours).toFixed(2)}h` : '',
        entry.breakDuration ? `${parseFloat(entry.breakDuration).toFixed(2)}h` : '',
        entry.status,
        entry.notes || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-clock-report-${dateFilter.startDate}-to-${dateFilter.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (currentLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Time Clock</h1>
          <p className="text-muted-foreground">Manage your work hours and time tracking</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono">{formatTime(currentTime)}</div>
          <div className="text-sm text-muted-foreground">
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      <Tabs defaultValue="clock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clock">
            <Clock className="h-4 w-4 mr-2" />
            Time Clock
          </TabsTrigger>
          <TabsTrigger value="history">
            <Calendar className="h-4 w-4 mr-2" />
            Time History
          </TabsTrigger>
          {isManager && (
            <TabsTrigger value="management">
              <Users className="h-4 w-4 mr-2" />
              Team Management
            </TabsTrigger>
          )}
          {(isManager || isAdmin) && (
            <TabsTrigger value="triggers">
              <Timer className="h-4 w-4 mr-2" />
              Task Triggers
            </TabsTrigger>
          )}
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clock" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Current Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Current Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentEntry?.entry ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      {getStatusBadge(currentEntry.entry.status)}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Clocked in at:</span>
                      <span className="font-mono">
                        {new Date(currentEntry.entry.clockInTime).toLocaleTimeString('en-US', { hour12: true })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Duration:</span>
                      <span className="font-mono">
                        {formatDuration(currentEntry.entry.clockInTime)}
                      </span>
                    </div>

                    {currentEntry.entry.status === 'on_break' && currentEntry.entry.breakStart && (
                      <div className="flex items-center justify-between">
                        <span>Break started:</span>
                        <span className="font-mono">
                          {new Date(currentEntry.entry.breakStart).toLocaleTimeString('en-US', { hour12: true })}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Clock className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Not currently clocked in</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Clock in, out, or manage breaks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(!currentEntry?.entry || !currentEntry.entry.id) && (
                  <Button 
                    onClick={() => clockInMutation.mutate()}
                    disabled={clockInMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Clock In
                  </Button>
                )}

                {currentEntry?.entry && currentEntry.entry.status === 'clocked_in' && (
                  <div className="space-y-3">
                    <Button
                      onClick={() => startBreakMutation.mutate()}
                      disabled={startBreakMutation.isPending}
                      variant="outline"
                      className="w-full"
                    >
                      <Coffee className="h-4 w-4 mr-2" />
                      Start Break
                    </Button>
                    
                    <div className="space-y-2">
                      <Label htmlFor="clockOutNotes">Clock Out Notes (Optional)</Label>
                      <Textarea
                        id="clockOutNotes"
                        placeholder="Add any notes about your work session..."
                        value={clockOutNotes}
                        onChange={(e) => setClockOutNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                    
                    <Button
                      onClick={() => clockOutMutation.mutate()}
                      disabled={clockOutMutation.isPending}
                      variant="destructive"
                      className="w-full"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Clock Out
                    </Button>
                  </div>
                )}

                {currentEntry?.entry && currentEntry.entry.status === 'on_break' && (
                  <Button
                    onClick={() => endBreakMutation.mutate()}
                    disabled={endBreakMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    End Break
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Time Entries</CardTitle>
                  <CardDescription>
                    {isManager ? "Employee time clock entries" : "Your recent time clock entries"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={exportTimeData} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
              
              {/* Date and User Filters */}
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex gap-2">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-40"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-40"
                    />
                  </div>
                </div>
                
                {isManager && (
                  <div>
                    <Label htmlFor="userFilter">Employee</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {users.map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.firstName} {user.lastName} ({user.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {entriesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No time entries found for the selected criteria</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      {isManager && <TableHead>Employee</TableHead>}
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry: TimeClockEntry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{formatDate(entry.clockInTime)}</TableCell>
                        {isManager && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {entry.userName} {entry.userLastName}
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="font-mono">
                          {new Date(entry.clockInTime).toLocaleTimeString('en-US', { hour12: true })}
                        </TableCell>
                        <TableCell className="font-mono">
                          {entry.clockOutTime 
                            ? new Date(entry.clockOutTime).toLocaleTimeString('en-US', { hour12: true })
                            : "—"
                          }
                        </TableCell>
                        <TableCell className="font-mono">
                          {entry.totalHours 
                            ? `${parseFloat(entry.totalHours).toFixed(2)}h`
                            : "—"
                          }
                        </TableCell>
                        <TableCell>{getStatusBadge(entry.status)}</TableCell>
                        <TableCell>
                          {(entry.clockInLocation || entry.clockOutLocation) ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewLocationOnMap(entry)}
                              className="p-1"
                            >
                              <MapPin className="h-4 w-4" />
                            </Button>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="max-w-48 truncate">
                          {entry.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isManager && (
          <TabsContent value="management" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Active Clock-ins */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="h-5 w-5" />
                    Currently Clocked In
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredEntries.filter((entry: TimeClockEntry) => entry.status === 'clocked_in').length}
                  </div>
                  <p className="text-muted-foreground">Employees working</p>
                </CardContent>
              </Card>

              {/* On Break */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coffee className="h-5 w-5" />
                    On Break
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredEntries.filter((entry: TimeClockEntry) => entry.status === 'on_break').length}
                  </div>
                  <p className="text-muted-foreground">Employees on break</p>
                </CardContent>
              </Card>

              {/* Total Hours Today */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Total Hours Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredEntries
                      .filter((entry: TimeClockEntry) => {
                        const today = new Date().toDateString();
                        return new Date(entry.clockInTime).toDateString() === today;
                      })
                      .reduce((total, entry) => {
                        return total + (entry.totalHours ? parseFloat(entry.totalHours) : 0);
                      }, 0)
                      .toFixed(1)}h
                  </div>
                  <p className="text-muted-foreground">Hours worked today</p>
                </CardContent>
              </Card>
            </div>

            {/* Active Employees List */}
            <Card>
              <CardHeader>
                <CardTitle>Active Employee Status</CardTitle>
                <CardDescription>Real-time view of employee clock status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users
                    .filter((user: any) => {
                      const userEntry = filteredEntries.find((entry: TimeClockEntry) => 
                        entry.userId === user.id && 
                        (entry.status === 'clocked_in' || entry.status === 'on_break')
                      );
                      return userEntry;
                    })
                    .map((user: any) => {
                      const userEntry = filteredEntries.find((entry: TimeClockEntry) => 
                        entry.userId === user.id && 
                        (entry.status === 'clocked_in' || entry.status === 'on_break')
                      );
                      
                      return (
                        <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium">{user.firstName} {user.lastName}</div>
                              <div className="text-sm text-muted-foreground">{user.username}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {userEntry && getStatusBadge(userEntry.status)}
                            {userEntry && (
                              <span className="text-sm text-muted-foreground">
                                {formatDuration(userEntry.clockInTime)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  
                  {users.filter((user: any) => {
                    const userEntry = filteredEntries.find((entry: TimeClockEntry) => 
                      entry.userId === user.id && 
                      (entry.status === 'clocked_in' || entry.status === 'on_break')
                    );
                    return userEntry;
                  }).length === 0 && (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">No employees currently clocked in</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Task Triggers Tab */}
        {(isManager || isAdmin) && (
          <TabsContent value="triggers" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Task Triggers</h2>
                <p className="text-muted-foreground">
                  Automatically create tasks when employees clock in, out, or take breaks
                </p>
              </div>
              <Button onClick={handleCreateTrigger} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Trigger
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Active Triggers
                </CardTitle>
                <CardDescription>
                  Manage automatic task creation based on time clock events
                </CardDescription>
              </CardHeader>
              <CardContent>
                {triggersLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : triggers.length === 0 ? (
                  <div className="text-center py-8">
                    <Timer className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No task triggers configured</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create triggers to automatically generate tasks when employees clock in, out, or take breaks
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {triggers.map((trigger: TimeClockTaskTrigger) => (
                      <div
                        key={trigger.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{trigger.taskTitle}</h3>
                              <Badge variant={trigger.isActive ? "default" : "secondary"}>
                                {trigger.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <Badge variant="outline">
                                {trigger.triggerEvent.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {trigger.taskDescription}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTrigger(trigger)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => executeTriggerMutation.mutate({ id: trigger.id })}
                              disabled={executeTriggerMutation.isPending}
                            >
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteTriggerMutation.mutate(trigger.id)}
                              disabled={deleteTriggerMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Priority:</span>
                            <Badge variant="outline" className="ml-1">
                              {trigger.priority}
                            </Badge>
                          </div>
                          <div>
                            <span className="font-medium">Type:</span>
                            <span className="ml-1">{trigger.taskType}</span>
                          </div>
                          <div>
                            <span className="font-medium">Frequency:</span>
                            <span className="ml-1">{trigger.frequency.replace('_', ' ')}</span>
                          </div>
                          <div>
                            <span className="font-medium">Delay:</span>
                            <span className="ml-1">{trigger.delayMinutes}m</span>
                          </div>
                        </div>

                        {trigger.assignToMode !== 'trigger_user' && (
                          <div className="text-sm">
                            <span className="font-medium">Assigned to:</span>
                            <span className="ml-1">
                              {trigger.assignToMode === 'specific_user' && trigger.assignedUserName
                                ? `${trigger.assignedUserName} ${trigger.assignedUserLastName}`
                                : trigger.assignToMode.replace('_', ' ')}
                            </span>
                          </div>
                        )}

                        {trigger.projectId && trigger.projectName && (
                          <div className="text-sm">
                            <span className="font-medium">Project:</span>
                            <span className="ml-1">{trigger.projectName}</span>
                          </div>
                        )}

                        {trigger.triggerCount > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Triggered {trigger.triggerCount} times
                            {trigger.lastTriggered && (
                              <span className="ml-1">
                                • Last: {new Date(trigger.lastTriggered).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Task Trigger Dialog */}
            <Dialog open={showTriggerDialog} onOpenChange={setShowTriggerDialog}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTrigger ? "Edit Task Trigger" : "Create Task Trigger"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure automatic task creation based on time clock events
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="taskTitle">Task Title</Label>
                      <Input
                        id="taskTitle"
                        value={triggerForm.taskTitle}
                        onChange={(e) => setTriggerForm(prev => ({ ...prev, taskTitle: e.target.value }))}
                        placeholder="e.g., Daily Safety Check"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="triggerEvent">Trigger Event</Label>
                      <Select 
                        value={triggerForm.triggerEvent} 
                        onValueChange={(value: any) => setTriggerForm(prev => ({ ...prev, triggerEvent: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clock_in">Clock In</SelectItem>
                          <SelectItem value="clock_out">Clock Out</SelectItem>
                          <SelectItem value="break_start">Break Start</SelectItem>
                          <SelectItem value="break_end">Break End</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taskDescription">Task Description</Label>
                    <Textarea
                      id="taskDescription"
                      value={triggerForm.taskDescription}
                      onChange={(e) => setTriggerForm(prev => ({ ...prev, taskDescription: e.target.value }))}
                      placeholder="Detailed description of the task..."
                      rows={3}
                    />
                  </div>

                  {/* Task Settings */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="taskType">Task Type</Label>
                      <Input
                        id="taskType"
                        value={triggerForm.taskType}
                        onChange={(e) => setTriggerForm(prev => ({ ...prev, taskType: e.target.value }))}
                        placeholder="e.g., safety, inspection"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select 
                        value={triggerForm.priority} 
                        onValueChange={(value: any) => setTriggerForm(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delayMinutes">Delay (minutes)</Label>
                      <Input
                        id="delayMinutes"
                        type="number"
                        value={triggerForm.delayMinutes}
                        onChange={(e) => setTriggerForm(prev => ({ ...prev, delayMinutes: parseInt(e.target.value) || 0 }))}
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Assignment Settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assignToMode">Assign To</Label>
                      <Select 
                        value={triggerForm.assignToMode} 
                        onValueChange={(value: any) => setTriggerForm(prev => ({ ...prev, assignToMode: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trigger_user">User Who Triggered</SelectItem>
                          <SelectItem value="specific_user">Specific User</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {triggerForm.assignToMode === 'specific_user' && (
                      <div className="space-y-2">
                        <Label htmlFor="assignToUserId">Select User</Label>
                        <Select 
                          value={triggerForm.assignToUserId?.toString() || "none"} 
                          onValueChange={(value) => setTriggerForm(prev => ({ ...prev, assignToUserId: value === "none" ? undefined : parseInt(value) }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select user</SelectItem>
                            {users.map((user: any) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.firstName} {user.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Project Settings */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="projectId">Project (Optional)</Label>
                      <Select 
                        value={triggerForm.projectId?.toString() || "none"} 
                        onValueChange={(value) => setTriggerForm(prev => ({ ...prev, projectId: value === "none" ? undefined : parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select project or leave empty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No specific project</SelectItem>
                          {projects.map((project: any) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="createProjectIfNone"
                        checked={triggerForm.createProjectIfNone}
                        onCheckedChange={(checked) => setTriggerForm(prev => ({ ...prev, createProjectIfNone: !!checked }))}
                      />
                      <Label htmlFor="createProjectIfNone">
                        Create project if none selected
                      </Label>
                    </div>

                    {triggerForm.createProjectIfNone && (
                      <div className="space-y-2">
                        <Label htmlFor="projectTemplate">Project Template</Label>
                        <Input
                          id="projectTemplate"
                          value={triggerForm.projectTemplate}
                          onChange={(e) => setTriggerForm(prev => ({ ...prev, projectTemplate: e.target.value }))}
                          placeholder="e.g., Daily Tasks - {date}"
                        />
                      </div>
                    )}
                  </div>

                  {/* Frequency and Schedule */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="frequency">Frequency</Label>
                      <Select 
                        value={triggerForm.frequency} 
                        onValueChange={(value: any) => setTriggerForm(prev => ({ ...prev, frequency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="every_time">Every Time</SelectItem>
                          <SelectItem value="once_per_day">Once Per Day</SelectItem>
                          <SelectItem value="once_per_week">Once Per Week</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isRequired"
                        checked={triggerForm.isRequired}
                        onCheckedChange={(checked) => setTriggerForm(prev => ({ ...prev, isRequired: !!checked }))}
                      />
                      <Label htmlFor="isRequired">
                        Mark task as required
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={triggerForm.isActive}
                        onCheckedChange={(checked) => setTriggerForm(prev => ({ ...prev, isActive: checked }))}
                      />
                      <Label htmlFor="isActive">
                        Trigger is active
                      </Label>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowTriggerDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveTrigger}
                    disabled={!triggerForm.taskTitle || createTriggerMutation.isPending || updateTriggerMutation.isPending}
                  >
                    {createTriggerMutation.isPending || updateTriggerMutation.isPending ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    ) : null}
                    {editingTrigger ? "Update Trigger" : "Create Trigger"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* General Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>
                  Configure basic time clock preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EST">Eastern Time (EST)</SelectItem>
                      <SelectItem value="CST">Central Time (CST)</SelectItem>
                      <SelectItem value="MST">Mountain Time (MST)</SelectItem>
                      <SelectItem value="PST">Pacific Time (PST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="workweek-start">Work Week Starts</Label>
                  <Select defaultValue="monday">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time-format">Time Format</Label>
                  <Select defaultValue="12hour">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12hour">12 Hour (AM/PM)</SelectItem>
                      <SelectItem value="24hour">24 Hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Location Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Settings
                </CardTitle>
                <CardDescription>
                  Configure GPS and location tracking options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require GPS Location</Label>
                    <p className="text-sm text-muted-foreground">
                      Force employees to enable GPS when clocking in/out
                    </p>
                  </div>
                  <input type="checkbox" className="toggle" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Location Accuracy</Label>
                    <p className="text-sm text-muted-foreground">
                      Minimum GPS accuracy required (meters)
                    </p>
                  </div>
                  <Input 
                    type="number" 
                    defaultValue="50" 
                    className="w-20"
                    min="10"
                    max="500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="work-locations">Allowed Work Locations</Label>
                  <Textarea
                    id="work-locations"
                    placeholder="Enter addresses or GPS coordinates (one per line)"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to allow clocking in from any location
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Time Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Time Rules
                </CardTitle>
                <CardDescription>
                  Set automatic time tracking rules and policies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auto-break">Automatic Break (hours)</Label>
                  <Input 
                    id="auto-break"
                    type="number" 
                    defaultValue="4" 
                    min="0"
                    max="12"
                    step="0.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Automatically deduct break time after working this many hours
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="break-duration">Default Break Duration (minutes)</Label>
                  <Input 
                    id="break-duration"
                    type="number" 
                    defaultValue="30" 
                    min="15"
                    max="120"
                    step="15"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overtime-threshold">Overtime Threshold (hours/day)</Label>
                  <Input 
                    id="overtime-threshold"
                    type="number" 
                    defaultValue="8" 
                    min="6"
                    max="12"
                    step="0.5"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Round Time Entries</Label>
                    <p className="text-sm text-muted-foreground">
                      Round to nearest 15 minutes
                    </p>
                  </div>
                  <input type="checkbox" className="toggle" />
                </div>
              </CardContent>
            </Card>

            {/* Approval Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Approval Settings
                </CardTitle>
                <CardDescription>
                  Configure supervisor approval requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Supervisor Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      All time entries must be approved by supervisor
                    </p>
                  </div>
                  <input type="checkbox" className="toggle" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-approve after 7 days</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically approve entries older than 7 days
                    </p>
                  </div>
                  <input type="checkbox" className="toggle" defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="approval-reminder">Approval Reminder (days)</Label>
                  <Select defaultValue="3">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="2">2 days</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="5">5 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Send reminder emails to supervisors for pending approvals
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Export Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Settings
                </CardTitle>
                <CardDescription>
                  Configure time sheet export options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="export-format">Default Export Format</Label>
                  <Select defaultValue="csv">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include Location Data</Label>
                    <p className="text-sm text-muted-foreground">
                      Add GPS coordinates to exported reports
                    </p>
                  </div>
                  <input type="checkbox" className="toggle" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include Break Details</Label>
                    <p className="text-sm text-muted-foreground">
                      Show break start/end times in exports
                    </p>
                  </div>
                  <input type="checkbox" className="toggle" defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coffee className="h-5 w-5" />
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  Configure alerts and notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Overtime Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when employees approach overtime
                    </p>
                  </div>
                  <input type="checkbox" className="toggle" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Missed Clock-out Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert when employees forget to clock out
                    </p>
                  </div>
                  <input type="checkbox" className="toggle" defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notification-time">Daily Report Time</Label>
                  <Input 
                    id="notification-time"
                    type="time" 
                    defaultValue="17:00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Time to send daily time tracking summary
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Save Settings Button */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline">
              Reset to Defaults
            </Button>
            <Button>
              Save Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Location Map Modal */}
      {showLocationMap && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl h-96 m-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Clock In/Out Locations</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowLocationMap(false)}
              >
                ×
              </Button>
            </div>
            <div className="h-80">
              <GoogleMaps
                userLocations={selectedEntryLocations.map(loc => ({
                  userId: 1,
                  username: loc.address || 'Location',
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  timestamp: loc.timestamp,
                  accuracy: loc.accuracy
                }))}
                height="320px"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}