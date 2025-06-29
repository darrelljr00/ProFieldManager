import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ImageCompressionSettings } from "@/components/ImageCompressionSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  Users,
  Shield,
  Database,
  Activity,
  Server,
  Mail,
  MessageSquare,
  FileText,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

type SystemHealth = {
  database: boolean;
  api: boolean;
  storage: boolean;
  email: boolean;
  uptime: string;
  lastBackup: string;
};

type ActivityLog = {
  id: number;
  userId: number;
  username: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress: string;
};

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userStats } = useQuery({
    queryKey: ["/api/admin/users/stats"],
  });

  const { data: systemHealth } = useQuery<SystemHealth>({
    queryKey: ["/api/admin/system/health"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: activityLogs = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/admin/activity-logs"],
  });

  const { data: systemSettingsArray } = useQuery({
    queryKey: ["/api/admin/system/settings"],
  });

  // Transform array of settings into a flat object for easier access
  const systemSettings = systemSettingsArray?.reduce((acc: any, setting: any) => {
    const key = setting.key.replace('system_', '');
    acc[key] = setting.value === 'true' ? true : setting.value === 'false' ? false : setting.value;
    return acc;
  }, {}) || {};

  const { data: companySettings } = useQuery({
    queryKey: ["/api/settings/company"],
  });

  const { data: saasMetrics } = useQuery({
    queryKey: ["/api/admin/saas/metrics"],
  });

  const { data: allOrganizations } = useQuery({
    queryKey: ["/api/admin/saas/organizations"],
  });

  const { data: subscriptionPlans } = useQuery({
    queryKey: ["/api/saas/plans"],
  });

  const { data: billingData } = useQuery({
    queryKey: ["/api/admin/saas/billing"],
  });

  const updateSystemSettingMutation = useMutation({
    mutationFn: (data: { key: string; value: string }) =>
      apiRequest("PUT", "/api/admin/system/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system/settings"] });
      toast({
        title: "Success",
        description: "System setting updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update system setting",
        variant: "destructive",
      });
    },
  });

  const performMaintenanceMutation = useMutation({
    mutationFn: (action: string) =>
      apiRequest("POST", "/api/admin/maintenance", { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system/health"] });
      toast({
        title: "Success",
        description: "Maintenance action completed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to perform maintenance action",
        variant: "destructive",
      });
    },
  });

  const suspendOrganizationMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/admin/saas/organizations/${id}/suspend`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/saas/organizations"] });
      toast({
        title: "Success",
        description: "Organization suspended successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to suspend organization",
        variant: "destructive",
      });
    },
  });







  const exportDataMutation = useMutation({
    mutationFn: (type: string) =>
      apiRequest("POST", "/api/admin/export", { type }),
    onSuccess: (data: any) => {
      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast({
        title: "Success",
        description: "System data exported successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to export system data",
        variant: "destructive",
      });
    },
  });

  const logoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      const response = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/company"] });
      setLogoFile(null);
      setLogoPreview(null);
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    },
  });

  const stats = userStats || {
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
    managers: 0,
    users: 0,
    verified: 0,
    recentLogins: 0
  };

  const getHealthIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-500" />
    );
  };

  const getHealthStatus = (status: boolean) => {
    return status ? "Healthy" : "Error";
  };

  const handleSystemSettingChange = (key: string, value: string) => {
    updateSystemSettingMutation.mutate({ key: `system_${key}`, value });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = () => {
    if (logoFile) {
      logoUploadMutation.mutate(logoFile);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Admin Settings
          </h1>
          <p className="text-muted-foreground">System administration and configuration</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database</CardTitle>
                {getHealthIcon(systemHealth?.database || false)}
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">
                  {getHealthStatus(systemHealth?.database || false)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Service</CardTitle>
                {getHealthIcon(systemHealth?.api || false)}
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">
                  {getHealthStatus(systemHealth?.api || false)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage</CardTitle>
                {getHealthIcon(systemHealth?.storage || false)}
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">
                  {getHealthStatus(systemHealth?.storage || false)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Email Service</CardTitle>
                {getHealthIcon(systemHealth?.email || false)}
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">
                  {getHealthStatus(systemHealth?.email || false)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                  <div className="text-sm text-muted-foreground">Active Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.admins}</div>
                  <div className="text-sm text-muted-foreground">Administrators</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.recentLogins}</div>
                  <div className="text-sm text-muted-foreground">Recent Logins</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">System Uptime</Label>
                  <div className="text-lg">{systemHealth?.uptime || "Unknown"}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Backup</Label>
                  <div className="text-lg">{systemHealth?.lastBackup || "Never"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Company Settings
              </CardTitle>
              <CardDescription>
                Manage company logo and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Company Logo</Label>
                <div className="space-y-4">
                  {/* Current Logo Display */}
                  {companySettings?.logo && !logoPreview && (
                    <div className="flex items-center space-x-4">
                      <img
                        src={companySettings.logo.startsWith('/uploads') ? companySettings.logo : `/uploads/${companySettings.logo}`}
                        alt="Current logo"
                        className="h-16 w-16 object-contain border rounded"
                      />
                      <span className="text-sm text-muted-foreground">Current logo</span>
                    </div>
                  )}
                  
                  {/* Logo Preview */}
                  {logoPreview && (
                    <div className="flex items-center space-x-4">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-16 w-16 object-contain border rounded"
                      />
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          onClick={handleLogoUpload}
                          disabled={logoUploadMutation.isPending}
                          size="sm"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {logoUploadMutation.isPending ? "Uploading..." : "Upload"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={removeLogo}
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* File Input */}
                  <div>
                    <Input
                      id="logoFile"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Supported formats: JPG, PNG, GIF, SVG. Max size: 5MB
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saas" className="space-y-6">
          {/* SaaS Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{saasMetrics?.totalOrganizations || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{saasMetrics?.newOrganizationsThisMonth || 0} this month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{saasMetrics?.activeSubscriptions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {saasMetrics?.trialSubscriptions || 0} on trial
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${saasMetrics?.monthlyRevenue || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{saasMetrics?.revenueGrowth || 0}% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{saasMetrics?.churnRate || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {saasMetrics?.churnTrend || 0}% vs last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Organization Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Organization Management
              </CardTitle>
              <CardDescription>
                Manage all tenant organizations, subscriptions, and billing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allOrganizations?.map((org: any) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{org.name}</div>
                          <div className="text-sm text-muted-foreground">{org.slug}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={org.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                          {org.subscriptionPlan || 'Free'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          org.subscriptionStatus === 'active' ? 'default' :
                          org.subscriptionStatus === 'trial' ? 'secondary' :
                          org.subscriptionStatus === 'suspended' ? 'destructive' : 'outline'
                        }>
                          {org.subscriptionStatus || 'inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{org.userCount || 0}</TableCell>
                      <TableCell>{new Date(org.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Suspend
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Suspend Organization</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will suspend access for {org.name} and all its users. This action can be reversed.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => suspendOrganizationMutation.mutate(org.id)}
                                >
                                  Suspend
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Subscription Plans Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Subscription Plans
              </CardTitle>
              <CardDescription>
                Manage subscription tiers, pricing, and features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {subscriptionPlans?.map((plan: any) => (
                  <Card key={plan.id} className="relative">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {plan.name}
                        <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                          {plan.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        <div className="text-2xl font-bold">${plan.price}</div>
                        <div className="text-sm">{plan.interval}</div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>Features:</strong>
                          <ul className="list-disc list-inside mt-1">
                            <li>{plan.maxUsers} users</li>
                            <li>{plan.maxProjects} projects</li>
                            <li>{plan.maxStorageGB}GB storage</li>
                            {plan.hasAdvancedReporting && <li>Advanced reporting</li>}
                            {plan.hasApiAccess && <li>API access</li>}
                            {plan.hasCustomBranding && <li>Custom branding</li>}
                          </ul>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button 
                            variant={plan.isActive ? "outline" : "default"} 
                            size="sm"
                          >
                            {plan.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <Button 
                onClick={() => {
                  // Create new plan functionality would be implemented here
                  toast({
                    title: "Feature",
                    description: "Plan creation interface would open here",
                  });
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Create New Plan
              </Button>
            </CardContent>
          </Card>

          {/* Billing & Revenue Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Billing & Revenue
              </CardTitle>
              <CardDescription>
                Monitor revenue, failed payments, and billing issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Recent Payments</h4>
                  <div className="space-y-2">
                    {billingData?.recentPayments?.map((payment: any) => (
                      <div key={payment.id} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <div className="font-medium">{payment.organizationName}</div>
                          <div className="text-sm text-muted-foreground">{payment.planName}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${payment.amount}</div>
                          <Badge variant={payment.status === 'succeeded' ? 'default' : 'destructive'}>
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold">Failed Payments</h4>
                  <div className="space-y-2">
                    {billingData?.failedPayments?.map((payment: any) => (
                      <div key={payment.id} className="flex justify-between items-center p-2 border border-red-200 rounded">
                        <div>
                          <div className="font-medium">{payment.organizationName}</div>
                          <div className="text-sm text-muted-foreground">
                            Last attempt: {new Date(payment.lastAttempt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${payment.amount}</div>
                          <Button variant="outline" size="sm">Retry</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature Toggles & Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Global Feature Controls
              </CardTitle>
              <CardDescription>
                Control feature availability and system-wide limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Feature Toggles</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enableTrials">Enable Free Trials</Label>
                      <Switch
                        id="enableTrials"
                        checked={systemSettings?.enableTrials || false}
                        onCheckedChange={(checked) => 
                          handleSystemSettingChange("enableTrials", checked.toString())
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enableSelfSignup">Enable Self Signup</Label>
                      <Switch
                        id="enableSelfSignup"
                        checked={systemSettings?.enableSelfSignup || false}
                        onCheckedChange={(checked) => 
                          handleSystemSettingChange("enableSelfSignup", checked.toString())
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enableApiAccess">Enable API Access</Label>
                      <Switch
                        id="enableApiAccess"
                        checked={systemSettings?.enableApiAccess || false}
                        onCheckedChange={(checked) => 
                          handleSystemSettingChange("enableApiAccess", checked.toString())
                        }
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold">Global Limits</h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="maxOrgsPerUser">Max Organizations per User</Label>
                      <Input
                        id="maxOrgsPerUser"
                        type="number"
                        defaultValue={systemSettings?.maxOrgsPerUser || 1}
                        onBlur={(e) => 
                          handleSystemSettingChange("maxOrgsPerUser", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trialDurationDays">Trial Duration (days)</Label>
                      <Input
                        id="trialDurationDays"
                        type="number"
                        defaultValue={systemSettings?.trialDurationDays || 14}
                        onBlur={(e) => 
                          handleSystemSettingChange("trialDurationDays", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxFileUploadMB">Max File Upload (MB)</Label>
                      <Input
                        id="maxFileUploadMB"
                        type="number"
                        defaultValue={systemSettings?.maxFileUploadMB || 10}
                        onBlur={(e) => 
                          handleSystemSettingChange("maxFileUploadMB", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="registration">Allow User Registration</Label>
                  <Switch
                    id="registration"
                    checked={systemSettings?.allowRegistration || false}
                    onCheckedChange={(checked) => 
                      handleSystemSettingChange("allowRegistration", checked.toString())
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailVerification">Require Email Verification</Label>
                  <Switch
                    id="emailVerification"
                    checked={systemSettings?.requireEmailVerification || false}
                    onCheckedChange={(checked) => 
                      handleSystemSettingChange("requireEmailVerification", checked.toString())
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    defaultValue={systemSettings?.sessionTimeout || 60}
                    onBlur={(e) => 
                      handleSystemSettingChange("sessionTimeout", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxFileSize">Max File Upload Size (MB)</Label>
                  <Input
                    id="maxFileSize"
                    type="number"
                    defaultValue={systemSettings?.maxFileSize || 10}
                    onBlur={(e) => 
                      handleSystemSettingChange("maxFileSize", e.target.value)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Image Compression Settings
              </CardTitle>
              <CardDescription>
                Configure automatic image compression for uploaded files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="enableImageCompression">Enable Image Compression</Label>
                  <Switch
                    id="enableImageCompression"
                    checked={systemSettings?.enableImageCompression || false}
                    onCheckedChange={(checked) => 
                      handleSystemSettingChange("enableImageCompression", checked.toString())
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Automatically compress images to reduce file size
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageQuality">Image Quality (%)</Label>
                  <Input
                    id="imageQuality"
                    type="number"
                    min="10"
                    max="100"
                    defaultValue={systemSettings?.imageQuality || 80}
                    onBlur={(e) => 
                      handleSystemSettingChange("imageQuality", e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher values mean better quality but larger files
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxImageWidth">Max Image Width (px)</Label>
                  <Input
                    id="maxImageWidth"
                    type="number"
                    min="100"
                    max="5000"
                    defaultValue={systemSettings?.maxImageWidth || 1920}
                    onBlur={(e) => 
                      handleSystemSettingChange("maxImageWidth", e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Images wider than this will be resized
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxImageHeight">Max Image Height (px)</Label>
                  <Input
                    id="maxImageHeight"
                    type="number"
                    min="100"
                    max="5000"
                    defaultValue={systemSettings?.maxImageHeight || 1080}
                    onBlur={(e) => 
                      handleSystemSettingChange("maxImageHeight", e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Images taller than this will be resized
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compressionFormat">Output Format</Label>
                  <Select
                    value={systemSettings?.compressionFormat || "jpeg"}
                    onValueChange={(value) => 
                      handleSystemSettingChange("compressionFormat", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jpeg">JPEG</SelectItem>
                      <SelectItem value="webp">WebP</SelectItem>
                      <SelectItem value="png">PNG</SelectItem>
                      <SelectItem value="original">Keep Original</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    WebP offers best compression, JPEG is most compatible
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enableThumbnails">Generate Thumbnails</Label>
                  <Switch
                    id="enableThumbnails"
                    checked={systemSettings?.enableThumbnails || false}
                    onCheckedChange={(checked) => 
                      handleSystemSettingChange("enableThumbnails", checked.toString())
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Create small thumbnail versions of images
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  Changes will apply to newly uploaded images only
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                  <Input
                    id="passwordMinLength"
                    type="number"
                    defaultValue={systemSettings?.passwordMinLength || 8}
                    onBlur={(e) => 
                      handleSystemSettingChange("passwordMinLength", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loginAttempts">Max Login Attempts</Label>
                  <Input
                    id="loginAttempts"
                    type="number"
                    defaultValue={systemSettings?.maxLoginAttempts || 5}
                    onBlur={(e) => 
                      handleSystemSettingChange("maxLoginAttempts", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requireStrongPassword">Require Strong Passwords</Label>
                  <Switch
                    id="requireStrongPassword"
                    checked={systemSettings?.requireStrongPassword || false}
                    onCheckedChange={(checked) => 
                      handleSystemSettingChange("requireStrongPassword", checked.toString())
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enableTwoFactor">Enable Two-Factor Authentication</Label>
                  <Switch
                    id="enableTwoFactor"
                    checked={systemSettings?.enableTwoFactor || false}
                    onCheckedChange={(checked) => 
                      handleSystemSettingChange("enableTwoFactor", checked.toString())
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => performMaintenanceMutation.mutate("backup")}
                  disabled={performMaintenanceMutation.isPending}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Create Backup
                </Button>
                <Button
                  variant="outline"
                  onClick={() => performMaintenanceMutation.mutate("cleanup")}
                  disabled={performMaintenanceMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clean Temp Files
                </Button>
                <Button
                  variant="outline"
                  onClick={() => performMaintenanceMutation.mutate("refresh-cache")}
                  disabled={performMaintenanceMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Cache
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportDataMutation.mutate("full")}
                  disabled={exportDataMutation.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export System Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Activity Logs
              </CardTitle>
              <CardDescription>
                Recent system and user activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLogs.slice(0, 10).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.username}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell className="max-w-xs truncate">{log.details}</TableCell>
                      <TableCell>{log.ipAddress}</TableCell>
                      <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}