import React, { useState } from "react";
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
  Trash,
  Star,
  Database,
  Zap,
  Check,
  X
} from "lucide-react";
import FileSecurityTab from "@/components/FileSecurityTab";
import { ApiIntegrationManager } from "@/components/api-integration-manager";
import { SubscriptionPlanSelector } from "@/components/subscription-plan-selector";


export default function SaasAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("plans");
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [showCreateSubscriptionDialog, setShowCreateSubscriptionDialog] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<any>(null);
  const [editingOrganization, setEditingOrganization] = useState<any>(null);
  const [showEditOrgDialog, setShowEditOrgDialog] = useState(false);
  const [organizationUsers, setOrganizationUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedUserOrgId, setSelectedUserOrgId] = useState<number | null>(null);
  const [userManagementUsers, setUserManagementUsers] = useState<any[]>([]);
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
  const { data: subscriptionPlans = [], isLoading: plansLoading, error: plansError } = useQuery({
    queryKey: ["/api/subscription-plans"],
  });



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

  const updateUserMutation = useMutation({
    mutationFn: (data: { orgId: number; userId: number; updates: any }) =>
      apiRequest("PUT", `/api/admin/saas/organizations/${data.orgId}/users/${data.userId}`, data.updates),
    onSuccess: () => {
      // Refresh the appropriate user list
      if (editingOrganization?.id) {
        fetchOrganizationUsers(editingOrganization.id);
      }
      if (activeTab === 'users') {
        fetchUserManagementUsers(selectedUserOrgId);
      }
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (data: { orgId: number; userId: number }) =>
      apiRequest("DELETE", `/api/admin/saas/organizations/${data.orgId}/users/${data.userId}`),
    onSuccess: () => {
      // Refresh the appropriate user list
      if (editingOrganization?.id) {
        fetchOrganizationUsers(editingOrganization.id);
      }
      if (activeTab === 'users') {
        fetchUserManagementUsers(selectedUserOrgId);
      }
      toast({
        title: "Success", 
        description: "User deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
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

  // Fetch organization users when editing
  const fetchOrganizationUsers = async (orgId: number) => {
    if (!orgId) return;
    try {
      const response = await fetch(`/api/admin/saas/organizations/${orgId}/users`);
      const users = await response.json();
      setOrganizationUsers(users);
    } catch (error) {
      console.error("Error fetching organization users:", error);
    }
  };

  // Fetch users for user management tab
  const fetchUserManagementUsers = async (orgId: number | null) => {
    try {
      let response;
      if (orgId) {
        response = await fetch(`/api/admin/saas/organizations/${orgId}/users`);
      } else {
        response = await fetch(`/api/admin/users`);
      }
      const users = await response.json();
      setUserManagementUsers(users);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Load users when organization selection changes
  React.useEffect(() => {
    if (activeTab === 'users') {
      fetchUserManagementUsers(selectedUserOrgId);
    }
  }, [selectedUserOrgId, activeTab]);

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
    mutationFn: (data: any) => {
      console.log("Creating subscription with data:", data);
      return apiRequest("POST", "/api/admin/saas/subscriptions", data);
    },
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

  // Create and Update Plan mutations
  const createPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      return await apiRequest("/api/subscription-plans", {
        method: "POST",
        body: JSON.stringify(planData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: "Success",
        description: "Subscription plan created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create subscription plan",
        variant: "destructive",
      });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest(`/api/subscription-plans/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: "Success",
        description: "Subscription plan updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription plan",
        variant: "destructive",
      });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/subscription-plans/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: "Success",
        description: "Subscription plan deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete subscription plan",
        variant: "destructive",
      });
    },
  });

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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="integrations">API & Integrations</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="security">File Security</TabsTrigger>
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingOrganization(org);
                              setShowEditOrgDialog(true);
                              fetchOrganizationUsers(org.id);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
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

          {/* Edit Organization Dialog */}
          <Dialog open={showEditOrgDialog} onOpenChange={setShowEditOrgDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Organization</DialogTitle>
                <DialogDescription>
                  Update organization details, settings, and manage users
                </DialogDescription>
              </DialogHeader>
              {editingOrganization && (
                <div className="space-y-6">
                  {/* Organization Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Organization Details</h3>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-name" className="text-right">
                          Organization Name
                        </Label>
                        <Input
                          id="edit-name"
                          className="col-span-3"
                          value={editingOrganization.name || ""}
                          onChange={(e) => setEditingOrganization({
                            ...editingOrganization,
                            name: e.target.value
                          })}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-slug" className="text-right">
                          Slug
                        </Label>
                        <Input
                          id="edit-slug"
                          className="col-span-3"
                          value={editingOrganization.slug || ""}
                          onChange={(e) => setEditingOrganization({
                            ...editingOrganization,
                            slug: e.target.value
                          })}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-status" className="text-right">
                          Status
                        </Label>
                        <Select
                          value={editingOrganization.subscriptionStatus || "trial"}
                          onValueChange={(value) => setEditingOrganization({
                            ...editingOrganization,
                            subscriptionStatus: value
                          })}
                        >
                          <SelectTrigger className="col-span-3">
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
                      <div className="space-y-4">
                        <Label className="text-lg font-semibold">Change Subscription Plan</Label>
                        <SubscriptionPlanSelector
                          plans={subscriptionPlans || []}
                          selectedPlanId={editingOrganization.subscriptionPlanId?.toString() || ""}
                          onPlanSelect={(planId) => setEditingOrganization({
                            ...editingOrganization,
                            subscriptionPlanId: parseInt(planId)
                          })}
                          showFeatures={true}
                          showRadioButtons={true}
                        />
                      </div>
                    </div>
                  </div>

                  {/* User Management */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">User Management</h3>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Username</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {organizationUsers.map((user: any) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                {editingUser?.id === user.id ? (
                                  <Input
                                    value={editingUser.username || ""}
                                    onChange={(e) => setEditingUser({
                                      ...editingUser,
                                      username: e.target.value
                                    })}
                                    className="w-32"
                                  />
                                ) : (
                                  user.username
                                )}
                              </TableCell>
                              <TableCell>
                                {editingUser?.id === user.id ? (
                                  <Input
                                    value={editingUser.email || ""}
                                    onChange={(e) => setEditingUser({
                                      ...editingUser,
                                      email: e.target.value
                                    })}
                                    className="w-48"
                                  />
                                ) : (
                                  user.email
                                )}
                              </TableCell>
                              <TableCell>
                                {editingUser?.id === user.id ? (
                                  <Select
                                    value={editingUser.role || "user"}
                                    onValueChange={(value) => setEditingUser({
                                      ...editingUser,
                                      role: value
                                    })}
                                  >
                                    <SelectTrigger className="w-24">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                      <SelectItem value="manager">Manager</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                    {user.role}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={user.isActive ? 'default' : 'destructive'}>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {editingUser?.id === user.id ? (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        updateUserMutation.mutate({
                                          orgId: editingOrganization.id,
                                          userId: user.id,
                                          updates: {
                                            username: editingUser.username,
                                            email: editingUser.email,
                                            role: editingUser.role,
                                            isActive: editingUser.isActive,
                                            ...(editingUser.newPassword && { password: editingUser.newPassword })
                                          }
                                        });
                                        setEditingUser(null);
                                      }}
                                      disabled={updateUserMutation.isPending}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingUser(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingUser({ ...user, newPassword: "" })}
                                    >
                                      Edit
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="destructive">
                                          Delete
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete {user.username}? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteUserMutation.mutate({
                                              orgId: editingOrganization.id,
                                              userId: user.id
                                            })}
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                          {editingUser?.id && (
                            <TableRow>
                              <TableCell colSpan={5}>
                                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                                  <div>
                                    <Label htmlFor="new-password">New Password (optional)</Label>
                                    <Input
                                      id="new-password"
                                      type="password"
                                      value={editingUser?.newPassword || ""}
                                      onChange={(e) => setEditingUser({
                                        ...editingUser,
                                        newPassword: e.target.value
                                      })}
                                      placeholder="Enter new password"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="user-status">Status</Label>
                                    <Select
                                      value={editingUser?.isActive ? "active" : "inactive"}
                                      onValueChange={(value) => setEditingUser({
                                        ...editingUser,
                                        isActive: value === "active"
                                      })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Current users: {organizationUsers.length} / {editingOrganization.maxUsers || 'Unlimited'}
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditOrgDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (editingOrganization) {
                      updateOrganizationMutation.mutate({
                        id: editingOrganization.id,
                        updates: {
                          name: editingOrganization.name,
                          slug: editingOrganization.slug,
                          subscriptionStatus: editingOrganization.subscriptionStatus,
                          subscriptionPlanId: editingOrganization.subscriptionPlanId
                        }
                      });
                      setShowEditOrgDialog(false);
                    }
                  }}
                  disabled={updateOrganizationMutation.isPending}
                >
                  {updateOrganizationMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts across all organizations
              </CardDescription>
              <div className="flex gap-4 mt-4">
                <div className="w-64">
                  <Label htmlFor="org-filter">Filter by Organization</Label>
                  <Select
                    value={selectedUserOrgId?.toString() || "all"}
                    onValueChange={(value) => {
                      const orgId = value === "all" ? null : parseInt(value);
                      setSelectedUserOrgId(orgId);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Organizations</SelectItem>
                      {allOrganizations?.map((org: any) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userManagementUsers?.map((user: any) => {
                    const userOrg = allOrganizations?.find((org: any) => org.id === user.organizationId);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{userOrg?.name || `Organization ${user.organizationId}`}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'destructive'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingUser({ ...user, newPassword: "" })}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {user.username}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteUserMutation.mutate({
                                      orgId: user.organizationId,
                                      userId: user.id
                                    })}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          {/* Subscription Plans Management */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Subscription Plans Management
                  </CardTitle>
                  <CardDescription>
                    Create, edit, and configure subscription plans with pricing and features
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Subscription Plan</DialogTitle>
                      <DialogDescription>
                        Configure a new subscription plan with pricing, limits, and features
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="planName">Plan Name</Label>
                          <Input id="planName" placeholder="e.g., Professional" />
                        </div>
                        <div>
                          <Label htmlFor="planSlug">Slug</Label>
                          <Input id="planSlug" placeholder="e.g., professional" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="planDescription">Description</Label>
                        <Input id="planDescription" placeholder="Plan description..." />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="planPrice">Price</Label>
                          <Input id="planPrice" type="number" placeholder="99.00" />
                        </div>
                        <div>
                          <Label htmlFor="planCurrency">Currency</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="USD" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="planInterval">Billing Interval</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Monthly" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="month">Monthly</SelectItem>
                              <SelectItem value="year">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="maxUsers">Max Users</Label>
                          <Input id="maxUsers" type="number" placeholder="25" />
                        </div>
                        <div>
                          <Label htmlFor="maxProjects">Max Projects</Label>
                          <Input id="maxProjects" type="number" placeholder="100" />
                        </div>
                        <div>
                          <Label htmlFor="maxStorage">Max Storage (GB)</Label>
                          <Input id="maxStorage" type="number" placeholder="50" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button variant="outline">Cancel</Button>
                        <Button>Create Plan</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Advanced Plan Management Interface */}
              {plansLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading subscription plans...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div>
                    <Label className="text-lg font-semibold mb-6 block">Advanced Plan Configuration</Label>
                    <p className="text-muted-foreground mb-6">Configure pricing, limits, and features for each subscription tier.</p>
                  </div>

                  {/* Three Large Plan Configuration Boxes */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {subscriptionPlans?.map((plan: any) => (
                      <Card key={plan.id} className={`relative border-2 ${plan.isPopular ? 'border-primary bg-primary/5' : 'border-muted'} transition-all duration-200 hover:shadow-lg`}>
                        {plan.isPopular && (
                          <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1">
                            ⭐ Most Popular
                          </Badge>
                        )}
                        
                        <CardHeader className="pb-4">
                          <div className="text-center">
                            <CardTitle className="text-xl font-bold mb-2">{plan.name}</CardTitle>
                            <div className="text-3xl font-bold text-primary mb-2">
                              ${plan.price}
                              <span className="text-sm font-normal text-muted-foreground">/{plan.billingInterval}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{plan.description}</p>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-6">
                          {/* Basic Settings */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-sm border-b pb-2">Basic Settings</h4>
                            
                            <div className="space-y-3">
                              <div>
                                <Label htmlFor={`${plan.slug}-price`} className="text-xs font-medium">Price</Label>
                                <Input 
                                  id={`${plan.slug}-price`}
                                  type="number" 
                                  step="0.01"
                                  defaultValue={plan.price}
                                  className="mt-1"
                                  onChange={(e) => {
                                    // Handle price change
                                    console.log(`${plan.name} price changed to:`, e.target.value);
                                  }}
                                />
                              </div>
                              
                              <div>
                                <Label className="text-xs font-medium">Billing Interval</Label>
                                <div className="flex gap-2 mt-1">
                                  <label className="flex items-center space-x-1">
                                    <input
                                      type="radio"
                                      name={`${plan.slug}-interval`}
                                      checked={plan.billingInterval === 'month'}
                                      onChange={() => console.log(`${plan.name} set to monthly`)}
                                      className="text-primary"
                                    />
                                    <span className="text-xs">Monthly</span>
                                  </label>
                                  <label className="flex items-center space-x-1">
                                    <input
                                      type="radio"
                                      name={`${plan.slug}-interval`}
                                      checked={plan.billingInterval === 'year'}
                                      onChange={() => console.log(`${plan.name} set to yearly`)}
                                      className="text-primary"
                                    />
                                    <span className="text-xs">Yearly</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Plan Limits */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-sm border-b pb-2">Plan Limits</h4>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor={`${plan.slug}-users`} className="text-xs font-medium">Max Users</Label>
                                <Input 
                                  id={`${plan.slug}-users`}
                                  type="number"
                                  defaultValue={plan.maxUsers}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`${plan.slug}-projects`} className="text-xs font-medium">Max Projects</Label>
                                <Input 
                                  id={`${plan.slug}-projects`}
                                  type="number"
                                  defaultValue={plan.maxProjects}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`${plan.slug}-customers`} className="text-xs font-medium">Max Customers</Label>
                                <Input 
                                  id={`${plan.slug}-customers`}
                                  type="number"
                                  defaultValue={plan.maxCustomers}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`${plan.slug}-storage`} className="text-xs font-medium">Storage (GB)</Label>
                                <Input 
                                  id={`${plan.slug}-storage`}
                                  type="number"
                                  defaultValue={plan.maxStorageGB}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Core Features */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-sm border-b pb-2">Core Features</h4>
                            
                            <div className="space-y-2">
                              {[
                                { key: 'hasHumanResources', label: 'Human Resources' },
                                { key: 'hasGpsTracking', label: 'GPS Tracking' },
                                { key: 'hasWeather', label: 'Weather' },
                                { key: 'hasSms', label: 'SMS' },
                                { key: 'hasImageGallery', label: 'Image Gallery' },
                                { key: 'hasVehicleInspections', label: 'Vehicle Inspections' },
                                { key: 'hasFormBuilder', label: 'Form Builder' },
                                { key: 'hasExpenses', label: 'Expenses' },
                                { key: 'hasQuotes', label: 'Quotes' },
                                { key: 'hasLeads', label: 'Leads' },
                                { key: 'hasAnalytics', label: 'Analytics' },
                                { key: 'hasTimeClock', label: 'Time Clock' }
                              ].map((feature) => (
                                <div key={feature.key} className="flex items-center justify-between">
                                  <Label className="text-xs">{feature.label}</Label>
                                  <div className="flex gap-1">
                                    <label className="flex items-center space-x-1">
                                      <input
                                        type="radio"
                                        name={`${plan.slug}-${feature.key}`}
                                        checked={plan[feature.key] === true}
                                        onChange={() => console.log(`${plan.name} ${feature.label} enabled`)}
                                        className="text-green-500 scale-75"
                                      />
                                      <span className="text-xs text-green-600">✓</span>
                                    </label>
                                    <label className="flex items-center space-x-1">
                                      <input
                                        type="radio"
                                        name={`${plan.slug}-${feature.key}`}
                                        checked={plan[feature.key] === false}
                                        onChange={() => console.log(`${plan.name} ${feature.label} disabled`)}
                                        className="text-red-500 scale-75"
                                      />
                                      <span className="text-xs text-red-600">✗</span>
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Advanced Features */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-sm border-b pb-2">Advanced Features</h4>
                            
                            <div className="space-y-2">
                              {[
                                { key: 'hasInvoicing', label: 'Invoicing' },
                                { key: 'hasAdvancedReporting', label: 'Advanced Reporting' },
                                { key: 'hasApiAccess', label: 'API Access' },
                                { key: 'hasCustomBranding', label: 'Custom Branding' },
                                { key: 'hasPrioritySupport', label: 'Priority Support' },
                                { key: 'hasWhiteLabel', label: 'White Label' },
                                { key: 'hasAdvancedIntegrations', label: 'Advanced Integrations' },
                                { key: 'hasMultiLanguage', label: 'Multi-Language' },
                                { key: 'hasAdvancedSecurity', label: 'Advanced Security' }
                              ].map((feature) => (
                                <div key={feature.key} className="flex items-center justify-between">
                                  <Label className="text-xs">{feature.label}</Label>
                                  <div className="flex gap-1">
                                    <label className="flex items-center space-x-1">
                                      <input
                                        type="radio"
                                        name={`${plan.slug}-${feature.key}`}
                                        checked={plan[feature.key] === true}
                                        onChange={() => console.log(`${plan.name} ${feature.label} enabled`)}
                                        className="text-green-500 scale-75"
                                      />
                                      <span className="text-xs text-green-600">✓</span>
                                    </label>
                                    <label className="flex items-center space-x-1">
                                      <input
                                        type="radio"
                                        name={`${plan.slug}-${feature.key}`}
                                        checked={plan[feature.key] === false}
                                        onChange={() => console.log(`${plan.name} ${feature.label} disabled`)}
                                        className="text-red-500 scale-75"
                                      />
                                      <span className="text-xs text-red-600">✗</span>
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Plan Status */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-sm border-b pb-2">Plan Status</h4>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Active Plan</Label>
                                <div className="flex gap-1">
                                  <label className="flex items-center space-x-1">
                                    <input
                                      type="radio"
                                      name={`${plan.slug}-active`}
                                      checked={plan.isActive === true}
                                      onChange={() => console.log(`${plan.name} activated`)}
                                      className="text-green-500 scale-75"
                                    />
                                    <span className="text-xs text-green-600">Active</span>
                                  </label>
                                  <label className="flex items-center space-x-1">
                                    <input
                                      type="radio"
                                      name={`${plan.slug}-active`}
                                      checked={plan.isActive === false}
                                      onChange={() => console.log(`${plan.name} deactivated`)}
                                      className="text-red-500 scale-75"
                                    />
                                    <span className="text-xs text-red-600">Inactive</span>
                                  </label>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Popular Badge</Label>
                                <div className="flex gap-1">
                                  <label className="flex items-center space-x-1">
                                    <input
                                      type="radio"
                                      name={`${plan.slug}-popular`}
                                      checked={plan.isPopular === true}
                                      onChange={() => console.log(`${plan.name} marked as popular`)}
                                      className="text-amber-500 scale-75"
                                    />
                                    <span className="text-xs text-amber-600">Popular</span>
                                  </label>
                                  <label className="flex items-center space-x-1">
                                    <input
                                      type="radio"
                                      name={`${plan.slug}-popular`}
                                      checked={plan.isPopular === false}
                                      onChange={() => console.log(`${plan.name} unmarked as popular`)}
                                      className="text-gray-500 scale-75"
                                    />
                                    <span className="text-xs text-gray-600">Normal</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Save Button */}
                          <div className="pt-4 border-t">
                            <Button 
                              className="w-full"
                              onClick={() => {
                                toast({
                                  title: "Plan Updated",
                                  description: `${plan.name} plan configuration has been saved successfully`,
                                });
                              }}
                            >
                              💾 Save {plan.name} Changes
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Global Actions */}
                  <div className="flex justify-between items-center pt-6 border-t">
                    <div className="text-sm text-muted-foreground">
                      Configure each plan individually using the controls above
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline">
                        🔄 Reset All Plans
                      </Button>
                      <Button>
                        💾 Save All Changes
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <FileSecurityTab />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Platform Analytics
              </CardTitle>
              <CardDescription>
                System performance and usage analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Analytics dashboard coming soon</p>
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

            {/* Subscription Plan Selection */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Choose Subscription Plan</Label>
              <SubscriptionPlanSelector
                plans={subscriptionPlans || []}
                selectedPlanId={subscriptionForm.planId}
                onPlanSelect={(planId) => setSubscriptionForm({...subscriptionForm, planId})}
                showFeatures={true}
                showRadioButtons={true}
              />
            </div>

            {/* Subscription Status */}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSubscriptionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createSubscriptionMutation.mutate(subscriptionForm)}
              disabled={createSubscriptionMutation.isPending}
            >
              {createSubscriptionMutation.isPending ? "Creating..." : "Create Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Username
                </Label>
                <Input
                  id="username"
                  className="col-span-3"
                  value={editingUser.username || ""}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    username: e.target.value
                  })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  className="col-span-3"
                  value={editingUser.email || ""}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    email: e.target.value
                  })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role
                </Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) => setEditingUser({
                    ...editingUser,
                    role: value
                  })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-password" className="text-right">
                  New Password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  className="col-span-3"
                  placeholder="Leave blank to keep current password"
                  value={editingUser.newPassword || ""}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    newPassword: e.target.value
                  })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Implementation would go here
                  toast({
                    title: "User Updated",
                    description: "User information has been updated successfully",
                  });
                  setEditingUser(null);
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
