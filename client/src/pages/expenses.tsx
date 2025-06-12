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
  Filter
} from "lucide-react";
import type { Expense, ExpenseCategory, Project } from "@shared/schema";

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

  const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  const approvedExpenses = expenses.filter(e => e.status === "approved").length;
  const pendingExpenses = expenses.filter(e => e.status === "pending").length;

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
          <Card>
            <CardHeader>
              <CardTitle>Expense List</CardTitle>
              <CardDescription>All expense entries with status and details</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          {expense.vendor && (
                            <p className="text-sm text-gray-500">{expense.vendor}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {expense.category.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>${parseFloat(expense.amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(expense.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(expense.status)}
                            <span>{expense.status}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {expense.project ? expense.project.name : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {expense.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveExpenseMutation.mutate(expense.id)}
                            >
                              Approve
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
            </CardContent>
          </Card>
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
    </div>
  );
}