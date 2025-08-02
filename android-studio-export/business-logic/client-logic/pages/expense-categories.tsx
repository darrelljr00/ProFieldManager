import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const expenseCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  color: z.string().default("#3B82F6"),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

type ExpenseCategoryForm = z.infer<typeof expenseCategorySchema>;

interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  isDefault: boolean;
  organizationId: number;
  createdAt: string;
  updatedAt: string;
}

export default function ExpenseCategories() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: categories = [], isLoading } = useQuery<ExpenseCategory[]>({
    queryKey: ["/api/expense-categories"],
  });

  const form = useForm<ExpenseCategoryForm>({
    resolver: zodResolver(expenseCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6",
      isActive: true,
      isDefault: false,
    },
  });

  const editForm = useForm<ExpenseCategoryForm>({
    resolver: zodResolver(expenseCategorySchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: ExpenseCategoryForm) =>
      apiRequest("POST", "/api/expense-categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
      toast({
        title: "Success",
        description: "Expense category created successfully",
      });
      form.reset();
      setShowForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create expense category",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ExpenseCategoryForm }) =>
      apiRequest("PUT", `/api/expense-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
      toast({
        title: "Success",
        description: "Expense category updated successfully",
      });
      setEditingId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update expense category",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/expense-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
      toast({
        title: "Success",
        description: "Expense category deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete expense category",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExpenseCategoryForm) => {
    createMutation.mutate(data);
  };

  const handleEdit = (category: ExpenseCategory) => {
    setEditingId(category.id);
    editForm.reset({
      name: category.name,
      description: category.description || "",
      color: category.color,
      isActive: category.isActive,
      isDefault: category.isDefault,
    });
  };

  const handleSaveEdit = (id: number) => {
    editForm.handleSubmit((data) => {
      updateMutation.mutate({ id, data });
    })();
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this expense category?")) {
      deleteMutation.mutate(id);
    }
  };

  const colorOptions = [
    "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
    "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"
  ];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Expense Categories</h1>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Expense Category</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Category Name *
                  </label>
                  <Input
                    {...form.register("name")}
                    placeholder="e.g., Travel, Meals, Office Supplies"
                  />
                  {form.formState.errors.name && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => form.setValue("color", color)}
                        className={`w-8 h-8 rounded border-2 ${
                          form.watch("color") === color
                            ? "border-gray-900"
                            : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <Textarea
                  {...form.register("description")}
                  placeholder="Optional description for this category"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...form.register("isActive")}
                    className="rounded"
                  />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...form.register("isDefault")}
                    className="rounded"
                  />
                  <span className="text-sm">Default Category</span>
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {createMutation.isPending ? "Creating..." : "Create Category"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardContent className="p-4">
              {editingId === category.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Category Name *
                      </label>
                      <Input
                        {...editForm.register("name")}
                        placeholder="Category name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Color
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => editForm.setValue("color", color)}
                            className={`w-8 h-8 rounded border-2 ${
                              editForm.watch("color") === color
                                ? "border-gray-900"
                                : "border-gray-300"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Description
                    </label>
                    <Textarea
                      {...editForm.register("description")}
                      placeholder="Category description"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        {...editForm.register("isActive")}
                        className="rounded"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        {...editForm.register("isDefault")}
                        className="rounded"
                      />
                      <span className="text-sm">Default Category</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSaveEdit(category.id)}
                      disabled={updateMutation.isPending}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                    <Button
                      onClick={() => setEditingId(null)}
                      variant="outline"
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {category.name}
                        {category.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                        {!category.isActive && (
                          <Badge variant="destructive" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </h3>
                      {category.description && (
                        <p className="text-gray-600 text-sm">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(category)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(category.id)}
                      variant="destructive"
                      size="sm"
                      disabled={category.isDefault}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {categories.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 mb-4">No expense categories found</p>
              <Button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 mx-auto"
              >
                <Plus className="h-4 w-4" />
                Create Your First Category
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}