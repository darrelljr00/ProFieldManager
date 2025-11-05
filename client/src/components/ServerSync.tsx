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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Server,
  RefreshCw,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Trash2,
  Edit,
  Eye,
  PlayCircle,
  Database,
  FileText,
  ArrowLeftRight,
  ArrowRight,
  Code,
  Copy,
} from "lucide-react";
import { format } from "date-fns";

type SyncConfiguration = {
  id: number;
  serverName: string;
  serverUrl: string;
  apiKey?: string;
  username?: string;
  syncDirection: "one-way" | "bidirectional";
  syncDatabase: boolean;
  syncFiles: boolean;
  exportFormat: "sql" | "csv";
  conflictResolution: "manual" | "auto-local" | "auto-remote";
  useTimestampComparison: boolean;
  useChecksumComparison: boolean;
  isActive: boolean;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
};

type SyncHistory = {
  id: number;
  configurationId: number;
  syncType: string;
  syncDirection: string;
  status: string;
  totalRecords: number;
  recordsSynced: number;
  recordsFailed: number;
  conflictsDetected: number;
  totalFiles: number;
  filesSynced: number;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  errorMessage?: string;
  createdAt: string;
  configuration?: {
    id: number;
    serverName: string;
  };
};

type SyncConflict = {
  id: number;
  syncHistoryId: number;
  tableName: string;
  recordId: string;
  conflictType: string;
  localData: any;
  remoteData: any;
  localTimestamp?: string;
  remoteTimestamp?: string;
  localChecksum?: string;
  remoteChecksum?: string;
  status: string;
  createdAt: string;
};

export function ServerSync() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SyncConfiguration | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<number | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null);
  const [deleteConfirmConfig, setDeleteConfirmConfig] = useState<number | null>(null);
  const [remoteServerCode, setRemoteServerCode] = useState<string>("");

  const [configForm, setConfigForm] = useState({
    serverName: "",
    serverUrl: "",
    apiKey: "",
    username: "",
    encryptedPassword: "",
    syncDirection: "one-way" as "one-way" | "bidirectional",
    syncDatabase: true,
    syncFiles: false,
    exportFormat: "sql" as "sql" | "csv",
    conflictResolution: "manual" as "manual" | "auto-local" | "auto-remote",
    useTimestampComparison: true,
    useChecksumComparison: true,
  });

  // Fetch sync configurations
  const { data: configurations = [], isLoading: loadingConfigs } = useQuery<SyncConfiguration[]>({
    queryKey: ["/api/sync/configurations"],
  });

  // Fetch sync history
  const { data: syncHistory = [], isLoading: loadingHistory } = useQuery<SyncHistory[]>({
    queryKey: ["/api/sync/history"],
  });

  // Fetch conflicts
  const { data: conflicts = [] } = useQuery<SyncConflict[]>({
    queryKey: ["/api/sync/conflicts"],
  });

  // Create or update configuration
  const saveConfigMutation = useMutation({
    mutationFn: async (data: typeof configForm) => {
      if (editingConfig) {
        return apiRequest(`/api/sync/configurations/${editingConfig.id}`, "PUT", data);
      }
      return apiRequest("/api/sync/configurations", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/configurations"] });
      setIsConfigDialogOpen(false);
      setEditingConfig(null);
      resetForm();
      toast({
        title: "Success",
        description: editingConfig ? "Configuration updated" : "Configuration created",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  // Delete configuration
  const deleteConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/sync/configurations/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/configurations"] });
      setDeleteConfirmConfig(null);
      toast({
        title: "Success",
        description: "Configuration deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete configuration",
        variant: "destructive",
      });
    },
  });

  // Test connection
  const testConnectionMutation = useMutation({
    mutationFn: async (data: { serverUrl: string; apiKey: string; username: string }) => {
      return apiRequest("/api/sync/test-connection", "POST", data);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Connection Successful",
        description: `Connected to server (v${data.serverVersion || "unknown"})`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to server",
        variant: "destructive",
      });
    },
  });

  // Execute sync
  const executeSyncMutation = useMutation({
    mutationFn: async (data: { configurationId: number; syncType: string }) => {
      return apiRequest("/api/sync/execute", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/history"] });
      toast({
        title: "Sync Started",
        description: "Sync operation has been initiated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start sync",
        variant: "destructive",
      });
    },
  });

  // Resolve conflict
  const resolveConflictMutation = useMutation({
    mutationFn: async (data: { conflictId: number; resolution: string; mergedData?: any }) => {
      return apiRequest(`/api/sync/conflicts/${data.conflictId}/resolve`, "POST", {
        resolution: data.resolution,
        mergedData: data.mergedData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sync/conflicts"] });
      setShowConflictDialog(false);
      setSelectedConflict(null);
      toast({
        title: "Conflict Resolved",
        description: "Conflict has been resolved",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve conflict",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setConfigForm({
      serverName: "",
      serverUrl: "",
      apiKey: "",
      username: "",
      encryptedPassword: "",
      syncDirection: "one-way",
      syncDatabase: true,
      syncFiles: false,
      exportFormat: "sql",
      conflictResolution: "manual",
      useTimestampComparison: true,
      useChecksumComparison: true,
    });
  };

  // Generate remote server template
  const generateRemoteServerTemplate = () => {
    const template = `// ======================================================================
// REMOTE SYNC RECEIVER SERVER
// ======================================================================
// This Node.js/Express server receives sync data from Pro Field Manager
// 
// SETUP INSTRUCTIONS:
// 1. Install Node.js (v16 or higher) on your remote server
// 2. Create a new directory and save this file as "sync-receiver-server.js"
// 3. Install dependencies: npm install express pg bcryptjs multer csv-parse
// 4. Create .env file with your database credentials (see CONFIG section)
// 5. Run the server: node sync-receiver-server.js
// 6. Server will listen on port 3000 (or PORT env variable)
// 7. Configure firewall to allow incoming connections on the port
// ======================================================================

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ======================================================================
// CONFIGURATION - Update these values or use environment variables
// ======================================================================

const CONFIG = {
  // Server Configuration
  port: process.env.PORT || 3000,
  
  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'sync_receiver',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'your_password_here',
  },
  
  // Authentication - IMPORTANT: Change these before deploying!
  auth: {
    // API key to match your sync configuration
    apiKey: process.env.API_KEY || 'your-api-key-here',
    username: process.env.AUTH_USERNAME || 'admin',
    // Password hash (generate with: node -e "console.log(require('bcryptjs').hashSync('your-password', 10))")
    passwordHash: process.env.PASSWORD_HASH || '$2a$10$EXAMPLE',
  },
  
  // File Storage
  fileStoragePath: process.env.FILE_STORAGE_PATH || './sync_files',
};

// ======================================================================
// INITIALIZE APP AND DATABASE
// ======================================================================

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

const pool = new Pool(CONFIG.database);

// Create file storage directory
if (!fs.existsSync(CONFIG.fileStoragePath)) {
  fs.mkdirSync(CONFIG.fileStoragePath, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const orgPath = path.join(CONFIG.fileStoragePath, req.body.organizationId || 'default');
      if (!fs.existsSync(orgPath)) {
        fs.mkdirSync(orgPath, { recursive: true });
      }
      cb(null, orgPath);
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// ======================================================================
// AUTHENTICATION MIDDLEWARE
// ======================================================================

function authenticateRequest(req, res, next) {
  const authHeader = req.headers.authorization;
  const username = req.headers['x-username'];
  const password = req.headers['x-password'];
  
  // API Key authentication
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === CONFIG.auth.apiKey) {
      return next();
    }
  }
  
  // Username/Password authentication
  if (username && password) {
    if (username === CONFIG.auth.username && bcrypt.compareSync(password, CONFIG.auth.passwordHash)) {
      return next();
    }
  }
  
  return res.status(401).json({ error: 'Unauthorized' });
}

// ======================================================================
// HEALTH CHECK ENDPOINT
// ======================================================================

app.get('/api/sync/status', authenticateRequest, async (req, res) => {
  try {
    // Test database connection
    const result = await pool.query('SELECT NOW()');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      serverTime: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// ======================================================================
// RECEIVE DATABASE SYNC (SQL FORMAT)
// ======================================================================

app.post('/api/sync/database', authenticateRequest, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { organizationId, sqlStatements, format } = req.body;
    
    console.log(\`Receiving database sync for org \${organizationId}, format: \${format}\`);
    
    await client.query('BEGIN');
    
    if (format === 'sql') {
      // Execute SQL statements
      if (Array.isArray(sqlStatements)) {
        for (const sql of sqlStatements) {
          await client.query(sql);
        }
      } else if (typeof sqlStatements === 'string') {
        // Split by semicolon and execute each statement
        const statements = sqlStatements.split(';').filter(s => s.trim());
        for (const sql of statements) {
          if (sql.trim()) {
            await client.query(sql);
          }
        }
      }
    } else if (format === 'csv') {
      // Handle CSV import
      const { tableName, csvData } = req.body;
      
      // Parse CSV and insert data
      console.log(\`CSV import for table \${tableName}\`);
      
      // TODO: Implement CSV parsing and insertion
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      recordsSynced: sqlStatements?.length || 0,
      conflicts: [],
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database sync error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
    });
  } finally {
    client.release();
  }
});

// ======================================================================
// RECEIVE FILE SYNC
// ======================================================================

app.post('/api/sync/files', authenticateRequest, upload.array('files', 100), async (req, res) => {
  try {
    const { organizationId } = req.body;
    const uploadedFiles = req.files;
    
    console.log(\`Received \${uploadedFiles?.length || 0} files for org \${organizationId}\`);
    
    const fileResults = [];
    
    for (const file of uploadedFiles || []) {
      // Calculate checksum
      const fileBuffer = fs.readFileSync(file.path);
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      fileResults.push({
        filename: file.originalname,
        size: file.size,
        checksum,
        path: file.path,
      });
    }
    
    res.json({
      success: true,
      filesSynced: fileResults.length,
      files: fileResults,
    });
    
  } catch (error) {
    console.error('File sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ======================================================================
// RECEIVE COMBINED SYNC
// ======================================================================

app.post('/api/sync/receive', authenticateRequest, async (req, res) => {
  try {
    const { organizationId, syncType, timestamp, databaseSql, databaseCsv, files } = req.body;
    
    console.log(\`Received sync request: type=\${syncType}, org=\${organizationId}, time=\${timestamp}\`);
    
    const results = {
      success: true,
      recordsSynced: 0,
      totalRecords: 0,
      filesSynced: 0,
      totalFiles: 0,
      conflicts: [],
    };
    
    // Handle database sync
    if (syncType === 'database' || syncType === 'both') {
      if (databaseSql) {
        // Process SQL
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const statements = databaseSql.split(';').filter(s => s.trim());
          for (const sql of statements) {
            if (sql.trim()) {
              await client.query(sql);
            }
          }
          await client.query('COMMIT');
          results.recordsSynced = statements.length;
          results.totalRecords = statements.length;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }
    }
    
    // Handle file sync
    if (syncType === 'files' || syncType === 'both') {
      if (files && Array.isArray(files)) {
        results.totalFiles = files.length;
        results.filesSynced = files.length;
      }
    }
    
    res.json(results);
    
  } catch (error) {
    console.error('Sync receive error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ======================================================================
// START SERVER
// ======================================================================

app.listen(CONFIG.port, () => {
  console.log(\`\\n========================================\`);
  console.log(\`Remote Sync Receiver Server Started\`);
  console.log(\`========================================\`);
  console.log(\`Port: \${CONFIG.port}\`);
  console.log(\`Database: \${CONFIG.database.host}:\${CONFIG.database.port}/\${CONFIG.database.database}\`);
  console.log(\`File Storage: \${CONFIG.fileStoragePath}\`);
  console.log(\`\\nEndpoints:\`);
  console.log(\`  GET  /api/sync/status       - Health check\`);
  console.log(\`  POST /api/sync/database     - Receive database sync\`);
  console.log(\`  POST /api/sync/files        - Receive file uploads\`);
  console.log(\`  POST /api/sync/receive      - Combined sync endpoint\`);
  console.log(\`========================================\\n\`);
});

// ======================================================================
// ERROR HANDLING
// ======================================================================

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});
`;
    setRemoteServerCode(template);
  };

  // Download remote server file
  const downloadRemoteServer = () => {
    const blob = new Blob([remoteServerCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sync-receiver-server.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded",
      description: "Remote server file has been downloaded",
    });
  };

  // Copy code to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(remoteServerCode);
    toast({
      title: "Copied",
      description: "Code copied to clipboard",
    });
  };

  // Generate template on component mount
  if (remoteServerCode === "") {
    generateRemoteServerTemplate();
  }

  const openEditDialog = (config: SyncConfiguration) => {
    setEditingConfig(config);
    setConfigForm({
      serverName: config.serverName,
      serverUrl: config.serverUrl,
      apiKey: config.apiKey || "",
      username: config.username || "",
      encryptedPassword: "",
      syncDirection: config.syncDirection,
      syncDatabase: config.syncDatabase,
      syncFiles: config.syncFiles,
      exportFormat: config.exportFormat,
      conflictResolution: config.conflictResolution,
      useTimestampComparison: config.useTimestampComparison,
      useChecksumComparison: config.useChecksumComparison,
    });
    setIsConfigDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      completed: "bg-green-500",
      "in-progress": "bg-blue-500",
      failed: "bg-red-500",
      conflict: "bg-yellow-500",
      pending: "bg-gray-500",
    };
    const color = statusColors[status as keyof typeof statusColors] || "bg-gray-500";
    
    return (
      <Badge className={`${color} text-white`} data-testid={`badge-sync-status-${status}`}>
        {status}
      </Badge>
    );
  };

  const handleSync = (configId: number, syncType: string) => {
    executeSyncMutation.mutate({ configurationId: configId, syncType });
  };

  return (
    <div className="space-y-6">
      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950" data-testid="card-conflicts-alert">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-5 w-5" />
              {conflicts.length} Sync Conflict{conflicts.length !== 1 ? "s" : ""} Detected
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              Review and resolve conflicts to complete the sync operation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conflicts.slice(0, 3).map((conflict) => (
                <div
                  key={conflict.id}
                  className="flex items-center justify-between bg-white dark:bg-gray-900 p-3 rounded border"
                >
                  <div>
                    <p className="font-medium">
                      {conflict.tableName} - Record #{conflict.recordId}
                    </p>
                    <p className="text-sm text-gray-600">
                      Type: {conflict.conflictType}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedConflict(conflict);
                      setShowConflictDialog(true);
                    }}
                    data-testid={`button-view-conflict-${conflict.id}`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View & Resolve
                  </Button>
                </div>
              ))}
              {conflicts.length > 3 && (
                <p className="text-sm text-gray-600 text-center pt-2">
                  +{conflicts.length - 3} more conflicts
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Server Configuration */}
      <Card data-testid="card-server-config">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Server Configurations
              </CardTitle>
              <CardDescription>
                Manage remote server connections for data synchronization
              </CardDescription>
            </div>
            <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingConfig(null);
                    resetForm();
                  }}
                  data-testid="button-add-config"
                >
                  <Server className="h-4 w-4 mr-2" />
                  Add Configuration
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingConfig ? "Edit" : "Add"} Server Configuration
                  </DialogTitle>
                  <DialogDescription>
                    Configure connection to your remote server for sync operations
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="serverName">Server Name</Label>
                      <Input
                        id="serverName"
                        placeholder="Production Server"
                        value={configForm.serverName}
                        onChange={(e) =>
                          setConfigForm({ ...configForm, serverName: e.target.value })
                        }
                        data-testid="input-server-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serverUrl">Server URL</Label>
                      <Input
                        id="serverUrl"
                        placeholder="https://server.example.com"
                        value={configForm.serverUrl}
                        onChange={(e) =>
                          setConfigForm({ ...configForm, serverUrl: e.target.value })
                        }
                        data-testid="input-server-url"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        placeholder="admin"
                        value={configForm.username}
                        onChange={(e) =>
                          setConfigForm({ ...configForm, username: e.target.value })
                        }
                        data-testid="input-username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input
                        id="apiKey"
                        placeholder="sk-..."
                        value={configForm.apiKey}
                        onChange={(e) =>
                          setConfigForm({ ...configForm, apiKey: e.target.value })
                        }
                        data-testid="input-api-key"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={configForm.encryptedPassword}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, encryptedPassword: e.target.value })
                      }
                      data-testid="input-password"
                    />
                    <p className="text-xs text-gray-500">
                      Leave blank to keep existing password
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="syncDirection">Sync Direction</Label>
                      <Select
                        value={configForm.syncDirection}
                        onValueChange={(value: "one-way" | "bidirectional") =>
                          setConfigForm({ ...configForm, syncDirection: value })
                        }
                      >
                        <SelectTrigger data-testid="select-sync-direction">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one-way">
                            One-Way (Push)
                          </SelectItem>
                          <SelectItem value="bidirectional">
                            Bidirectional
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="exportFormat">Export Format</Label>
                      <Select
                        value={configForm.exportFormat}
                        onValueChange={(value: "sql" | "csv") =>
                          setConfigForm({ ...configForm, exportFormat: value })
                        }
                      >
                        <SelectTrigger data-testid="select-export-format">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sql">SQL</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="conflictResolution">Conflict Resolution</Label>
                      <Select
                        value={configForm.conflictResolution}
                        onValueChange={(value: "manual" | "auto-local" | "auto-remote") =>
                          setConfigForm({ ...configForm, conflictResolution: value })
                        }
                      >
                        <SelectTrigger data-testid="select-conflict-resolution">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="auto-local">Auto (Local Wins)</SelectItem>
                          <SelectItem value="auto-remote">Auto (Remote Wins)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="syncDatabase" className="flex-1">
                        Sync Database
                      </Label>
                      <Switch
                        id="syncDatabase"
                        checked={configForm.syncDatabase}
                        onCheckedChange={(checked) =>
                          setConfigForm({ ...configForm, syncDatabase: checked })
                        }
                        data-testid="switch-sync-database"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="syncFiles" className="flex-1">
                        Sync Files
                      </Label>
                      <Switch
                        id="syncFiles"
                        checked={configForm.syncFiles}
                        onCheckedChange={(checked) =>
                          setConfigForm({ ...configForm, syncFiles: checked })
                        }
                        data-testid="switch-sync-files"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="timestampComparison" className="flex-1">
                        Use Timestamp Comparison
                      </Label>
                      <Switch
                        id="timestampComparison"
                        checked={configForm.useTimestampComparison}
                        onCheckedChange={(checked) =>
                          setConfigForm({ ...configForm, useTimestampComparison: checked })
                        }
                        data-testid="switch-timestamp-comparison"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="checksumComparison" className="flex-1">
                        Use Checksum Comparison
                      </Label>
                      <Switch
                        id="checksumComparison"
                        checked={configForm.useChecksumComparison}
                        onCheckedChange={(checked) =>
                          setConfigForm({ ...configForm, useChecksumComparison: checked })
                        }
                        data-testid="switch-checksum-comparison"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        testConnectionMutation.mutate({
                          serverUrl: configForm.serverUrl,
                          apiKey: configForm.apiKey,
                          username: configForm.username,
                        })
                      }
                      disabled={!configForm.serverUrl || testConnectionMutation.isPending}
                      data-testid="button-test-connection"
                    >
                      <RefreshCw
                        className={`h-4 w-4 mr-2 ${testConnectionMutation.isPending ? "animate-spin" : ""}`}
                      />
                      Test Connection
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="outline"
                      onClick={() => setIsConfigDialogOpen(false)}
                      data-testid="button-cancel-config"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => saveConfigMutation.mutate(configForm)}
                      disabled={!configForm.serverName || !configForm.serverUrl || saveConfigMutation.isPending}
                      data-testid="button-save-config"
                    >
                      {editingConfig ? "Update" : "Create"} Configuration
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loadingConfigs ? (
            <div className="text-center py-8">Loading configurations...</div>
          ) : configurations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No configurations yet. Add a server configuration to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {configurations.map((config) => (
                <div
                  key={config.id}
                  className="border rounded-lg p-4 hover:border-gray-400 transition-colors"
                  data-testid={`config-item-${config.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{config.serverName}</h4>
                        {config.isActive ? (
                          <Badge className="bg-green-500 text-white">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{config.serverUrl}</p>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          {config.syncDirection === "bidirectional" ? (
                            <ArrowLeftRight className="h-4 w-4" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                          {config.syncDirection}
                        </span>
                        {config.syncDatabase && (
                          <span className="flex items-center gap-1">
                            <Database className="h-4 w-4" />
                            Database ({config.exportFormat.toUpperCase()})
                          </span>
                        )}
                        {config.syncFiles && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            Files
                          </span>
                        )}
                      </div>
                      {config.lastSyncAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          Last synced: {format(new Date(config.lastSyncAt), "PPp")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedConfig(config.id);
                          const syncType = config.syncDatabase && config.syncFiles ? "both" : 
                                          config.syncDatabase ? "database" : "files";
                          handleSync(config.id, syncType);
                        }}
                        disabled={executeSyncMutation.isPending}
                        data-testid={`button-sync-${config.id}`}
                      >
                        <PlayCircle className="h-4 w-4 mr-1" />
                        Sync Now
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(config)}
                        data-testid={`button-edit-config-${config.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmConfig(config.id)}
                        data-testid={`button-delete-config-${config.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card data-testid="card-sync-history">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Sync History
          </CardTitle>
          <CardDescription>
            View past sync operations and their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="text-center py-8">Loading history...</div>
          ) : syncHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No sync history yet. Start a sync operation to see results here.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Server</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncHistory.map((sync) => (
                  <TableRow key={sync.id} data-testid={`sync-history-${sync.id}`}>
                    <TableCell className="text-sm">
                      {format(new Date(sync.startedAt), "PP p")}
                    </TableCell>
                    <TableCell>{sync.configuration?.serverName || "Unknown"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{sync.syncType}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{sync.syncDirection}</TableCell>
                    <TableCell>{getStatusBadge(sync.status)}</TableCell>
                    <TableCell className="text-sm">
                      {sync.recordsSynced || 0} / {sync.totalRecords || 0}
                      {sync.conflictsDetected > 0 && (
                        <span className="text-yellow-600 ml-1">
                          ({sync.conflictsDetected} conflicts)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {sync.filesSynced || 0} / {sync.totalFiles || 0}
                    </TableCell>
                    <TableCell className="text-sm">
                      {sync.durationSeconds ? `${sync.durationSeconds}s` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Conflict Resolution Dialog */}
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Resolve Sync Conflict</DialogTitle>
            <DialogDescription>
              {selectedConflict && (
                <>
                  {selectedConflict.tableName} - Record #{selectedConflict.recordId}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedConflict && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Local Version</h4>
                    {selectedConflict.localTimestamp && (
                      <span className="text-xs text-gray-500">
                        {format(new Date(selectedConflict.localTimestamp), "PPp")}
                      </span>
                    )}
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border max-h-96 overflow-auto">
                    <pre className="text-xs">
                      {JSON.stringify(selectedConflict.localData, null, 2)}
                    </pre>
                  </div>
                  {selectedConflict.localChecksum && (
                    <p className="text-xs text-gray-500">
                      Checksum: {selectedConflict.localChecksum}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Remote Version</h4>
                    {selectedConflict.remoteTimestamp && (
                      <span className="text-xs text-gray-500">
                        {format(new Date(selectedConflict.remoteTimestamp), "PPp")}
                      </span>
                    )}
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border max-h-96 overflow-auto">
                    <pre className="text-xs">
                      {JSON.stringify(selectedConflict.remoteData, null, 2)}
                    </pre>
                  </div>
                  {selectedConflict.remoteChecksum && (
                    <p className="text-xs text-gray-500">
                      Checksum: {selectedConflict.remoteChecksum}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowConflictDialog(false)}
                  data-testid="button-cancel-conflict"
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    resolveConflictMutation.mutate({
                      conflictId: selectedConflict.id,
                      resolution: "resolved-remote",
                    })
                  }
                  disabled={resolveConflictMutation.isPending}
                  data-testid="button-accept-remote"
                >
                  Accept Remote
                </Button>
                <Button
                  onClick={() =>
                    resolveConflictMutation.mutate({
                      conflictId: selectedConflict.id,
                      resolution: "resolved-local",
                    })
                  }
                  disabled={resolveConflictMutation.isPending}
                  data-testid="button-accept-local"
                >
                  Accept Local
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirmConfig !== null}
        onOpenChange={() => setDeleteConfirmConfig(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this server configuration and all associated sync history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmConfig && deleteConfigMutation.mutate(deleteConfirmConfig)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remote Server Generator */}
      <Card data-testid="card-remote-server-generator" className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Remote Server Generator
              </CardTitle>
              <CardDescription>
                Download and configure the sync receiver server for your remote server
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={copyToClipboard}
                disabled={!remoteServerCode}
                data-testid="button-copy-code"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
              </Button>
              <Button
                onClick={downloadRemoteServer}
                disabled={!remoteServerCode}
                data-testid="button-download-server"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Server File
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg border">
              <h4 className="font-semibold mb-2">Deployment Instructions</h4>
              <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
                <li>Download the server file using the button above</li>
                <li>Transfer the file to your remote server (via FTP, SCP, or similar)</li>
                <li>Install Node.js (v16 or higher) on your remote server</li>
                <li>Install dependencies: <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">npm install express pg bcryptjs multer csv-parse</code></li>
                <li>Edit the CONFIG section in the file to match your database credentials and authentication</li>
                <li>Configure your firewall to allow incoming connections on port 3000 (or your chosen port)</li>
                <li>Run the server: <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">node sync-receiver-server.js</code></li>
                <li>For production, use a process manager like PM2: <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">pm2 start sync-receiver-server.js</code></li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label htmlFor="server-code">Server Code (editable)</Label>
              <textarea
                id="server-code"
                value={remoteServerCode}
                onChange={(e) => setRemoteServerCode(e.target.value)}
                className="w-full h-96 p-4 font-mono text-sm bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="textarea-server-code"
                spellCheck={false}
              />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You can modify the code above before downloading. The template includes all necessary
                endpoints to receive sync data from Pro Field Manager.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Security Notes
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>Change the default API key and credentials before deploying</li>
                <li>Use environment variables for sensitive configuration</li>
                <li>Enable HTTPS/SSL for production deployments</li>
                <li>Keep your remote server software updated</li>
                <li>Configure firewall rules to restrict access to trusted IPs</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
