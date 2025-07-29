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
  PlayCircle,
  Zap,
  Volume2,
  FileText
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

interface TaskTrigger {
  id: number;
  organizationId: number;
  name: string;
  description?: string;
  triggerType: 'clock_in' | 'clock_out' | 'break_start' | 'break_end' | 'manual';
  isActive: boolean;
  
  // Alert settings
  hasFlashingAlert: boolean;
  flashColor: string;
  flashDuration: number;
  
  // Sound settings
  hasSoundAlert: boolean;
  soundType: string;
  soundVolume: number;
  
  // Duration and timing
  displayDuration: number;
  autoHide: boolean;
  
  // Text fields and content
  title: string;
  message: string;
  buttonText: string;
  
  // Clock-out prevention
  preventClockOut: boolean;
  completionRequired: boolean;
  
  // Text input fields
  hasTextField: boolean;
  textFieldLabel?: string;
  textFieldRequired: boolean;
  hasNumberField: boolean;
  numberFieldLabel?: string;
  numberFieldRequired: boolean;
  
  // Assignment and timing
  assignToUserId?: number;
  delayMinutes: number;
  maxTriggers?: number;
  
  // Days of week and time constraints
  allowedDays: string[];
  timeWindowStart?: string;
  timeWindowEnd?: string;
  
  // Created info
  createdBy: number;
  createdAt: string;
}

export default function TimeClock() {
  const [clockOutNotes, setClockOutNotes] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Include tomorrow to catch today's entries
  });
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [selectedEntryLocations, setSelectedEntryLocations] = useState<LocationData[]>([]);
  const [showTriggerDialog, setShowTriggerDialog] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<TaskTrigger | null>(null);
  const [triggerForm, setTriggerForm] = useState({
    name: '',
    description: '',
    triggerType: 'clock_in' as const,
    isActive: true,
    
    // Alert settings
    hasFlashingAlert: true,
    flashColor: '#f59e0b',
    flashDuration: 5,
    
    // Sound settings
    hasSoundAlert: true,
    soundType: 'notification',
    soundVolume: 80,
    
    // Duration and timing
    displayDuration: 10,
    autoHide: false,
    
    // Text fields and content
    title: '',
    message: '',
    buttonText: 'Mark Complete',
    
    // Clock-out prevention
    preventClockOut: false,
    completionRequired: false,
    
    // Text input fields
    hasTextField: false,
    textFieldLabel: '',
    textFieldRequired: false,
    hasNumberField: false,
    numberFieldLabel: '',
    numberFieldRequired: false,
    
    // Assignment and timing
    assignToUserId: undefined as number | undefined,
    delayMinutes: 0,
    maxTriggers: undefined as number | undefined,
    
    // Days of week and time constraints
    allowedDays: [] as string[],
    timeWindowStart: '',
    timeWindowEnd: ''
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

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
      
      console.log('🕒 TIME CLOCK QUERY:', {
        isManager,
        endpoint,
        dateFilter,
        userRole: user?.role
      });
      
      return apiRequest("GET", endpoint)
        .then(res => {
          console.log('🕒 TIME CLOCK RESPONSE:', {
            status: res.status,
            endpoint,
            isManager
          });
          return res.json();
        })
        .then(data => {
          console.log('🕒 TIME CLOCK DATA:', {
            dataLength: data.length,
            endpoint,
            isManager,
            firstEntry: data[0]
          });
          return data;
        });
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
    queryKey: ["/api/task-triggers"],
    enabled: isManager || isAdmin,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isManager || isAdmin,
  });

  const createTriggerMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/task-triggers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-triggers"] });
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
      apiRequest("PUT", `/api/task-triggers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-triggers"] });
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
    mutationFn: (id: number) => apiRequest("DELETE", `/api/task-triggers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-triggers"] });
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
      name: '',
      description: '',
      triggerType: 'clock_in',
      isActive: true,
      
      // Visual alerts
      hasFlashingAlert: false,
      flashColor: '#f59e0b',
      flashDuration: 5,
      
      // Sound alerts
      hasSoundAlert: false,
      soundType: 'chime',
      soundVolume: 80,
      
      // Display settings
      displayDuration: 10,
      autoHide: false,
      
      // Text fields and content
      title: '',
      message: '',
      buttonText: 'Mark Complete',
      
      // Clock-out prevention
      preventClockOut: false,
      completionRequired: false,
      
      // Text input fields
      hasTextField: false,
      textFieldLabel: '',
      textFieldRequired: false,
      hasNumberField: false,
      numberFieldLabel: '',
      numberFieldRequired: false,
      
      // Assignment and timing
      assignToUserId: undefined,
      delayMinutes: 0,
      maxTriggers: undefined,
      
      // Days of week and time constraints
      allowedDays: [],
      timeWindowStart: undefined,
      timeWindowEnd: undefined
    });
  };

  const handleCreateTrigger = () => {
    setEditingTrigger(null);
    resetTriggerForm();
    setShowTriggerDialog(true);
  };

  const handleEditTrigger = (trigger: TaskTrigger) => {
    setEditingTrigger(trigger);
    setTriggerForm({
      name: trigger.name,
      description: trigger.description || '',
      triggerType: trigger.triggerType,
      isActive: trigger.isActive,
      
      // Visual alerts
      hasFlashingAlert: trigger.hasFlashingAlert,
      flashColor: trigger.flashColor,
      flashDuration: trigger.flashDuration,
      
      // Sound alerts
      hasSoundAlert: trigger.hasSoundAlert,
      soundType: trigger.soundType,
      soundVolume: trigger.soundVolume,
      
      // Display settings
      displayDuration: trigger.displayDuration,
      autoHide: trigger.autoHide,
      
      // Text fields and content
      title: trigger.title,
      message: trigger.message,
      buttonText: trigger.buttonText,
      
      // Clock-out prevention
      preventClockOut: trigger.preventClockOut,
      completionRequired: trigger.completionRequired,
      
      // Text input fields
      hasTextField: trigger.hasTextField || false,
      textFieldLabel: trigger.textFieldLabel || '',
      textFieldRequired: trigger.textFieldRequired || false,
      hasNumberField: trigger.hasNumberField || false,
      numberFieldLabel: trigger.numberFieldLabel || '',
      numberFieldRequired: trigger.numberFieldRequired || false,
      
      // Assignment and timing
      assignToUserId: trigger.assignToUserId,
      delayMinutes: trigger.delayMinutes,
      maxTriggers: trigger.maxTriggers,
      
      // Days of week and time constraints
      allowedDays: trigger.allowedDays || [],
      timeWindowStart: trigger.timeWindowStart,
      timeWindowEnd: trigger.timeWindowEnd
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
    
    // Debug logging
    console.log('Duration Debug:', {
      startTime,
      startParsed: start.toISOString(),
      endParsed: end.toISOString(),
      durationMs: duration,
      startValid: !isNaN(start.getTime()),
      endValid: !isNaN(end.getTime())
    });
    
    if (duration < 0 || isNaN(duration)) {
      return "0h 0m";
    }
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    // Additional debug for display issue
    console.log('Final duration display:', `${hours}h ${minutes}m`);
    
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

  // Debug logging for filtering
  console.log('🔍 FILTERING DEBUG:', {
    entriesLength: entries.length,
    selectedUser,
    filteredLength: filteredEntries.length,
    firstEntry: entries[0],
    userIdMatch: entries[0]?.userId?.toString() === selectedUser
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
                    {triggers.map((trigger: TaskTrigger) => (
                      <div
                        key={trigger.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{trigger.name}</h3>
                              <Badge variant={trigger.isActive ? "default" : "secondary"}>
                                {trigger.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <Badge variant="outline">
                                {trigger.triggerType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Badge>
                              {trigger.assignedToUserId && trigger.assignedUserName && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                  <User className="h-3 w-3 mr-1" />
                                  {trigger.assignedUserName} {trigger.assignedUserLastName || ''}
                                </Badge>
                              )}
                              {trigger.assignedToRole === 'all_users' && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  <Users className="h-3 w-3 mr-1" />
                                  All Users
                                </Badge>
                              )}
                              {!trigger.assignedToUserId && !trigger.assignedToRole && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <User className="h-3 w-3 mr-1" />
                                  Trigger User
                                </Badge>
                              )}
                              {trigger.assignedToRole && trigger.assignedToRole !== 'all_users' && (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                  <User className="h-3 w-3 mr-1" />
                                  {trigger.assignedToRole.charAt(0).toUpperCase() + trigger.assignedToRole.slice(1)}
                                </Badge>
                              )}
                              {trigger.hasFlashingAlert && (
                                <Badge variant="outline" className="text-amber-600">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Flash
                                </Badge>
                              )}
                              {trigger.hasSoundAlert && (
                                <Badge variant="outline" className="text-blue-600">
                                  <Volume2 className="h-3 w-3 mr-1" />
                                  Sound
                                </Badge>
                              )}
                              {trigger.preventClockOut && (
                                <Badge variant="outline" className="text-red-600">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Blocks Clock-out
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {trigger.description || trigger.message}
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
                            <span className="font-medium">Alert Duration:</span>
                            <span className="ml-1">{trigger.displayDuration}s</span>
                          </div>
                          <div>
                            <span className="font-medium">Flash Color:</span>
                            <div className="flex items-center gap-1 ml-1">
                              <div 
                                className="w-3 h-3 rounded-full border" 
                                style={{ backgroundColor: trigger.flashColor }}
                              />
                              <span>{trigger.flashColor}</span>
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Sound:</span>
                            <span className="ml-1">{trigger.soundType} ({trigger.soundVolume}%)</span>
                          </div>
                          <div>
                            <span className="font-medium">Delay:</span>
                            <span className="ml-1">{trigger.delayMinutes}m</span>
                          </div>
                        </div>

                        {(trigger.assignedToUserId || trigger.assignedToRole) && (
                          <div className="text-sm">
                            <span className="font-medium">Assigned to:</span>
                            <span className="ml-1">
                              {trigger.assignedToUserId && trigger.assignedUserName
                                ? `${trigger.assignedUserName} ${trigger.assignedUserLastName || ''}`
                                : trigger.assignedToRole
                                ? trigger.assignedToRole.replace('_', ' ').charAt(0).toUpperCase() + trigger.assignedToRole.replace('_', ' ').slice(1)
                                : 'Trigger User'}
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

                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Trigger Name</Label>
                        <Input
                          id="name"
                          value={triggerForm.name}
                          onChange={(e) => setTriggerForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Daily Safety Check"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="triggerType">Trigger Event</Label>
                        <Select 
                          value={triggerForm.triggerType} 
                          onValueChange={(value: any) => setTriggerForm(prev => ({ ...prev, triggerType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="clock_in">Clock In</SelectItem>
                            <SelectItem value="clock_out">Clock Out</SelectItem>
                            <SelectItem value="break_start">Break Start</SelectItem>
                            <SelectItem value="break_end">Break End</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        value={triggerForm.description}
                        onChange={(e) => setTriggerForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description of this trigger's purpose"
                        rows={2}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={triggerForm.isActive}
                        onCheckedChange={(checked) => setTriggerForm(prev => ({ ...prev, isActive: checked }))}
                      />
                      <Label htmlFor="isActive">Active</Label>
                    </div>
                  </div>

                  {/* Alert Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Zap className="h-5 w-5 text-amber-500" />
                      Visual Alert Settings
                    </h3>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="hasFlashingAlert"
                        checked={triggerForm.hasFlashingAlert}
                        onCheckedChange={(checked) => setTriggerForm(prev => ({ ...prev, hasFlashingAlert: checked }))}
                      />
                      <Label htmlFor="hasFlashingAlert">Enable Flashing Alert</Label>
                    </div>
                    {triggerForm.hasFlashingAlert && (
                      <div className="grid grid-cols-2 gap-4 ml-6">
                        <div className="space-y-2">
                          <Label htmlFor="flashColor">Flash Color</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              id="flashColor"
                              value={triggerForm.flashColor}
                              onChange={(e) => setTriggerForm(prev => ({ ...prev, flashColor: e.target.value }))}
                              className="w-10 h-10 rounded border"
                            />
                            <Input
                              value={triggerForm.flashColor}
                              onChange={(e) => setTriggerForm(prev => ({ ...prev, flashColor: e.target.value }))}
                              placeholder="#f59e0b"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="flashDuration">Flash Duration (seconds)</Label>
                          <Input
                            id="flashDuration"
                            type="number"
                            min="1"
                            max="60"
                            value={triggerForm.flashDuration}
                            onChange={(e) => setTriggerForm(prev => ({ ...prev, flashDuration: parseInt(e.target.value) || 5 }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sound Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Volume2 className="h-5 w-5 text-blue-500" />
                      Sound Alert Settings
                    </h3>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="hasSoundAlert"
                        checked={triggerForm.hasSoundAlert}
                        onCheckedChange={(checked) => setTriggerForm(prev => ({ ...prev, hasSoundAlert: checked }))}
                      />
                      <Label htmlFor="hasSoundAlert">Enable Sound Alert</Label>
                    </div>
                    {triggerForm.hasSoundAlert && (
                      <div className="grid grid-cols-2 gap-4 ml-6">
                        <div className="space-y-2">
                          <Label htmlFor="soundType">Sound Type</Label>
                          <Select 
                            value={triggerForm.soundType} 
                            onValueChange={(value) => setTriggerForm(prev => ({ ...prev, soundType: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="chime">Chime</SelectItem>
                              <SelectItem value="bell">Bell</SelectItem>
                              <SelectItem value="notification">Notification</SelectItem>
                              <SelectItem value="pop">Pop</SelectItem>
                              <SelectItem value="ding">Ding</SelectItem>
                              <SelectItem value="gentle">Gentle</SelectItem>
                              <SelectItem value="modern">Modern</SelectItem>
                              <SelectItem value="subtle">Subtle</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="soundVolume">Volume (%)</Label>
                          <Input
                            id="soundVolume"
                            type="number"
                            min="0"
                            max="100"
                            value={triggerForm.soundVolume}
                            onChange={(e) => setTriggerForm(prev => ({ ...prev, soundVolume: parseInt(e.target.value) || 80 }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Display and Timing Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Timer className="h-5 w-5 text-green-500" />
                      Display & Timing Settings
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="displayDuration">Display Duration (seconds)</Label>
                        <Input
                          id="displayDuration"
                          type="number"
                          min="1"
                          max="300"
                          value={triggerForm.displayDuration}
                          onChange={(e) => setTriggerForm(prev => ({ ...prev, displayDuration: parseInt(e.target.value) || 10 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="delayMinutes">Delay Before Trigger (minutes)</Label>
                        <Input
                          id="delayMinutes"
                          type="number"
                          min="0"
                          value={triggerForm.delayMinutes}
                          onChange={(e) => setTriggerForm(prev => ({ ...prev, delayMinutes: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="autoHide"
                        checked={triggerForm.autoHide}
                        onCheckedChange={(checked) => setTriggerForm(prev => ({ ...prev, autoHide: checked }))}
                      />
                      <Label htmlFor="autoHide">Auto-hide after display duration</Label>
                    </div>
                  </div>

                  {/* Task Content */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Task Content</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Task Title</Label>
                        <Input
                          id="title"
                          value={triggerForm.title}
                          onChange={(e) => setTriggerForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., Daily Safety Check"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="buttonText">Button Text</Label>
                        <Input
                          id="buttonText"
                          value={triggerForm.buttonText}
                          onChange={(e) => setTriggerForm(prev => ({ ...prev, buttonText: e.target.value }))}
                          placeholder="e.g., Mark Complete"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Task Message</Label>
                      <Textarea
                        id="message"
                        value={triggerForm.message}
                        onChange={(e) => setTriggerForm(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Detailed instructions for the user..."
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Clock-out Prevention */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Clock className="h-5 w-5 text-red-500" />
                      Clock-out Prevention
                    </h3>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="preventClockOut"
                        checked={triggerForm.preventClockOut}
                        onCheckedChange={(checked) => setTriggerForm(prev => ({ ...prev, preventClockOut: checked }))}
                      />
                      <Label htmlFor="preventClockOut">Prevent clock-out until completed</Label>
                    </div>
                    {triggerForm.preventClockOut && (
                      <div className="flex items-center space-x-2 ml-6">
                        <Switch
                          id="completionRequired"
                          checked={triggerForm.completionRequired}
                          onCheckedChange={(checked) => setTriggerForm(prev => ({ ...prev, completionRequired: checked }))}
                        />
                        <Label htmlFor="completionRequired">Require task completion confirmation</Label>
                      </div>
                    )}
                  </div>

                  {/* Optional Text Input Fields */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-purple-500" />
                      Optional Input Fields
                    </h3>
                    
                    {/* Text Field */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="hasTextField"
                          checked={triggerForm.hasTextField}
                          onCheckedChange={(checked) => setTriggerForm(prev => ({ ...prev, hasTextField: checked }))}
                        />
                        <Label htmlFor="hasTextField">Include Text Input Field</Label>
                      </div>
                      {triggerForm.hasTextField && (
                        <div className="grid grid-cols-2 gap-4 ml-6">
                          <div className="space-y-2">
                            <Label htmlFor="textFieldLabel">Text Field Label</Label>
                            <Input
                              id="textFieldLabel"
                              value={triggerForm.textFieldLabel}
                              onChange={(e) => setTriggerForm(prev => ({ ...prev, textFieldLabel: e.target.value }))}
                              placeholder="e.g., Notes, Comments"
                            />
                          </div>
                          <div className="flex items-center space-x-2 pt-6">
                            <Switch
                              id="textFieldRequired"
                              checked={triggerForm.textFieldRequired}
                              onCheckedChange={(checked) => setTriggerForm(prev => ({ ...prev, textFieldRequired: checked }))}
                            />
                            <Label htmlFor="textFieldRequired">Required</Label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Number Field */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="hasNumberField"
                          checked={triggerForm.hasNumberField}
                          onCheckedChange={(checked) => setTriggerForm(prev => ({ ...prev, hasNumberField: checked }))}
                        />
                        <Label htmlFor="hasNumberField">Include Number Input Field</Label>
                      </div>
                      {triggerForm.hasNumberField && (
                        <div className="grid grid-cols-2 gap-4 ml-6">
                          <div className="space-y-2">
                            <Label htmlFor="numberFieldLabel">Number Field Label</Label>
                            <Input
                              id="numberFieldLabel"
                              value={triggerForm.numberFieldLabel}
                              onChange={(e) => setTriggerForm(prev => ({ ...prev, numberFieldLabel: e.target.value }))}
                              placeholder="e.g., Hours, Quantity"
                            />
                          </div>
                          <div className="flex items-center space-x-2 pt-6">
                            <Switch
                              id="numberFieldRequired"
                              checked={triggerForm.numberFieldRequired}
                              onCheckedChange={(checked) => setTriggerForm(prev => ({ ...prev, numberFieldRequired: checked }))}
                            />
                            <Label htmlFor="numberFieldRequired">Required</Label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assignment Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Assignment & Constraints</h3>
                    <div className="space-y-2">
                      <Label htmlFor="assignToUserId">Assign to Specific User (Optional)</Label>
                      <Select 
                        value={triggerForm.assignToUserId?.toString() || "none"} 
                        onValueChange={(value) => setTriggerForm(prev => ({ ...prev, assignToUserId: value === "none" ? undefined : parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Assign to any user or select specific user" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No specific user (assigned to triggering user)</SelectItem>
                          {users.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxTriggers">Maximum Triggers (Optional)</Label>
                      <Input
                        id="maxTriggers"
                        type="number"
                        min="1"
                        value={triggerForm.maxTriggers || ''}
                        onChange={(e) => setTriggerForm(prev => ({ ...prev, maxTriggers: e.target.value ? parseInt(e.target.value) : undefined }))}
                        placeholder="Leave empty for unlimited"
                      />
                    </div>
                  </div>

                  {/* Time Constraints */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-green-500" />
                      Time Constraints (Optional)
                    </h3>
                    
                    {/* Days of Week */}
                    <div className="space-y-2">
                      <Label>Allowed Days of Week</Label>
                      <div className="flex flex-wrap gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                          <div key={day} className="flex items-center space-x-2">
                            <Checkbox
                              id={day}
                              checked={triggerForm.allowedDays.includes(day)}
                              onCheckedChange={(checked) => {
                                setTriggerForm(prev => ({
                                  ...prev,
                                  allowedDays: checked 
                                    ? [...prev.allowedDays, day]
                                    : prev.allowedDays.filter(d => d !== day)
                                }));
                              }}
                            />
                            <Label htmlFor={day} className="text-sm">{day.slice(0, 3)}</Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Leave empty to allow any day</p>
                    </div>

                    {/* Time Window */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="timeWindowStart">Start Time (Optional)</Label>
                        <Input
                          id="timeWindowStart"
                          type="time"
                          value={triggerForm.timeWindowStart || ''}
                          onChange={(e) => setTriggerForm(prev => ({ ...prev, timeWindowStart: e.target.value || undefined }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timeWindowEnd">End Time (Optional)</Label>
                        <Input
                          id="timeWindowEnd"
                          type="time"
                          value={triggerForm.timeWindowEnd || ''}
                          onChange={(e) => setTriggerForm(prev => ({ ...prev, timeWindowEnd: e.target.value || undefined }))}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Leave empty to allow any time</p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowTriggerDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveTrigger}
                    disabled={!triggerForm.name || !triggerForm.title || createTriggerMutation.isPending || updateTriggerMutation.isPending}
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