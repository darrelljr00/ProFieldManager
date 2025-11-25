import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Rocket, 
  Server, 
  History, 
  Terminal, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Loader2,
  Settings,
  Eye,
  Trash2,
  Play,
  Square,
  Info
} from "lucide-react";

interface Deployment {
  id: number;
  jobId: string;
  organizationId: number;
  projectId: string;
  serverHost: string;
  serverUser: string;
  serverPort: number;
  remotePath: string;
  localBuildPath: string;
  status: string;
  logs?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

interface DeployConfig {
  serverHost: string;
  serverUser: string;
  serverPort: number;
  remotePath: string;
  localBuildPath: string;
  deployToken: string;
}

const defaultConfig: DeployConfig = {
  serverHost: "",
  serverUser: "root",
  serverPort: 22,
  remotePath: "/home/user/public_html",
  localBuildPath: "./dist",
  deployToken: ""
};

function getStatusBadge(status: string) {
  switch (status) {
    case "success":
      return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
    case "failed":
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    case "running":
    case "syncing":
      return <Badge className="bg-blue-500 hover:bg-blue-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running</Badge>;
    case "pending":
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(dateString: string | undefined) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString();
}

function DeployLogs({ jobId, token, onClose }: { jobId: string; token: string; onClose: () => void }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("connecting");
  const [isComplete, setIsComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) {
      setLogs(["ERROR: No deploy token provided. Cannot stream logs."]);
      setStatus("failed");
      setIsComplete(true);
      return;
    }
    
    const eventSource = new EventSource(`/api/deploy/logs/${jobId}?token=${encodeURIComponent(token)}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "log") {
          setLogs(prev => [...prev, data.message]);
        } else if (data.type === "status") {
          setStatus(data.status);
        } else if (data.type === "complete") {
          setStatus(data.status);
          setIsComplete(true);
          eventSource.close();
        } else if (data.type === "error") {
          setLogs(prev => [...prev, `ERROR: ${data.message}`]);
          setIsComplete(true);
          eventSource.close();
        }
      } catch (e) {
        console.error("Failed to parse SSE message:", e);
      }
    };

    eventSource.onerror = () => {
      setIsComplete(true);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId, token]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          <span className="font-mono text-sm">Job: {jobId}</span>
        </div>
        {getStatusBadge(status)}
      </div>
      
      <ScrollArea 
        ref={scrollRef}
        className="h-[400px] w-full rounded-md border bg-black p-4"
      >
        <div className="font-mono text-xs text-green-400 whitespace-pre-wrap">
          {logs.length === 0 ? (
            <span className="text-gray-500">Waiting for logs...</span>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className={log.includes("ERROR") ? "text-red-400" : ""}>
                {log}
              </div>
            ))
          )}
          {!isComplete && (
            <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1" />
          )}
        </div>
      </ScrollArea>

      {isComplete && (
        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      )}
    </div>
  );
}

function DeployHistory({ onViewLogs }: { onViewLogs: (jobId: string, token: string) => void }) {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useQuery<{ deployments: Deployment[] }>({
    queryKey: ["/api/deploy/history"],
  });
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");

  const handleViewLogs = (jobId: string) => {
    setSelectedDeployment(jobId);
    setTokenInput("");
  };

  const handleConfirmViewLogs = () => {
    if (!tokenInput.trim()) {
      toast({
        title: "Token Required",
        description: "Please enter the deploy token to view logs.",
        variant: "destructive",
      });
      return;
    }
    if (selectedDeployment) {
      onViewLogs(selectedDeployment, tokenInput);
      setSelectedDeployment(null);
      setTokenInput("");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const deployments = data?.deployments || [];

  if (deployments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No deployment history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <div className="space-y-3">
        {deployments.map((deployment) => (
          <Card key={deployment.id} className="overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{deployment.jobId}</span>
                  {getStatusBadge(deployment.status)}
                </div>
                <div className="text-sm text-muted-foreground">
                  <Server className="h-3 w-3 inline mr-1" />
                  {deployment.serverUser}@{deployment.serverHost}:{deployment.remotePath}
                </div>
                <div className="text-xs text-muted-foreground">
                  Started: {formatDate(deployment.startedAt)} | 
                  Completed: {formatDate(deployment.completedAt)}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewLogs(deployment.jobId)}
                  data-testid={`view-logs-${deployment.jobId}`}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Logs
                </Button>
              </div>
            </div>
            
            {deployment.errorMessage && (
              <div className="px-4 pb-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {deployment.errorMessage}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedDeployment} onOpenChange={() => setSelectedDeployment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Deploy Token</DialogTitle>
            <DialogDescription>
              Enter your deploy token to view the logs for this deployment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="historyToken">Deploy Token</Label>
              <Input
                id="historyToken"
                type="password"
                placeholder="Enter deploy token"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                data-testid="input-history-token"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDeployment(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmViewLogs}>
              View Logs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeployForm({ onDeploy }: { onDeploy: (jobId: string, token: string) => void }) {
  const { toast } = useToast();
  const [config, setConfig] = useState<DeployConfig>(() => {
    const saved = localStorage.getItem("cwp_deploy_config");
    if (saved) {
      try {
        return { ...defaultConfig, ...JSON.parse(saved) };
      } catch {
        return defaultConfig;
      }
    }
    return defaultConfig;
  });
  const [isDeploying, setIsDeploying] = useState(false);

  const handleSaveConfig = () => {
    const toSave = { ...config };
    delete (toSave as any).deployToken;
    localStorage.setItem("cwp_deploy_config", JSON.stringify(toSave));
    toast({
      title: "Configuration Saved",
      description: "Server configuration saved locally (token not stored).",
    });
  };

  const handleDeploy = async () => {
    if (!config.serverHost || !config.serverUser || !config.remotePath || !config.localBuildPath) {
      toast({
        title: "Missing Configuration",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!config.deployToken) {
      toast({
        title: "Missing Deploy Token",
        description: "Please enter the deployment API token.",
        variant: "destructive",
      });
      return;
    }

    setIsDeploying(true);

    try {
      const response = await fetch("/api/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.deployToken}`,
        },
        body: JSON.stringify({
          serverHost: config.serverHost,
          serverUser: config.serverUser,
          serverPort: config.serverPort,
          remotePath: config.remotePath,
          localBuildPath: config.localBuildPath,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Deployment failed");
      }

      toast({
        title: "Deployment Started",
        description: `Job ID: ${data.jobId}`,
      });

      onDeploy(data.jobId, config.deployToken);
      queryClient.refetchQueries({ queryKey: ["/api/deploy/history"] });

    } catch (error: any) {
      toast({
        title: "Deployment Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>CWP Server Deployment</AlertTitle>
        <AlertDescription>
          Deploy your application to a Control Web Panel (CWP) server using SSH and rsync.
          Make sure you have SSH key access configured.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="serverHost">Server Host *</Label>
          <Input
            id="serverHost"
            placeholder="server.example.com"
            value={config.serverHost}
            onChange={(e) => setConfig({ ...config, serverHost: e.target.value })}
            data-testid="input-server-host"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="serverUser">SSH User *</Label>
          <Input
            id="serverUser"
            placeholder="root"
            value={config.serverUser}
            onChange={(e) => setConfig({ ...config, serverUser: e.target.value })}
            data-testid="input-server-user"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="serverPort">SSH Port</Label>
          <Input
            id="serverPort"
            type="number"
            placeholder="22"
            value={config.serverPort}
            onChange={(e) => setConfig({ ...config, serverPort: parseInt(e.target.value) || 22 })}
            data-testid="input-server-port"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="remotePath">Remote Path *</Label>
          <Input
            id="remotePath"
            placeholder="/home/user/public_html"
            value={config.remotePath}
            onChange={(e) => setConfig({ ...config, remotePath: e.target.value })}
            data-testid="input-remote-path"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="localBuildPath">Local Build Path *</Label>
          <Input
            id="localBuildPath"
            placeholder="./dist"
            value={config.localBuildPath}
            onChange={(e) => setConfig({ ...config, localBuildPath: e.target.value })}
            data-testid="input-local-build-path"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deployToken">Deploy API Token *</Label>
          <Input
            id="deployToken"
            type="password"
            placeholder="Enter your deploy token"
            value={config.deployToken}
            onChange={(e) => setConfig({ ...config, deployToken: e.target.value })}
            data-testid="input-deploy-token"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleSaveConfig} data-testid="button-save-config">
          <Settings className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
        
        <Button 
          onClick={handleDeploy} 
          disabled={isDeploying}
          data-testid="button-deploy"
        >
          {isDeploying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4 mr-2" />
              Deploy Now
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function SetupInstructions() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Setup Instructions</h3>
      
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Generate SSH Key Pair</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-3 rounded-md font-mono text-sm">
              ssh-keygen -t ed25519 -C "deploy@profieldmanager" -f ~/.ssh/cwp_deploy
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Add Public Key to CWP Server</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Copy the public key to your CWP server's authorized_keys:
            </p>
            <div className="bg-muted p-3 rounded-md font-mono text-sm">
              ssh-copy-id -i ~/.ssh/cwp_deploy.pub user@server.example.com
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Set Environment Variables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Set these environment variables in your Replit project:
            </p>
            <div className="bg-muted p-3 rounded-md font-mono text-sm space-y-1">
              <div><span className="text-blue-500">DEPLOY_API_TOKEN</span>=your_secure_random_token</div>
              <div><span className="text-blue-500">CWP_SSH_PRIVATE_KEY</span>=&lt;contents of ~/.ssh/cwp_deploy&gt;</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">4. Build Your Application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Run the build command to generate deployable files:
            </p>
            <div className="bg-muted p-3 rounded-md font-mono text-sm">
              npm run build
            </div>
            <p className="text-sm text-muted-foreground">
              The default build output is in <code>./dist</code>. Update "Local Build Path" if different.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">5. Configure CWP Server</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Ensure your CWP server has:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>SSH access enabled for your user</li>
              <li>rsync installed (<code>yum install rsync</code> or <code>apt install rsync</code>)</li>
              <li>Correct permissions on the remote path</li>
              <li>Web server configured to serve from the remote path</li>
            </ul>
          </CardContent>
        </Card>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Security Note</AlertTitle>
          <AlertDescription>
            The deploy token authenticates deployment requests. Keep it secret and use a strong, random value.
            Generate one with: <code className="bg-muted px-1 rounded">openssl rand -hex 32</code>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

export default function DeployCWP() {
  const [activeLog, setActiveLog] = useState<{ jobId: string; token: string } | null>(null);
  
  const handleDeploy = (jobId: string, token: string) => {
    setActiveLog({ jobId, token });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deploy to CWP</h1>
          <p className="text-muted-foreground">
            Deploy your application to Control Web Panel servers
          </p>
        </div>
      </div>

      <Tabs defaultValue="deploy" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deploy" data-testid="tab-deploy">
            <Rocket className="h-4 w-4 mr-2" />
            Deploy
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="setup" data-testid="tab-setup">
            <Settings className="h-4 w-4 mr-2" />
            Setup Guide
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deploy">
          <Card>
            <CardHeader>
              <CardTitle>Deployment Configuration</CardTitle>
              <CardDescription>
                Configure your CWP server details and deploy your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeployForm onDeploy={handleDeploy} />
            </CardContent>
          </Card>

          {activeLog && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Deployment Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DeployLogs 
                  jobId={activeLog.jobId} 
                  token={activeLog.token}
                  onClose={() => setActiveLog(null)} 
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Deployment History</CardTitle>
              <CardDescription>
                View past deployments and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeployHistory onViewLogs={handleDeploy} />
            </CardContent>
          </Card>

          {activeLog && (
            <Dialog open={!!activeLog} onOpenChange={() => setActiveLog(null)}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    Deployment Logs
                  </DialogTitle>
                </DialogHeader>
                <DeployLogs 
                  jobId={activeLog.jobId}
                  token={activeLog.token}
                  onClose={() => setActiveLog(null)} 
                />
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        <TabsContent value="setup">
          <Card>
            <CardHeader>
              <CardTitle>Setup Guide</CardTitle>
              <CardDescription>
                How to configure SSH access and environment variables for deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SetupInstructions />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
