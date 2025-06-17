import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Receipt, 
  Scan, 
  DollarSign, 
  Calendar, 
  Tag, 
  Building2, 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Edit, 
  Trash2, 
  Download,
  TrendingUp,
  TrendingDown,
  Filter,
  Calculator
} from "lucide-react";
import type { Expense, ExpenseCategory, Project } from "@shared/schema";
import { ExpenseLineItemsForm, type LineItem } from "@/components/expense-line-items-form";

interface ExpenseWithProject extends Expense {
  project?: Project;
}

const EXPENSE_CATEGORIES = [
  "travel",
  "meals",
  "office_supplies", 
  "equipment",
  "software",
  "marketing",
  "entertainment",
  "utilities",
  "other"
];

export default function Expenses() {
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [ocrDialogOpen, setOcrDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "vendor">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithProject | null>(null);
  const [showExpenseDetails, setShowExpenseDetails] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading: expensesLoading } = useQuery<ExpenseWithProject[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: categories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ["/api/expense-categories"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: FormData) => 
      fetch("/api/expenses", {
        method: "POST",
        body: data,
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setExpenseDialogOpen(false);
      toast({
        title: "Success",
        description: "Expense created successfully",
      });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
    },
  });

  const approveExpenseMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/expenses/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Success",
        description: "Expense approved successfully",
      });
    },
  });

  const handleCreateExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // If we have OCR data, populate the form with it
    if (ocrResult?.testData) {
      formData.set("vendor", ocrResult.testData.vendor);
      formData.set("amount", ocrResult.testData.amount);
      formData.set("expenseDate", ocrResult.testData.date);
      formData.set("category", ocrResult.testData.category);
    }
    
    createExpenseMutation.mutate(formData);
  };

  const handleOcrScan = async () => {
    if (!selectedFile) return;
    
    setOcrLoading(true);
    try {
      const formData = new FormData();
      formData.append("receipt", selectedFile);
      
      const response = await fetch("/api/ocr/receipt", {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      setOcrResult(result);
      
      if (result.success) {
        toast({
          title: "OCR Processing Complete",
          description: "Receipt data extracted successfully",
        });
      } else {
        toast({
          title: "OCR Service",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process receipt",
        variant: "destructive",
      });
    } finally {
      setOcrLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      pending: "outline",
      approved: "secondary",
      rejected: "destructive",
      reimbursed: "default",
    };
    return colors[status] || "outline";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      case "reimbursed":
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Filter and sort expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = searchTerm === "" || 
      expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || expense.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    const matchesProject = projectFilter === "all" || 
      (projectFilter === "none" && !expense.projectId) ||
      expense.projectId?.toString() === projectFilter;
    
    const expenseDate = new Date(expense.expenseDate);
    const now = new Date();
    const matchesDate = dateFilter === "all" ||
      (dateFilter === "today" && expenseDate.toDateString() === now.toDateString()) ||
      (dateFilter === "week" && expenseDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) ||
      (dateFilter === "month" && expenseDate >= new Date(now.getFullYear(), now.getMonth(), 1)) ||
      (dateFilter === "year" && expenseDate >= new Date(now.getFullYear(), 0, 1));
    
    return matchesSearch && matchesStatus && matchesCategory && matchesProject && matchesDate;
  }).sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case "date":
        comparison = new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime();
        break;
      case "amount":
        comparison = parseFloat(a.amount) - parseFloat(b.amount);
        break;
      case "vendor":
        comparison = (a.vendor || "").localeCompare(b.vendor || "");
        break;
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  const approvedExpenses = filteredExpenses.filter(e => e.status === "approved").length;
  const pendingExpenses = filteredExpenses.filter(e => e.status === "pending").length;
  const rejectedExpenses = filteredExpenses.filter(e => e.status === "rejected").length;

  if (expensesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Expense Tracker</h1>
        <p className="text-gray-600">Manage expenses with OCR receipt scanning</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold">${totalExpenses.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold">{approvedExpenses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{pendingExpenses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Receipt className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Count</p>
                <p className="text-2xl font-bold">{expenses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="expenses" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="expenses">All Expenses</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>
          
          <div className="flex space-x-2">
            <Dialog open={ocrDialogOpen} onOpenChange={setOcrDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Scan className="h-4 w-4 mr-2" />
                  Scan Receipt
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>OCR Receipt Scanner</DialogTitle>
                  <DialogDescription>
                    Upload a receipt image to automatically extract expense information
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="receipt">Receipt Image</Label>
                    <Input 
                      id="receipt" 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  
                  {selectedFile && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm font-medium">{selectedFile.name}</span>
                      </div>
                      <Button 
                        onClick={handleOcrScan} 
                        disabled={ocrLoading}
                        className="w-full"
                      >
                        {ocrLoading ? "Processing..." : "Extract Data"}
                      </Button>
                    </div>
                  )}
                  
                  {ocrResult && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-medium mb-2">Extracted Information:</h4>
                      {ocrResult.success ? (
                        <div className="space-y-1 text-sm">
                          <p><strong>Vendor:</strong> {ocrResult.data.vendor}</p>
                          <p><strong>Amount:</strong> ${ocrResult.data.amount}</p>
                          <p><strong>Date:</strong> {ocrResult.data.date}</p>
                          <p><strong>Category:</strong> {ocrResult.data.category}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-red-600">{ocrResult.message}</p>
                          {ocrResult.testData && (
                            <div className="text-sm text-gray-600">
                              <p><strong>Test Data:</strong></p>
                              <p>Vendor: {ocrResult.testData.vendor}</p>
                              <p>Amount: ${ocrResult.testData.amount}</p>
                              <p>Date: {ocrResult.testData.date}</p>
                            </div>
                          )}
                        </div>
                      )}
                      <Button 
                        onClick={() => {
                          setOcrDialogOpen(false);
                          setExpenseDialogOpen(true);
                        }}
                        className="w-full mt-2"
                      >
                        Create Expense
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Expense</DialogTitle>
                  <DialogDescription>
                    Add a new expense entry with receipt attachment
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateExpense} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="description">Description *</Label>
                      <Input 
                        id="description" 
                        name="description" 
                        defaultValue={ocrResult?.testData?.vendor || ""}
                        required 
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount">Amount *</Label>
                      <Input 
                        id="amount" 
                        name="amount" 
                        type="number" 
                        step="0.01" 
                        defaultValue={ocrResult?.testData?.amount || ""}
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expenseDate">Date *</Label>
                      <Input 
                        id="expenseDate" 
                        name="expenseDate" 
                        type="date" 
                        defaultValue={ocrResult?.testData?.date || new Date().toISOString().split('T')[0]}
                        required 
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select name="category" defaultValue={ocrResult?.testData?.category || ""}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category.replace('_', ' ').toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vendor">Vendor</Label>
                      <Input 
                        id="vendor" 
                        name="vendor" 
                        defaultValue={ocrResult?.testData?.vendor || ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="projectId">Project (Optional)</Label>
                      <Select name="projectId">
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="receipt">Receipt Image</Label>
                    <Input id="receipt" name="receipt" type="file" accept="image/*" />
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" rows={3} />
                  </div>
                  
                  <div>
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input id="tags" name="tags" placeholder="business, travel, meals" />
                  </div>
                  
                  <Button type="submit" disabled={createExpenseMutation.isPending}>
                    {createExpenseMutation.isPending ? "Creating..." : "Create Expense"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="expenses" className="space-y-4">
          {/* Enhanced Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Expense Filters & Search
              </CardTitle>
              <CardDescription>Filter and search through your expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search vendor, description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="reimbursed">Reimbursed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category-filter">Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {EXPENSE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.replace('_', ' ').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="project-filter">Project</Label>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      <SelectItem value="none">No Project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date-filter">Date Range</Label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Dates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sort-by">Sort By</Label>
                  <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                    const [sort, order] = value.split('-');
                    setSortBy(sort as "date" | "amount" | "vendor");
                    setSortOrder(order as "asc" | "desc");
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Date (Newest)</SelectItem>
                      <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                      <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
                      <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
                      <SelectItem value="vendor-asc">Vendor (A-Z)</SelectItem>
                      <SelectItem value="vendor-desc">Vendor (Z-A)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredExpenses.length} of {expenses.length} expenses
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === "table" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("table")}
                    >
                      Table View
                    </Button>
                    <Button
                      variant={viewMode === "cards" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("cards")}
                    >
                      Card View
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const data = [
                        ['Date', 'Description', 'Vendor', 'Category', 'Amount', 'Status', 'Project', 'Notes', 'Created']
                      ];
                      
                      filteredExpenses.forEach(expense => {
                        data.push([
                          new Date(expense.expenseDate).toLocaleDateString(),
                          expense.description || '',
                          expense.vendor || '',
                          expense.category.replace('_', ' ').toUpperCase(),
                          `$${parseFloat(expense.amount).toFixed(2)}`,
                          expense.status,
                          expense.project?.name || '',
                          expense.notes || '',
                          new Date(expense.createdAt).toLocaleDateString()
                        ]);
                      });
                      
                      const csv = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `expenses-filtered-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export ({filteredExpenses.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setCategoryFilter("all");
                      setProjectFilter("all");
                      setDateFilter("all");
                      setSortBy("date");
                      setSortOrder("desc");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filtered Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Filtered Total</p>
                    <p className="text-xl font-bold">${totalExpenses.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Approved</p>
                    <p className="text-xl font-bold">{approvedExpenses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-xl font-bold">{pendingExpenses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Rejected</p>
                    <p className="text-xl font-bold">{rejectedExpenses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expense List - Table View */}
          {viewMode === "table" && (
            <Card>
              <CardHeader>
                <CardTitle>Expense List</CardTitle>
                <CardDescription>Detailed view of filtered expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id} className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedExpense(expense);
                          setShowExpenseDetails(true);
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(expense.expenseDate).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            {expense.notes && (
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {expense.notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {expense.vendor ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {expense.vendor}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <Tag className="h-3 w-3" />
                            {expense.category.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-medium">
                            ${parseFloat(expense.amount).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(expense.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(expense.status)}
                              <span>{expense.status}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {expense.project ? (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                              {expense.project.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                            {expense.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveExpenseMutation.mutate(expense.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {expense.receiptUrl && (
                              <Button size="sm" variant="ghost" asChild>
                                <a href={`/${expense.receiptUrl}`} target="_blank" rel="noopener noreferrer">
                                  <Receipt className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteExpenseMutation.mutate(expense.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredExpenses.length === 0 && (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No expenses found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your filters or add a new expense</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Expense List - Card View */}
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExpenses.map((expense) => (
                <Card key={expense.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedExpense(expense);
                    setShowExpenseDetails(true);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{expense.description}</CardTitle>
                        {expense.vendor && (
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <Building2 className="h-3 w-3" />
                            {expense.vendor}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant={getStatusColor(expense.status)}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(expense.status)}
                          <span className="text-xs">{expense.status}</span>
                        </div>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">
                          ${parseFloat(expense.amount).toFixed(2)}
                        </span>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {expense.category.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(expense.expenseDate).toLocaleDateString()}
                        </div>
                        {expense.project && (
                          <Badge variant="secondary" className="text-xs">
                            {expense.project.name}
                          </Badge>
                        )}
                      </div>
                      
                      {expense.notes && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {expense.notes}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex space-x-2">
                          {expense.receiptUrl && (
                            <Button size="sm" variant="ghost" asChild onClick={(e) => e.stopPropagation()}>
                              <a href={`/${expense.receiptUrl}`} target="_blank" rel="noopener noreferrer">
                                <Receipt className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {expense.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                approveExpenseMutation.mutate(expense.id);
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteExpenseMutation.mutate(expense.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredExpenses.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-xl font-medium text-muted-foreground">No expenses found</p>
                  <p className="text-muted-foreground">Try adjusting your filters or add a new expense</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Reports</CardTitle>
              <CardDescription>Generate and manage expense reports</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Expense reporting functionality coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Categories</CardTitle>
              <CardDescription>Manage expense categorization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {EXPENSE_CATEGORIES.map((category) => (
                  <div key={category} className="border rounded-lg p-3 text-center">
                    <Tag className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                    <p className="text-sm font-medium">
                      {category.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detailed Expense View Dialog */}
      <Dialog open={showExpenseDetails} onOpenChange={setShowExpenseDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expense Details
            </DialogTitle>
            <DialogDescription>
              Complete information for this expense entry
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedExpense.description}</h3>
                  {selectedExpense.vendor && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {selectedExpense.vendor}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">${parseFloat(selectedExpense.amount).toFixed(2)}</p>
                  <Badge variant={getStatusColor(selectedExpense.status)} className="mt-1">
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(selectedExpense.status)}
                      <span>{selectedExpense.status}</span>
                    </div>
                  </Badge>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(selectedExpense.expenseDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline">
                        {selectedExpense.category.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {selectedExpense.project && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Project</Label>
                      <div className="mt-1">
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          {selectedExpense.project.name}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="mt-1">{new Date(selectedExpense.createdAt).toLocaleDateString()}</p>
                  </div>

                  {selectedExpense.tags && typeof selectedExpense.tags === 'string' && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Tags</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedExpense.tags.split(',').map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedExpense.receiptUrl && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Receipt</Label>
                      <div className="mt-1">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/${selectedExpense.receiptUrl}`} target="_blank" rel="noopener noreferrer">
                            <Receipt className="h-4 w-4 mr-2" />
                            View Receipt
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes Section */}
              {selectedExpense.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{selectedExpense.notes}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex space-x-2">
                  {selectedExpense.status === "pending" && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        approveExpenseMutation.mutate(selectedExpense.id);
                        setShowExpenseDetails(false);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Expense
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      const expense = selectedExpense;
                      const data = [
                        ['Field', 'Value'],
                        ['Description', expense.description],
                        ['Vendor', expense.vendor || ''],
                        ['Amount', `$${parseFloat(expense.amount).toFixed(2)}`],
                        ['Category', expense.category.replace('_', ' ').toUpperCase()],
                        ['Date', new Date(expense.expenseDate).toLocaleDateString()],
                        ['Status', expense.status],
                        ['Project', expense.project?.name || ''],
                        ['Notes', expense.notes || ''],
                        ['Created', new Date(expense.createdAt).toLocaleDateString()]
                      ];
                      
                      const csv = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `expense-${expense.id}-details.csv`;
                      a.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Details
                  </Button>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowExpenseDetails(false)}
                  >
                    Close
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      deleteExpenseMutation.mutate(selectedExpense.id);
                      setShowExpenseDetails(false);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}