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
import { Textarea } from "@/components/ui/textarea";
import {
  Settings,
  Shield,
  Database,
  Activity,
  Server,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  Lock,
  Eye,
  Download,
  Upload,
  FileText,
  Search
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FileSecuritySettings {
  id: number;
  organizationId: number;
  enableMalwareScan: boolean;
  enableVirusScan: boolean;
  quarantineOnThreatDetection: boolean;
  allowedMimeTypes: string[];
  blockedMimeTypes: string[];
  allowedExtensions: string[];
  blockedExtensions: string[];
  maxFileSize: number;
  maxTotalUploadSize: number;
  maxFilesPerUpload: number;
  maxDailyUploads: number;
  primaryScanProvider: string;
  enableMultipleProviders: boolean;
  scanTimeout: number;
  requireAuthentication: boolean;
  enableAccessLogging: boolean;
  enableDownloadTracking: boolean;
  allowPublicSharing: boolean;
  maxShareDuration: number;
  enableContentTypeValidation: boolean;
  enableFileHeaderValidation: boolean;
  blockSuspiciousFileNames: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SecurityScan {
  id: number;
  fileName: string;
  fileSize: number;
  scanStatus: string;
  scanProvider: string;
  threatCount: number;
  threatSeverity: string | null;
  actionTaken: string;
  createdAt: string;
  scanDuration: number | null;
}

interface SecurityStats {
  totalScans: number;
  recentScans: number;
  threatsDetected: number;
  quarantinedFiles: number;
  totalAccess: number;
  recentAccess: number;
  suspiciousActivity: number;
  deniedAccess: number;
}

export default function FileSecurity() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedOrg, setSelectedOrg] = useState<number | null>(null);
  const [settings, setSettings] = useState<FileSecuritySettings | null>(null);
  const [newMimeType, setNewMimeType] = useState("");
  const [newExtension, setNewExtension] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Get all organizations for admin
  const { data: organizations } = useQuery({
    queryKey: ["/api/admin/saas/organizations"],
  });

  // Get security settings for selected organization
  const { data: securitySettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/file-security/settings", selectedOrg],
    enabled: !!selectedOrg,
  });

  // Get security statistics
  const { data: securityStats } = useQuery({
    queryKey: ["/api/file-security/stats", selectedOrg],
    enabled: !!selectedOrg,
  });

  // Get recent security scans
  const { data: recentScans } = useQuery({
    queryKey: ["/api/file-security/scans", selectedOrg],
    enabled: !!selectedOrg,
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: FileSecuritySettings) => {
      return apiRequest(`/api/file-security/settings/${selectedOrg}`, "PUT", settings);
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "File security settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/file-security/settings", selectedOrg] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: `Failed to update settings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Force scan mutation
  const forceScanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/file-security/scan-all/${selectedOrg}`, "POST", {});
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Security Scan Initiated",
        description: "Full security scan has been started for all files.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/file-security/scans", selectedOrg] });
    },
    onError: (error: any) => {
      toast({
        title: "Scan Failed",
        description: `Failed to initiate security scan: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Set selected organization and settings when data loads
  if (organizations && !selectedOrg && organizations.length > 0) {
    setSelectedOrg(organizations[0].id);
  }

  if (securitySettings && !settings) {
    setSettings(securitySettings as FileSecuritySettings);
  }

  const handleSaveSettings = () => {
    if (!settings) return;
    updateSettingsMutation.mutate(settings);
  };

  const addMimeType = (blocked: boolean = false) => {
    if (!newMimeType || !settings) return;
    
    const field = blocked ? 'blockedMimeTypes' : 'allowedMimeTypes';
    const updated = {
      ...settings,
      [field]: [...settings[field], newMimeType],
    };
    setSettings(updated);
    setNewMimeType("");
  };

  const removeMimeType = (mimeType: string, blocked: boolean = false) => {
    if (!settings) return;
    
    const field = blocked ? 'blockedMimeTypes' : 'allowedMimeTypes';
    const updated = {
      ...settings,
      [field]: settings[field].filter(type => type !== mimeType),
    };
    setSettings(updated);
  };

  const addExtension = (blocked: boolean = false) => {
    if (!newExtension || !settings) return;
    
    const ext = newExtension.startsWith('.') ? newExtension : `.${newExtension}`;
    const field = blocked ? 'blockedExtensions' : 'allowedExtensions';
    const updated = {
      ...settings,
      [field]: [...settings[field], ext],
    };
    setSettings(updated);
    setNewExtension("");
  };

  const removeExtension = (extension: string, blocked: boolean = false) => {
    if (!settings) return;
    
    const field = blocked ? 'blockedExtensions' : 'allowedExtensions';
    const updated = {
      ...settings,
      [field]: settings[field].filter(ext => ext !== extension),
    };
    setSettings(updated);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getScanStatusColor = (status: string) => {
    switch (status) {
      case 'clean': return 'bg-green-100 text-green-800';
      case 'infected': return 'bg-red-100 text-red-800';
      case 'quarantined': return 'bg-orange-100 text-orange-800';
      case 'scanning': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getThreatSeverityColor = (severity: string | null) => {
    if (!severity) return 'bg-gray-100 text-gray-800';
    switch (severity) {
      case 'low': return 'bg-yellow-100 text-yellow-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'high': return 'bg-red-100 text-red-800';
      case 'critical': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">File Security</h1>
          <p className="text-gray-600 mt-1">
            Manage file security settings, scan results, and access controls
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {selectedOrg && (
            <Button
              onClick={() => forceScanMutation.mutate()}
              disabled={forceScanMutation.isPending}
              variant="outline"
            >
              {forceScanMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Full Scan
            </Button>
          )}
        </div>
      </div>

      {/* Organization Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Server className="h-5 w-5 mr-2" />
            Organization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedOrg?.toString()} 
            onValueChange={(value) => setSelectedOrg(parseInt(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              {organizations?.map((org: any) => (
                <SelectItem key={org.id} value={org.id.toString()}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedOrg && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="scans">Scan Results</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Scans</p>
                      <p className="text-2xl font-bold">{securityStats?.totalScans || 0}</p>
                    </div>
                    <Activity className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Recent Scans</p>
                      <p className="text-2xl font-bold text-green-600">{securityStats?.recentScans || 0}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Threats Detected</p>
                      <p className="text-2xl font-bold text-red-600">{securityStats?.threatsDetected || 0}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Quarantined Files</p>
                      <p className="text-2xl font-bold text-orange-600">{securityStats?.quarantinedFiles || 0}</p>
                    </div>
                    <Lock className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Access</p>
                      <p className="text-2xl font-bold">{securityStats?.totalAccess || 0}</p>
                    </div>
                    <Eye className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Recent Access</p>
                      <p className="text-2xl font-bold text-green-600">{securityStats?.recentAccess || 0}</p>
                    </div>
                    <Download className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Suspicious Activity</p>
                      <p className="text-2xl font-bold text-orange-600">{securityStats?.suspiciousActivity || 0}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Denied Access</p>
                      <p className="text-2xl font-bold text-red-600">{securityStats?.deniedAccess || 0}</p>
                    </div>
                    <Shield className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            {settingsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Shield className="h-5 w-5 mr-2" />
                        Security Settings
                      </span>
                      <div className="flex items-center space-x-2">
                        {isEditing ? (
                          <>
                            <Button
                              onClick={() => setIsEditing(false)}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleSaveSettings}
                              disabled={updateSettingsMutation.isPending}
                              size="sm"
                            >
                              {updateSettingsMutation.isPending ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                              )}
                              Save
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => setIsEditing(true)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="enableMalwareScan">Enable Malware Scan</Label>
                          <Switch
                            id="enableMalwareScan"
                            checked={settings?.enableMalwareScan || false}
                            onCheckedChange={(checked) => 
                              setSettings(prev => prev ? { ...prev, enableMalwareScan: checked } : null)
                            }
                            disabled={!isEditing}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Scan all uploaded files for malware
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="enableVirusScan">Enable Virus Scan</Label>
                          <Switch
                            id="enableVirusScan"
                            checked={settings?.enableVirusScan || false}
                            onCheckedChange={(checked) => 
                              setSettings(prev => prev ? { ...prev, enableVirusScan: checked } : null)
                            }
                            disabled={!isEditing}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Scan all uploaded files for viruses
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="quarantineOnThreatDetection">Quarantine on Threat</Label>
                          <Switch
                            id="quarantineOnThreatDetection"
                            checked={settings?.quarantineOnThreatDetection || false}
                            onCheckedChange={(checked) => 
                              setSettings(prev => prev ? { ...prev, quarantineOnThreatDetection: checked } : null)
                            }
                            disabled={!isEditing}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Automatically quarantine files with threats
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="enableAccessLogging">Enable Access Logging</Label>
                          <Switch
                            id="enableAccessLogging"
                            checked={settings?.enableAccessLogging || false}
                            onCheckedChange={(checked) => 
                              setSettings(prev => prev ? { ...prev, enableAccessLogging: checked } : null)
                            }
                            disabled={!isEditing}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Log all file access attempts
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                      <Input
                        id="maxFileSize"
                        type="number"
                        value={settings?.maxFileSize ? Math.round(settings.maxFileSize / 1024 / 1024) : ''}
                        onChange={(e) => 
                          setSettings(prev => prev ? { 
                            ...prev, 
                            maxFileSize: parseInt(e.target.value) * 1024 * 1024 
                          } : null)
                        }
                        disabled={!isEditing}
                        placeholder="50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="primaryScanProvider">Primary Scan Provider</Label>
                      <Select 
                        value={settings?.primaryScanProvider || 'clamav'}
                        onValueChange={(value) => 
                          setSettings(prev => prev ? { ...prev, primaryScanProvider: value } : null)
                        }
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select scan provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clamav">ClamAV</SelectItem>
                          <SelectItem value="virustotal">VirusTotal</SelectItem>
                          <SelectItem value="defender">Windows Defender</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      File Type Restrictions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label>Allowed MIME Types</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {settings?.allowedMimeTypes?.map((type, index) => (
                            <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                              {type}
                              {isEditing && (
                                <button
                                  onClick={() => removeMimeType(type, false)}
                                  className="ml-2 hover:text-red-600"
                                >
                                  ×
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                        {isEditing && (
                          <div className="flex gap-2 mt-2">
                            <Input
                              value={newMimeType}
                              onChange={(e) => setNewMimeType(e.target.value)}
                              placeholder="e.g., image/jpeg"
                              className="flex-1"
                            />
                            <Button onClick={() => addMimeType(false)} size="sm">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label>Blocked MIME Types</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {settings?.blockedMimeTypes?.map((type, index) => (
                            <Badge key={index} variant="secondary" className="bg-red-100 text-red-800">
                              {type}
                              {isEditing && (
                                <button
                                  onClick={() => removeMimeType(type, true)}
                                  className="ml-2 hover:text-red-600"
                                >
                                  ×
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                        {isEditing && (
                          <div className="flex gap-2 mt-2">
                            <Input
                              value={newMimeType}
                              onChange={(e) => setNewMimeType(e.target.value)}
                              placeholder="e.g., application/x-executable"
                              className="flex-1"
                            />
                            <Button onClick={() => addMimeType(true)} size="sm">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label>Allowed Extensions</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {settings?.allowedExtensions?.map((ext, index) => (
                            <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                              {ext}
                              {isEditing && (
                                <button
                                  onClick={() => removeExtension(ext, false)}
                                  className="ml-2 hover:text-red-600"
                                >
                                  ×
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                        {isEditing && (
                          <div className="flex gap-2 mt-2">
                            <Input
                              value={newExtension}
                              onChange={(e) => setNewExtension(e.target.value)}
                              placeholder="e.g., .jpg"
                              className="flex-1"
                            />
                            <Button onClick={() => addExtension(false)} size="sm">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label>Blocked Extensions</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {settings?.blockedExtensions?.map((ext, index) => (
                            <Badge key={index} variant="secondary" className="bg-red-100 text-red-800">
                              {ext}
                              {isEditing && (
                                <button
                                  onClick={() => removeExtension(ext, true)}
                                  className="ml-2 hover:text-red-600"
                                >
                                  ×
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                        {isEditing && (
                          <div className="flex gap-2 mt-2">
                            <Input
                              value={newExtension}
                              onChange={(e) => setNewExtension(e.target.value)}
                              placeholder="e.g., .exe"
                              className="flex-1"
                            />
                            <Button onClick={() => addExtension(true)} size="sm">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="scans" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 mr-2" />
                  Recent Security Scans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Threats</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentScans?.map((scan: SecurityScan) => (
                      <TableRow key={scan.id}>
                        <TableCell className="font-medium">{scan.fileName}</TableCell>
                        <TableCell>{formatFileSize(scan.fileSize)}</TableCell>
                        <TableCell>
                          <Badge className={getScanStatusColor(scan.scanStatus)}>
                            {scan.scanStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {scan.threatCount > 0 ? (
                            <Badge className={getThreatSeverityColor(scan.threatSeverity)}>
                              {scan.threatCount} ({scan.threatSeverity})
                            </Badge>
                          ) : (
                            <span className="text-green-600">Clean</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{scan.actionTaken}</Badge>
                        </TableCell>
                        <TableCell>
                          {scan.scanDuration ? `${scan.scanDuration}ms` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Access Activity Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Activity logging is coming soon.</p>
                  <p className="text-sm">Enable access logging in settings to start tracking file access.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}