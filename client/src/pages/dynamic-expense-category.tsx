import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Download, DollarSign, CheckCircle, Clock } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface ExpenseCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
}

interface Expense {
  id: number;
  amount: string;
  description: string;
  category: string;
  vendor: string | null;
  expenseDate: string;
  status: string;
  userId: number;
}

export default function DynamicExpenseCategory() {
  const [, params] = useRoute("/expense-category/:slug");
  const categorySlug = params?.slug;
  const { user } = useAuth();
  
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: categories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ["/api/expense-categories"],
  });

  const category = categories.find((c) => c.slug === categorySlug);

  const { data: allExpenses = [] } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  // Filter expenses by this category name
  const categoryExpenses = allExpenses.filter((expense) => {
    const matchesCategory = expense.category.toLowerCase() === category?.name.toLowerCase();
    const matchesStatus = statusFilter === "all" || expense.status === statusFilter;
    
    // For non-admin/manager users, only show their own expenses
    if (user?.role !== "admin" && user?.role !== "manager") {
      return matchesCategory && matchesStatus && expense.userId === user?.id;
    }
    
    return matchesCategory && matchesStatus;
  });

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.Receipt;
    return Icon;
  };

  if (!category) {
    return (
      <div className="p-6 bg-white dark:bg-gray-900">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Category Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            The expense category "{categorySlug}" could not be found.
          </p>
        </div>
      </div>
    );
  }

  const IconComponent = getIconComponent(category.icon);

  const totalAmount = categoryExpenses.reduce(
    (sum, exp) => sum + parseFloat(exp.amount),
    0
  );
  const approvedAmount = categoryExpenses
    .filter((exp) => exp.status === "approved")
    .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const pendingCount = categoryExpenses.filter(
    (exp) => exp.status === "pending"
  ).length;

  return (
    <div className="p-6 space-y-6 bg-white dark:bg-gray-900">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: `${category.color}20` }}
          >
            <IconComponent
              className="h-8 w-8"
              style={{ color: category.color }}
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {category.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {category.description || "Track and manage expenses"}
            </p>
          </div>
        </div>
        <Button data-testid="button-add-expense">
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total {category.name}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${totalAmount.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {categoryExpenses.length} total expenses
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Approved
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${approvedAmount.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {categoryExpenses.filter((e) => e.status === "approved").length}{" "}
              expenses
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {pendingCount}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className={statusFilter === "all" ? "" : "dark:border-gray-600 dark:text-white"}
            data-testid="filter-all"
          >
            All
          </Button>
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("pending")}
            className={statusFilter === "pending" ? "" : "dark:border-gray-600 dark:text-white"}
            data-testid="filter-pending"
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === "approved" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("approved")}
            className={statusFilter === "approved" ? "" : "dark:border-gray-600 dark:text-white"}
            data-testid="filter-approved"
          >
            Approved
          </Button>
          <Button
            variant={statusFilter === "rejected" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("rejected")}
            className={statusFilter === "rejected" ? "" : "dark:border-gray-600 dark:text-white"}
            data-testid="filter-rejected"
          >
            Rejected
          </Button>
        </div>
      </div>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Expense List</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryExpenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No {category.name.toLowerCase()} found
            </div>
          ) : (
            <div className="space-y-4">
              {categoryExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  data-testid={`expense-item-${expense.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {expense.description}
                        </p>
                        <div className="flex gap-3 text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {expense.vendor && <span>Vendor: {expense.vendor}</span>}
                          <span>
                            {new Date(expense.expenseDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        ${parseFloat(expense.amount).toFixed(2)}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          expense.status === "approved"
                            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                            : expense.status === "pending"
                            ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                            : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                        }`}
                      >
                        {expense.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
