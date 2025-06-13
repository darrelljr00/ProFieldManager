import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

  const { data: systemSettings } = useQuery({
    queryKey: ["/api/admin/system/settings"],
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

  const updateUserPermissionsMutation = useMutation({
    mutationFn: ({ userId, permissions }: { userId: number; permissions: any }) =>
      apiRequest("PUT", `/api/admin/users/${userId}/permissions`, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User permissions updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user permissions",
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
    updateSystemSettingMutation.mutate({ key, value });
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
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

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                User Management Overview
              </CardTitle>
              <CardDescription>
                Manage user accounts and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Total Registered Users</span>
                  <Badge variant="outline">{stats.total}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active Users</span>
                  <Badge variant="secondary">{stats.active}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Inactive Users</span>
                  <Badge variant="destructive">{stats.inactive}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Email Verified Users</span>
                  <Badge variant="outline">{stats.verified}</Badge>
                </div>
                <div className="pt-4">
                  <Button asChild className="w-full">
                    <a href="/users">Manage Users</a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                User Permissions Management
              </CardTitle>
              <CardDescription>
                Control what each user can access and modify in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>View Profiles</TableHead>
                      <TableHead>Edit Profiles</TableHead>
                      <TableHead>Create Invoices</TableHead>
                      <TableHead>View All Data</TableHead>
                      <TableHead>Manage Projects</TableHead>
                      <TableHead>Access Reports</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : user.role === 'manager' ? 'secondary' : 'outline'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={user.canViewProfiles ?? true}
                            onCheckedChange={(checked) => 
                              updateUserPermissionsMutation.mutate({
                                userId: user.id,
                                permissions: { canViewProfiles: checked }
                              })
                            }
                            disabled={user.role === 'admin' || updateUserPermissionsMutation.isPending}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={user.canEditProfiles ?? false}
                            onCheckedChange={(checked) => 
                              updateUserPermissionsMutation.mutate({
                                userId: user.id,
                                permissions: { canEditProfiles: checked }
                              })
                            }
                            disabled={user.role === 'admin' || updateUserPermissionsMutation.isPending}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={user.canCreateInvoices ?? true}
                            onCheckedChange={(checked) => 
                              updateUserPermissionsMutation.mutate({
                                userId: user.id,
                                permissions: { canCreateInvoices: checked }
                              })
                            }
                            disabled={user.role === 'admin' || updateUserPermissionsMutation.isPending}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={user.canViewAllData ?? false}
                            onCheckedChange={(checked) => 
                              updateUserPermissionsMutation.mutate({
                                userId: user.id,
                                permissions: { canViewAllData: checked }
                              })
                            }
                            disabled={user.role === 'admin' || updateUserPermissionsMutation.isPending}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={user.canManageProjects ?? true}
                            onCheckedChange={(checked) => 
                              updateUserPermissionsMutation.mutate({
                                userId: user.id,
                                permissions: { canManageProjects: checked }
                              })
                            }
                            disabled={user.role === 'admin' || updateUserPermissionsMutation.isPending}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={user.canAccessReports ?? true}
                            onCheckedChange={(checked) => 
                              updateUserPermissionsMutation.mutate({
                                userId: user.id,
                                permissions: { canAccessReports: checked }
                              })
                            }
                            disabled={user.role === 'admin' || updateUserPermissionsMutation.isPending}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Permission Descriptions:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div><strong>View Profiles:</strong> Can view user profile information</div>
                    <div><strong>Edit Profiles:</strong> Can modify user profile data</div>
                    <div><strong>Create Invoices:</strong> Can create and send invoices</div>
                    <div><strong>View All Data:</strong> Can see data created by all users</div>
                    <div><strong>Manage Projects:</strong> Can create and manage projects</div>
                    <div><strong>Access Reports:</strong> Can view financial and system reports</div>
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