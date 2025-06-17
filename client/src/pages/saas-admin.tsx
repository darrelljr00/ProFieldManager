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
  Users,
  Server,
  Activity,
  Shield,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";

export default function SaasAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // SaaS-specific queries
  const { data: subscriptionPlans } = useQuery({
    queryKey: ["/api/saas/plans"],
  });

  const { data: allOrganizations } = useQuery({
    queryKey: ["/api/admin/saas/organizations"],
  });

  const { data: saasMetrics } = useQuery({
    queryKey: ["/api/admin/saas/metrics"],
  });

  const { data: billingData } = useQuery({
    queryKey: ["/api/admin/saas/billing"],
  });

  const { data: systemSettings } = useQuery({
    queryKey: ["/api/admin/system/settings"],
  });

  const systemSettingsData = systemSettings?.reduce((acc: any, setting: any) => {
    acc[setting.key] = setting.value === 'true' ? true : setting.value === 'false' ? false : setting.value;
    return acc;
  }, {}) || {};

  // SaaS admin mutations
  const updateOrganizationMutation = useMutation({
    mutationFn: (data: { id: number; updates: any }) =>
      apiRequest("PUT", `/api/admin/saas/organizations/${data.id}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/saas/organizations"] });
      toast({
        title: "Success",
        description: "Organization updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update organization",
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
  });

  const createSubscriptionPlanMutation = useMutation({
    mutationFn: (planData: any) =>
      apiRequest("POST", "/api/admin/saas/plans", planData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saas/plans"] });
      toast({
        title: "Success",
        description: "Subscription plan created successfully",
      });
    },
  });

  const updateSystemSettingMutation = useMutation({
    mutationFn: (data: { key: string; value: string }) =>
      apiRequest("PUT", "/api/admin/system/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system/settings"] });
      toast({
        title: "Success",
        description: "Setting updated successfully",
      });
    },
  });

  const handleSystemSettingChange = (key: string, value: string) => {
    updateSystemSettingMutation.mutate({ key, value });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Server className="h-8 w-8" />
            SaaS Administration
          </h1>
          <p className="text-muted-foreground">Manage subscriptions, organizations, and platform settings</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="settings">Global Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="organizations" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
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
                        checked={systemSettingsData?.enableTrials || false}
                        onCheckedChange={(checked) => 
                          handleSystemSettingChange("enableTrials", checked.toString())
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enableSelfSignup">Enable Self Signup</Label>
                      <Switch
                        id="enableSelfSignup"
                        checked={systemSettingsData?.enableSelfSignup || false}
                        onCheckedChange={(checked) => 
                          handleSystemSettingChange("enableSelfSignup", checked.toString())
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enableApiAccess">Enable API Access</Label>
                      <Switch
                        id="enableApiAccess"
                        checked={systemSettingsData?.enableApiAccess || false}
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
                        defaultValue={systemSettingsData?.maxOrgsPerUser || 1}
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
                        defaultValue={systemSettingsData?.trialDurationDays || 14}
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
                        defaultValue={systemSettingsData?.maxFileUploadMB || 10}
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
      </Tabs>
    </div>
  );
}