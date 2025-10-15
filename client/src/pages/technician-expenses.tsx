import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  Receipt, 
  DollarSign, 
  Calendar, 
  User, 
  Edit, 
  Trash2, 
  TrendingUp,
  Filter
} from "lucide-react";
import type { Expense } from "@shared/schema";

interface ExpenseWithDetails extends Expense {
  project?: { name: string };
  user?: { firstName: string; lastName: string };
}

export default function TechnicianExpenses() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery<ExpenseWithDetails[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me"],
  });

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
          <Button data-testid="button-add-expense">
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
                          <Badge className={getStatusColor(expense.status || 'pending')}>
                            {expense.status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-edit-expense-${expense.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
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
    </div>
  );
}
