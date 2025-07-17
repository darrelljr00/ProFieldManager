import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Target, Calculator,
  BarChart3, Download, Calendar, Filter
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

  // Fetch consolidated reports data
  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ["/api/reports/data"],
    select: (data) => data || { metrics: {}, data: { invoices: [], leads: [], expenses: [], customers: [] } }
  });

  // Extract data from consolidated response
  const salesData = reportsData?.data?.invoices || [];
  const leadsData = reportsData?.data?.leads || [];
  const expensesData = reportsData?.data?.expenses || [];
  const customersData = reportsData?.data?.customers || [];
  
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
          <p className="text-gray-600">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
          <TabsTrigger value="close-rate">Close Rate</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
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
      </Tabs>
    </div>
  );
}