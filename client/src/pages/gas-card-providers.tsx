import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, CreditCard, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { GasCardProvider, InsertGasCardProvider } from "@shared/schema";

export default function GasCardProviders() {
  const [editingProvider, setEditingProvider] = useState<GasCardProvider | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertGasCardProvider>>({
    name: "",
    description: "",
    contactInfo: "",
    accountNumber: "",
    isActive: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["/api/gas-card-providers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<InsertGasCardProvider>) =>
      apiRequest("POST", "/api/gas-card-providers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gas-card-providers"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Gas card provider created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create gas card provider",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<InsertGasCardProvider>) =>
      apiRequest("PUT", `/api/gas-card-providers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gas-card-providers"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Gas card provider updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update gas card provider",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/gas-card-providers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gas-card-providers"] });
      toast({
        title: "Success",
        description: "Gas card provider deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete gas card provider",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      contactInfo: "",
      accountNumber: "",
      isActive: true,
    });
    setEditingProvider(null);
  };

  const handleEdit = (provider: GasCardProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      description: provider.description || "",
      contactInfo: provider.contactInfo || "",
      accountNumber: provider.accountNumber || "",
      isActive: provider.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast({
        title: "Error",
        description: "Provider name is required",
        variant: "destructive",
      });
      return;
    }

    if (editingProvider) {
      updateMutation.mutate({ id: editingProvider.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this gas card provider?")) {
      deleteMutation.mutate(id);
    }
  };

  // Listen for WebSocket updates
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'gas_card_provider_created' || 
            message.type === 'gas_card_provider_updated' || 
            message.type === 'gas_card_provider_deleted') {
          queryClient.invalidateQueries({ queryKey: ["/api/gas-card-providers"] });
        }
      } catch (error) {
        // Ignore parsing errors
      }
    };

    // Check if WebSocket is available
    if (typeof window !== 'undefined' && window.WebSocket) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      try {
        const ws = new WebSocket(wsUrl);
        ws.addEventListener('message', handleWebSocketMessage);
        
        return () => {
          ws.removeEventListener('message', handleWebSocketMessage);
          ws.close();
        };
      } catch (error) {
        console.log('WebSocket connection failed, using polling fallback');
      }
    }
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const activeProviders = providers.filter((p: GasCardProvider) => p.isActive);
  const inactiveProviders = providers.filter((p: GasCardProvider) => !p.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gas Card Providers</h1>
          <p className="text-muted-foreground">
            Manage gas card providers for expense tracking and reporting
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProvider ? "Edit Gas Card Provider" : "Add Gas Card Provider"}
              </DialogTitle>
              <DialogDescription>
                {editingProvider 
                  ? "Update the gas card provider information below."
                  : "Create a new gas card provider for expense tracking."
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Provider Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Shell, Exxon, BP"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the provider"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="contactInfo">Contact Information</Label>
                <Textarea
                  id="contactInfo"
                  value={formData.contactInfo || ""}
                  onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                  placeholder="Phone, email, website, or other contact details"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={formData.accountNumber || ""}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="Corporate account number (optional)"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive || false}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isActive">Active Provider</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : null}
                  {editingProvider ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Providers */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <CreditCard className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold">Active Providers</h2>
            <Badge variant="secondary">{activeProviders.length}</Badge>
          </div>
          <div className="space-y-3">
            {activeProviders.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No active gas card providers</p>
                  <p className="text-sm">Add your first provider to get started</p>
                </CardContent>
              </Card>
            ) : (
              activeProviders.map((provider: GasCardProvider) => (
                <Card key={provider.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Building className="w-4 h-4 text-primary" />
                          <h3 className="font-semibold">{provider.name}</h3>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        </div>
                        {provider.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {provider.description}
                          </p>
                        )}
                        {provider.accountNumber && (
                          <p className="text-xs text-muted-foreground">
                            Account: {provider.accountNumber}
                          </p>
                        )}
                        {provider.contactInfo && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Contact: {provider.contactInfo}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(provider)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(provider.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Inactive Providers */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <CreditCard className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-semibold">Inactive Providers</h2>
            <Badge variant="secondary">{inactiveProviders.length}</Badge>
          </div>
          <div className="space-y-3">
            {inactiveProviders.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No inactive providers</p>
                </CardContent>
              </Card>
            ) : (
              inactiveProviders.map((provider: GasCardProvider) => (
                <Card key={provider.id} className="opacity-75">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <h3 className="font-semibold text-gray-600">{provider.name}</h3>
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                            Inactive
                          </Badge>
                        </div>
                        {provider.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {provider.description}
                          </p>
                        )}
                        {provider.accountNumber && (
                          <p className="text-xs text-muted-foreground">
                            Account: {provider.accountNumber}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(provider)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(provider.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      <Separator />
      
      <Card>
        <CardHeader>
          <CardTitle>Gas Card Provider Management</CardTitle>
          <CardDescription>
            Tips for managing your gas card providers effectively
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Best Practices</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Keep provider information up to date</li>
                <li>• Include account numbers for easier expense tracking</li>
                <li>• Add contact information for account support</li>
                <li>• Mark unused providers as inactive</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Usage</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Providers appear in expense forms</li>
                <li>• Inactive providers are hidden from selection</li>
                <li>• Use descriptions to add provider details</li>
                <li>• Contact info helps with account management</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}