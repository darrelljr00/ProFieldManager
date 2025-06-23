import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Clock, 
  Play, 
  Square, 
  Coffee, 
  MapPin, 
  Calendar,
  Timer,
  User,
  Settings
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
}

interface CurrentEntry {
  id: number;
  clockInTime: string;
  status: string;
  breakStart?: string;
}

export default function TimeClock() {
  const [clockOutNotes, setClockOutNotes] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Get time clock entries
  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["/api/time-clock/entries"],
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
      return apiRequest("POST", "/api/time-clock/clock-out", { notes: clockOutNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock/entries"] });
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
                {currentEntry ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      {getStatusBadge(currentEntry.status)}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Clocked in at:</span>
                      <span className="font-mono">
                        {new Date(currentEntry.clockInTime).toLocaleTimeString('en-US', { hour12: true })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Duration:</span>
                      <span className="font-mono">
                        {formatDuration(currentEntry.clockInTime)}
                      </span>
                    </div>

                    {currentEntry.status === 'on_break' && currentEntry.breakStart && (
                      <div className="flex items-center justify-between">
                        <span>Break started:</span>
                        <span className="font-mono">
                          {new Date(currentEntry.breakStart).toLocaleTimeString('en-US', { hour12: true })}
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
                {!currentEntry && (
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

                {currentEntry && currentEntry.status === 'clocked_in' && (
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

                {currentEntry && currentEntry.status === 'on_break' && (
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
              <CardTitle>Time Entries</CardTitle>
              <CardDescription>Your recent time clock entries</CardDescription>
            </CardHeader>
            <CardContent>
              {entriesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No time entries found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry: TimeClockEntry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{formatDate(entry.clockInTime)}</TableCell>
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
      </Tabs>
    </div>
  );
}