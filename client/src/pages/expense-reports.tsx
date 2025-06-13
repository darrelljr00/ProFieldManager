import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  FileText, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send, 
  Eye,
  Receipt,
  Calendar
} from "lucide-react";
import type { ExpenseReport, InsertExpenseReport, Expense } from "@shared/schema";
import { format } from "date-fns";

export default function ExpenseReports() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ExpenseReport | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAddExpensesModalOpen, setIsAddExpensesModalOpen] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<Partial<InsertExpenseReport>>({
    title: "",
    description: "",
  });
  const { toast } = useToast();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["/api/expense-reports"],
  });

  const { data: availableExpenses } = useQuery({
    queryKey: ["/api/expenses"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertExpenseReport) => apiRequest("POST", "/api/expense-reports", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-reports"] });
      setIsCreateModalOpen(false);
      setFormData({ title: "", description: "" });
      toast({
        title: "Success",
        description: "Expense report created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create expense report",
        variant: "destructive",
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/expense-reports/${id}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-reports"] });
      toast({
        title: "Success",
        description: "Expense report submitted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit expense report",
        variant: "destructive",
      });
    },
  });

  const addExpensesMutation = useMutation({
    mutationFn: async ({ reportId, expenseIds }: { reportId: number; expenseIds: number[] }) => {
      for (const expenseId of expenseIds) {
        await apiRequest("POST", `/api/expense-reports/${reportId}/expenses/${expenseId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-reports"] });
      setIsAddExpensesModalOpen(false);
      setSelectedExpenses(new Set());
      toast({
        title: "Success",
        description: "Expenses added to report successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add expenses to report",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData as InsertExpenseReport);
  };

  const handleSubmitReport = (reportId: number) => {
    submitMutation.mutate(reportId);
  };

  const handleAddExpenses = () => {
    if (selectedReport && selectedExpenses.size > 0) {
      addExpensesMutation.mutate({
        reportId: selectedReport.id,
        expenseIds: Array.from(selectedExpenses),
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "secondary";
      case "submitted": return "default";
      case "approved": return "default";
      case "rejected": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft": return <Clock className="w-3 h-3" />;
      case "submitted": return <Send className="w-3 h-3" />;
      case "approved": return <CheckCircle className="w-3 h-3" />;
      case "rejected": return <XCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  // Filter available expenses - only include those not already in a report and approved
  const unassignedExpenses = availableExpenses?.filter((expense: Expense) => 
    expense.status === "approved" && 
    !reports?.some((report: any) => 
      report.expenses?.some((reportExpense: Expense) => reportExpense.id === expense.id)
    )
  ) || [];

  return (
    <div className="flex-1">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Expense Reports</h2>
            <p className="text-gray-600">Create and manage expense reports for reimbursement.</p>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Expense Report</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Report Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Q1 2024 Business Travel"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the expense report..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    className="bg-primary hover:bg-blue-700"
                  >
                    Create Report
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reports?.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No expense reports</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first expense report.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports?.map((report: any) => (
              <Card key={report.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg font-semibold">{report.title}</span>
                    <Badge variant={getStatusColor(report.status)}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(report.status)}
                        <span>{report.status}</span>
                      </div>
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-semibold flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        {parseFloat(report.totalAmount || "0").toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Expenses:</span>
                      <span className="flex items-center">
                        <Receipt className="w-4 h-4 mr-1" />
                        {report.expenses?.length || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Created:</span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {format(new Date(report.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>

                    {report.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{report.description}</p>
                    )}

                    <div className="flex space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          setIsViewModalOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      
                      {report.status === "draft" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReport(report);
                              setIsAddExpensesModalOpen(true);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Expenses
                          </Button>
                          
                          {report.expenses?.length > 0 && (
                            <Button
                              size="sm"
                              onClick={() => handleSubmitReport(report.id)}
                              disabled={submitMutation.isPending}
                              className="bg-primary hover:bg-blue-700"
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Submit
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* View Report Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedReport?.title}
              <Badge variant={getStatusColor(selectedReport?.status || "")} className="ml-2">
                <div className="flex items-center space-x-1">
                  {getStatusIcon(selectedReport?.status || "")}
                  <span>{selectedReport?.status}</span>
                </div>
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900">Total Amount</h4>
                  <p className="text-2xl font-bold text-primary">
                    ${parseFloat(selectedReport.totalAmount || "0").toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900">Number of Expenses</h4>
                  <p className="text-2xl font-bold text-primary">
                    {(selectedReport as any).expenses?.length || 0}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900">Created Date</h4>
                  <p className="text-sm text-gray-600">
                    {format(new Date(selectedReport.createdAt), "MMMM d, yyyy")}
                  </p>
                </div>
              </div>

              {selectedReport.description && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600">{selectedReport.description}</p>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Expenses</h4>
                {(selectedReport as any).expenses?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedReport as any).expenses?.map((expense: Expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {expense.category.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(expense.expenseDate), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>${parseFloat(expense.amount).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500 text-center py-4">No expenses added to this report yet.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Expenses Modal */}
      <Dialog open={isAddExpensesModalOpen} onOpenChange={setIsAddExpensesModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Expenses to Report</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select approved expenses to add to "{selectedReport?.title}". Only expenses that haven't been added to other reports are shown.
            </p>
            
            {unassignedExpenses.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unassignedExpenses.map((expense: Expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedExpenses.has(expense.id)}
                            onCheckedChange={(checked) => {
                              const newSelection = new Set(selectedExpenses);
                              if (checked) {
                                newSelection.add(expense.id);
                              } else {
                                newSelection.delete(expense.id);
                              }
                              setSelectedExpenses(newSelection);
                            }}
                          />
                        </TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {expense.category.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(expense.expenseDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>${parseFloat(expense.amount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <div className="flex justify-between items-center pt-4">
                  <p className="text-sm text-gray-600">
                    {selectedExpenses.size} expense(s) selected
                  </p>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsAddExpensesModalOpen(false);
                        setSelectedExpenses(new Set());
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddExpenses}
                      disabled={selectedExpenses.size === 0 || addExpensesMutation.isPending}
                      className="bg-primary hover:bg-blue-700"
                    >
                      Add Selected Expenses
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Receipt className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No available expenses</h3>
                <p className="mt-1 text-sm text-gray-500">
                  All approved expenses have already been added to reports, or you don't have any approved expenses yet.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}