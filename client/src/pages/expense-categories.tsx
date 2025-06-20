import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ExpenseCategories() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch expense categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['/api/expense-categories'],
    queryFn: () => apiRequest('GET', '/api/expense-categories').then(res => res.json())
  });

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/expense-categories', data),
    onSuccess: () => {
      toast({
        title: "Category created",
        description: "Expense category has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/expense-categories'] });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create expense category.",
        variant: "destructive",
      });
    }
  });

  // Update category mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest('PUT', `/api/expense-categories/${id}`, data),
    onSuccess: () => {
      toast({
        title: "Category updated",
        description: "Expense category has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/expense-categories'] });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to update expense category.",
        variant: "destructive",
      });
    }
  });

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/expense-categories/${id}`),
    onSuccess: () => {
      toast({
        title: "Category deleted",
        description: "Expense category has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/expense-categories'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete expense category.",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "#3B82F6",
      isActive: true
    });
    setEditingCategory(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      color: category.color,
      isActive: category.isActive
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      deleteMutation.mutate(id);
    }
  };

  const colors = [
    "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
    "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Expense Categories</h1>
          <p className="text-gray-600 mt-2">Manage your expense categories for better organization</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Category" : "Create New Category"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Travel, Office Supplies"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this category"
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingCategory ? "Update" : "Create"} Category
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category: ExpenseCategory) => (
          <Card key={category.id} className="relative">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(category)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {!category.isDefault && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(category.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {category.description && (
                <CardDescription className="mb-3">
                  {category.description}
                </CardDescription>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Badge variant={category.isActive ? "default" : "secondary"}>
                    {category.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {category.isDefault && (
                    <Badge variant="outline">
                      <Tag className="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Created {new Date(category.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No expense categories yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first expense category to start organizing your expenses
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Category
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}