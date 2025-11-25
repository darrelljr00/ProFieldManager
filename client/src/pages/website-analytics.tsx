import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Eye,
  Users,
  Clock,
  TrendingUp,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  RefreshCw,
  Settings,
  Activity,
  ExternalLink,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Chrome,
  Apple,
} from "lucide-react";
import { SiFacebook, SiGoogle } from "react-icons/si";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

interface TrafficOverview {
  pageViews: number;
  uniqueVisitors: number;
  sessions: number;
  avgSessionDuration: number;
  bounceRate: number;
  period: string;
}

interface TopPage {
  pagePath: string;
  pageTitle: string | null;
  views: number;
  uniqueVisitors: number;
  avgTimeOnPage: number;
}

interface ActiveVisitor {
  sessionId: string;
  visitorId: string;
  landingPage: string;
  exitPage: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  pageViewCount: number;
  startTime: string;
  lastActivityAt: string;
  utmSource: string | null;
}

interface AnalyticsSettings {
  enableInternalTracking: boolean;
  trackPageViews: boolean;
  trackVisitorSessions: boolean;
  enableGoogleAnalytics: boolean;
  googleAnalyticsMeasurementId: string | null;
  enableFacebookPixel: boolean;
  facebookPixelId: string | null;
  anonymizeIp: boolean;
  respectDoNotTrack: boolean;
  cookieConsentRequired: boolean;
  dataRetentionDays: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const hours = Math.floor(diffMins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

function getDeviceIcon(deviceType: string | null) {
  switch (deviceType?.toLowerCase()) {
    case 'mobile':
      return <Smartphone className="h-4 w-4" />;
    case 'tablet':
      return <Tablet className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
}

export default function WebsiteAnalytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState("7d");
  const [settingsData, setSettingsData] = useState<Partial<AnalyticsSettings>>({});

  // Fetch traffic overview
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useQuery<TrafficOverview>({
    queryKey: ["/api/analytics/traffic-overview", period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/traffic-overview?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch traffic overview");
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch current visitors
  const { data: currentVisitors, isLoading: visitorsLoading, refetch: refetchVisitors } = useQuery<{
    activeCount: number;
    visitors: ActiveVisitor[];
  }>({
    queryKey: ["/api/analytics/current-visitors"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch top pages
  const { data: topPages, isLoading: pagesLoading } = useQuery<TopPage[]>({
    queryKey: ["/api/analytics/top-pages", period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/top-pages?period=${period}&limit=10`);
      if (!res.ok) throw new Error("Failed to fetch top pages");
      return res.json();
    },
  });

  // Fetch traffic sources
  const { data: sources } = useQuery<{ source: string; sessions: number; visitors: number }[]>({
    queryKey: ["/api/analytics/traffic-sources", period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/traffic-sources?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch traffic sources");
      return res.json();
    },
  });

  // Fetch device breakdown
  const { data: deviceData } = useQuery<{
    devices: { deviceType: string; count: number }[];
    browsers: { browser: string; count: number }[];
  }>({
    queryKey: ["/api/analytics/device-breakdown", period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/device-breakdown?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch device breakdown");
      return res.json();
    },
  });

  // Fetch timeline data
  const { data: timeline } = useQuery<{ date: string; pageViews: number; uniqueVisitors: number }[]>({
    queryKey: ["/api/analytics/pageviews-timeline", period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/pageviews-timeline?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch timeline");
      return res.json();
    },
  });

  // Fetch settings
  const { data: settings } = useQuery<AnalyticsSettings>({
    queryKey: ["/api/analytics/settings"],
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<AnalyticsSettings>) => {
      const res = await apiRequest("POST", "/api/analytics/settings", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Settings saved", description: "Analytics settings have been updated." });
      queryClient.refetchQueries({ queryKey: ["/api/analytics/settings"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (settings) {
      setSettingsData(settings);
    }
  }, [settings]);

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settingsData);
  };

  const refreshAll = () => {
    refetchOverview();
    refetchVisitors();
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Website Analytics</h1>
          <p className="text-muted-foreground">Monitor your website traffic and visitor behavior</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[130px]" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={refreshAll} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="traffic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1">
          <TabsTrigger value="traffic" data-testid="tab-traffic">
            <BarChart3 className="h-4 w-4 mr-2" />
            Web Traffic
          </TabsTrigger>
          <TabsTrigger value="realtime" data-testid="tab-realtime">
            <Activity className="h-4 w-4 mr-2" />
            Current Visitors
          </TabsTrigger>
          <TabsTrigger value="google" data-testid="tab-google">
            <SiGoogle className="h-4 w-4 mr-2" />
            Google Analytics
          </TabsTrigger>
          <TabsTrigger value="facebook" data-testid="tab-facebook">
            <SiFacebook className="h-4 w-4 mr-2" />
            Facebook Pixel
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Web Traffic Tab */}
        <TabsContent value="traffic" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Page Views</p>
                    <p className="text-2xl font-bold" data-testid="stat-pageviews">
                      {overviewLoading ? "-" : overview?.pageViews?.toLocaleString() || 0}
                    </p>
                  </div>
                  <Eye className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Unique Visitors</p>
                    <p className="text-2xl font-bold" data-testid="stat-visitors">
                      {overviewLoading ? "-" : overview?.uniqueVisitors?.toLocaleString() || 0}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sessions</p>
                    <p className="text-2xl font-bold" data-testid="stat-sessions">
                      {overviewLoading ? "-" : overview?.sessions?.toLocaleString() || 0}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Duration</p>
                    <p className="text-2xl font-bold" data-testid="stat-duration">
                      {overviewLoading ? "-" : formatDuration(overview?.avgSessionDuration || 0)}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Bounce Rate</p>
                    <p className="text-2xl font-bold" data-testid="stat-bounce">
                      {overviewLoading ? "-" : `${overview?.bounceRate || 0}%`}
                    </p>
                  </div>
                  <ArrowDownRight className="h-8 w-8 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Traffic Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Traffic Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {timeline && timeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeline}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => new Date(val).toLocaleDateString()}
                        fontSize={12}
                      />
                      <YAxis fontSize={12} />
                      <Tooltip 
                        labelFormatter={(val) => new Date(val).toLocaleDateString()}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="pageViews" 
                        stroke="#3b82f6" 
                        name="Page Views"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="uniqueVisitors" 
                        stroke="#10b981" 
                        name="Unique Visitors"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available for this period
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Device Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Device Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {deviceData?.devices && deviceData.devices.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={deviceData.devices}
                        dataKey="count"
                        nameKey="deviceType"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {deviceData.devices.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No device data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Pages and Sources */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Pages */}
            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
                <CardDescription>Most visited pages on your website</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Page</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                        <TableHead className="text-right">Visitors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPages?.map((page, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-sm max-w-[200px] truncate">
                            {page.pagePath}
                          </TableCell>
                          <TableCell className="text-right">{page.views}</TableCell>
                          <TableCell className="text-right">{page.uniqueVisitors}</TableCell>
                        </TableRow>
                      )) || (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No page data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Traffic Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
                <CardDescription>Where your visitors come from</CardDescription>
              </CardHeader>
              <CardContent>
                {sources && sources.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sources} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={12} />
                      <YAxis dataKey="source" type="category" fontSize={12} width={100} />
                      <Tooltip />
                      <Bar dataKey="sessions" fill="#3b82f6" name="Sessions" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No source data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Current Visitors Tab */}
        <TabsContent value="realtime" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    Live Visitors
                  </CardTitle>
                  <CardDescription>
                    {currentVisitors?.activeCount || 0} active visitor(s) right now
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchVisitors()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {visitorsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : currentVisitors?.visitors && currentVisitors.visitors.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {currentVisitors.visitors.map((visitor) => (
                      <Card key={visitor.sessionId} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {getDeviceIcon(visitor.deviceType)}
                              <span className="font-medium">{visitor.browser || 'Unknown Browser'}</span>
                              <span className="text-muted-foreground">on</span>
                              <span>{visitor.os || 'Unknown OS'}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span className="font-mono">{visitor.landingPage}</span>
                              {visitor.exitPage && visitor.exitPage !== visitor.landingPage && (
                                <>
                                  <span className="mx-2">→</span>
                                  <span className="font-mono">{visitor.exitPage}</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{visitor.pageViewCount} page(s) viewed</span>
                              {visitor.utmSource && (
                                <Badge variant="outline" className="text-xs">
                                  via {visitor.utmSource}
                                </Badge>
                              )}
                              {visitor.country && (
                                <span className="flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  {visitor.city ? `${visitor.city}, ` : ''}{visitor.country}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <Badge variant="secondary">
                              {formatTimeAgo(visitor.lastActivityAt)}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active visitors right now</p>
                  <p className="text-sm">Visitors will appear here as they browse your site</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Analytics Tab */}
        <TabsContent value="google" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SiGoogle className="h-5 w-5" />
                Google Analytics Integration
              </CardTitle>
              <CardDescription>
                Connect your Google Analytics 4 account to track detailed visitor behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Google Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Track page views and user interactions with Google Analytics
                  </p>
                </div>
                <Switch
                  checked={settingsData.enableGoogleAnalytics || false}
                  onCheckedChange={(checked) => 
                    setSettingsData({ ...settingsData, enableGoogleAnalytics: checked })
                  }
                  data-testid="switch-ga-enabled"
                />
              </div>

              {settingsData.enableGoogleAnalytics && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="gaMeasurementId">Measurement ID</Label>
                    <Input
                      id="gaMeasurementId"
                      placeholder="G-XXXXXXXXXX"
                      value={settingsData.googleAnalyticsMeasurementId || ""}
                      onChange={(e) => 
                        setSettingsData({ ...settingsData, googleAnalyticsMeasurementId: e.target.value })
                      }
                      data-testid="input-ga-id"
                    />
                    <p className="text-sm text-muted-foreground">
                      Find this in Google Analytics: Admin → Property → Data Streams → Web
                    </p>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">How to get your Measurement ID:</h4>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Go to your Google Analytics account</li>
                      <li>Navigate to Admin → Property → Data Streams → Web</li>
                      <li>Select your web stream (or create one)</li>
                      <li>Copy the Measurement ID (starts with "G-")</li>
                    </ol>
                    <a 
                      href="https://analytics.google.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-500 mt-2 hover:underline"
                    >
                      Open Google Analytics <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleSaveSettings} 
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-ga"
              >
                {updateSettingsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Facebook Pixel Tab */}
        <TabsContent value="facebook" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SiFacebook className="h-5 w-5 text-blue-600" />
                Facebook Pixel Integration
              </CardTitle>
              <CardDescription>
                Track conversions and build audiences for Facebook advertising
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Facebook Pixel</Label>
                  <p className="text-sm text-muted-foreground">
                    Track page views and conversions for Facebook Ads
                  </p>
                </div>
                <Switch
                  checked={settingsData.enableFacebookPixel || false}
                  onCheckedChange={(checked) => 
                    setSettingsData({ ...settingsData, enableFacebookPixel: checked })
                  }
                  data-testid="switch-fb-enabled"
                />
              </div>

              {settingsData.enableFacebookPixel && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="fbPixelId">Pixel ID</Label>
                    <Input
                      id="fbPixelId"
                      placeholder="1234567890123456"
                      value={settingsData.facebookPixelId || ""}
                      onChange={(e) => 
                        setSettingsData({ ...settingsData, facebookPixelId: e.target.value })
                      }
                      data-testid="input-fb-pixel"
                    />
                    <p className="text-sm text-muted-foreground">
                      Find this in Facebook Events Manager under Data Sources
                    </p>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">How to get your Pixel ID:</h4>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Go to Facebook Events Manager</li>
                      <li>Click on Data Sources in the left menu</li>
                      <li>Select your Pixel or create a new one</li>
                      <li>Copy the Pixel ID (a 16-digit number)</li>
                    </ol>
                    <a 
                      href="https://business.facebook.com/events_manager" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-500 mt-2 hover:underline"
                    >
                      Open Events Manager <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium mb-2">Tracked Events:</h4>
                    <ul className="text-sm space-y-1">
                      <li className="flex items-center gap-2">
                        <Badge variant="secondary">PageView</Badge>
                        <span className="text-muted-foreground">Automatically tracked on every page</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Badge variant="secondary">Lead</Badge>
                        <span className="text-muted-foreground">When a quote request is submitted</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Badge variant="secondary">Contact</Badge>
                        <span className="text-muted-foreground">When contact form is submitted</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleSaveSettings} 
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-fb"
              >
                {updateSettingsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Settings</CardTitle>
              <CardDescription>Configure tracking behavior and privacy settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Internal Tracking</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Internal Tracking</Label>
                    <p className="text-sm text-muted-foreground">
                      Track visitors using our built-in analytics
                    </p>
                  </div>
                  <Switch
                    checked={settingsData.enableInternalTracking ?? true}
                    onCheckedChange={(checked) => 
                      setSettingsData({ ...settingsData, enableInternalTracking: checked })
                    }
                    data-testid="switch-internal-tracking"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Track Page Views</Label>
                    <p className="text-sm text-muted-foreground">
                      Record each page a visitor views
                    </p>
                  </div>
                  <Switch
                    checked={settingsData.trackPageViews ?? true}
                    onCheckedChange={(checked) => 
                      setSettingsData({ ...settingsData, trackPageViews: checked })
                    }
                    data-testid="switch-track-pageviews"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Track Visitor Sessions</Label>
                    <p className="text-sm text-muted-foreground">
                      Group page views into browsing sessions
                    </p>
                  </div>
                  <Switch
                    checked={settingsData.trackVisitorSessions ?? true}
                    onCheckedChange={(checked) => 
                      setSettingsData({ ...settingsData, trackVisitorSessions: checked })
                    }
                    data-testid="switch-track-sessions"
                  />
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="font-medium">Privacy Settings</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Anonymize IP Addresses</Label>
                    <p className="text-sm text-muted-foreground">
                      Remove the last octet of visitor IP addresses
                    </p>
                  </div>
                  <Switch
                    checked={settingsData.anonymizeIp ?? true}
                    onCheckedChange={(checked) => 
                      setSettingsData({ ...settingsData, anonymizeIp: checked })
                    }
                    data-testid="switch-anonymize-ip"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Respect Do Not Track</Label>
                    <p className="text-sm text-muted-foreground">
                      Honor browser's Do Not Track preference
                    </p>
                  </div>
                  <Switch
                    checked={settingsData.respectDoNotTrack ?? true}
                    onCheckedChange={(checked) => 
                      setSettingsData({ ...settingsData, respectDoNotTrack: checked })
                    }
                    data-testid="switch-dnt"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Cookie Consent Required</Label>
                    <p className="text-sm text-muted-foreground">
                      Only track after visitor consents to cookies
                    </p>
                  </div>
                  <Switch
                    checked={settingsData.cookieConsentRequired ?? false}
                    onCheckedChange={(checked) => 
                      setSettingsData({ ...settingsData, cookieConsentRequired: checked })
                    }
                    data-testid="switch-cookie-consent"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data Retention (days)</Label>
                  <Select
                    value={String(settingsData.dataRetentionDays || 365)}
                    onValueChange={(value) => 
                      setSettingsData({ ...settingsData, dataRetentionDays: parseInt(value) })
                    }
                  >
                    <SelectTrigger className="w-[200px]" data-testid="select-retention">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="730">2 years</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Automatically delete analytics data older than this period
                  </p>
                </div>
              </div>

              <Button 
                onClick={handleSaveSettings} 
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-settings"
              >
                {updateSettingsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
