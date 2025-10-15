import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Receipt, 
  DollarSign, 
  Calendar, 
  User, 
  Edit, 
  Trash2, 
  TrendingUp,
  Filter,
  Camera,
  Upload,
  X,
  Image as ImageIcon
} from "lucide-react";
import type { Expense } from "@shared/schema";

console.log("🔥 TECHNICIAN EXPENSES FILE LOADED!");

interface ExpenseWithDetails extends Expense {
  project?: { name: string };
  user?: { firstName: string; lastName: string };
}

export default function TechnicianExpenses() {
  console.log("🎯 TECHNICIAN EXPENSES COMPONENT RENDERING!");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithDetails | null>(null);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery<ExpenseWithDetails[]>({
    queryKey: ["/api/expenses"],
  });

  console.log("Technician Expenses Debug:", { 
    expensesCount: expenses?.length, 
    isLoading,
    expenses: expenses?.slice(0, 2) // Log first 2 expenses
  });

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/users/me"],
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/expenses", formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Expense created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create expense",
        variant: "destructive",
      });
    },
  });

  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number; formData: FormData }) => {
      const response = await apiRequest("PUT", `/api/expenses/${id}`, formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update expense",
        variant: "destructive",
      });
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete expense",
        variant: "destructive",
      });
    },
  });

  // Handle image selection from camera or file
  const handleImageSelect = (file: File) => {
    setReceiptImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Reset form
  const resetForm = () => {
    setEditingExpense(null);
    setReceiptImage(null);
    setReceiptPreview("");
    setUploadProgress(0);
    setSelectedProjectId("");
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    // Add receipt image if selected
    if (receiptImage) {
      formData.append("receipt", receiptImage);
    }

    // Add logged-in user's ID as the submitter
    if (currentUser?.id) {
      formData.append("userId", currentUser.id.toString());
    }

    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, formData });
    } else {
      createExpenseMutation.mutate(formData);
    }
  };

  // Handle edit
  const handleEdit = (expense: ExpenseWithDetails) => {
    setEditingExpense(expense);
    if (expense.receiptUrl) {
      setReceiptPreview(expense.receiptUrl);
    }
    if (expense.projectId) {
      setSelectedProjectId(expense.projectId.toString());
    }
    setIsDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      deleteExpenseMutation.mutate(id);
    }
  };

  const filteredExpenses = expenses.filter((expense) => {
    if (statusFilter !== "all" && expense.status !== statusFilter) return false;
    
    // For technicians, show only their own expenses
    // For managers/admins, show all expenses
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
      return expense.userId === currentUser?.id;
    }
    
    return true;
  });

  const totalExpenses = filteredExpenses.reduce((sum, expense) => 
    sum + parseFloat(expense.amount || "0"), 0
  );

  const approvedExpenses = filteredExpenses
    .filter(e => e.status === "approved")
    .reduce((sum, expense) => sum + parseFloat(expense.amount || "0"), 0);

  const pendingExpenses = filteredExpenses
    .filter(e => e.status === "pending")
    .reduce((sum, expense) => sum + parseFloat(expense.amount || "0"), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-500 dark:bg-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 dark:bg-yellow-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 dark:bg-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 dark:bg-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="heading-technician-expenses">
              Technician Expenses
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track and manage field technician expenses
            </p>
          </div>
          <Button 
            onClick={() => setIsDialogOpen(true)} 
            data-testid="button-add-expense"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Expenses</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-500" />
                {formatCurrency(totalExpenses)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Approved</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                {formatCurrency(approvedExpenses)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Approval</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Receipt className="h-5 w-5 text-yellow-500" />
                {formatCurrency(pendingExpenses)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle>Filters</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                data-testid="filter-all"
              >
                All
              </Button>
              <Button
                variant={statusFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("pending")}
                data-testid="filter-pending"
              >
                Pending
              </Button>
              <Button
                variant={statusFilter === "approved" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("approved")}
                data-testid="filter-approved"
              >
                Approved
              </Button>
              <Button
                variant={statusFilter === "rejected" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("rejected")}
                data-testid="filter-rejected"
              >
                Rejected
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Expense List</CardTitle>
            <CardDescription>
              {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading expenses...</div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No expenses found</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                        <TableHead>Technician</TableHead>
                      )}
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {formatDate(expense.expenseDate)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {expense.description || "No description"}
                        </TableCell>
                        {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              {expense.user ? `${expense.user.firstName} ${expense.user.lastName}` : 'Unknown'}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>{expense.category || "Uncategorized"}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(parseFloat(expense.amount || "0"))}
                        </TableCell>
                        <TableCell>
                          {expense.receiptUrl ? (
                            <a 
                              href={expense.receiptUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                            >
                              <Receipt className="h-4 w-4" />
                              <span className="text-xs">View</span>
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">No receipt</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(expense.status || 'pending')}>
                            {expense.status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEdit(expense)}
                              data-testid={`button-edit-expense-${expense.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(expense.id)}
                              data-testid={`button-delete-expense-${expense.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
            <DialogDescription>
              {editingExpense ? "Update expense details" : "Create a new expense entry with receipt photo"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={editingExpense?.amount}
                  className="pl-10"
                  placeholder="0.00"
                  data-testid="input-expense-amount"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                name="category"
                required
                defaultValue={editingExpense?.category}
                placeholder="e.g., Gas, Tools, Meals"
                data-testid="input-expense-category"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                required
                defaultValue={editingExpense?.description}
                placeholder="Enter expense details"
                rows={3}
                data-testid="input-expense-description"
              />
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="expenseDate">Expense Date *</Label>
              <Input
                id="expenseDate"
                name="expenseDate"
                type="date"
                required
                defaultValue={editingExpense?.expenseDate ? new Date(editingExpense.expenseDate).toISOString().split('T')[0] : ''}
                data-testid="input-expense-date"
              />
            </div>

            {/* Project (Optional) */}
            <div>
              <Label htmlFor="projectId">Project (Optional)</Label>
              <Select 
                value={selectedProjectId} 
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger data-testid="select-expense-project">
                  <SelectValue placeholder="Select a project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Hidden input to submit project ID in FormData */}
              <input 
                type="hidden" 
                name="projectId" 
                value={selectedProjectId} 
              />
            </div>

            {/* Vendor */}
            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <Input
                id="vendor"
                name="vendor"
                defaultValue={editingExpense?.vendor || ''}
                placeholder="Store or vendor name"
                data-testid="input-expense-vendor"
              />
            </div>

            {/* Submitted By (Read-only) */}
            <div>
              <Label htmlFor="submittedBy">Submitted By</Label>
              <Input
                id="submittedBy"
                value={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : ''}
                readOnly
                className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                data-testid="input-expense-submitter"
              />
            </div>

            {/* Receipt Photo Upload */}
            <div className="space-y-3">
              <Label>Receipt Photo</Label>
              
              {/* Camera and File Upload Buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => cameraInputRef.current?.click()}
                  data-testid="button-camera-capture"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Take Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-file-upload"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </Button>
              </div>

              {/* Hidden camera input (mobile will open camera) */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageSelect(file);
                }}
                className="hidden"
              />

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageSelect(file);
                }}
                className="hidden"
              />

              {/* Image Preview */}
              {receiptPreview && (
                <div className="relative border rounded-lg p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                    onClick={() => {
                      setReceiptImage(null);
                      setReceiptPreview("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="w-full h-48 object-contain rounded"
                  />
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {receiptImage?.name || "Current receipt"}
                  </p>
                </div>
              )}

              {editingExpense?.receiptUrl && !receiptPreview && (
                <p className="text-sm text-muted-foreground">
                  Current receipt: <a href={editingExpense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={editingExpense?.notes || ''}
                placeholder="Additional notes"
                rows={2}
                data-testid="input-expense-notes"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
                data-testid="button-cancel-expense"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                data-testid="button-submit-expense"
              >
                {createExpenseMutation.isPending || updateExpenseMutation.isPending ? (
                  "Saving..."
                ) : editingExpense ? (
                  "Update Expense"
                ) : (
                  "Create Expense"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
