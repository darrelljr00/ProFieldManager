import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Users, UserCheck, Folder } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FolderPermissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  folder: {
    id: number;
    name: string;
  } | null;
}

interface Permission {
  id: number;
  userId?: number;
  userRole?: string;
  canView: boolean;
  canUpload: boolean;
  canCreateSubfolder: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canMove: boolean;
  inheritPermissions: boolean;
  applyToSubfolders: boolean;
  userName?: string;
  userLastName?: string;
  userEmail?: string;
  expiresAt?: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export function FolderPermissionsDialog({ isOpen, onClose, folder }: FolderPermissionsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [permissions, setPermissions] = useState({
    canView: true,
    canUpload: false,
    canCreateSubfolder: false,
    canEdit: false,
    canDelete: false,
    canMove: false,
    inheritPermissions: true,
    applyToSubfolders: false,
  });

  // Fetch folder permissions
  const { data: folderPermissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['/api/folders', folder?.id, 'permissions'],
    enabled: !!folder?.id && isOpen,
  });

  // Fetch organization users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    enabled: isOpen,
  });

  // Create permission mutation
  const createPermissionMutation = useMutation({
    mutationFn: async (permissionData: any) => {
      return apiRequest('POST', `/api/folders/${folder?.id}/permissions`, permissionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders', folder?.id, 'permissions'] });
      toast({
        title: "Permission Created",
        description: "Folder permission has been created successfully.",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create permission",
        variant: "destructive",
      });
    },
  });

  // Update permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return apiRequest('PUT', `/api/folder-permissions/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders', folder?.id, 'permissions'] });
      toast({
        title: "Permission Updated",
        description: "Folder permission has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update permission",
        variant: "destructive",
      });
    },
  });

  // Delete permission mutation
  const deletePermissionMutation = useMutation({
    mutationFn: async (permissionId: number) => {
      return apiRequest('DELETE', `/api/folder-permissions/${permissionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders', folder?.id, 'permissions'] });
      toast({
        title: "Permission Deleted",
        description: "Folder permission has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete permission",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedUserId(null);
    setSelectedRole("");
    setPermissions({
      canView: true,
      canUpload: false,
      canCreateSubfolder: false,
      canEdit: false,
      canDelete: false,
      canMove: false,
      inheritPermissions: true,
      applyToSubfolders: false,
    });
  };

  const handleCreatePermission = () => {
    if (!selectedUserId && !selectedRole) {
      toast({
        title: "Error",
        description: "Please select either a user or role",
        variant: "destructive",
      });
      return;
    }

    const permissionData = {
      ...permissions,
      ...(selectedUserId ? { userId: selectedUserId } : { userRole: selectedRole }),
    };

    createPermissionMutation.mutate(permissionData);
  };

  const handleUpdatePermission = (permissionId: number, updates: any) => {
    updatePermissionMutation.mutate({ id: permissionId, updates });
  };

  const handleDeletePermission = (permissionId: number) => {
    deletePermissionMutation.mutate(permissionId);
  };

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleExistingPermission = (permission: Permission, key: keyof Permission) => {
    if (typeof permission[key] === 'boolean') {
      handleUpdatePermission(permission.id, {
        [key]: !permission[key]
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Folder Permissions - {folder?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing Permissions */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Current Permissions</h3>
            {permissionsLoading ? (
              <div className="text-center py-4">Loading permissions...</div>
            ) : folderPermissions.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No specific permissions set. Using default role permissions.
              </div>
            ) : (
              <div className="space-y-3">
                {folderPermissions.map((permission: Permission) => (
                  <div key={permission.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {permission.userId ? (
                          <>
                            <UserCheck className="h-4 w-4" />
                            <span className="font-medium">
                              {permission.userName} {permission.userLastName}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({permission.userEmail})
                            </span>
                          </>
                        ) : (
                          <>
                            <Users className="h-4 w-4" />
                            <span className="font-medium">
                              Role: {permission.userRole}
                            </span>
                          </>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePermission(permission.id)}
                        disabled={deletePermissionMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { key: 'canView', label: 'View' },
                        { key: 'canUpload', label: 'Upload Files' },
                        { key: 'canCreateSubfolder', label: 'Create Folders' },
                        { key: 'canEdit', label: 'Edit' },
                        { key: 'canDelete', label: 'Delete' },
                        { key: 'canMove', label: 'Move' },
                        { key: 'inheritPermissions', label: 'Inherit' },
                        { key: 'applyToSubfolders', label: 'Apply to Subfolders' },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Switch
                            checked={permission[key as keyof Permission] as boolean}
                            onCheckedChange={() => toggleExistingPermission(permission, key as keyof Permission)}
                            disabled={updatePermissionMutation.isPending}
                          />
                          <Label className="text-sm">{label}</Label>
                        </div>
                      ))}
                    </div>
                    
                    {permission.expiresAt && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Expires: {new Date(permission.expiresAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Permission */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-3">Add New Permission</h3>
            
            <div className="space-y-4">
              {/* User/Role Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="user-select">Select User</Label>
                  <Select
                    value={selectedUserId?.toString() || ""}
                    onValueChange={(value) => {
                      setSelectedUserId(value ? parseInt(value) : null);
                      if (value) setSelectedRole("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user: User) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.firstName} {user.lastName} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="role-select">Or Select Role</Label>
                  <Select
                    value={selectedRole}
                    onValueChange={(value) => {
                      setSelectedRole(value);
                      if (value) setSelectedUserId(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a role..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <Label className="text-base font-medium">Permissions</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  {[
                    { key: 'canView', label: 'View' },
                    { key: 'canUpload', label: 'Upload Files' },
                    { key: 'canCreateSubfolder', label: 'Create Folders' },
                    { key: 'canEdit', label: 'Edit' },
                    { key: 'canDelete', label: 'Delete' },
                    { key: 'canMove', label: 'Move' },
                    { key: 'inheritPermissions', label: 'Inherit from Parent' },
                    { key: 'applyToSubfolders', label: 'Apply to Subfolders' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Switch
                        checked={permissions[key as keyof typeof permissions]}
                        onCheckedChange={() => togglePermission(key as keyof typeof permissions)}
                      />
                      <Label className="text-sm">{label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={handleCreatePermission}
            disabled={createPermissionMutation.isPending || (!selectedUserId && !selectedRole)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Permission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}