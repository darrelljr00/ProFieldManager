import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Key, Webhook, Settings, Activity, Copy, Trash2, Plus, Eye, EyeOff } from "lucide-react";

interface ApiKey {
  id: number;
  key_name: string;
  api_key?: string;
  permissions: any;
  rate_limit_per_hour: number;
  rate_limit_per_day: number;
  rate_limit_per_month: number;
  is_active: boolean;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
}

interface Webhook {
  id: number;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  retry_count: number;
  timeout_seconds: number;
  created_at: string;
}

export function ApiIntegrationManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateApiKey, setShowCreateApiKey] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [showApiKey, setShowApiKey] = useState<{[key: number]: boolean}>({});
  const [newApiKey, setNewApiKey] = useState({
    keyName: '',
    permissions: {},
    rateLimits: { perHour: 1000, perDay: 10000, perMonth: 100000 },
    expiresAt: ''
  });
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [],
    retryCount: 3,
    timeoutSeconds: 30
  });

  // Fetch API keys
  const { data: apiKeys, isLoading: keysLoading } = useQuery({
    queryKey: ['/api/integrations/api-keys'],
    queryFn: () => apiRequest('/api/integrations/api-keys')
  });

  // Fetch webhooks
  const { data: webhooks, isLoading: webhooksLoading } = useQuery({
    queryKey: ['/api/integrations/webhooks'],
    queryFn: () => apiRequest('/api/integrations/webhooks')
  });

  // Fetch API usage
  const { data: apiUsage } = useQuery({
    queryKey: ['/api/integrations/api-usage'],
    queryFn: () => apiRequest('/api/integrations/api-usage')
  });

  // Create API key mutation
  const createApiKeyMutation = useMutation({
    mutationFn: (data: typeof newApiKey) =>
      apiRequest('/api/integrations/api-keys', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/api-keys'] });
      setShowCreateApiKey(false);
      setNewApiKey({ keyName: '', permissions: {}, rateLimits: { perHour: 1000, perDay: 10000, perMonth: 100000 }, expiresAt: '' });
      
      // Show the new API key
      if (data.api_key) {
        toast({
          title: "API Key Created",
          description: `Key: ${data.api_key.substring(0, 20)}... (copy this now, it won't be shown again)`,
          duration: 10000
        });
      }
    }
  });

  // Create webhook mutation
  const createWebhookMutation = useMutation({
    mutationFn: (data: typeof newWebhook) =>
      apiRequest('/api/integrations/webhooks', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/webhooks'] });
      setShowCreateWebhook(false);
      setNewWebhook({ name: '', url: '', events: [], retryCount: 3, timeoutSeconds: 30 });
      toast({
        title: "Success",
        description: "Webhook created successfully"
      });
    }
  });

  // Delete API key mutation
  const deleteApiKeyMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/integrations/api-keys/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/api-keys'] });
      toast({
        title: "Success",
        description: "API key deleted successfully"
      });
    }
  });

  const availableEvents = [
    'invoice.created', 'invoice.updated', 'invoice.paid',
    'project.created', 'project.updated', 'project.completed',
    'user.created', 'user.updated',
    'expense.created', 'expense.approved',
    'task.created', 'task.completed'
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard"
    });
  };

  const toggleApiKeyVisibility = (keyId: number) => {
    setShowApiKey(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            API & Integration Management
          </h2>
          <p className="text-muted-foreground">
            Manage API keys, webhooks, and third-party integrations
          </p>
        </div>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Usage Analytics
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">API Keys</h3>
            <Dialog open={showCreateApiKey} onOpenChange={setShowCreateApiKey}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    Generate a new API key for integrating with external systems
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      value={newApiKey.keyName}
                      onChange={(e) => setNewApiKey({ ...newApiKey, keyName: e.target.value })}
                      placeholder="e.g., Mobile App, Dashboard Integration"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="hourlyLimit">Hourly Limit</Label>
                      <Input
                        id="hourlyLimit"
                        type="number"
                        value={newApiKey.rateLimits.perHour}
                        onChange={(e) => setNewApiKey({ 
                          ...newApiKey, 
                          rateLimits: { ...newApiKey.rateLimits, perHour: parseInt(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dailyLimit">Daily Limit</Label>
                      <Input
                        id="dailyLimit"
                        type="number"
                        value={newApiKey.rateLimits.perDay}
                        onChange={(e) => setNewApiKey({ 
                          ...newApiKey, 
                          rateLimits: { ...newApiKey.rateLimits, perDay: parseInt(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="monthlyLimit">Monthly Limit</Label>
                      <Input
                        id="monthlyLimit"
                        type="number"
                        value={newApiKey.rateLimits.perMonth}
                        onChange={(e) => setNewApiKey({ 
                          ...newApiKey, 
                          rateLimits: { ...newApiKey.rateLimits, perMonth: parseInt(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
                    <Input
                      id="expiresAt"
                      type="date"
                      value={newApiKey.expiresAt}
                      onChange={(e) => setNewApiKey({ ...newApiKey, expiresAt: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={() => createApiKeyMutation.mutate(newApiKey)}
                    disabled={createApiKeyMutation.isPending || !newApiKey.keyName}
                  >
                    Create API Key
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {keysLoading ? (
              <div className="text-center py-8">Loading API keys...</div>
            ) : (
              apiKeys?.map((key: ApiKey) => (
                <Card key={key.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{key.key_name}</CardTitle>
                        <CardDescription>
                          Created {new Date(key.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={key.is_active ? "default" : "secondary"}>
                          {key.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteApiKeyMutation.mutate(key.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>API Key</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={showApiKey[key.id] ? (key.api_key || `pf_${key.id}_[hidden]`) : "••••••••••••••••••••••••••••••••"}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleApiKeyVisibility(key.id)}
                          >
                            {showApiKey[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(key.api_key || `pf_${key.id}_[contact_admin]`)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <Label>Hourly Limit</Label>
                          <p className="font-mono">{key.rate_limit_per_hour.toLocaleString()}</p>
                        </div>
                        <div>
                          <Label>Daily Limit</Label>
                          <p className="font-mono">{key.rate_limit_per_day.toLocaleString()}</p>
                        </div>
                        <div>
                          <Label>Monthly Limit</Label>
                          <p className="font-mono">{key.rate_limit_per_month.toLocaleString()}</p>
                        </div>
                      </div>
                      {key.last_used_at && (
                        <p className="text-sm text-muted-foreground">
                          Last used: {new Date(key.last_used_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Webhook Endpoints</h3>
            <Dialog open={showCreateWebhook} onOpenChange={setShowCreateWebhook}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Webhook
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Webhook</DialogTitle>
                  <DialogDescription>
                    Configure a webhook endpoint to receive real-time events
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="webhookName">Webhook Name</Label>
                    <Input
                      id="webhookName"
                      value={newWebhook.name}
                      onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                      placeholder="e.g., Invoice Notifications"
                    />
                  </div>
                  <div>
                    <Label htmlFor="webhookUrl">Endpoint URL</Label>
                    <Input
                      id="webhookUrl"
                      value={newWebhook.url}
                      onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                      placeholder="https://your-app.com/webhooks/profield"
                    />
                  </div>
                  <div>
                    <Label>Events to Subscribe</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {availableEvents.map((event) => (
                        <div key={event} className="flex items-center space-x-2">
                          <Switch
                            id={event}
                            checked={newWebhook.events.includes(event)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewWebhook({ 
                                  ...newWebhook, 
                                  events: [...newWebhook.events, event] 
                                });
                              } else {
                                setNewWebhook({ 
                                  ...newWebhook, 
                                  events: newWebhook.events.filter(e => e !== event) 
                                });
                              }
                            }}
                          />
                          <Label htmlFor={event} className="text-sm">{event}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="retryCount">Retry Count</Label>
                      <Input
                        id="retryCount"
                        type="number"
                        value={newWebhook.retryCount}
                        onChange={(e) => setNewWebhook({ 
                          ...newWebhook, 
                          retryCount: parseInt(e.target.value) || 0 
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="timeout">Timeout (seconds)</Label>
                      <Input
                        id="timeout"
                        type="number"
                        value={newWebhook.timeoutSeconds}
                        onChange={(e) => setNewWebhook({ 
                          ...newWebhook, 
                          timeoutSeconds: parseInt(e.target.value) || 30 
                        })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={() => createWebhookMutation.mutate(newWebhook)}
                    disabled={createWebhookMutation.isPending || !newWebhook.name || !newWebhook.url}
                  >
                    Create Webhook
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {webhooksLoading ? (
              <div className="text-center py-8">Loading webhooks...</div>
            ) : (
              webhooks?.map((webhook: Webhook) => (
                <Card key={webhook.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{webhook.name}</CardTitle>
                        <CardDescription>{webhook.url}</CardDescription>
                      </div>
                      <Badge variant={webhook.is_active ? "default" : "secondary"}>
                        {webhook.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <Label>Subscribed Events</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {webhook.events.map((event: string) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label>Retry Count</Label>
                          <p>{webhook.retry_count}</p>
                        </div>
                        <div>
                          <Label>Timeout</Label>
                          <p>{webhook.timeout_seconds}s</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Usage Analytics Tab */}
        <TabsContent value="usage" className="space-y-4">
          <h3 className="text-lg font-semibold">API Usage Analytics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Requests (30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {apiUsage?.reduce((sum: number, item: any) => sum + parseInt(item.total_requests), 0) || 0}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {apiUsage?.length ? 
                    Math.round(apiUsage.reduce((sum: number, item: any) => sum + parseFloat(item.avg_response_time), 0) / apiUsage.length)
                    : 0}ms
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {apiUsage?.length ? 
                    Math.round((apiUsage.reduce((sum: number, item: any) => sum + parseInt(item.error_count), 0) / 
                    apiUsage.reduce((sum: number, item: any) => sum + parseInt(item.total_requests), 0)) * 100)
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          {apiUsage?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Usage by API Key</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {apiUsage.map((usage: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="font-medium">{usage.key_name}</p>
                        <p className="text-sm text-muted-foreground">{usage.usage_date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{usage.total_requests} requests</p>
                        <p className="text-xs text-muted-foreground">
                          {usage.error_count} errors • {Math.round(usage.avg_response_time)}ms avg
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <h3 className="text-lg font-semibold">Third-Party Integrations</h3>
          
          <div className="grid gap-4">
            {[
              { name: 'Stripe', description: 'Payment processing and billing', type: 'stripe', enabled: false },
              { name: 'QuickBooks', description: 'Accounting and financial management', type: 'quickbooks', enabled: false },
              { name: 'Salesforce', description: 'Customer relationship management', type: 'salesforce', enabled: false },
              { name: 'Google Calendar', description: 'Schedule and appointment management', type: 'google_calendar', enabled: false },
              { name: 'Slack', description: 'Team communication and notifications', type: 'slack', enabled: false },
              { name: 'Microsoft Teams', description: 'Collaboration and messaging', type: 'microsoft_teams', enabled: false }
            ].map((integration) => (
              <Card key={integration.type}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={integration.enabled ? "default" : "secondary"}>
                        {integration.enabled ? "Connected" : "Not Connected"}
                      </Badge>
                      <Switch checked={integration.enabled} disabled />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" disabled>
                    Configure Integration
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}