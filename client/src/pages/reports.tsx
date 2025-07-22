import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Target, Calculator,
  BarChart3, Download, CalendarIcon, Filter
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface ReportData {
  sales: any[];
  leads: any[];
  expenses: any[];
  invoices: any[];
  customers: any[];
}

export default function Reports() {
  const [timeRange, setTimeRange] = useState("12months");
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [useCustomRange, setUseCustomRange] = useState(false);

  // Build query parameters for date filtering
  const getQueryParams = () => {
    const params = new URLSearchParams();
    if (useCustomRange && startDate && endDate) {
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());
    } else {
      params.append('timeRange', timeRange);
    }
    return params.toString();
  };

  // Fetch consolidated reports data
  const { data: reportsData, isLoading: reportsLoading, refetch } = useQuery({
    queryKey: ["/api/reports/data", getQueryParams()],
    queryFn: async () => {
      const params = getQueryParams();
      const response = await fetch(`/api/reports/data?${params}`);
      if (!response.ok) throw new Error('Failed to fetch reports data');
      return response.json();
    },
    select: (data) => data || { metrics: {}, data: { invoices: [], leads: [], expenses: [], customers: [], employees: [] } }
  });

  // Extract data from consolidated response
  const salesData = reportsData?.data?.invoices || [];
  const leadsData = reportsData?.data?.leads || [];
  const expensesData = reportsData?.data?.expenses || [];
  const customersData = reportsData?.data?.customers || [];
  const employeesData = reportsData?.data?.employees || [];
  
  // Use loading state from consolidated query
  const isLoading = reportsLoading;

  // Process sales data for charts
  const processSalesData = () => {
    if (!salesData) return [];
    
    const monthlyData = salesData.reduce((acc: any, invoice: any) => {
      const date = new Date(invoice.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
          revenue: 0,
          count: 0,
          refunds: 0
        };
      }
      
      const amount = parseFloat(invoice.totalAmount || 0);
      if (invoice.status === 'paid') {
        acc[monthKey].revenue += amount;
        acc[monthKey].count += 1;
      } else if (invoice.status === 'refunded') {
        acc[monthKey].refunds += amount;
      }
      
      return acc;
    }, {});
    
    return Object.values(monthlyData).slice(-12);
  };

  // Process leads data for charts
  const processLeadsData = () => {
    if (!leadsData) return [];
    
    const leadsByMonth = leadsData.reduce((acc: any, lead: any) => {
      const date = new Date(lead.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
          total: 0,
          converted: 0,
          lost: 0,
          qualified: 0
        };
      }
      
      acc[monthKey].total += 1;
      if (lead.status === 'converted') acc[monthKey].converted += 1;
      if (lead.status === 'lost') acc[monthKey].lost += 1;
      if (lead.status === 'qualified') acc[monthKey].qualified += 1;
      
      return acc;
    }, {});
    
    return Object.values(leadsByMonth).slice(-12);
  };

  // Process expenses data for charts
  const processExpensesData = () => {
    if (!expensesData) return [];
    
    const expensesByMonth = expensesData.reduce((acc: any, expense: any) => {
      const date = new Date(expense.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
          amount: 0,
          count: 0
        };
      }
      
      acc[monthKey].amount += parseFloat(expense.amount || 0);
      acc[monthKey].count += 1;
      
      return acc;
    }, {});
    
    return Object.values(expensesByMonth).slice(-12);
  };

  // Calculate close rate
  const calculateCloseRate = () => {
    if (!leadsData) return [];
    
    const rateByMonth = leadsData.reduce((acc: any, lead: any) => {
      const date = new Date(lead.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
          total: 0,
          closed: 0,
          rate: 0
        };
      }
      
      acc[monthKey].total += 1;
      if (lead.status === 'converted') acc[monthKey].closed += 1;
      
      return acc;
    }, {});
    
    Object.values(rateByMonth).forEach((month: any) => {
      month.rate = month.total > 0 ? Math.round((month.closed / month.total) * 100) : 0;
    });
    
    return Object.values(rateByMonth).slice(-12);
  };

  // Lead source distribution
  const getLeadSourceData = () => {
    if (!leadsData) return [];
    
    const sourceCount = leadsData.reduce((acc: any, lead: any) => {
      const source = lead.source || 'Unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(sourceCount).map(([name, value]) => ({ name, value }));
  };

  // Key metrics from backend
  const getKeyMetrics = () => {
    return reportsData?.metrics || {
      totalRevenue: 0,
      totalLeads: 0,
      closeRate: 0,
      totalExpenses: 0,
      totalRefunds: 0,
      totalCustomers: 0
    };
  };

  const salesChartData = processSalesData();
  const leadsChartData = processLeadsData();
  const expensesChartData = processExpensesData();
  const closeRateData = calculateCloseRate();
  const leadSourceData = getLeadSourceData();
  const metrics = getKeyMetrics();

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">
            Comprehensive business insights and performance metrics
            {reportsData?.dateRange && (
              <span className="ml-2 text-sm text-blue-600">
                ({format(new Date(reportsData.dateRange.startDate), "MMM d, yyyy")} - {format(new Date(reportsData.dateRange.endDate), "MMM d, yyyy")})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="custom-range"
              checked={useCustomRange}
              onChange={(e) => setUseCustomRange(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="custom-range" className="text-sm">Custom Range</Label>
          </div>
          
          {!useCustomRange ? (
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-36 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d, yyyy") : "Start Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <span className="text-sm text-gray-500">to</span>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-36 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM d, yyyy") : "End Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              {useCustomRange && startDate && endDate && (
                <Button 
                  onClick={() => {
                    // Force refetch with new date range
                    const queryKey = ["/api/reports/data", getQueryParams()];
                    reportsLoading || refetch();
                  }}
                  variant="default"
                  size="sm"
                >
                  Apply
                </Button>
              )}
            </div>
          )}
          
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ${metrics.totalRevenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.totalLeads}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Close Rate</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.closeRate}%</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  ${metrics.totalExpenses.toLocaleString()}
                </p>
              </div>
              <Calculator className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Refunds</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${metrics.totalRefunds.toLocaleString()}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Tabs */}
      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
          <TabsTrigger value="close-rate">Close Rate</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
        </TabsList>

        {/* Sales Charts */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue</CardTitle>
                <CardDescription>Revenue trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={salesChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#0088FE" 
                      fill="#0088FE" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invoice Count vs Revenue</CardTitle>
                <CardDescription>Number of invoices and total revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" fill="#00C49F" name="Invoice Count" />
                    <Bar yAxisId="right" dataKey="revenue" fill="#0088FE" name="Revenue ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Leads Charts */}
        <TabsContent value="leads" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead Generation Trends</CardTitle>
                <CardDescription>Lead volume and conversion over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={leadsChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#0088FE" name="Total Leads" />
                    <Line type="monotone" dataKey="converted" stroke="#00C49F" name="Converted" />
                    <Line type="monotone" dataKey="qualified" stroke="#FFBB28" name="Qualified" />
                    <Line type="monotone" dataKey="lost" stroke="#FF8042" name="Lost" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lead Sources</CardTitle>
                <CardDescription>Distribution of lead sources</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={leadSourceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {leadSourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Refunds Charts */}
        <TabsContent value="refunds" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Refunds Analysis</CardTitle>
              <CardDescription>Monthly refund amounts and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, 'Refunds']} />
                  <Legend />
                  <Bar dataKey="refunds" fill="#FF8042" name="Refunds ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Close Rate Charts */}
        <TabsContent value="close-rate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lead Close Rate</CardTitle>
              <CardDescription>Conversion rate trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={closeRateData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Close Rate']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="#8884d8" 
                    strokeWidth={3}
                    name="Close Rate (%)" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Expenses Charts */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Expenses</CardTitle>
                <CardDescription>Expense trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={expensesChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, 'Expenses']} />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#FF8042" 
                      fill="#FF8042" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Count vs Amount</CardTitle>
                <CardDescription>Number of expenses and total amount</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={expensesChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" fill="#FFBB28" name="Expense Count" />
                    <Bar yAxisId="right" dataKey="amount" fill="#FF8042" name="Amount ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Employee Performance Tab */}
        <TabsContent value="employees" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Employee Performance Metrics</CardTitle>
                <CardDescription>Task completion, job assignments, and performance tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium">Employee</th>
                        <th className="text-center p-3 font-medium">Jobs Assigned</th>
                        <th className="text-center p-3 font-medium">Active Projects</th>
                        <th className="text-center p-3 font-medium">Completed Projects</th>
                        <th className="text-center p-3 font-medium">Tasks</th>
                        <th className="text-center p-3 font-medium">Completion Rate</th>
                        <th className="text-center p-3 font-medium">Overdue Tasks</th>
                        <th className="text-center p-3 font-medium">Days Late</th>
                        <th className="text-center p-3 font-medium">Days Called Off</th>
                        <th className="text-center p-3 font-medium">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={10} className="text-center p-8 text-gray-500">
                            Loading employee data...
                          </td>
                        </tr>
                      ) : employeesData.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center p-8 text-gray-500">
                            No employee data available
                          </td>
                        </tr>
                      ) : (
                        employeesData.map((employee: any) => (
                          <tr key={employee.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <div>
                                <div className="font-medium">{employee.name}</div>
                                <div className="text-sm text-gray-500">{employee.email}</div>
                              </div>
                            </td>
                            <td className="text-center p-3">
                              <Badge variant="outline">{employee.jobsAssigned}</Badge>
                            </td>
                            <td className="text-center p-3">
                              <Badge variant="default" className="bg-blue-100 text-blue-700">
                                {employee.activeProjects}
                              </Badge>
                            </td>
                            <td className="text-center p-3">
                              <Badge variant="default" className="bg-green-100 text-green-700">
                                {employee.completedProjects}
                              </Badge>
                            </td>
                            <td className="text-center p-3">
                              <div className="text-sm">
                                <div>{employee.tasksCompleted}/{employee.tasksTotal}</div>
                              </div>
                            </td>
                            <td className="text-center p-3">
                              <div className="flex items-center justify-center">
                                <div className={`text-sm font-medium px-2 py-1 rounded ${
                                  employee.taskCompletionRate >= 80 
                                    ? 'bg-green-100 text-green-700' 
                                    : employee.taskCompletionRate >= 60 
                                    ? 'bg-yellow-100 text-yellow-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {employee.taskCompletionRate}%
                                </div>
                              </div>
                            </td>
                            <td className="text-center p-3">
                              {employee.overdueTasks > 0 ? (
                                <Badge variant="destructive">{employee.overdueTasks}</Badge>
                              ) : (
                                <Badge variant="outline">0</Badge>
                              )}
                            </td>
                            <td className="text-center p-3">
                              {employee.daysLate > 0 ? (
                                <Badge variant="destructive">{employee.daysLate}</Badge>
                              ) : (
                                <Badge variant="outline">0</Badge>
                              )}
                            </td>
                            <td className="text-center p-3">
                              <Badge variant="outline">{employee.daysCalledOff}</Badge>
                            </td>
                            <td className="text-center p-3">
                              <Badge variant="secondary">{employee.role}</Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Employee Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Completion Rates</CardTitle>
                  <CardDescription>Employee task completion performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={employeesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="taskCompletionRate" fill="#0088FE" name="Completion Rate %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Project Assignments</CardTitle>
                  <CardDescription>Active vs completed projects per employee</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={employeesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="activeProjects" fill="#00C49F" name="Active Projects" />
                      <Bar dataKey="completedProjects" fill="#0088FE" name="Completed Projects" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Issues</CardTitle>
                  <CardDescription>Overdue tasks and days late tracking</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={employeesData.filter((emp: any) => emp.overdueTasks > 0 || emp.daysLate > 0)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="overdueTasks" fill="#FF8042" name="Overdue Tasks" />
                      <Bar dataKey="daysLate" fill="#FF0000" name="Days Late" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Time Off Summary</CardTitle>
                  <CardDescription>Days called off during reporting period</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={employeesData.filter((emp: any) => emp.daysCalledOff > 0)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="daysCalledOff" fill="#FFBB28" name="Days Called Off" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}