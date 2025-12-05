import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  UserPlus,
  Camera,
  Upload,
  Trash2, 
  Edit, 
  Shield, 
  ShieldOff,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Download,
  Search,
  UserCheck,
  UserX,
  Save,
  X
} from "lucide-react";

type User = {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  userType: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  canAccessDashboard?: boolean;
  canAccessCalendar?: boolean;
  canAccessTimeClock?: boolean;
  canAccessJobs?: boolean;
  canAccessMyTasks?: boolean;
  canAccessLeads?: boolean;
  canAccessExpenses?: boolean;
  canAccessExpenseCategories?: boolean;
  canAccessTechnicianExpenses?: boolean;
  canAccessGasCards?: boolean;
  canAccessGasCardProviders?: boolean;
  canAccessQuotes?: boolean;
  canAccessInvoices?: boolean;
  canAccessCustomers?: boolean;
  canAccessPayments?: boolean;
  canAccessFileManager?: boolean;
  canAccessFormBuilder?: boolean;
  canAccessInternalMessages?: boolean;
  canAccessImageGallery?: boolean;
  canAccessSMS?: boolean;
  canAccessGpsTracking?: boolean;
  canAccessInspections?: boolean;
  canAccessMobileTest?: boolean;
  canAccessReviews?: boolean;
  canAccessMarketResearch?: boolean;
  canAccessHR?: boolean;
  canAccessUsers?: boolean;
  canAccessLiveStream?: boolean;
  canAccessSaasAdmin?: boolean;
  canAccessAdminSettings?: boolean;
  canAccessReports?: boolean;
  canAccessSettings?: boolean;
  profilePicture?: string;
  // HR-specific permissions
  canViewHREmployees?: boolean;
  canEditHREmployees?: boolean;
  canViewAllEmployees?: boolean;
  canEditAllEmployees?: boolean;
  canViewOwnHRProfile?: boolean;
  canEditOwnHRProfile?: boolean;
};

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState("users");
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingPermissions, setPendingPermissions] = useState<Record<number, Partial<User>>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showProfilePictureDialog, setShowProfilePictureDialog] = useState(false);
  const [selectedFileForUpload, setSelectedFileForUpload] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser, isAdmin } = useAuth();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: userStats } = useQuery({
    queryKey: ["/api/admin/users/stats"],
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["/api/organizations"],
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

  const batchSavePermissionsMutation = useMutation({
    mutationFn: (changes: Record<number, Partial<User>>) =>
      apiRequest("PUT", "/api/admin/users/batch-permissions", { changes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setPendingPermissions({});
      setHasUnsavedChanges(false);
      toast({
        title: "Success",
        description: "All permission changes saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save permission changes",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setShowNewUserDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: (data: { id: number; userData: any }) =>
      apiRequest("PUT", `/api/admin/users/${data.id}`, data.userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setShowEditDialog(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: (data: { id: number; action: "activate" | "deactivate" }) =>
      apiRequest("POST", `/api/admin/users/${data.id}/${data.action}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/users/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
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

  const bulkActionMutation = useMutation({
    mutationFn: (data: { userIds: number[]; action: string; value?: any }) =>
      apiRequest("POST", "/api/admin/users/bulk-action", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      setSelectedUsers([]);
      toast({
        title: "Success",
        description: "Bulk action completed successfully",
      });
      setShowBulkDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to perform bulk action",
        variant: "destructive",
      });
    },
  });

  const uploadProfilePictureMutation = useMutation({
    mutationFn: ({ userId, file }: { userId: number; file: File }) => {
      const formData = new FormData();
      formData.append('profilePicture', file);
      return apiRequest("POST", `/api/admin/users/${userId}/profile-picture`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowProfilePictureDialog(false);
      setSelectedFileForUpload(null);
      toast({
        title: "Success",
        description: "Profile picture uploaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload profile picture",
        variant: "destructive",
      });
    },
  });

  const deleteProfilePictureMutation = useMutation({
    mutationFn: (userId: number) => apiRequest("DELETE", `/api/admin/users/${userId}/profile-picture`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Profile picture deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete profile picture",
        variant: "destructive",
      });
    },
  });

  const pushNavigationUpdatesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/navigation/push-updates", {}),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Navigation updates pushed to all users successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to push navigation updates",
        variant: "destructive",
      });
    },
  });

  // Navigation Permission Profiles
  const { data: navigationProfiles = [], isLoading: isLoadingNavProfiles } = useQuery<any[]>({
    queryKey: ["/api/navigation-permission-profiles"],
  });

  const updateNavigationProfileMutation = useMutation({
    mutationFn: ({ profileId, updates }: { profileId: number; updates: any }) =>
      apiRequest("PATCH", `/api/navigation-permission-profiles/${profileId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/navigation-permission-profiles"] });
      toast({
        title: "Success",
        description: "Navigation profile updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update navigation profile",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userData = {
      username: formData.get("username") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      role: formData.get("role") as string,
      userType: formData.get("userType") as string,
      isActive: formData.get("isActive") === "on",
    };
    createUserMutation.mutate(userData);
  };

  const handleUpdateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    const formData = new FormData(e.currentTarget);
    const userData = {
      username: formData.get("username") as string,
      email: formData.get("email") as string,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      role: formData.get("role") as string,
      userType: formData.get("userType") as string,
      isActive: formData.get("isActive") === "on",
    };
    
    updateUserMutation.mutate({ id: selectedUser.id, userData });
  };

  const handleUpdatePassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }
    
    updateUserMutation.mutate({ 
      id: selectedUser.id, 
      userData: { password } 
    });
    setShowPasswordDialog(false);
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getRoleBadge = (role: string) => {
    const safeRole = role || 'user';
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      admin: "destructive",
      manager: "secondary",
      technician: "default",
      user: "outline"
    };
    const isTechnician = safeRole === 'technician';
    return (
      <Badge 
        variant={colors[safeRole] || "outline"} 
        className={isTechnician ? "bg-orange-600 hover:bg-orange-700" : ""}
      >
        {safeRole.charAt(0).toUpperCase() + safeRole.slice(1)}
      </Badge>
    );
  };

  const getUserTypeBadge = (userType: string) => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      web: "outline",
      mobile: "secondary",
      both: "default"
    };
    const labels: Record<string, string> = {
      web: "Web Only",
      mobile: "Mobile Only", 
      both: "Web & Mobile"
    };
    return <Badge variant={colors[userType] || "outline"}>{labels[userType] || userType || 'both'}</Badge>;
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setShowEditDialog(true);
  };

  const openPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setShowPasswordDialog(true);
  };

  // Filter and search users
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === "" || 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && user.isActive) ||
      (statusFilter === "inactive" && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Bulk operations handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: number, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleBulkAction = (action: string, value?: any) => {
    bulkActionMutation.mutate({
      userIds: selectedUsers,
      action,
      value
    });
  };

  const openProfilePictureDialog = (user: User) => {
    setSelectedUser(user);
    setShowProfilePictureDialog(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFileForUpload(file);
    }
  };

  const handleUploadProfilePicture = () => {
    if (!selectedUser || !selectedFileForUpload) return;
    
    uploadProfilePictureMutation.mutate({
      userId: selectedUser.id,
      file: selectedFileForUpload
    });
  };

  const handleDeleteProfilePicture = (user: User) => {
    if (confirm(`Are you sure you want to delete ${user.firstName || user.username}'s profile picture?`)) {
      deleteProfilePictureMutation.mutate(user.id);
    }
  };

  // Helper functions for handling pending permissions
  const updatePendingPermission = (userId: number, permission: string, value: boolean) => {
    setPendingPermissions(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [permission]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const getUserPermissionValue = (user: User, permission: string) => {
    if (pendingPermissions[user.id] && pendingPermissions[user.id].hasOwnProperty(permission)) {
      return pendingPermissions[user.id][permission as keyof User];
    }
    return user[permission as keyof User];
  };

  const handleSaveAllChanges = () => {
    if (Object.keys(pendingPermissions).length === 0) {
      toast({
        title: "No Changes",
        description: "No permission changes to save",
      });
      return;
    }
    
    // Filter out empty permission objects and only send actual changes
    const validChanges: Record<number, Partial<User>> = {};
    
    Object.entries(pendingPermissions).forEach(([userIdStr, permissions]) => {
      const userId = parseInt(userIdStr);
      const permissionKeys = Object.keys(permissions || {});
      
      // Only include users that have actual permission changes
      if (permissionKeys.length > 0) {
        validChanges[userId] = permissions;
      }
    });
    
    if (Object.keys(validChanges).length === 0) {
      toast({
        title: "No Valid Changes",
        description: "No valid permission changes to save",
      });
      return;
    }
    
    batchSavePermissionsMutation.mutate(validChanges);
  };

  const handleDiscardChanges = () => {
    setPendingPermissions({});
    setHasUnsavedChanges(false);
    toast({
      title: "Changes Discarded",
      description: "All unsaved permission changes have been discarded",
    });
  };

  // User statistics with fallback
  const stats = userStats || {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
    admins: users.filter(u => u.role === 'admin').length,
    managers: users.filter(u => u.role === 'manager').length,
    regularUsers: users.filter(u => u.role === 'user').length,
    verified: users.filter(u => u.emailVerified).length,
    recentLogins: users.filter(u => u.lastLoginAt && 
      new Date(u.lastLoginAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
  };

  const safeStats = {
    total: stats.total || 0,
    active: stats.active || 0,
    inactive: stats.inactive || 0,
    recentLogins: stats.recentLogins || 0
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="tab-access">Tab Access</TabsTrigger>
          <TabsTrigger value="hr-settings">HR Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* User Statistics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{safeStats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{safeStats.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
                <UserX className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{safeStats.inactive}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Logins</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{safeStats.recentLogins}</div>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">User Accounts</h2>
              <p className="text-sm text-muted-foreground">Manage user accounts and basic settings</p>
            </div>
            <div className="flex items-center gap-2">
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedUsers.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDialog(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Bulk Actions
              </Button>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const csv = "Username,Email,Role,Status,Created\n" + 
                filteredUsers.map(u => `${u.username},${u.email},${u.role},${u.isActive ? 'Active' : 'Inactive'},${u.createdAt}`).join("\n");
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'users.csv';
              a.click();
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system with appropriate role and permissions
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      name="username"
                      placeholder="johndoe"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPasswords.newPassword ? "text" : "password"}
                      placeholder="Enter password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => togglePasswordVisibility('newPassword')}
                    >
                      {showPasswords.newPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Organization</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      New users will be automatically assigned to your organization:
                    </p>
                    <p className="font-medium">
                      {organizations.find((org: any) => org.id === currentUser?.organizationId)?.name || 'Your Organization'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select name="role" defaultValue="user">
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="userType">User Type</Label>
                    <Select name="userType" defaultValue="both">
                      <SelectTrigger>
                        <SelectValue placeholder="Select user type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="web">Web Only</SelectItem>
                        <SelectItem value="mobile">Mobile Only</SelectItem>
                        <SelectItem value="both">Web & Mobile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch name="isActive" id="isActive" defaultChecked />
                  <Label htmlFor="isActive">Active Account</Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewUserDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? "Creating..." : "Create User"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {filteredUsers.length} of {users.length} users displayed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>User Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {user.profilePicture ? (
                          <img
                            src={`/api/admin/users/${user.id}/profile-picture`}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {(user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        {(user.firstName || user.lastName) && (
                          <div className="text-sm text-muted-foreground">
                            {user.firstName} {user.lastName}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getUserTypeBadge(user.userType || "both")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.isActive ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span>{user.isActive ? "Active" : "Inactive"}</span>
                      {user.emailVerified && (
                        <Badge variant="secondary" className="text-xs">Verified</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.lastLoginAt ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(user.lastLoginAt), "MMM dd, yyyy")}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.createdAt), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPasswordDialog(user)}
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleUserStatusMutation.mutate({
                          id: user.id,
                          action: user.isActive ? "deactivate" : "activate"
                        })}
                        disabled={toggleUserStatusMutation.isPending}
                      >
                        {user.isActive ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openProfilePictureDialog(user)}
                        title="Upload Profile Picture"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                      {user.profilePicture && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProfilePicture(user)}
                          title="Delete Profile Picture"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
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
                              onClick={() => deleteUserMutation.mutate(user.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
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

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    name="username"
                    defaultValue={selectedUser.username}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    name="email"
                    type="email"
                    defaultValue={selectedUser.email}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input
                    id="edit-firstName"
                    name="firstName"
                    defaultValue={selectedUser.firstName || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input
                    id="edit-lastName"
                    name="lastName"
                    defaultValue={selectedUser.lastName || ""}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-role">Role</Label>
                  <Select name="role" defaultValue={selectedUser.role}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-userType">User Type</Label>
                  <Select name="userType" defaultValue={selectedUser.userType || "both"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">Web Only</SelectItem>
                      <SelectItem value="mobile">Mobile Only</SelectItem>
                      <SelectItem value="both">Web & Mobile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch 
                  name="isActive" 
                  id="edit-isActive" 
                  defaultChecked={selectedUser.isActive}
                />
                <Label htmlFor="edit-isActive">Active Account</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPasswords.password ? "text" : "password"}
                  placeholder="Enter new password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => togglePasswordVisibility('password')}
                >
                  {showPasswords.password ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPasswords.confirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => togglePasswordVisibility('confirmPassword')}
                >
                  {showPasswords.confirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPasswordDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? "Updating..." : "Change Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
            <DialogDescription>
              Perform actions on {selectedUsers.length} selected users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleBulkAction("activate")}
                disabled={bulkActionMutation.isPending}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Activate Users
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBulkAction("deactivate")}
                disabled={bulkActionMutation.isPending}
              >
                <UserX className="h-4 w-4 mr-2" />
                Deactivate Users
              </Button>
            </div>
            <div className="flex gap-2">
              <Select onValueChange={(value) => handleBulkAction("changeRole", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Change role to..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Picture Upload Dialog */}
      <Dialog open={showProfilePictureDialog} onOpenChange={setShowProfilePictureDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Profile Picture</DialogTitle>
            <DialogDescription>
              Upload a profile picture for {selectedUser?.firstName || selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <input
                type="file"
                id="profile-picture-input"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('profile-picture-input')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Select Image
              </Button>
              {selectedFileForUpload && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Selected: {selectedFileForUpload.name}
                </p>
              )}
            </div>
            {selectedUser?.profilePicture && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Current Profile Picture:</p>
                <img
                  src={`/api/admin/users/${selectedUser.id}/profile-picture`}
                  alt="Current profile picture"
                  className="w-16 h-16 rounded-full object-cover border"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowProfilePictureDialog(false);
                setSelectedFileForUpload(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUploadProfilePicture}
              disabled={!selectedFileForUpload || uploadProfilePictureMutation.isPending}
            >
              {uploadProfilePictureMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                User Permissions
              </CardTitle>
              <CardDescription>
                Manage user access permissions and control their capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* User Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{safeStats.total}</div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{safeStats.active}</div>
                    <div className="text-sm text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{safeStats.inactive}</div>
                    <div className="text-sm text-muted-foreground">Inactive</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{userStats?.verified || 0}</div>
                    <div className="text-sm text-muted-foreground">Verified</div>
                  </div>
                </div>

                {/* User Permissions Table */}
                <div>
                  <h3 className="text-lg font-medium mb-4">User Permissions</h3>
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
                            <Badge variant={user.role === 'admin' ? 'default' : user.role === 'manager' ? 'secondary' : user.role === 'technician' ? 'default' : 'outline'} className={user.role === 'technician' ? 'bg-orange-600' : ''}>
                              {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'User'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={user.canViewProfiles === true}
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
                              checked={user.canEditProfiles === true}
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
                              checked={user.canCreateInvoices === true}
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
                              checked={user.canViewAllData === true}
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
                              checked={user.canManageProjects === true}
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
                              checked={user.canAccessReports === true}
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tab-access" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Navigation Tab Access Control
              </CardTitle>
              <CardDescription>
                Control which navigation tabs each role can access. Changes apply to all users with that role.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Role Description Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">Admin</h4>
                    <p className="text-xs text-purple-700 dark:text-purple-300">Full access to all tabs</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Manager</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300">Manage teams and operations</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">Technician</h4>
                    <p className="text-xs text-green-700 dark:text-green-300">Field work access</p>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                    <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">User</h4>
                    <p className="text-xs text-orange-700 dark:text-orange-300">Basic access</p>
                  </div>
                  <div className="p-4 bg-pink-50 dark:bg-pink-950 rounded-lg border border-pink-200 dark:border-pink-800">
                    <h4 className="font-semibold text-pink-900 dark:text-pink-100 mb-1">HR</h4>
                    <p className="text-xs text-pink-700 dark:text-pink-300">HR-related access</p>
                  </div>
                </div>

                {/* Profile-Based Tab Access Table */}
                {isLoadingNavProfiles ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background z-10 min-w-[120px]">Role Profile</TableHead>
                          <TableHead>Dashboard</TableHead>
                          <TableHead>Calendar</TableHead>
                          <TableHead>Time Clock</TableHead>
                          <TableHead>Jobs</TableHead>
                          <TableHead>My Tasks</TableHead>
                          <TableHead>Leads</TableHead>
                          <TableHead>Expenses</TableHead>
                          <TableHead>Quotes</TableHead>
                          <TableHead>Invoices</TableHead>
                          <TableHead>Customers</TableHead>
                          <TableHead>Payments</TableHead>
                          <TableHead>File Manager</TableHead>
                          <TableHead>Parts/Supplies</TableHead>
                          <TableHead>My Schedule</TableHead>
                          <TableHead>Form Builder</TableHead>
                          <TableHead>Inspections</TableHead>
                          <TableHead>Team Messages</TableHead>
                          <TableHead>Gallery</TableHead>
                          <TableHead>SMS</TableHead>
                          <TableHead>GPS Tracking</TableHead>
                          <TableHead>Weather</TableHead>
                          <TableHead>Reviews</TableHead>
                          <TableHead>Market Research</TableHead>
                          <TableHead>HR</TableHead>
                          <TableHead>Users</TableHead>
                          <TableHead>SaaS Admin</TableHead>
                          <TableHead>Admin Settings</TableHead>
                          <TableHead>Reports</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {navigationProfiles.map((profile: any) => (
                          <TableRow key={profile.id}>
                            <TableCell className="sticky left-0 bg-background z-10">
                              <div className="flex items-center gap-2">
                                <Badge variant={
                                  profile.name.includes('Admin') ? 'default' :
                                  profile.name.includes('Manager') ? 'secondary' :
                                  profile.name.includes('Technician') ? 'outline' :
                                  profile.name.includes('HR') ? 'destructive' :
                                  'outline'
                                }>
                                  {profile.name.replace(' Navigation', '')}
                                </Badge>
                                {profile.isSystem && (
                                  <span className="text-xs text-muted-foreground">(System)</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessDashboard === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessDashboard: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-dashboard-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessCalendar === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessCalendar: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-calendar-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessTimeClock === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessTimeClock: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-timeclock-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessJobs === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessJobs: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-jobs-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessMyTasks === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessMyTasks: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-mytasks-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessLeads === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessLeads: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-leads-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessExpenses === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessExpenses: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-expenses-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessQuotes === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessQuotes: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-quotes-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessInvoices === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessInvoices: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-invoices-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessCustomers === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessCustomers: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-customers-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessPayments === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessPayments: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-payments-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessFileManager === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessFileManager: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-filemanager-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessPartsSupplies === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessPartsSupplies: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-parts-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessMySchedule === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessMySchedule: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-schedule-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessFormBuilder === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessFormBuilder: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-formbuilder-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessInspections === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessInspections: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-inspections-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessTeamMessages === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessTeamMessages: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-messages-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessImageGallery === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessImageGallery: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-gallery-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessSMS === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessSMS: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-sms-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessGpsTracking === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessGpsTracking: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-gps-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessWeather === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessWeather: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-weather-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessReviews === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessReviews: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-reviews-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessMarketResearch === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessMarketResearch: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-market-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessHR === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessHR: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-hr-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessUsers === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessUsers: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-users-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessSaasAdmin === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessSaasAdmin: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-saas-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessAdminSettings === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessAdminSettings: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-adminsettings-${profile.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={profile.canAccessReports === true}
                                onCheckedChange={(checked) => 
                                  updateNavigationProfileMutation.mutate({
                                    profileId: profile.id,
                                    updates: { canAccessReports: checked }
                                  })
                                }
                                disabled={updateNavigationProfileMutation.isPending}
                                data-testid={`switch-reports-${profile.id}`}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Info Section */}
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Role-Based Tab Access:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div><strong>Admin:</strong> Full access to all navigation tabs and admin functions</div>
                    <div><strong>Manager:</strong> Team management and operations access</div>
                    <div><strong>Technician:</strong> Field work focused - jobs, schedule, time clock</div>
                    <div><strong>User:</strong> Basic access for regular team members</div>
                    <div><strong>HR:</strong> Human resources focused access</div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Note:</strong> Changes to role profiles apply to all users with that role. 
                      Users will see the navigation tabs enabled for their assigned role.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hr-settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Human Resource Settings
              </CardTitle>
              <CardDescription>
                Configure role-based permissions for HR functionality and employee management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Permission Rules Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">User</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Can only see their own HR profile</p>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                    <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">Technician</h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300">Field worker with time clock and job access</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Manager</h4>
                    <p className="text-sm text-green-700 dark:text-green-300">Can see all HR employees in their organization</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">HR</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">Can see all employees and make changes</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                    <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">Admin</h4>
                    <p className="text-sm text-red-700 dark:text-red-300">Can see all employees and make changes including other HR</p>
                  </div>
                </div>

                {/* HR Permissions Table */}
                <div>
                  <h3 className="text-lg font-medium mb-4">HR Permissions by User</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>View HR Employees</TableHead>
                        <TableHead>Edit HR Employees</TableHead>
                        <TableHead>View All Employees</TableHead>
                        <TableHead>Edit All Employees</TableHead>
                        <TableHead>View Own HR Profile</TableHead>
                        <TableHead>Edit Own HR Profile</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers?.map((user: any) => {
                        // Determine default permissions based on role
                        const getDefaultHRPermission = (permissionType: string) => {
                          switch (user.role) {
                            case 'admin':
                              return true; // Admin can do everything
                            case 'hr':
                              switch (permissionType) {
                                case 'canViewHREmployees':
                                case 'canEditHREmployees':
                                case 'canViewAllEmployees':
                                case 'canEditAllEmployees':
                                case 'canViewOwnHRProfile':
                                case 'canEditOwnHRProfile':
                                  return true;
                                default:
                                  return false;
                              }
                            case 'manager':
                              switch (permissionType) {
                                case 'canViewHREmployees':
                                case 'canViewOwnHRProfile':
                                  return true;
                                default:
                                  return false;
                              }
                            case 'technician':
                              switch (permissionType) {
                                case 'canViewOwnHRProfile':
                                  return true;
                                default:
                                  return false;
                              }
                            case 'user':
                              switch (permissionType) {
                                case 'canViewOwnHRProfile':
                                  return true;
                                default:
                                  return false;
                              }
                            default:
                              return false;
                          }
                        };

                        return (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{user.firstName} {user.lastName}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                user.role === 'admin' ? 'destructive' : 
                                user.role === 'hr' ? 'default' : 
                                user.role === 'manager' ? 'secondary' : 
                                user.role === 'technician' ? 'default' :
                                'outline'
                              } className={user.role === 'technician' ? 'bg-orange-600' : ''}>
                                {user.role?.toUpperCase() || 'USER'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={user.canViewHREmployees ?? getDefaultHRPermission('canViewHREmployees')}
                                onCheckedChange={(checked) => 
                                  updateUserPermissionsMutation.mutate({
                                    userId: user.id,
                                    permissions: { canViewHREmployees: checked }
                                  })
                                }
                                disabled={user.role === 'admin' || updateUserPermissionsMutation.isPending}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={user.canEditHREmployees ?? getDefaultHRPermission('canEditHREmployees')}
                                onCheckedChange={(checked) => 
                                  updateUserPermissionsMutation.mutate({
                                    userId: user.id,
                                    permissions: { canEditHREmployees: checked }
                                  })
                                }
                                disabled={user.role === 'admin' || updateUserPermissionsMutation.isPending}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={user.canViewAllEmployees ?? getDefaultHRPermission('canViewAllEmployees')}
                                onCheckedChange={(checked) => 
                                  updateUserPermissionsMutation.mutate({
                                    userId: user.id,
                                    permissions: { canViewAllEmployees: checked }
                                  })
                                }
                                disabled={user.role === 'admin' || updateUserPermissionsMutation.isPending}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={user.canEditAllEmployees ?? getDefaultHRPermission('canEditAllEmployees')}
                                onCheckedChange={(checked) => 
                                  updateUserPermissionsMutation.mutate({
                                    userId: user.id,
                                    permissions: { canEditAllEmployees: checked }
                                  })
                                }
                                disabled={user.role === 'admin' || updateUserPermissionsMutation.isPending}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={user.canViewOwnHRProfile ?? getDefaultHRPermission('canViewOwnHRProfile')}
                                onCheckedChange={(checked) => 
                                  updateUserPermissionsMutation.mutate({
                                    userId: user.id,
                                    permissions: { canViewOwnHRProfile: checked }
                                  })
                                }
                                disabled={user.role === 'admin' || updateUserPermissionsMutation.isPending}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={user.canEditOwnHRProfile ?? getDefaultHRPermission('canEditOwnHRProfile')}
                                onCheckedChange={(checked) => 
                                  updateUserPermissionsMutation.mutate({
                                    userId: user.id,
                                    permissions: { canEditOwnHRProfile: checked }
                                  })
                                }
                                disabled={user.role === 'admin' || updateUserPermissionsMutation.isPending}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">HR Permission Descriptions:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div><strong>View HR Employees:</strong> Can see other HR team members' profiles</div>
                      <div><strong>Edit HR Employees:</strong> Can modify HR employee information</div>
                      <div><strong>View All Employees:</strong> Can see all organization employees</div>
                      <div><strong>Edit All Employees:</strong> Can modify any employee information</div>
                      <div><strong>View Own HR Profile:</strong> Can view their own HR profile</div>
                      <div><strong>Edit Own HR Profile:</strong> Can modify their own HR profile</div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Role-Based Default Permissions:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                      <div className="text-blue-700 dark:text-blue-300">
                        <strong>User:</strong><br/>
                        • View/Edit Own Profile Only
                      </div>
                      <div className="text-orange-700 dark:text-orange-300">
                        <strong>Technician:</strong><br/>
                        • View Own Profile<br/>
                        • Time Clock & Jobs Access
                      </div>
                      <div className="text-blue-700 dark:text-blue-300">
                        <strong>Manager:</strong><br/>
                        • View HR Employees<br/>
                        • View/Edit Own Profile
                      </div>
                      <div className="text-blue-700 dark:text-blue-300">
                        <strong>HR:</strong><br/>
                        • All Employee Access<br/>
                        • Full Edit Permissions
                      </div>
                      <div className="text-blue-700 dark:text-blue-300">
                        <strong>Admin:</strong><br/>
                        • Full System Access<br/>
                        • Override All Restrictions
                      </div>
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