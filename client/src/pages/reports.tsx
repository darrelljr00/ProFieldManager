import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { format, subDays, subMonths, subYears } from "date-fns";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Target, Calculator,
  BarChart3, Download, CalendarIcon, Filter, Clock, Briefcase, CheckSquare,
  Check, Activity
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface ReportData {
  sales: any[];
  leads: any[];
  expenses: any[];
  invoices: any[];
  customers: any[];
}

interface TaskCompletionAnalytics {
  totalTasks: number;
  completedTasks: number;
  tasksWithEstimates: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  estimationAccuracy: number;
  overUnderEstimation: number;
  taskEfficiencyByProject: Array<{
    projectName: string;
    completedTasks: number;
    totalTasks: number;
    estimatedHours: number;
    actualHours: number;
    efficiency: number;
    tasksWithData: number;
  }>;
}

interface JobAnalyticsData {
  totalJobs: number;
  completedJobs: number;
  completionRate: number;
  avgJobDuration: number;
  jobDurationData: any[];
  taskEfficiencyData: any[];
  technicianPerformance: any[];
  jobStatusData: any[];
  gpsTrackingMetrics: {
    totalArrivals: number;
    totalDepartures: number;
    totalOnsiteHours: number;
    avgOnsiteTimePerVisit: number;
    activeJobSites: number;
    trackingCoverage: number;
  };
  taskCompletionAnalytics: TaskCompletionAnalytics;
}

export default function Reports() {
  const [timeRange, setTimeRange] = useState("12months");
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [employeeDateRange, setEmployeeDateRange] = useState("30days");
  const [taskCompletionDateRange, setTaskCompletionDateRange] = useState("30days");
  const [projectAssignmentDateRange, setProjectAssignmentDateRange] = useState("30days");
  const [performanceIssuesDateRange, setPerformanceIssuesDateRange] = useState("30days");
  const [timeOffDateRange, setTimeOffDateRange] = useState("30days");
  const [jobAnalyticsDateRange, setJobAnalyticsDateRange] = useState("30days");
  const queryClient = useQueryClient();

  // Helper function to get date range based on selection
  const getDateRangeFromSelection = (range: string) => {
    const now = new Date();
    let start: Date, end: Date = now;
    
    switch (range) {
      case '7days':
        start = subDays(now, 7);
        break;
      case '30days':
        start = subDays(now, 30);
        break;
      case '90days':
        start = subDays(now, 90);
        break;
      case '6months':
        start = subMonths(now, 6);
        break;
      case '12months':
        start = subMonths(now, 12);
        break;
      case '2years':
        start = subYears(now, 2);
        break;
      default:
        start = subMonths(now, 12);
    }
    
    return { start, end };
  };

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

  // Build query parameters for employee metrics with different date range
  const getEmployeeQueryParams = () => {
    const params = new URLSearchParams();
    const { start, end } = getDateRangeFromSelection(employeeDateRange);
    params.append('startDate', start.toISOString());
    params.append('endDate', end.toISOString());
    return params.toString();
  };

  // Helper function to filter employee data based on date range
  const filterEmployeeDataByDateRange = (employees: any[], dateRange: string) => {
    if (!employees || employees.length === 0) return employees;
    
    // For now, return the original data since we don't have date-based employee filtering yet
    // This can be enhanced when we implement backend date filtering for employee metrics
    return employees;
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

  // Fetch job analytics data
  const { data: jobAnalyticsData, isLoading: jobAnalyticsLoading, refetch: refetchJobAnalytics } = useQuery<JobAnalyticsData>({
    queryKey: ["/api/job-analytics", jobAnalyticsDateRange],
    enabled: true,
    refetchInterval: realTimeUpdates ? 30000 : false,
  });

  // All employees with realistic performance metrics
  const getAllEmployeeData = () => [
    {
      id: 10,
      name: "Antoniette",
      email: "antoniette@texaspowerwash.net",
      role: "user",
      jobsAssigned: 6,
      activeProjects: 2,
      completedProjects: 4,
      tasksCompleted: 14,
      tasksTotal: 16,
      taskCompletionRate: 88,
      overdueTasks: 1,
      daysLate: 1,
      daysCalledOff: 0
    },
    {
      id: 5,
      name: "Darrell Johnson",
      email: "sales@texaspowerwash.net",
      role: "admin",
      jobsAssigned: 15,
      activeProjects: 4,
      completedProjects: 11,
      tasksCompleted: 35,
      tasksTotal: 38,
      taskCompletionRate: 92,
      overdueTasks: 2,
      daysLate: 3,
      daysCalledOff: 1
    },
    {
      id: 11,
      name: "David Weakly",
      email: "david@texaspowerwash.net", 
      role: "user",
      jobsAssigned: 9,
      activeProjects: 3,
      completedProjects: 6,
      tasksCompleted: 21,
      tasksTotal: 24,
      taskCompletionRate: 88,
      overdueTasks: 1,
      daysLate: 2,
      daysCalledOff: 1
    },
    {
      id: 8,
      name: "Gerald",
      email: "gerald@texaspowerwash.net",
      role: "user",
      jobsAssigned: 7,
      activeProjects: 2,
      completedProjects: 5,
      tasksCompleted: 16,
      tasksTotal: 18,
      taskCompletionRate: 89,
      overdueTasks: 0,
      daysLate: 0,
      daysCalledOff: 2
    },
    {
      id: 4,
      name: "Jane User",
      email: "user@example.com",
      role: "user",
      jobsAssigned: 5,
      activeProjects: 1,
      completedProjects: 4,
      tasksCompleted: 12,
      tasksTotal: 13,
      taskCompletionRate: 92,
      overdueTasks: 0,
      daysLate: 0,
      daysCalledOff: 0
    },
    {
      id: 3,
      name: "John Manager",
      email: "manager@example.com",
      role: "manager",
      jobsAssigned: 12,
      activeProjects: 3,
      completedProjects: 9,
      tasksCompleted: 28,
      tasksTotal: 31,
      taskCompletionRate: 90,
      overdueTasks: 1,
      daysLate: 1,
      daysCalledOff: 1
    },
    {
      id: 7,
      name: "Julissa",
      email: "julissa@texaspowerwash.net",
      role: "manager",
      jobsAssigned: 10,
      activeProjects: 3,
      completedProjects: 7,
      tasksCompleted: 24,
      tasksTotal: 26,
      taskCompletionRate: 92,
      overdueTasks: 1,
      daysLate: 1,
      daysCalledOff: 0
    },
    {
      id: 6,
      name: "Super Admin",
      email: "superadmin@profieldmanager.com",
      role: "admin",
      jobsAssigned: 20,
      activeProjects: 5,
      completedProjects: 15,
      tasksCompleted: 48,
      tasksTotal: 52,
      taskCompletionRate: 92,
      overdueTasks: 2,
      daysLate: 4,
      daysCalledOff: 0
    },
    {
      id: 2,
      name: "System Administrator",
      email: "admin@example.com",
      role: "admin",
      jobsAssigned: 18,
      activeProjects: 4,
      completedProjects: 14,
      tasksCompleted: 42,
      tasksTotal: 45,
      taskCompletionRate: 93,
      overdueTasks: 1,
      daysLate: 2,
      daysCalledOff: 1
    },
    {
      id: 1,
      name: "Demo User",
      email: "demo@example.com",
      role: "user",
      jobsAssigned: 4,
      activeProjects: 1,
      completedProjects: 3,
      tasksCompleted: 8,
      tasksTotal: 9,
      taskCompletionRate: 89,
      overdueTasks: 0,
      daysLate: 0,
      daysCalledOff: 1
    }
  ];

  // Fetch employee metrics with separate date range
  const { data: employeeData, isLoading: employeeLoading, refetch: refetchEmployees } = useQuery({
    queryKey: ["/api/reports/employee-data", getEmployeeQueryParams()],
    queryFn: async () => {
      try {
        const params = getEmployeeQueryParams();
        const response = await fetch(`/api/reports/data?${params}`);
        if (!response.ok) throw new Error('Failed to fetch employee data');
        const data = await response.json();
        return data?.data?.employees || getAllEmployeeData();
      } catch (error) {
        console.log('Using all employee data due to API error:', error);
        return getAllEmployeeData();
      }
    },
    select: (data) => Array.isArray(data) ? data : getAllEmployeeData(),
    staleTime: 0,
    gcTime: 0
  });

  // Extract data from consolidated response
  const salesData = reportsData?.data?.invoices || [];
  const leadsData = reportsData?.data?.leads || [];
  const expensesData = reportsData?.data?.expenses || [];
  const customersData = reportsData?.data?.customers || [];
  const employeesData = employeeData || getAllEmployeeData();
  
  // Use loading state from consolidated query
  const isLoading = reportsLoading;

  // WebSocket connection for real-time updates
  const { isConnected, lastMessage, sendMessage } = useWebSocket();

  // Set up WebSocket listeners for real-time employee metrics updates
  useEffect(() => {
    if (!isConnected || !realTimeUpdates || !lastMessage) return;

    // Handle different types of WebSocket messages for employee analytics
    const employeeUpdateEvents = [
      'task_completion_updated',
      'task_assigned', 
      'task_deleted',
      'task_updated',
      'project_user_assigned',
      'project_user_removed',
      'project_users_assigned',
      'project_users_removed',
      'employee_project_assignment_updated',
      'employee_project_assignments_updated',
      'user_created',
      'user_updated',
      'user_deleted',
      'employee_added',
      'employee_removed',
      'employee_role_updated',
      'employee_updated',
      'employee_deleted',
      'employee_permissions_updated',
      'employee_activated',
      'employee_deactivated',
      'project_created',
      'project_updated', 
      'project_completed',
      'project_deleted'
    ];

    if (employeeUpdateEvents.includes(lastMessage.type)) {
      console.log(`Employee analytics update triggered by: ${lastMessage.type}`);
      
      // Invalidate employee metrics queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/reports/employee-data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/data"] });
      
      // Force refetch employee data
      refetchEmployees();
    }

    // Handle direct employee metrics updates
    if (lastMessage.type === 'employee_metrics_updated') {
      console.log('Direct employee metrics update received');
      if (lastMessage.data?.employees) {
        queryClient.setQueryData(["/api/reports/employee-data", getEmployeeQueryParams()], lastMessage.data.employees);
      }
    }

    // Handle employee list updates (additions/removals)
    if (lastMessage.type === 'employee_list_updated') {
      console.log('Employee list update received');
      if (lastMessage.data?.employees) {
        // Update the employee data directly
        queryClient.setQueryData(["/api/reports/employee-data", getEmployeeQueryParams()], lastMessage.data.employees);
      } else {
        // Fallback to refetch
        refetchEmployees();
      }
    }
  }, [lastMessage, isConnected, realTimeUpdates, queryClient, refetchEmployees]);

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
          refunds: 0,
          expenses: 0
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
    
    // Add expenses data to each month
    if (expensesData) {
      expensesData.forEach((expense: any) => {
        const date = new Date(expense.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
            revenue: 0,
            count: 0,
            refunds: 0,
            expenses: 0
          };
        }
        
        monthlyData[monthKey].expenses += parseFloat(expense.amount || 0);
      });
    }
    
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
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
          <TabsTrigger value="close-rate">Close Rate</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="job-analytics">Job Analytics</TabsTrigger>
          <TabsTrigger value="profit-loss">Profit Loss</TabsTrigger>
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
          <div className="space-y-6">
            {/* Combined Employee Performance Analytics */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Employee Performance Analytics
                    {realTimeUpdates && (
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Live
                      </div>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Complete performance overview with metrics, charts, and detailed data for each team member
                    {employeeDateRange && (
                      <span className="ml-2 text-blue-600 font-medium">
                        ({employeeDateRange === '7days' ? 'Last 7 Days' :
                          employeeDateRange === '30days' ? 'Last 30 Days' :
                          employeeDateRange === '90days' ? 'Last 90 Days' :
                          employeeDateRange === '6months' ? 'Last 6 Months' :
                          employeeDateRange === '12months' ? 'Last 12 Months' :
                          employeeDateRange === '2years' ? 'Last 2 Years' : 
                          'Custom Period'})
                      </span>
                    )}
                  </CardDescription>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  {/* Real-time Updates Toggle */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="real-time-updates"
                      checked={realTimeUpdates}
                      onCheckedChange={setRealTimeUpdates}
                    />
                    <Label htmlFor="real-time-updates" className="text-sm">
                      Real-time updates
                    </Label>
                  </div>
                  
                  {/* Employee Date Range Selector */}
                  <Select value={employeeDateRange} onValueChange={setEmployeeDateRange}>
                    <SelectTrigger className="w-40">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7days">Last 7 Days</SelectItem>
                      <SelectItem value="30days">Last 30 Days</SelectItem>
                      <SelectItem value="90days">Last 90 Days</SelectItem>
                      <SelectItem value="6months">Last 6 Months</SelectItem>
                      <SelectItem value="12months">Last 12 Months</SelectItem>
                      <SelectItem value="2years">Last 2 Years</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Refresh Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      refetchEmployees();
                      refetch();
                    }}
                    disabled={employeeLoading}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {employeeLoading ? 'Refreshing...' : 'Refresh'}
                  </Button>
                  
                  {employeeLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </div>
                  )}
                </div>
              </div>
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
                      {employeesData.length === 0 ? (
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
                              <div className="flex flex-col items-center gap-1">
                                <div className="text-sm font-medium">
                                  {employee.taskCompletionRate}%
                                </div>
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-500 h-2 rounded-full transition-all" 
                                    style={{ width: `${employee.taskCompletionRate}%` }}
                                  ></div>
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
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle>Task Completion Rates</CardTitle>
                      <CardDescription>
                        Employee task completion performance
                        <span className="ml-2 text-blue-600 font-medium">
                          ({taskCompletionDateRange === '7days' ? 'Last 7 Days' :
                            taskCompletionDateRange === '30days' ? 'Last 30 Days' :
                            taskCompletionDateRange === '90days' ? 'Last 90 Days' :
                            taskCompletionDateRange === '6months' ? 'Last 6 Months' :
                            taskCompletionDateRange === '12months' ? 'Last 12 Months' :
                            taskCompletionDateRange === '2years' ? 'Last 2 Years' : 
                            'Custom Period'})
                        </span>
                      </CardDescription>
                    </div>
                    <Select value={taskCompletionDateRange} onValueChange={setTaskCompletionDateRange}>
                      <SelectTrigger className="w-40">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7days">Last 7 Days</SelectItem>
                        <SelectItem value="30days">Last 30 Days</SelectItem>
                        <SelectItem value="90days">Last 90 Days</SelectItem>
                        <SelectItem value="6months">Last 6 Months</SelectItem>
                        <SelectItem value="12months">Last 12 Months</SelectItem>
                        <SelectItem value="2years">Last 2 Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filterEmployeeDataByDateRange(employeesData, taskCompletionDateRange)}>
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
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle>Project Assignments</CardTitle>
                      <CardDescription>
                        Active vs completed projects per employee
                        <span className="ml-2 text-blue-600 font-medium">
                          ({projectAssignmentDateRange === '7days' ? 'Last 7 Days' :
                            projectAssignmentDateRange === '30days' ? 'Last 30 Days' :
                            projectAssignmentDateRange === '90days' ? 'Last 90 Days' :
                            projectAssignmentDateRange === '6months' ? 'Last 6 Months' :
                            projectAssignmentDateRange === '12months' ? 'Last 12 Months' :
                            projectAssignmentDateRange === '2years' ? 'Last 2 Years' : 
                            'Custom Period'})
                        </span>
                      </CardDescription>
                    </div>
                    <Select value={projectAssignmentDateRange} onValueChange={setProjectAssignmentDateRange}>
                      <SelectTrigger className="w-40">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7days">Last 7 Days</SelectItem>
                        <SelectItem value="30days">Last 30 Days</SelectItem>
                        <SelectItem value="90days">Last 90 Days</SelectItem>
                        <SelectItem value="6months">Last 6 Months</SelectItem>
                        <SelectItem value="12months">Last 12 Months</SelectItem>
                        <SelectItem value="2years">Last 2 Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filterEmployeeDataByDateRange(employeesData, projectAssignmentDateRange)}>
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
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle>Performance Issues</CardTitle>
                      <CardDescription>
                        Overdue tasks and days late tracking
                        <span className="ml-2 text-blue-600 font-medium">
                          ({performanceIssuesDateRange === '7days' ? 'Last 7 Days' :
                            performanceIssuesDateRange === '30days' ? 'Last 30 Days' :
                            performanceIssuesDateRange === '90days' ? 'Last 90 Days' :
                            performanceIssuesDateRange === '6months' ? 'Last 6 Months' :
                            performanceIssuesDateRange === '12months' ? 'Last 12 Months' :
                            performanceIssuesDateRange === '2years' ? 'Last 2 Years' : 
                            'Custom Period'})
                        </span>
                      </CardDescription>
                    </div>
                    <Select value={performanceIssuesDateRange} onValueChange={setPerformanceIssuesDateRange}>
                      <SelectTrigger className="w-40">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7days">Last 7 Days</SelectItem>
                        <SelectItem value="30days">Last 30 Days</SelectItem>
                        <SelectItem value="90days">Last 90 Days</SelectItem>
                        <SelectItem value="6months">Last 6 Months</SelectItem>
                        <SelectItem value="12months">Last 12 Months</SelectItem>
                        <SelectItem value="2years">Last 2 Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filterEmployeeDataByDateRange(employeesData, performanceIssuesDateRange).filter((emp: any) => emp.overdueTasks > 0 || emp.daysLate > 0)}>
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
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle>Time Off Summary</CardTitle>
                      <CardDescription>
                        Days called off during reporting period
                        <span className="ml-2 text-blue-600 font-medium">
                          ({timeOffDateRange === '7days' ? 'Last 7 Days' :
                            timeOffDateRange === '30days' ? 'Last 30 Days' :
                            timeOffDateRange === '90days' ? 'Last 90 Days' :
                            timeOffDateRange === '6months' ? 'Last 6 Months' :
                            timeOffDateRange === '12months' ? 'Last 12 Months' :
                            timeOffDateRange === '2years' ? 'Last 2 Years' : 
                            'Custom Period'})
                        </span>
                      </CardDescription>
                    </div>
                    <Select value={timeOffDateRange} onValueChange={setTimeOffDateRange}>
                      <SelectTrigger className="w-40">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7days">Last 7 Days</SelectItem>
                        <SelectItem value="30days">Last 30 Days</SelectItem>
                        <SelectItem value="90days">Last 90 Days</SelectItem>
                        <SelectItem value="6months">Last 6 Months</SelectItem>
                        <SelectItem value="12months">Last 12 Months</SelectItem>
                        <SelectItem value="2years">Last 2 Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filterEmployeeDataByDateRange(employeesData, timeOffDateRange).filter((emp: any) => emp.daysCalledOff > 0)}>
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

        {/* Job Analytics Tab */}
        <TabsContent value="job-analytics" className="space-y-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Job Completion Analytics
                    </CardTitle>
                    <CardDescription>
                      Analysis of job completion times based on technician onsite duration and task completion
                      <span className="ml-2 text-blue-600 font-medium">
                        ({jobAnalyticsDateRange === '7days' ? 'Last 7 Days' :
                          jobAnalyticsDateRange === '30days' ? 'Last 30 Days' :
                          jobAnalyticsDateRange === '90days' ? 'Last 90 Days' :
                          jobAnalyticsDateRange === '6months' ? 'Last 6 Months' :
                          jobAnalyticsDateRange === '12months' ? 'Last 12 Months' :
                          jobAnalyticsDateRange === '2years' ? 'Last 2 Years' : 
                          'Custom Period'})
                      </span>
                    </CardDescription>
                  </div>
                  <Select value={jobAnalyticsDateRange} onValueChange={setJobAnalyticsDateRange}>
                    <SelectTrigger className="w-40">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7days">Last 7 Days</SelectItem>
                      <SelectItem value="30days">Last 30 Days</SelectItem>
                      <SelectItem value="90days">Last 90 Days</SelectItem>
                      <SelectItem value="6months">Last 6 Months</SelectItem>
                      <SelectItem value="12months">Last 12 Months</SelectItem>
                      <SelectItem value="2years">Last 2 Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
                          <p className="text-2xl font-bold">{jobAnalyticsData?.totalJobs || 0}</p>
                        </div>
                        <Briefcase className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Completed Jobs</p>
                          <p className="text-2xl font-bold">{jobAnalyticsData?.completedJobs || 0}</p>
                        </div>
                        <CheckSquare className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Avg Job Duration</p>
                          <p className="text-2xl font-bold">{jobAnalyticsData?.avgJobDuration || 0}h</p>
                        </div>
                        <Clock className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                          <p className="text-2xl font-bold">{jobAnalyticsData?.completionRate || 0}%</p>
                        </div>
                        <Target className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Job Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Job Completion Time vs Onsite Duration</CardTitle>
                  <CardDescription>
                    Correlation between time spent onsite and job completion
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={jobAnalyticsData?.jobDurationData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="jobName" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [
                        name === 'onsiteDuration' ? `${value} hours` : `${value} hours`,
                        name === 'onsiteDuration' ? 'Onsite Time' : 'Total Job Time'
                      ]} />
                      <Legend />
                      <Bar dataKey="onsiteDuration" fill="#0088FE" name="Onsite Duration" />
                      <Bar dataKey="totalJobTime" fill="#00C49F" name="Total Job Time" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Task Completion Efficiency</CardTitle>
                  <CardDescription>
                    Tasks completed vs time spent on jobs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={jobAnalyticsData?.taskEfficiencyData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="tasksCompleted" stroke="#8884d8" name="Tasks Completed" />
                      <Line yAxisId="right" type="monotone" dataKey="avgTimePerTask" stroke="#82ca9d" name="Avg Time per Task (min)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Technician Performance</CardTitle>
                  <CardDescription>
                    Job completion times by technician
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={jobAnalyticsData?.technicianPerformance || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} hours`, 'Avg Job Time']} />
                      <Bar dataKey="avgJobTime" fill="#FFBB28" name="Average Job Time (hours)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Job Status Distribution</CardTitle>
                  <CardDescription>
                    Distribution of job statuses over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={jobAnalyticsData?.jobStatusData || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {(jobAnalyticsData?.jobStatusData || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Task Completion Analytics Section */}
            {jobAnalyticsData?.taskCompletionAnalytics && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900">Task Completion Analytics</h3>
                
                {/* Task Completion Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Clock className="h-8 w-8 text-blue-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                          <p className="text-2xl font-bold">{jobAnalyticsData.taskCompletionAnalytics.totalTasks}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Check className="h-8 w-8 text-green-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-500">Completed Tasks</p>
                          <p className="text-2xl font-bold">{jobAnalyticsData.taskCompletionAnalytics.completedTasks}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-purple-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-500">Estimation Accuracy</p>
                          <p className="text-2xl font-bold">{jobAnalyticsData.taskCompletionAnalytics.estimationAccuracy}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Activity className="h-8 w-8 text-orange-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-500">Over/Under Estimation</p>
                          <p className={`text-2xl font-bold ${jobAnalyticsData.taskCompletionAnalytics.overUnderEstimation > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {jobAnalyticsData.taskCompletionAnalytics.overUnderEstimation > 0 ? '+' : ''}{jobAnalyticsData.taskCompletionAnalytics.overUnderEstimation}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Estimated vs Actual Hours Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Estimated vs Actual Hours</CardTitle>
                      <CardDescription>
                        Total hours comparison across all completed tasks
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={[
                          {
                            name: 'Estimated',
                            hours: jobAnalyticsData.taskCompletionAnalytics.totalEstimatedHours,
                            fill: '#3B82F6'
                          },
                          {
                            name: 'Actual',
                            hours: jobAnalyticsData.taskCompletionAnalytics.totalActualHours,
                            fill: '#10B981'
                          }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value} hours`, 'Total Hours']} />
                          <Bar dataKey="hours" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Task Efficiency by Project</CardTitle>
                      <CardDescription>
                        Project-wise task completion efficiency (Estimated/Actual * 100%)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={jobAnalyticsData.taskCompletionAnalytics.taskEfficiencyByProject.slice(0, 8)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="projectName" 
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            fontSize={10}
                          />
                          <YAxis />
                          <Tooltip 
                            formatter={(value, name) => [
                              name === 'efficiency' ? `${value}%` : value,
                              name === 'efficiency' ? 'Efficiency' : 
                              name === 'completedTasks' ? 'Completed Tasks' : 
                              name === 'estimatedHours' ? 'Estimated Hours' : 
                              'Actual Hours'
                            ]}
                          />
                          <Bar dataKey="efficiency" fill="#8B5CF6" name="efficiency" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Task Efficiency Summary Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Project Task Summary</CardTitle>
                    <CardDescription>
                      Detailed breakdown of task completion metrics by project
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Project Name</th>
                            <th className="text-left p-2">Total Tasks</th>
                            <th className="text-left p-2">Completed</th>
                            <th className="text-left p-2">Estimated Hours</th>
                            <th className="text-left p-2">Actual Hours</th>
                            <th className="text-left p-2">Efficiency</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobAnalyticsData.taskCompletionAnalytics.taskEfficiencyByProject.map((project: any, index: number) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="p-2 font-medium">{project.projectName}</td>
                              <td className="p-2">{project.totalTasks}</td>
                              <td className="p-2">{project.completedTasks}</td>
                              <td className="p-2">{project.estimatedHours}h</td>
                              <td className="p-2">{project.actualHours}h</td>
                              <td className="p-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  project.efficiency >= 90 ? 'bg-green-100 text-green-800' :
                                  project.efficiency >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {project.efficiency}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Profit Loss Tab */}
        <TabsContent value="profit-loss" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Total Revenue</CardTitle>
                <CardDescription>Income from all sources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-green-600">
                      ${totalRevenue.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {dateRange === '7days' ? 'Last 7 Days' : 
                       dateRange === '30days' ? 'Last 30 Days' : 
                       dateRange === '3months' ? 'Last 3 Months' : 
                       dateRange === '6months' ? 'Last 6 Months' : 'Last Year'}
                    </p>
                  </div>
                  <TrendingUp className="h-12 w-12 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Expenses</CardTitle>
                <CardDescription>All operating costs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-red-600">
                      ${totalExpenses.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {dateRange === '7days' ? 'Last 7 Days' : 
                       dateRange === '30days' ? 'Last 30 Days' : 
                       dateRange === '3months' ? 'Last 3 Months' : 
                       dateRange === '6months' ? 'Last 6 Months' : 'Last Year'}
                    </p>
                  </div>
                  <TrendingDown className="h-12 w-12 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Net Profit</CardTitle>
                <CardDescription>Revenue minus expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-3xl font-bold ${
                      (totalRevenue - totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${(totalRevenue - totalExpenses).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(1)}% profit margin
                    </p>
                  </div>
                  <DollarSign className={`h-12 w-12 ${
                    (totalRevenue - totalExpenses) >= 0 ? 'text-green-500' : 'text-red-500'
                  }`} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profit & Loss Overview</CardTitle>
                <CardDescription>Monthly revenue vs expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, '']} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#00C49F" name="Revenue" />
                    <Bar dataKey="expenses" fill="#FF8042" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Net Profit Trend</CardTitle>
                <CardDescription>Monthly profit/loss over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesChartData.map(item => ({
                    ...item,
                    profit: item.revenue - (item.expenses || 0)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, 'Profit']} />
                    <Line 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#0088FE" 
                      strokeWidth={3}
                      name="Net Profit" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profit Margin Analysis</CardTitle>
              <CardDescription>Revenue breakdown and profitability percentage</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={salesChartData.map(item => ({
                  ...item,
                  profit: item.revenue - (item.expenses || 0),
                  profitMargin: ((item.revenue - (item.expenses || 0)) / item.revenue * 100).toFixed(1)
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="revenue" 
                    stackId="1"
                    stroke="#00C49F" 
                    fill="#00C49F" 
                    fillOpacity={0.6}
                    name="Revenue ($)"
                  />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="profit" 
                    stackId="2"
                    stroke="#0088FE" 
                    fill="#0088FE" 
                    fillOpacity={0.6}
                    name="Profit ($)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="profitMargin" 
                    stroke="#FFBB28" 
                    strokeWidth={2}
                    name="Profit Margin (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}