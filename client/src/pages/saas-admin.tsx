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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Server,
  Activity,
  Shield,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Settings,
  Plus,
  Edit,
  Save,
} from "lucide-react";


export default function SaasAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [showCreateSubscriptionDialog, setShowCreateSubscriptionDialog] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<any>(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    organizationId: "",
    planId: "",
    status: "trial",
    startDate: new Date().toISOString().split('T')[0],
    trialDays: 14,
    // New organization fields
    createNewOrg: false,
    orgName: "",
    orgEmail: "",
    orgAddress: "",
    orgCity: "",
    orgState: "",
    orgZipCode: "",
    orgPhone: "",
    maxUsers: 5,
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminPassword: ""
  });
  const [planFeatures, setPlanFeatures] = useState<Record<string, string>>({});

  // SaaS-specific queries
  const { data: subscriptionPlans, isLoading: plansLoading, error: plansError } = useQuery({
    queryKey: ["/api/saas/plans"],
  });

  console.log("Subscription plans data:", subscriptionPlans);
  console.log("Plans loading:", plansLoading);
  console.log("Plans error:", plansError);

  // Type the subscription plans data properly
  const typedSubscriptionPlans = subscriptionPlans as any[] | undefined;

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

  // Feature assignment options
  const featureOptions = [
    { id: 'maxUsers', label: 'Max Users', type: 'limit' },
    { id: 'maxProjects', label: 'Max Projects', type: 'limit' },
    { id: 'maxStorageGB', label: 'Max Storage (GB)', type: 'limit' },
    { id: 'hasAdvancedReporting', label: 'Advanced Reporting', type: 'feature' },
    { id: 'hasApiAccess', label: 'API Access', type: 'feature' },
    { id: 'hasCustomBranding', label: 'Custom Branding', type: 'feature' },
    { id: 'hasIntegrations', label: 'Third-party Integrations', type: 'feature' },
    { id: 'hasPrioritySupport', label: 'Priority Support', type: 'feature' }
  ];

  const createSubscriptionMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", "/api/admin/saas/subscriptions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/saas/organizations"] });
      setShowCreateSubscriptionDialog(false);
      setSubscriptionForm({
        organizationId: "",
        planId: "",
        status: "trial",
        startDate: new Date().toISOString().split('T')[0],
        trialDays: 14,
        createNewOrg: false,
        orgName: "",
        orgEmail: "",
        orgAddress: "",
        orgCity: "",
        orgState: "",
        orgZipCode: "",
        orgPhone: "",
        maxUsers: 5,
        adminFirstName: "",
        adminLastName: "",
        adminEmail: "",
        adminPassword: ""
      });
      toast({
        title: "Success",
        description: "Subscription created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create subscription",
        variant: "destructive",
      });
    },
  });

  const updatePlanFeatureMutation = useMutation({
    mutationFn: (data: { planId: number; feature: string; value: any }) =>
      apiRequest("PUT", `/api/admin/saas/plans/${data.planId}/features`, { 
        feature: data.feature, 
        value: data.value 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saas/plans"] });
      toast({
        title: "Success",
        description: "Plan feature updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update plan feature",
        variant: "destructive",
      });
    },
  });

  const handleFeatureUpdate = async (planId: number, featureId: string, value: any) => {
    try {
      await apiRequest("POST", `/api/saas/plan-features/${planId}`, {
        [featureId]: value
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/saas/plans'] });
      
      toast({
        title: "Feature Updated",
        description: "Subscription plan feature has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Feature update error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update plan feature",
        variant: "destructive",
      });
    }
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="subscription-plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Organization Management
                  </CardTitle>
                  <CardDescription>
                    Manage all tenant organizations, subscriptions, and billing
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreateSubscriptionDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Subscription
                </Button>
              </div>
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
                Subscription Plans Feature Management
              </CardTitle>
              <CardDescription>
                Configure which features are available for each subscription plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Plan Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {plansLoading ? (
                  <div className="col-span-3 text-center py-8">Loading subscription plans...</div>
                ) : plansError ? (
                  <div className="col-span-3 text-center py-8 text-red-500">Error loading plans: {String(plansError)}</div>
                ) : !subscriptionPlans || !Array.isArray(subscriptionPlans) || subscriptionPlans.length === 0 ? (
                  <div className="col-span-3 text-center py-8">
                    No subscription plans found
                    <div className="text-xs mt-2">Debug: {JSON.stringify({ subscriptionPlans, plansLoading, plansError })}</div>
                  </div>
                ) : (
                  subscriptionPlans.map((plan: any) => (
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
                        <div className="text-sm">{plan.billingInterval}</div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>Limits:</strong> {plan.maxUsers === 999999 ? 'Unlimited' : plan.maxUsers} users, {plan.maxProjects === 999999 ? 'Unlimited' : plan.maxProjects} projects
                        </div>
                        <div className="text-sm">
                          <strong>Storage:</strong> {plan.maxStorageGB}GB
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  ))
                )}
              </div>

              {/* Feature Assignment Matrix */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Feature Assignment</h3>
                </div>
                
                {/* Core Features */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Core Features</CardTitle>
                    <CardDescription>Essential platform features</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {subscriptionPlans && Array.isArray(subscriptionPlans) && subscriptionPlans.length > 0 && [
                      { id: 'maxUsers', label: 'User Limit', values: ['5', '25', 'Unlimited'] },
                      { id: 'maxProjects', label: 'Project Limit', values: ['10', '100', 'Unlimited'] },
                      { id: 'maxStorageGB', label: 'Storage Limit (GB)', values: ['5', '50', '500'] }
                    ].map((feature) => (
                      <div key={feature.id} className="space-y-3">
                        <Label className="text-sm font-medium">{feature.label}</Label>
                        <div className="grid grid-cols-3 gap-4">
                          {subscriptionPlans.map((plan: any, planIndex: number) => (
                            <div key={plan.id} className="space-y-2">
                              <div className="text-sm font-medium text-center">{plan.name}</div>
                              <div className="space-y-2">
                                {feature.values.map((value) => (
                                  <div key={value} className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      name={`${feature.id}-${plan.id}`}
                                      value={value}
                                      id={`${feature.id}-${plan.id}-${value}`}
                                      defaultChecked={value === feature.values[planIndex]}
                                      onChange={() => {
                                        const numValue = value === 'Unlimited' ? -1 : (isNaN(parseInt(value)) ? value : parseInt(value));
                                        handleFeatureUpdate(plan.id, feature.id, numValue);
                                      }}
                                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                                    />
                                    <Label htmlFor={`${feature.id}-${plan.id}-${value}`} className="text-sm">
                                      {value}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Advanced Features */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Advanced Features</CardTitle>
                    <CardDescription>Premium platform capabilities</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { id: 'hasAdvancedReporting', label: 'Advanced Reporting & Analytics' },
                      { id: 'hasApiAccess', label: 'API Access & Webhooks' },
                      { id: 'hasCustomBranding', label: 'Custom Branding & White Label' },
                      { id: 'hasIntegrations', label: 'Third-party Integrations' },
                      { id: 'hasPrioritySupport', label: 'Priority Customer Support' }
                    ].map((feature) => (
                      <div key={feature.id} className="space-y-3">
                        <Label className="text-sm font-medium">{feature.label}</Label>
                        <div className="grid grid-cols-3 gap-4">
                          {subscriptionPlans?.map((plan: any) => (
                            <div key={plan.id} className="space-y-2">
                              <div className="text-sm font-medium text-center">{plan.name}</div>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name={`${feature.id}-${plan.id}`}
                                    value="not-included"
                                    id={`${feature.id}-${plan.id}-no`}
                                    defaultChecked={!plan[feature.id]}
                                    onChange={() => handleFeatureUpdate(plan.id, feature.id, false)}
                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                                  />
                                  <Label htmlFor={`${feature.id}-${plan.id}-no`} className="text-sm">
                                    Not Included
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name={`${feature.id}-${plan.id}`}
                                    value="included"
                                    id={`${feature.id}-${plan.id}-yes`}
                                    defaultChecked={plan[feature.id]}
                                    onChange={() => handleFeatureUpdate(plan.id, feature.id, true)}
                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                                  />
                                  <Label htmlFor={`${feature.id}-${plan.id}-yes`} className="text-sm">
                                    ✓ Included
                                  </Label>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Enterprise Features */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Enterprise Features</CardTitle>
                    <CardDescription>Advanced business capabilities</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { id: 'hasDocuSignIntegration', label: 'DocuSign Integration' },
                      { id: 'hasAdvancedSecurity', label: 'Advanced Security Features' },
                      { id: 'hasCustomDomain', label: 'Custom Domain Support' },
                      { id: 'hasSSOIntegration', label: 'Single Sign-On (SSO)' },
                      { id: 'hasDataExport', label: 'Data Export & Migration Tools' },
                      { id: 'hasAdvancedPermissions', label: 'Advanced User Permissions' }
                    ].map((feature) => (
                      <div key={feature.id} className="space-y-3">
                        <Label className="text-sm font-medium">{feature.label}</Label>
                        <div className="grid grid-cols-3 gap-4">
                          {subscriptionPlans?.map((plan: any) => (
                            <div key={plan.id} className="space-y-2">
                              <div className="text-sm font-medium text-center">{plan.name}</div>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name={`${feature.id}-${plan.id}`}
                                    value="not-included"
                                    id={`${feature.id}-${plan.id}-no`}
                                    defaultChecked={true}
                                    onChange={() => handleFeatureUpdate(plan.id, feature.id, false)}
                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                                  />
                                  <Label htmlFor={`${feature.id}-${plan.id}-no`} className="text-sm">
                                    Not Included
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name={`${feature.id}-${plan.id}`}
                                    value="included"
                                    id={`${feature.id}-${plan.id}-yes`}
                                    defaultChecked={false}
                                    onChange={() => handleFeatureUpdate(plan.id, feature.id, true)}
                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                                  />
                                  <Label htmlFor={`${feature.id}-${plan.id}-yes`} className="text-sm">
                                    ✓ Included
                                  </Label>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* API & Integration Limits */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">API & Integration Limits</CardTitle>
                    <CardDescription>Configure API rate limits and integration quotas</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { id: 'apiCallsPerMonth', label: 'API Calls per Month', values: ['1,000', '10,000', 'Unlimited'] },
                      { id: 'webhookEndpoints', label: 'Webhook Endpoints', values: ['1', '5', 'Unlimited'] },
                      { id: 'integrationConnections', label: 'Integration Connections', values: ['3', '10', 'Unlimited'] }
                    ].map((feature) => (
                      <div key={feature.id} className="space-y-3">
                        <Label className="text-sm font-medium">{feature.label}</Label>
                        <div className="grid grid-cols-3 gap-4">
                          {subscriptionPlans?.map((plan: any, planIndex: number) => (
                            <div key={plan.id} className="space-y-2">
                              <div className="text-sm font-medium text-center">{plan.name}</div>
                              <div className="space-y-2">
                                {feature.values.map((value) => (
                                  <div key={value} className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      name={`${feature.id}-${plan.id}`}
                                      value={value}
                                      id={`${feature.id}-${plan.id}-${value}`}
                                      defaultChecked={value === (feature.values[planIndex] || feature.values[0])}
                                      onChange={() => handleFeatureUpdate(plan.id, feature.id, value)}
                                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                                    />
                                    <Label htmlFor={`${feature.id}-${plan.id}-${value}`} className="text-sm">
                                      {value}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Save Changes Button */}
                <div className="flex justify-center pt-6">
                  <Button 
                    onClick={() => toast({ title: "Success", description: "Plan features updated successfully" })}
                    size="lg"
                    className="min-w-[200px]"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save All Changes
                  </Button>
                </div>
              </div>
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

      {/* Create Subscription Dialog */}
      <Dialog open={showCreateSubscriptionDialog} onOpenChange={setShowCreateSubscriptionDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Subscription</DialogTitle>
            <DialogDescription>
              Create a new subscription for an existing organization or create a new organization with a subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Organization Type Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Type</Label>
              <div className="col-span-3 flex gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="orgType"
                    checked={!subscriptionForm.createNewOrg}
                    onChange={() => setSubscriptionForm({...subscriptionForm, createNewOrg: false})}
                    className="text-primary"
                  />
                  <span>Existing Organization</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="orgType"
                    checked={subscriptionForm.createNewOrg}
                    onChange={() => setSubscriptionForm({...subscriptionForm, createNewOrg: true})}
                    className="text-primary"
                  />
                  <span>New Organization</span>
                </label>
              </div>
            </div>

            {/* Existing Organization Selection */}
            {!subscriptionForm.createNewOrg && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="organization" className="text-right">
                  Organization
                </Label>
                <div className="col-span-3">
                  <Select
                    value={subscriptionForm.organizationId}
                    onValueChange={(value) => setSubscriptionForm({...subscriptionForm, organizationId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {allOrganizations?.map((org: any) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* New Organization Fields */}
            {subscriptionForm.createNewOrg && (
              <>
                <div className="col-span-4 border-t pt-4">
                  <h4 className="font-medium mb-3">Organization Details</h4>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="orgName" className="text-right">
                    Organization Name
                  </Label>
                  <Input
                    id="orgName"
                    className="col-span-3"
                    value={subscriptionForm.orgName}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, orgName: e.target.value})}
                    placeholder="Company Name"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="orgEmail" className="text-right">
                    Organization Email
                  </Label>
                  <Input
                    id="orgEmail"
                    type="email"
                    className="col-span-3"
                    value={subscriptionForm.orgEmail}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, orgEmail: e.target.value})}
                    placeholder="contact@company.com"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="orgPhone" className="text-right">
                    Phone
                  </Label>
                  <Input
                    id="orgPhone"
                    className="col-span-3"
                    value={subscriptionForm.orgPhone}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, orgPhone: e.target.value})}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="orgAddress" className="text-right">
                    Address
                  </Label>
                  <Input
                    id="orgAddress"
                    className="col-span-3"
                    value={subscriptionForm.orgAddress}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, orgAddress: e.target.value})}
                    placeholder="123 Main St"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="orgCity" className="text-right">
                    City
                  </Label>
                  <Input
                    id="orgCity"
                    className="col-span-2"
                    value={subscriptionForm.orgCity}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, orgCity: e.target.value})}
                    placeholder="City"
                  />
                  <Input
                    placeholder="State"
                    value={subscriptionForm.orgState}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, orgState: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="orgZipCode" className="text-right">
                    Zip Code
                  </Label>
                  <Input
                    id="orgZipCode"
                    className="col-span-1"
                    value={subscriptionForm.orgZipCode}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, orgZipCode: e.target.value})}
                    placeholder="12345"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="maxUsers" className="text-right">
                    Max Users
                  </Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    className="col-span-1"
                    value={subscriptionForm.maxUsers}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, maxUsers: parseInt(e.target.value)})}
                    min="1"
                  />
                </div>

                <div className="col-span-4 border-t pt-4">
                  <h4 className="font-medium mb-3">Admin User Details</h4>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="adminFirstName" className="text-right">
                    Admin First Name
                  </Label>
                  <Input
                    id="adminFirstName"
                    className="col-span-1"
                    value={subscriptionForm.adminFirstName}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, adminFirstName: e.target.value})}
                    placeholder="John"
                  />
                  <Input
                    placeholder="Last Name"
                    value={subscriptionForm.adminLastName}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, adminLastName: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="adminEmail" className="text-right">
                    Admin Email
                  </Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    className="col-span-3"
                    value={subscriptionForm.adminEmail}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, adminEmail: e.target.value})}
                    placeholder="admin@company.com"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="adminPassword" className="text-right">
                    Admin Password
                  </Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    className="col-span-3"
                    value={subscriptionForm.adminPassword}
                    onChange={(e) => setSubscriptionForm({...subscriptionForm, adminPassword: e.target.value})}
                    placeholder="Secure password"
                  />
                </div>
              </>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="plan" className="text-right">
                Plan
              </Label>
              <div className="col-span-3">
                <Select
                  value={subscriptionForm.planId}
                  onValueChange={(value) => setSubscriptionForm({...subscriptionForm, planId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {subscriptionPlans?.map((plan: any) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        {plan.name} - ${plan.price}/{plan.interval}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <div className="col-span-3">
                <Select
                  value={subscriptionForm.status}
                  onValueChange={(value) => setSubscriptionForm({...subscriptionForm, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                className="col-span-3"
                value={subscriptionForm.startDate}
                onChange={(e) => setSubscriptionForm({...subscriptionForm, startDate: e.target.value})}
              />
            </div>
            {subscriptionForm.status === 'trial' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trialDays" className="text-right">
                  Trial Days
                </Label>
                <Input
                  id="trialDays"
                  type="number"
                  className="col-span-3"
                  value={subscriptionForm.trialDays}
                  onChange={(e) => setSubscriptionForm({...subscriptionForm, trialDays: parseInt(e.target.value)})}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateSubscriptionDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => createSubscriptionMutation.mutate(subscriptionForm)}
              disabled={
                (!subscriptionForm.createNewOrg && (!subscriptionForm.organizationId || !subscriptionForm.planId)) ||
                (subscriptionForm.createNewOrg && (!subscriptionForm.orgName || !subscriptionForm.adminEmail || !subscriptionForm.planId)) ||
                createSubscriptionMutation.isPending
              }
            >
              {createSubscriptionMutation.isPending ? "Creating..." : subscriptionForm.createNewOrg ? "Create Organization & Subscription" : "Create Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}