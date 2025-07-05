import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
  Shield,
  Scan,
  FileX,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Trash2,
  Settings,
  Save,
  RefreshCw,
  HardDrive,
  Lock,
  Unlock,
} from "lucide-react";

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

export default function FileSecurityTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSecurityTab, setActiveSecurityTab] = useState("overview");
  const [selectedOrg, setSelectedOrg] = useState<number | null>(null);
  const [settings, setSettings] = useState<FileSecuritySettings | null>(null);
  const [newMimeType, setNewMimeType] = useState("");
  const [newExtension, setNewExtension] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Get all organizations for admin
  const { data: organizations } = useQuery({
    queryKey: ["/api/saas/organizations"],
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

  // Update security settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<FileSecuritySettings>) => {
      const response = await fetch(`/api/file-security/settings/${selectedOrg}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedSettings),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Security Settings Updated",
        description: "File security settings have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/file-security/settings", selectedOrg] });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: `Failed to update security settings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Force scan mutation
  const forceScanMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/file-security/scan-all/${selectedOrg}`, {
        method: "POST",
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Security Scan Initiated",
        description: "Full security scan has been started for all files.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/file-security/scans", selectedOrg] });
    },
    onError: (error) => {
      toast({
        title: "Scan Failed",
        description: `Failed to initiate security scan: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (securitySettings) {
      setSettings(securitySettings as FileSecuritySettings);
    }
  }, [securitySettings]);

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

  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'clean': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'infected': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'scanning': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'error': return <FileX className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Organization Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            File Security Management
          </CardTitle>
          <CardDescription>
            Configure file upload security, virus scanning, and access controls for organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="org-select">Select Organization:</Label>
            <Select value={selectedOrg?.toString() || ""} onValueChange={(value) => setSelectedOrg(parseInt(value))}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Choose organization..." />
              </SelectTrigger>
              <SelectContent>
                {organizations?.map((org: any) => (
                  <SelectItem key={org.id} value={org.id.toString()}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedOrg && (
        <Tabs value={activeSecurityTab} onValueChange={setActiveSecurityTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Security Overview</TabsTrigger>
            <TabsTrigger value="settings">Security Settings</TabsTrigger>
            <TabsTrigger value="scans">Scan History</TabsTrigger>
            <TabsTrigger value="quarantine">Quarantine</TabsTrigger>
          </TabsList>

          {/* Security Overview */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Scans</p>
                      <p className="text-2xl font-bold">{(securityStats as SecurityStats)?.totalScans || 0}</p>
                    </div>
                    <Scan className="h-8 w-8 text-blue-500" />
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

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Suspicious Activity</p>
                      <p className="text-2xl font-bold text-yellow-600">{securityStats?.suspiciousActivity || 0}</p>
                    </div>
                    <Activity className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Security Actions</CardTitle>
                <CardDescription>Quick actions for file security management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button
                    onClick={() => forceScanMutation.mutate()}
                    disabled={forceScanMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Scan className="h-4 w-4" />
                    {forceScanMutation.isPending ? "Scanning..." : "Run Full Scan"}
                  </Button>
                  <Button variant="outline" onClick={() => setActiveSecurityTab("settings")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="settings" className="space-y-6">
            {settingsLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading security settings...</span>
                  </div>
                </CardContent>
              </Card>
            ) : settings ? (
              <>
                {/* Scanning Settings */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Malware & Virus Scanning</CardTitle>
                        <CardDescription>Configure automatic file scanning for threats</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing && (
                          <Button onClick={handleSaveSettings} size="sm" className="flex items-center gap-2">
                            <Save className="h-4 w-4" />
                            Save Changes
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(!isEditing)}
                        >
                          {isEditing ? "Cancel" : "Edit"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="malware-scan">Enable Malware Scanning</Label>
                          <Switch
                            id="malware-scan"
                            checked={settings.enableMalwareScan}
                            onCheckedChange={(checked) => 
                              setSettings({...settings, enableMalwareScan: checked})
                            }
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="virus-scan">Enable Virus Scanning</Label>
                          <Switch
                            id="virus-scan"
                            checked={settings.enableVirusScan}
                            onCheckedChange={(checked) => 
                              setSettings({...settings, enableVirusScan: checked})
                            }
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="quarantine">Quarantine Threats</Label>
                          <Switch
                            id="quarantine"
                            checked={settings.quarantineOnThreatDetection}
                            onCheckedChange={(checked) => 
                              setSettings({...settings, quarantineOnThreatDetection: checked})
                            }
                            disabled={!isEditing}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="scan-provider">Primary Scan Provider</Label>
                          <Select
                            value={settings.primaryScanProvider}
                            onValueChange={(value) => 
                              setSettings({...settings, primaryScanProvider: value})
                            }
                            disabled={!isEditing}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="clamav">ClamAV</SelectItem>
                              <SelectItem value="virustotal">VirusTotal</SelectItem>
                              <SelectItem value="defender">Windows Defender</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="scan-timeout">Scan Timeout (seconds)</Label>
                          <Input
                            id="scan-timeout"
                            type="number"
                            value={settings.scanTimeout}
                            onChange={(e) => 
                              setSettings({...settings, scanTimeout: parseInt(e.target.value)})
                            }
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* File Type Restrictions */}
                <Card>
                  <CardHeader>
                    <CardTitle>File Type Restrictions</CardTitle>
                    <CardDescription>Control which file types are allowed or blocked</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Allowed MIME Types */}
                      <div>
                        <Label className="text-base font-semibold">Allowed MIME Types</Label>
                        <div className="mt-2 space-y-2">
                          {isEditing && (
                            <div className="flex gap-2">
                              <Input
                                placeholder="e.g., image/jpeg"
                                value={newMimeType}
                                onChange={(e) => setNewMimeType(e.target.value)}
                              />
                              <Button onClick={() => addMimeType(false)} size="sm">Add</Button>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                            {settings.allowedMimeTypes.map((type) => (
                              <Badge key={type} variant="secondary" className="flex items-center gap-1">
                                {type}
                                {isEditing && (
                                  <button
                                    onClick={() => removeMimeType(type, false)}
                                    className="ml-1 hover:text-red-500"
                                  >
                                    ×
                                  </button>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Blocked MIME Types */}
                      <div>
                        <Label className="text-base font-semibold">Blocked MIME Types</Label>
                        <div className="mt-2 space-y-2">
                          {isEditing && (
                            <div className="flex gap-2">
                              <Input
                                placeholder="e.g., application/x-executable"
                                value={newMimeType}
                                onChange={(e) => setNewMimeType(e.target.value)}
                              />
                              <Button onClick={() => addMimeType(true)} size="sm" variant="destructive">Block</Button>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                            {settings.blockedMimeTypes.map((type) => (
                              <Badge key={type} variant="destructive" className="flex items-center gap-1">
                                {type}
                                {isEditing && (
                                  <button
                                    onClick={() => removeMimeType(type, true)}
                                    className="ml-1 hover:text-red-300"
                                  >
                                    ×
                                  </button>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Allowed Extensions */}
                      <div>
                        <Label className="text-base font-semibold">Allowed Extensions</Label>
                        <div className="mt-2 space-y-2">
                          {isEditing && (
                            <div className="flex gap-2">
                              <Input
                                placeholder="e.g., .pdf"
                                value={newExtension}
                                onChange={(e) => setNewExtension(e.target.value)}
                              />
                              <Button onClick={() => addExtension(false)} size="sm">Add</Button>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                            {settings.allowedExtensions.map((ext) => (
                              <Badge key={ext} variant="secondary" className="flex items-center gap-1">
                                {ext}
                                {isEditing && (
                                  <button
                                    onClick={() => removeExtension(ext, false)}
                                    className="ml-1 hover:text-red-500"
                                  >
                                    ×
                                  </button>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Blocked Extensions */}
                      <div>
                        <Label className="text-base font-semibold">Blocked Extensions</Label>
                        <div className="mt-2 space-y-2">
                          {isEditing && (
                            <div className="flex gap-2">
                              <Input
                                placeholder="e.g., .exe"
                                value={newExtension}
                                onChange={(e) => setNewExtension(e.target.value)}
                              />
                              <Button onClick={() => addExtension(true)} size="sm" variant="destructive">Block</Button>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                            {settings.blockedExtensions.map((ext) => (
                              <Badge key={ext} variant="destructive" className="flex items-center gap-1">
                                {ext}
                                {isEditing && (
                                  <button
                                    onClick={() => removeExtension(ext, true)}
                                    className="ml-1 hover:text-red-300"
                                  >
                                    ×
                                  </button>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* File Size and Upload Limits */}
                <Card>
                  <CardHeader>
                    <CardTitle>File Size & Upload Limits</CardTitle>
                    <CardDescription>Configure file size restrictions and upload limits</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="max-file-size">Maximum File Size (MB)</Label>
                          <Input
                            id="max-file-size"
                            type="number"
                            value={Math.round(settings.maxFileSize / 1024 / 1024)}
                            onChange={(e) => 
                              setSettings({...settings, maxFileSize: parseInt(e.target.value) * 1024 * 1024})
                            }
                            disabled={!isEditing}
                          />
                          <p className="text-sm text-muted-foreground">Current: {formatFileSize(settings.maxFileSize)}</p>
                        </div>

                        <div>
                          <Label htmlFor="max-total-upload">Max Total Upload Size (MB)</Label>
                          <Input
                            id="max-total-upload"
                            type="number"
                            value={Math.round(settings.maxTotalUploadSize / 1024 / 1024)}
                            onChange={(e) => 
                              setSettings({...settings, maxTotalUploadSize: parseInt(e.target.value) * 1024 * 1024})
                            }
                            disabled={!isEditing}
                          />
                          <p className="text-sm text-muted-foreground">Current: {formatFileSize(settings.maxTotalUploadSize)}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="max-files-per-upload">Max Files Per Upload</Label>
                          <Input
                            id="max-files-per-upload"
                            type="number"
                            value={settings.maxFilesPerUpload}
                            onChange={(e) => 
                              setSettings({...settings, maxFilesPerUpload: parseInt(e.target.value)})
                            }
                            disabled={!isEditing}
                          />
                        </div>

                        <div>
                          <Label htmlFor="max-daily-uploads">Max Daily Uploads</Label>
                          <Input
                            id="max-daily-uploads"
                            type="number"
                            value={settings.maxDailyUploads}
                            onChange={(e) => 
                              setSettings({...settings, maxDailyUploads: parseInt(e.target.value)})
                            }
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Access Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle>Access Controls & Security</CardTitle>
                    <CardDescription>Configure file access and security validations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="require-auth">Require Authentication</Label>
                          <Switch
                            id="require-auth"
                            checked={settings.requireAuthentication}
                            onCheckedChange={(checked) => 
                              setSettings({...settings, requireAuthentication: checked})
                            }
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="access-logging">Enable Access Logging</Label>
                          <Switch
                            id="access-logging"
                            checked={settings.enableAccessLogging}
                            onCheckedChange={(checked) => 
                              setSettings({...settings, enableAccessLogging: checked})
                            }
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="download-tracking">Track Downloads</Label>
                          <Switch
                            id="download-tracking"
                            checked={settings.enableDownloadTracking}
                            onCheckedChange={(checked) => 
                              setSettings({...settings, enableDownloadTracking: checked})
                            }
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="public-sharing">Allow Public Sharing</Label>
                          <Switch
                            id="public-sharing"
                            checked={settings.allowPublicSharing}
                            onCheckedChange={(checked) => 
                              setSettings({...settings, allowPublicSharing: checked})
                            }
                            disabled={!isEditing}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="content-validation">Content Type Validation</Label>
                          <Switch
                            id="content-validation"
                            checked={settings.enableContentTypeValidation}
                            onCheckedChange={(checked) => 
                              setSettings({...settings, enableContentTypeValidation: checked})
                            }
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="header-validation">File Header Validation</Label>
                          <Switch
                            id="header-validation"
                            checked={settings.enableFileHeaderValidation}
                            onCheckedChange={(checked) => 
                              setSettings({...settings, enableFileHeaderValidation: checked})
                            }
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="suspicious-names">Block Suspicious Names</Label>
                          <Switch
                            id="suspicious-names"
                            checked={settings.blockSuspiciousFileNames}
                            onCheckedChange={(checked) => 
                              setSettings({...settings, blockSuspiciousFileNames: checked})
                            }
                            disabled={!isEditing}
                          />
                        </div>
                        <div>
                          <Label htmlFor="max-share-duration">Max Share Duration (hours)</Label>
                          <Input
                            id="max-share-duration"
                            type="number"
                            value={settings.maxShareDuration}
                            onChange={(e) => 
                              setSettings({...settings, maxShareDuration: parseInt(e.target.value)})
                            }
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No security settings found for this organization.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Scan History */}
          <TabsContent value="scans" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Security Scans</CardTitle>
                <CardDescription>Monitor file scanning activity and threat detection</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Threats</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(recentScans as SecurityScan[] || []).map((scan: SecurityScan) => (
                      <TableRow key={scan.id}>
                        <TableCell className="font-medium">{scan.fileName}</TableCell>
                        <TableCell>{formatFileSize(scan.fileSize)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(scan.scanStatus)}
                            <span className="capitalize">{scan.scanStatus}</span>
                          </div>
                        </TableCell>
                        <TableCell>{scan.scanProvider}</TableCell>
                        <TableCell>
                          {scan.threatCount > 0 ? (
                            <Badge variant={getSeverityColor(scan.threatSeverity)}>
                              {scan.threatCount} threats
                            </Badge>
                          ) : (
                            <span className="text-green-600">Clean</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={scan.actionTaken === 'quarantined' ? 'destructive' : 'secondary'}>
                            {scan.actionTaken}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(scan.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quarantine */}
          <TabsContent value="quarantine" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quarantined Files</CardTitle>
                <CardDescription>Manage files that have been quarantined due to security threats</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  No quarantined files to display.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}