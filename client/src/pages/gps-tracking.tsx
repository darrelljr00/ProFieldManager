import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { GoogleMaps } from "@/components/google-maps";
import { MapPin, Smartphone, Monitor, Tablet, RefreshCw, Users, Calendar, Target } from "lucide-react";

interface GPSSession {
  id: number;
  userId: number;
  username: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  latitude: string;
  longitude: string;
  locationAccuracy: string;
  deviceType: string;
  locationTimestamp: string;
  userAgent: string;
  ipAddress: string;
}

interface GPSStats {
  totalSessions: number;
  mobileSessions: number;
  recentSessions: number;
  mobilePercentage: number;
}

export default function GPSTracking() {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  const { data: sessions = [], isLoading: sessionsLoading, refetch: refetchSessions } = useQuery<GPSSession[]>({
    queryKey: ["/api/gps-tracking/sessions"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/gps-tracking/sessions");
      return response.json();
    },
  });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<GPSStats>({
    queryKey: ["/api/gps-tracking/stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/gps-tracking/stats");
      return response.json();
    },
  });

  const refreshData = () => {
    refetchSessions();
    refetchStats();
    toast({
      title: "Data refreshed",
      description: "GPS tracking data has been updated",
    });
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const formatUserName = (session: GPSSession) => {
    if (session.firstName && session.lastName) {
      return `${session.firstName} ${session.lastName}`;
    }
    return session.username;
  };

  // Prepare map markers from sessions
  const mapMarkers = sessions.map(session => ({
    lat: parseFloat(session.latitude),
    lng: parseFloat(session.longitude),
    title: formatUserName(session),
    info: `${formatUserName(session)} - ${new Date(session.createdAt).toLocaleString()}`,
  }));

  if (sessionsLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GPS Tracking</h1>
          <p className="text-muted-foreground">
            Monitor user locations and login patterns for security purposes
          </p>
        </div>
        <Button onClick={refreshData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              With GPS data recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mobile Sessions</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.mobileSessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.mobilePercentage || 0}% of total sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Logins</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recentSessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Locations</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mapMarkers.length}</div>
            <p className="text-xs text-muted-foreground">
              Different login locations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
          <TabsTrigger value="sessions">Session Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Device Types</CardTitle>
                <CardDescription>Distribution of login devices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['mobile', 'tablet', 'desktop'].map(deviceType => {
                    const count = sessions.filter(s => s.deviceType === deviceType).length;
                    const percentage = sessions.length > 0 ? Math.round((count / sessions.length) * 100) : 0;
                    
                    return (
                      <div key={deviceType} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(deviceType)}
                          <span className="capitalize">{deviceType}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{count}</span>
                          <Badge variant="secondary">{percentage}%</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest GPS tracked logins</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sessions.slice(0, 5).map(session => (
                    <div key={session.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(session.deviceType)}
                        <div>
                          <p className="text-sm font-medium">{formatUserName(session)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        <MapPin className="h-3 w-3 mr-1" />
                        {parseFloat(session.locationAccuracy).toFixed(0)}m
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Login Locations Map</CardTitle>
              <CardDescription>
                Visual representation of user login locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mapMarkers.length > 0 ? (
                <div className="h-[500px] rounded-lg overflow-hidden">
                  <GoogleMaps
                    center={mapMarkers.length > 0 ? { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng } : undefined}
                    markers={mapMarkers}
                    zoom={10}
                  />
                </div>
              ) : (
                <div className="h-[500px] flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No GPS data available</h3>
                    <p className="text-muted-foreground">Login locations will appear here once users log in from mobile devices</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
              <CardDescription>
                Detailed view of all GPS tracked login sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Login Time</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map(session => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{formatUserName(session)}</p>
                          <p className="text-xs text-muted-foreground">@{session.username}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(session.deviceType)}
                          <span className="capitalize">{session.deviceType}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-mono">
                          <div>Lat: {parseFloat(session.latitude).toFixed(6)}</div>
                          <div>Lng: {parseFloat(session.longitude).toFixed(6)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          ±{parseFloat(session.locationAccuracy).toFixed(0)}m
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(session.createdAt).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {session.ipAddress}
                        </code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {sessions.length === 0 && (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No GPS sessions found</h3>
                  <p className="text-muted-foreground">GPS data will appear here when users log in from mobile devices</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}