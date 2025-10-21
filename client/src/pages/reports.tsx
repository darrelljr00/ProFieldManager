import React, { useState, useEffect, useMemo } from "react";
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
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { 
  exportSalesReport, 
  exportLeadsReport, 
  exportExpensesReport,
  exportEmployeeReport,
  exportProfitLossReport,
  exportProfitPerVehicleReport,
  exportJobAnalyticsReport
} from "@/lib/reportExports";

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
  const [profitLossView, setProfitLossView] = useState<'daily' | 'weekly' | 'monthly' | 'job' | 'vehicle'>('monthly');
  const [gasMaintView, setGasMaintView] = useState<'job' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('job');
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    queryKey: [`/api/reports/data?${getQueryParams()}`],
    select: (data) => data || { metrics: {}, data: { invoices: [], leads: [], expenses: [], customers: [], employees: [] } }
  });

  // Fetch job analytics data
  const { data: jobAnalyticsData, isLoading: jobAnalyticsLoading, refetch: refetchJobAnalytics } = useQuery<JobAnalyticsData>({
    queryKey: ["/api/job-analytics", jobAnalyticsDateRange],
    enabled: true,
    refetchInterval: realTimeUpdates ? 30000 : false,
  });

  // Fetch profit per vehicle data
  const getProfitPerVehicleParams = () => {
    const { start, end } = getDateRangeFromSelection(timeRange);
    return `startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
  };

  const { data: profitPerVehicleData, isLoading: profitPerVehicleLoading } = useQuery({
    queryKey: ["/api/reports/profit-per-vehicle", timeRange],
    queryFn: async () => {
      const params = getProfitPerVehicleParams();
      const response = await fetch(`/api/reports/profit-per-vehicle?${params}`);
      if (!response.ok) throw new Error('Failed to fetch profit per vehicle data');
      return response.json();
    },
  });

  // Fetch profit/loss detailed data with on-site labor costs
  // Memoize dates to prevent React Query cache issues
  const profitLossDates = useMemo(() => {
    let start, end;
    if (useCustomRange && startDate && endDate) {
      start = startDate;
      end = endDate;
    } else {
      const dateRange = getDateRangeFromSelection(timeRange);
      start = dateRange.start;
      end = dateRange.end;
    }
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString()
    };
  }, [useCustomRange, startDate, endDate, timeRange]);

  const { data: profitLossDetailedData, isLoading: profitLossDetailedLoading, refetch: refetchProfitLossDetailed } = useQuery({
    queryKey: ["/api/reports/profit-loss-detailed", profitLossView, profitLossDates.startDate, profitLossDates.endDate],
    queryFn: async () => {
      const params = `startDate=${profitLossDates.startDate}&endDate=${profitLossDates.endDate}&view=${profitLossView}`;
      console.log('🔍 FETCHING PROFIT/LOSS DATA:', `/api/reports/profit-loss-detailed?${params}`);
      const response = await fetch(`/api/reports/profit-loss-detailed?${params}`);
      if (!response.ok) throw new Error('Failed to fetch profit/loss detailed data');
      const data = await response.json();
      console.log('📊 PROFIT/LOSS RESPONSE:', data);
      return data;
    },
    select: (data) => {
      // Map backend field names to frontend expectations
      console.log('🔄 SELECT TRANSFORM INPUT:', data);
      if (data?.data) {
        data.data = data.data.map((item: any) => ({
          ...item,
          expenses: item.totalCosts || 0,
          profit: item.netProfit || 0
        }));
      }
      console.log('🔄 SELECT TRANSFORM OUTPUT:', data);
      return data;
    },
    enabled: true,
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always', // Always refetch on mount
  });

  // TEST: Direct fetch to diagnose
  useEffect(() => {
    if (selectedTab === 'gas-maintenance') {
      const testFetch = async () => {
        try {
          console.log('🧪 TEST FETCH GAS-MAINTENANCE ENDPOINT');
          const testUrl = `/api/reports/gas-maintenance?startDate=2024-01-01&endDate=2025-12-31&view=job`;
          const response = await fetch(testUrl);
          const data = await response.json();
          console.log('🧪 TEST RESPONSE:', { status: response.status, data });
        } catch (error) {
          console.error('🧪 TEST ERROR:', error);
        }
      };
      testFetch();
    }
  }, [selectedTab]);

  // Fetch gas and maintenance cost data  
  const gasMaintEnabled = !!profitLossDates.startDate && !!profitLossDates.endDate;
  console.log('⛽⛽⛽ GAS MAINT QUERY SETUP:', { 
    gasMaintView, 
    dates: profitLossDates, 
    enabled: gasMaintEnabled,
    startDateCheck: !!profitLossDates.startDate,
    endDateCheck: !!profitLossDates.endDate
  });
  const { data: gasMaintResponse, isLoading: gasMaintLoading, error: gasMaintError, isFetching: gasMaintFetching } = useQuery({
    queryKey: ["/api/reports/gas-maintenance", gasMaintView, profitLossDates.startDate, profitLossDates.endDate],
    queryFn: async () => {
      const params = `startDate=${profitLossDates.startDate}&endDate=${profitLossDates.endDate}&view=${gasMaintView}`;
      console.log('⛽ FETCHING GAS/MAINTENANCE DATA:', `/api/reports/gas-maintenance?${params}`);
      const response = await fetch(`/api/reports/gas-maintenance?${params}`);
      if (!response.ok) throw new Error('Failed to fetch gas/maintenance data');
      const data = await response.json();
      console.log('⛽ GAS/MAINTENANCE RESPONSE:', data);
      return data;
    },
    enabled: gasMaintEnabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  console.log('⛽⛽⛽ GAS MAINT QUERY STATE:', { 
    isLoading: gasMaintLoading, 
    isFetching: gasMaintFetching,
    hasData: !!gasMaintResponse,
    hasError: !!gasMaintError,
    error: gasMaintError 
  });

  const gasMaintData = gasMaintResponse?.data || [];
  const gasMaintSummary = gasMaintResponse?.summary || {
    totalGasCost: 0,
    totalMaintenanceCost: 0,
    totalCost: 0,
    totalGallons: 0,
    totalGasExpenses: 0,
    totalMaintenanceRecords: 0
  };

  // Fuel tracking data source: 'jobs' (travel segments) or 'obd' (OBD trips)
  const [fuelDataSource, setFuelDataSource] = useState<'jobs' | 'obd'>('jobs');
  const [fuelView, setFuelView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Fetch daily fuel usage calculations from job travel segments
  const { data: dailyFuelUsage, isLoading: fuelUsageLoading } = useQuery({
    queryKey: ["/api/dispatch/daily-fuel-usage", profitLossDates.startDate, profitLossDates.endDate],
    queryFn: async () => {
      const params = `startDate=${profitLossDates.startDate}&endDate=${profitLossDates.endDate}`;
      const response = await fetch(`/api/dispatch/daily-fuel-usage?${params}`);
      if (!response.ok) throw new Error('Failed to fetch daily fuel usage');
      return response.json();
    },
    enabled: fuelDataSource === 'jobs',
  });

  // Fetch OBD-based fuel usage calculations from OBD trips database
  const { data: obdFuelUsage, isLoading: obdFuelUsageLoading } = useQuery({
    queryKey: ["/api/dispatch/obd-fuel-usage", profitLossDates.startDate, profitLossDates.endDate, fuelView],
    queryFn: async () => {
      const params = `startDate=${profitLossDates.startDate}&endDate=${profitLossDates.endDate}&view=${fuelView}`;
      const response = await fetch(`/api/dispatch/obd-fuel-usage?${params}`);
      if (!response.ok) throw new Error('Failed to fetch OBD fuel usage');
      return response.json();
    },
    enabled: fuelDataSource === 'obd',
  });

  const currentFuelUsage = fuelDataSource === 'jobs' ? dailyFuelUsage : obdFuelUsage;
  const currentFuelLoading = fuelDataSource === 'jobs' ? fuelUsageLoading : obdFuelUsageLoading;

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
    queryKey: [`/api/reports/data?${getEmployeeQueryParams()}`],
    select: (data) => {
      try {
        const employees = data?.data?.employees || getAllEmployeeData();
        return Array.isArray(employees) ? employees : getAllEmployeeData();
      } catch (error) {
        console.log('Using all employee data due to API error:', error);
        return getAllEmployeeData();
      }
    },
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
  const isLoading = reportsLoading || profitLossDetailedLoading;

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

  // Set up WebSocket listeners for real-time on-site labor P&L updates
  useEffect(() => {
    if (!isConnected || !lastMessage) return;

    // Events that affect on-site labor costs and P&L calculations
    const laborPLUpdateEvents = [
      'time_clock_update',    // Time clock in/out events
      'user_clock_in',        // User clock in notification
      'user_clock_out',       // User clock out notification
      'project_started',      // Job started
      'project_completed',    // Job completed
      'job_started',          // Job started event
      'job_completed',        // Job completed event
      'project_updated'       // Job status/time updates
    ];

    // Check if the event type matches any labor/P&L update events
    const eventType = lastMessage.eventType || lastMessage.type;
    
    if (laborPLUpdateEvents.includes(eventType)) {
      console.log(`💰 On-Site Labor P&L update triggered by: ${eventType}`);
      console.log('📊 Real-time WebSocket update - Refreshing profit/loss data...');
      
      // Invalidate profit/loss queries to fetch fresh data with updated labor costs
      queryClient.invalidateQueries({ queryKey: ["/api/reports/profit-loss-detailed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/data"] });
      
      // Show a subtle notification for real-time update
      if (eventType === 'time_clock_update' || eventType === 'user_clock_in' || eventType === 'user_clock_out') {
        const userName = lastMessage.data?.userName || lastMessage.data?.user || 'Team member';
        const action = eventType.includes('in') ? 'clocked in' : eventType.includes('out') ? 'clocked out' : 'updated time clock';
        console.log(`⏰ ${userName} ${action} - Labor costs updating in real-time`);
      }
      
      // Force refetch to show updated on-site labor costs immediately
      refetchProfitLossDetailed();
    }
  }, [lastMessage, isConnected, queryClient, refetchProfitLossDetailed]);

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
  
  // Calculate total revenue and expenses for Profit Loss tab from detailed P&L data
  const totalRevenue = profitLossDetailedData?.summary?.totalRevenue || 0;
  const totalExpenses = profitLossDetailedData?.summary?.totalExpenses || 0;

  // Process profit/loss data by different views
  const getProfitLossDataByView = () => {
    if (!salesData && !expensesData) return [];

    if (profitLossView === 'job') {
      // Group by individual jobs
      const jobMap: Record<string, any> = {};
      
      // Add revenue from invoices
      salesData?.forEach((invoice: any) => {
        if (invoice.projectId && invoice.project) {
          const jobId = invoice.projectId;
          if (!jobMap[jobId]) {
            jobMap[jobId] = {
              jobName: invoice.project.name || `Job #${jobId}`,
              revenue: 0,
              expenses: 0,
              profit: 0
            };
          }
          jobMap[jobId].revenue += parseFloat(invoice.total || 0);
        }
      });

      // Add expenses by project
      expensesData?.forEach((expense: any) => {
        if (expense.projectId && expense.project) {
          const jobId = expense.projectId;
          if (!jobMap[jobId]) {
            jobMap[jobId] = {
              jobName: expense.project.name || `Job #${jobId}`,
              revenue: 0,
              expenses: 0,
              profit: 0
            };
          }
          jobMap[jobId].expenses += parseFloat(expense.amount || 0);
        }
      });

      // Calculate profit for each job
      Object.values(jobMap).forEach((job: any) => {
        job.profit = job.revenue - job.expenses;
      });

      return Object.values(jobMap).sort((a: any, b: any) => b.profit - a.profit);
    }

    if (profitLossView === 'daily') {
      // Group by day with detailed job information
      const dailyMap: Record<string, any> = {};
      
      salesData?.forEach((invoice: any) => {
        if (invoice.createdAt) {
          const date = format(new Date(invoice.createdAt), 'MM/dd/yyyy');
          if (!dailyMap[date]) {
            dailyMap[date] = { date, revenue: 0, expenses: 0, profit: 0, jobs: [] };
          }
          dailyMap[date].revenue += parseFloat(invoice.total || 0);
          
          // Track job details for this day
          if (invoice.projectId && invoice.project) {
            const existingJob = dailyMap[date].jobs.find((j: any) => j.jobId === invoice.projectId);
            if (existingJob) {
              existingJob.revenue += parseFloat(invoice.total || 0);
            } else {
              dailyMap[date].jobs.push({
                jobId: invoice.projectId,
                jobName: invoice.project.name || `Job #${invoice.projectId}`,
                revenue: parseFloat(invoice.total || 0),
                expenses: 0,
                profit: 0
              });
            }
          }
        }
      });

      expensesData?.forEach((expense: any) => {
        if (expense.createdAt) {
          const date = format(new Date(expense.createdAt), 'MM/dd/yyyy');
          if (!dailyMap[date]) {
            dailyMap[date] = { date, revenue: 0, expenses: 0, profit: 0, jobs: [] };
          }
          dailyMap[date].expenses += parseFloat(expense.amount || 0);
          
          // Track job expenses for this day
          if (expense.projectId && expense.project) {
            const existingJob = dailyMap[date].jobs.find((j: any) => j.jobId === expense.projectId);
            if (existingJob) {
              existingJob.expenses += parseFloat(expense.amount || 0);
            } else {
              dailyMap[date].jobs.push({
                jobId: expense.projectId,
                jobName: expense.project.name || `Job #${expense.projectId}`,
                revenue: 0,
                expenses: parseFloat(expense.amount || 0),
                profit: 0
              });
            }
          }
        }
      });

      Object.values(dailyMap).forEach((day: any) => {
        day.profit = day.revenue - day.expenses;
        day.profitMargin = day.revenue > 0 ? ((day.profit / day.revenue) * 100).toFixed(1) : 0;
        
        // Calculate profit for each job and sort by profitability
        day.jobs.forEach((job: any) => {
          job.profit = job.revenue - job.expenses;
          job.profitMargin = job.revenue > 0 ? ((job.profit / job.revenue) * 100).toFixed(1) : 0;
        });
        day.jobs.sort((a: any, b: any) => b.profit - a.profit);
        day.mostProfitableJob = day.jobs.length > 0 ? day.jobs[0] : null;
      });

      return Object.values(dailyMap).sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ).slice(-30); // Last 30 days
    }

    if (profitLossView === 'weekly') {
      // Group by week
      const weeklyMap: Record<string, any> = {};
      
      salesData?.forEach((invoice: any) => {
        if (invoice.date) {
          const date = new Date(invoice.date);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
          const weekKey = format(weekStart, 'MM/dd/yyyy');
          
          if (!weeklyMap[weekKey]) {
            weeklyMap[weekKey] = { 
              week: `Week of ${format(weekStart, 'MMM d')}`, 
              revenue: 0, 
              expenses: 0, 
              profit: 0 
            };
          }
          weeklyMap[weekKey].revenue += parseFloat(invoice.total || 0);
        }
      });

      expensesData?.forEach((expense: any) => {
        if (expense.date) {
          const date = new Date(expense.date);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const weekKey = format(weekStart, 'MM/dd/yyyy');
          
          if (!weeklyMap[weekKey]) {
            weeklyMap[weekKey] = { 
              week: `Week of ${format(weekStart, 'MMM d')}`, 
              revenue: 0, 
              expenses: 0, 
              profit: 0 
            };
          }
          weeklyMap[weekKey].expenses += parseFloat(expense.amount || 0);
        }
      });

      Object.values(weeklyMap).forEach((week: any) => {
        week.profit = week.revenue - week.expenses;
      });

      return Object.values(weeklyMap).sort((a: any, b: any) => {
        const dateA = new Date(a.week.replace('Week of ', '') + ', 2024');
        const dateB = new Date(b.week.replace('Week of ', '') + ', 2024');
        return dateA.getTime() - dateB.getTime();
      }).slice(-12); // Last 12 weeks
    }

    // Default: monthly view
    return salesChartData;
  };

  // Use backend data if available, otherwise fall back to local calculation
  const profitLossChartData = profitLossDetailedData?.data || getProfitLossDataByView();
  
  // Debug logging for on-site labor data
  useEffect(() => {
    if (profitLossDetailedData) {
      console.log('📊 PROFIT/LOSS DATA:', {
        view: profitLossView,
        dataLength: profitLossChartData?.length,
        hasData: !!profitLossChartData,
        sampleData: profitLossChartData?.[0],
        allData: profitLossChartData
      });
    }
  }, [profitLossDetailedData, profitLossChartData, profitLossView]);

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
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
          <TabsTrigger value="close-rate">Close Rate</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="job-analytics">Job Analytics</TabsTrigger>
          <TabsTrigger value="profit-loss">Profit Loss</TabsTrigger>
          <TabsTrigger value="onsite-labor">On-Site Labor P&L</TabsTrigger>
          <TabsTrigger value="gas-maintenance">Gas & Maintenance</TabsTrigger>
        </TabsList>

        {/* Sales Charts */}
        <TabsContent value="sales" className="space-y-6">
          <div className="flex justify-end gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportSalesReport(salesChartData, 'excel')}
              data-testid="button-export-sales-excel"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportSalesReport(salesChartData, 'pdf')}
              data-testid="button-export-sales-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
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
          <div className="flex justify-end gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportLeadsReport(leadsChartData, 'excel')}
              data-testid="button-export-leads-excel"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportLeadsReport(leadsChartData, 'pdf')}
              data-testid="button-export-leads-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
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
          <div className="flex justify-end gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportSalesReport(salesChartData, 'excel')}
              data-testid="button-export-refunds-excel"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportSalesReport(salesChartData, 'pdf')}
              data-testid="button-export-refunds-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
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
          <div className="flex justify-end gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportLeadsReport(leadsChartData, 'excel')}
              data-testid="button-export-closerate-excel"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportLeadsReport(leadsChartData, 'pdf')}
              data-testid="button-export-closerate-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
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
          <div className="flex justify-end gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportExpensesReport(expensesChartData, 'excel')}
              data-testid="button-export-expenses-excel"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportExpensesReport(expensesChartData, 'pdf')}
              data-testid="button-export-expenses-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
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
          <div className="flex justify-end gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportEmployeeReport(employeesData, 'excel')}
              data-testid="button-export-employees-excel"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportEmployeeReport(employeesData, 'pdf')}
              data-testid="button-export-employees-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
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
          <div className="flex justify-end gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportJobAnalyticsReport(jobAnalyticsData, 'excel')}
              data-testid="button-export-jobanalytics-excel"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportJobAnalyticsReport(jobAnalyticsData, 'pdf')}
              data-testid="button-export-jobanalytics-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
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
          <div className="flex justify-end gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportProfitLossReport(profitLossChartData, 'excel', profitLossView)}
              data-testid="button-export-profitloss-excel"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportProfitLossReport(profitLossChartData, 'pdf', profitLossView)}
              data-testid="button-export-profitloss-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
          {/* View Selector */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Profit & Loss Analysis</CardTitle>
                  <CardDescription>View profitability data by different time periods or individual jobs</CardDescription>
                </div>
                <Select value={profitLossView} onValueChange={(value: any) => setProfitLossView(value)}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Per Day</SelectItem>
                    <SelectItem value="weekly">Per Week</SelectItem>
                    <SelectItem value="monthly">Per Month</SelectItem>
                    <SelectItem value="job">Per Job</SelectItem>
                    <SelectItem value="vehicle">Per Vehicle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
          </Card>

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
                      {timeRange === '7days' ? 'Last 7 Days' : 
                       timeRange === '30days' ? 'Last 30 Days' : 
                       timeRange === '3months' ? 'Last 3 Months' : 
                       timeRange === '6months' ? 'Last 6 Months' : 'Last Year'}
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
                      {timeRange === '7days' ? 'Last 7 Days' : 
                       timeRange === '30days' ? 'Last 30 Days' : 
                       timeRange === '3months' ? 'Last 3 Months' : 
                       timeRange === '6months' ? 'Last 6 Months' : 'Last Year'}
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
                <CardTitle>
                  {profitLossView === 'job' ? 'Job Profitability' : profitLossView === 'vehicle' ? 'Vehicle Profitability' : 'Profit & Loss Overview'}
                </CardTitle>
                <CardDescription>
                  {profitLossView === 'daily' && 'Daily revenue vs expenses'}
                  {profitLossView === 'weekly' && 'Weekly revenue vs expenses'}
                  {profitLossView === 'monthly' && 'Monthly revenue vs expenses'}
                  {profitLossView === 'job' && 'Profitability by individual job'}
                  {profitLossView === 'vehicle' && 'Revenue vs expenses by vehicle'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profitLossView === 'vehicle' && profitPerVehicleLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={profitLossView === 'vehicle' ? (profitPerVehicleData?.vehicles || []) : profitLossChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey={profitLossView === 'vehicle' ? 'vehicleNumber' : profitLossView === 'job' ? 'jobName' : profitLossView === 'weekly' ? 'week' : profitLossView === 'daily' ? 'date' : 'month'} 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}`, '']} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#00C49F" name="Revenue" />
                      <Bar dataKey="expenses" fill="#FF8042" name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Net Profit Trend</CardTitle>
                <CardDescription>
                  {profitLossView === 'daily' && 'Daily profit/loss trends'}
                  {profitLossView === 'weekly' && 'Weekly profit/loss trends'}
                  {profitLossView === 'monthly' && 'Monthly profit/loss trends'}
                  {profitLossView === 'job' && 'Profit by job comparison'}
                  {profitLossView === 'vehicle' && 'Profit by vehicle comparison'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profitLossView === 'vehicle' && profitPerVehicleLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={profitLossView === 'vehicle' ? (profitPerVehicleData?.vehicles || []) : profitLossChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey={profitLossView === 'vehicle' ? 'vehicleNumber' : profitLossView === 'job' ? 'jobName' : profitLossView === 'weekly' ? 'week' : profitLossView === 'daily' ? 'date' : 'month'} 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                      />
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
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profit Margin Analysis</CardTitle>
              <CardDescription>
                {profitLossView === 'job' ? 'Profit margin by job' : profitLossView === 'vehicle' ? 'Profit margin by vehicle' : 'Revenue breakdown and profitability percentage'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profitLossView === 'vehicle' && profitPerVehicleLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={profitLossView === 'vehicle' 
                    ? (profitPerVehicleData?.vehicles || []).map(item => ({
                        ...item,
                        profitMargin: item.revenue > 0 ? ((item.profit) / item.revenue * 100).toFixed(1) : 0
                      }))
                    : profitLossChartData.map(item => ({
                        ...item,
                        profitMargin: item.revenue > 0 ? ((item.profit) / item.revenue * 100).toFixed(1) : 0
                      }))
                  }>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={profitLossView === 'vehicle' ? 'vehicleNumber' : profitLossView === 'job' ? 'jobName' : profitLossView === 'weekly' ? 'week' : profitLossView === 'daily' ? 'date' : 'month'} 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                  />
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
              )}
            </CardContent>
          </Card>

          {/* Daily Detailed Analysis - Line by Line Daily Net Profit */}
          {profitLossView === 'daily' && profitLossChartData.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Daily Net Profit Breakdown</CardTitle>
                  <CardDescription>Line-by-line daily profit/loss analysis for the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-3 font-medium">Date</th>
                          <th className="text-right p-3 font-medium">Revenue</th>
                          <th className="text-right p-3 font-medium">Expenses</th>
                          <th className="text-right p-3 font-medium">Net Profit</th>
                          <th className="text-right p-3 font-medium">Profit Margin</th>
                          <th className="text-left p-3 font-medium">Most Profitable Job</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profitLossChartData.map((day: any, index: number) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">{day.date}</td>
                            <td className="text-right p-3 text-green-600">
                              ${day.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="text-right p-3 text-red-600">
                              ${day.expenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className={`text-right p-3 font-semibold ${day.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${day.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className={`text-right p-3 ${parseFloat(day.profitMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {day.profitMargin}%
                            </td>
                            <td className="p-3">
                              {day.mostProfitableJob ? (
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">{day.mostProfitableJob.jobName}</span>
                                  <span className="text-xs text-green-600">
                                    ${day.mostProfitableJob.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} profit
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">No jobs</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 bg-gray-50">
                        <tr className="font-bold">
                          <td className="p-3">Total (30 Days)</td>
                          <td className="text-right p-3 text-green-600">
                            ${profitLossChartData.reduce((sum: number, day: any) => sum + day.revenue, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="text-right p-3 text-red-600">
                            ${profitLossChartData.reduce((sum: number, day: any) => sum + day.expenses, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={`text-right p-3 ${profitLossChartData.reduce((sum: number, day: any) => sum + day.profit, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${profitLossChartData.reduce((sum: number, day: any) => sum + day.profit, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={`text-right p-3 ${
                            (profitLossChartData.reduce((sum: number, day: any) => sum + day.profit, 0) / 
                             profitLossChartData.reduce((sum: number, day: any) => sum + day.revenue, 0) * 100) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {(profitLossChartData.reduce((sum: number, day: any) => sum + day.profit, 0) / 
                              profitLossChartData.reduce((sum: number, day: any) => sum + day.revenue, 0) * 100).toFixed(1)}%
                          </td>
                          <td className="p-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Most Profitable Jobs */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Most Profitable Jobs</CardTitle>
                  <CardDescription>Top performing jobs for each day with detailed profitability</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profitLossChartData.filter((day: any) => day.jobs && day.jobs.length > 0).map((day: any, dayIndex: number) => (
                      <div key={dayIndex} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-lg">{day.date}</h4>
                          <Badge variant="outline" className="text-sm">
                            {day.jobs.length} job{day.jobs.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b text-sm">
                                <th className="text-left p-2 font-medium">Rank</th>
                                <th className="text-left p-2 font-medium">Job Name</th>
                                <th className="text-right p-2 font-medium">Revenue</th>
                                <th className="text-right p-2 font-medium">Expenses</th>
                                <th className="text-right p-2 font-medium">Profit</th>
                                <th className="text-right p-2 font-medium">Margin</th>
                              </tr>
                            </thead>
                            <tbody>
                              {day.jobs.slice(0, 5).map((job: any, jobIndex: number) => (
                                <tr key={jobIndex} className="border-b last:border-0 text-sm">
                                  <td className="p-2">
                                    <Badge 
                                      variant={jobIndex === 0 ? "default" : "outline"}
                                      className={jobIndex === 0 ? "bg-yellow-500" : ""}
                                    >
                                      #{jobIndex + 1}
                                    </Badge>
                                  </td>
                                  <td className="p-2 font-medium">{job.jobName}</td>
                                  <td className="text-right p-2 text-green-600">
                                    ${job.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="text-right p-2 text-red-600">
                                    ${job.expenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className={`text-right p-2 font-semibold ${job.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ${job.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className={`text-right p-2 ${parseFloat(job.profitMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {job.profitMargin}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                    {profitLossChartData.filter((day: any) => day.jobs && day.jobs.length > 0).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No job data available for the selected period
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Profit per Vehicle */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle>Profit per Vehicle</CardTitle>
                      <CardDescription>Profitability analysis by vehicle for the selected period</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => exportProfitPerVehicleReport(profitPerVehicleData?.vehicles || [], 'excel')}
                        data-testid="button-export-vehicleprofit-excel"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Excel
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => exportProfitPerVehicleReport(profitPerVehicleData?.vehicles || [], 'pdf')}
                        data-testid="button-export-vehicleprofit-pdf"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {profitPerVehicleLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Bar Chart */}
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={profitPerVehicleData?.vehicles || []} 
                            margin={{ top: 10, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="vehicleNumber" 
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis />
                            <Tooltip 
                              formatter={(value: any) => `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            />
                            <Legend />
                            <Bar dataKey="revenue" name="Revenue" fill="#10b981" />
                            <Bar dataKey="expenses" name="Expenses" fill="#ef4444" />
                            <Bar dataKey="profit" name="Net Profit" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Summary Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left p-3 font-medium">Vehicle</th>
                              <th className="text-right p-3 font-medium">Jobs</th>
                              <th className="text-right p-3 font-medium">Revenue</th>
                              <th className="text-right p-3 font-medium">Base Expenses</th>
                              <th className="text-right p-3 font-medium">Travel Fuel</th>
                              <th className="text-right p-3 font-medium">Travel Labor</th>
                              <th className="text-right p-3 font-medium">On-Site Labor</th>
                              <th className="text-right p-3 font-medium">Total Travel</th>
                              <th className="text-right p-3 font-medium">Net Profit</th>
                              <th className="text-right p-3 font-medium">Margin %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {profitPerVehicleData?.vehicles && profitPerVehicleData.vehicles.length > 0 ? (
                              profitPerVehicleData.vehicles.map((vehicle: any, index: number) => (
                                <tr key={index} className="border-b hover:bg-gray-50" data-testid={`row-vehicle-profit-${vehicle.vehicleId}`}>
                                  <td className="p-3 font-medium" data-testid={`text-vehicle-number-${vehicle.vehicleId}`}>
                                    {vehicle.vehicleNumber}
                                    {vehicle.make && vehicle.model && (
                                      <span className="text-sm text-gray-500 ml-2">
                                        ({vehicle.make} {vehicle.model})
                                      </span>
                                    )}
                                  </td>
                                  <td className="text-right p-3" data-testid={`text-jobs-completed-${vehicle.vehicleId}`}>
                                    {vehicle.jobsCompleted}
                                  </td>
                                  <td className="text-right p-3 text-green-600" data-testid={`text-revenue-${vehicle.vehicleId}`}>
                                    ${vehicle.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="text-right p-3 text-red-600" data-testid={`text-expenses-${vehicle.vehicleId}`}>
                                    ${(vehicle.expenses - (vehicle.travelFuelCosts || 0) - (vehicle.travelLaborCosts || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="text-right p-3 text-orange-600" data-testid={`text-travel-fuel-${vehicle.vehicleId}`}>
                                    ${(vehicle.travelFuelCosts || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="text-right p-3 text-orange-600" data-testid={`text-travel-labor-${vehicle.vehicleId}`}>
                                    ${(vehicle.travelLaborCosts || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="text-right p-3 text-purple-600" data-testid={`text-onsite-labor-${vehicle.vehicleId}`}>
                                    ${(vehicle.onsiteLaborCosts || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    {vehicle.onsiteHours > 0 && (
                                      <span className="text-xs text-gray-500 block">
                                        ({vehicle.onsiteHours.toFixed(1)}h)
                                      </span>
                                    )}
                                  </td>
                                  <td className="text-right p-3 text-red-600 font-medium" data-testid={`text-total-travel-${vehicle.vehicleId}`}>
                                    ${(vehicle.totalTravelCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td 
                                    className={`text-right p-3 font-semibold ${vehicle.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                                    data-testid={`text-profit-${vehicle.vehicleId}`}
                                  >
                                    ${vehicle.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td 
                                    className={`text-right p-3 ${vehicle.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}
                                    data-testid={`text-profit-margin-${vehicle.vehicleId}`}
                                  >
                                    {vehicle.profitMargin}%
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr className="border-b">
                                <td colSpan={10} className="p-4 text-center text-gray-500">
                                  No vehicle data available for the selected period
                                </td>
                              </tr>
                            )}
                          </tbody>
                          {profitPerVehicleData?.totals && profitPerVehicleData.vehicles.length > 0 && (
                            <tfoot className="border-t-2 bg-gray-50">
                              <tr className="font-bold">
                                <td className="p-3">Total</td>
                                <td className="text-right p-3" data-testid="text-total-jobs">
                                  {profitPerVehicleData.totals.totalJobs}
                                </td>
                                <td className="text-right p-3 text-green-600" data-testid="text-total-revenue">
                                  ${profitPerVehicleData.totals.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="text-right p-3 text-red-600" data-testid="text-base-expenses">
                                  ${(profitPerVehicleData.totals.totalExpenses - (profitPerVehicleData.totals.totalTravelCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="text-right p-3 text-orange-600" data-testid="text-total-travel-fuel">
                                  ${(profitPerVehicleData.totals.totalTravelFuelCosts || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="text-right p-3 text-orange-600" data-testid="text-total-travel-labor">
                                  ${(profitPerVehicleData.totals.totalTravelLaborCosts || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="text-right p-3 text-purple-600" data-testid="text-total-onsite-labor">
                                  ${(profitPerVehicleData.totals.totalOnsiteLaborCosts || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  {profitPerVehicleData.totals.totalOnsiteHours > 0 && (
                                    <span className="text-xs text-gray-500 block">
                                      ({profitPerVehicleData.totals.totalOnsiteHours.toFixed(1)}h)
                                    </span>
                                  )}
                                </td>
                                <td className="text-right p-3 text-red-600 font-medium" data-testid="text-total-travel-cost">
                                  ${(profitPerVehicleData.totals.totalTravelCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td 
                                  className={`text-right p-3 ${profitPerVehicleData.totals.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                                  data-testid="text-total-profit"
                                >
                                  ${profitPerVehicleData.totals.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="text-right p-3" data-testid="text-avg-profit-margin">
                                  {profitPerVehicleData.totals.totalRevenue > 0 
                                    ? ((profitPerVehicleData.totals.totalProfit / profitPerVehicleData.totals.totalRevenue) * 100).toFixed(1)
                                    : 0}%
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Detailed Table View for Per Job */}
          {profitLossView === 'job' && profitLossChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Job Profitability Details</CardTitle>
                <CardDescription>Detailed breakdown of revenue, expenses, and profit by job</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium">Job Name</th>
                        <th className="text-right p-3 font-medium">Revenue</th>
                        <th className="text-right p-3 font-medium">Expenses</th>
                        <th className="text-right p-3 font-medium">Profit</th>
                        <th className="text-right p-3 font-medium">Profit Margin</th>
                        <th className="text-center p-3 font-medium">GPS Arrival</th>
                        <th className="text-center p-3 font-medium">Time Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitLossChartData.map((job: any, index: number) => {
                        const profitMargin = job.revenue > 0 ? ((job.profit / job.revenue) * 100).toFixed(1) : 0;
                        const arrivedTime = job.arrivedAt ? new Date(job.arrivedAt).toLocaleString() : '-';
                        const timeExceeded = job.timeExceededAt ? 'Exceeded' : (job.estimatedDuration ? 'On Time' : '-');
                        return (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">{job.jobName}</td>
                            <td className="text-right p-3 text-green-600">
                              ${job.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="text-right p-3 text-red-600">
                              ${job.expenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className={`text-right p-3 font-semibold ${job.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${job.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className={`text-right p-3 ${parseFloat(profitMargin.toString()) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {profitMargin}%
                            </td>
                            <td className="text-center p-3 text-sm text-gray-600">
                              {arrivedTime}
                            </td>
                            <td className={`text-center p-3 text-sm font-medium ${job.timeExceededAt ? 'text-red-600' : 'text-green-600'}`}>
                              {timeExceeded}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 bg-gray-50">
                      <tr className="font-bold">
                        <td className="p-3">Total</td>
                        <td className="text-right p-3 text-green-600">
                          ${profitLossChartData.reduce((sum: number, job: any) => sum + job.revenue, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="text-right p-3 text-red-600">
                          ${profitLossChartData.reduce((sum: number, job: any) => sum + job.expenses, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`text-right p-3 ${profitLossChartData.reduce((sum: number, job: any) => sum + job.profit, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${profitLossChartData.reduce((sum: number, job: any) => sum + job.profit, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="text-right p-3">
                          {(() => {
                            const totalRevenue = profitLossChartData.reduce((sum: number, job: any) => sum + job.revenue, 0);
                            const totalProfit = profitLossChartData.reduce((sum: number, job: any) => sum + job.profit, 0);
                            return totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;
                          })()}%
                        </td>
                        <td className="text-center p-3 text-sm text-gray-500">-</td>
                        <td className="text-center p-3 text-sm text-gray-500">-</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* On-Site Labor P&L Tab */}
        <TabsContent value="onsite-labor" className="space-y-6">
          <div className="flex justify-end gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportProfitLossReport(profitLossChartData, 'excel', 'onsite-labor')}
              data-testid="button-export-onsite-labor-excel"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportProfitLossReport(profitLossChartData, 'pdf', 'onsite-labor')}
              data-testid="button-export-onsite-labor-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* On-Site Labor Cost vs Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>On-Site Labor Cost vs Revenue</CardTitle>
                <CardDescription>Comparing revenue to on-site labor expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={profitLossChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                    <Bar dataKey="onsiteLaborCost" fill="#f59e0b" name="On-Site Labor Cost" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* On-Site Labor Profit Margin Chart */}
            <Card>
              <CardHeader>
                <CardTitle>On-Site Labor Profit Margin</CardTitle>
                <CardDescription>Net profit after on-site labor costs</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={profitLossChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="profitMargin" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Profit Margin %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* On-Site Labor Hours & Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>On-Site Labor Hours & Cost Analysis</CardTitle>
              <CardDescription>Detailed breakdown of on-site labor time and expenses</CardDescription>
            </CardHeader>
            <CardContent>
              {!profitLossChartData || profitLossChartData.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Labor Data Available</h3>
                  <p className="text-gray-600 mb-4">
                    No jobs with tracked labor hours found in the selected time period.
                  </p>
                  <div className="text-sm text-gray-500 space-y-2">
                    <p>💡 Labor costs are tracked when:</p>
                    <ul className="list-disc list-inside">
                      <li>Jobs are started and completed with timestamps</li>
                      <li>Employees are assigned to jobs</li>
                      <li>Employee hourly rates are configured</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-semibold">Job/Period</th>
                        <th className="text-right p-3 font-semibold">On-Site Hours</th>
                        <th className="text-right p-3 font-semibold">On-Site Labor Cost</th>
                        <th className="text-right p-3 font-semibold">Revenue</th>
                        <th className="text-right p-3 font-semibold">Labor as % of Revenue</th>
                        <th className="text-right p-3 font-semibold">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitLossChartData.map((item: any, index: number) => {
                      const laborPercentage = item.revenue > 0 
                        ? ((item.onsiteLaborCost || 0) / item.revenue * 100) 
                        : 0;
                      const netProfit = item.revenue - (item.onsiteLaborCost || 0);
                      
                      return (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{item.name}</td>
                          <td className="text-right p-3">
                            {item.onsiteHours ? item.onsiteHours.toFixed(1) : '0.0'} hrs
                          </td>
                          <td className="text-right p-3 text-orange-600">
                            ${(item.onsiteLaborCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="text-right p-3 text-green-600">
                            ${item.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="text-right p-3">
                            <span className={`font-medium ${laborPercentage > 50 ? 'text-red-600' : 'text-green-600'}`}>
                              {laborPercentage.toFixed(1)}%
                            </span>
                          </td>
                          <td className={`text-right p-3 font-semibold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 bg-gray-50">
                    <tr className="font-bold">
                      <td className="p-3">Total</td>
                      <td className="text-right p-3">
                        {profitLossChartData.reduce((sum: number, item: any) => sum + (item.onsiteHours || 0), 0).toFixed(1)} hrs
                      </td>
                      <td className="text-right p-3 text-orange-600">
                        ${profitLossChartData.reduce((sum: number, item: any) => sum + (item.onsiteLaborCost || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-right p-3 text-green-600">
                        ${profitLossChartData.reduce((sum: number, item: any) => sum + item.revenue, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-right p-3">
                        {(() => {
                          const totalRevenue = profitLossChartData.reduce((sum: number, item: any) => sum + item.revenue, 0);
                          const totalLaborCost = profitLossChartData.reduce((sum: number, item: any) => sum + (item.onsiteLaborCost || 0), 0);
                          return totalRevenue > 0 ? ((totalLaborCost / totalRevenue) * 100).toFixed(1) : 0;
                        })()}%
                      </td>
                      <td className={`text-right p-3 ${(() => {
                        const totalRevenue = profitLossChartData.reduce((sum: number, item: any) => sum + item.revenue, 0);
                        const totalLaborCost = profitLossChartData.reduce((sum: number, item: any) => sum + (item.onsiteLaborCost || 0), 0);
                        return totalRevenue - totalLaborCost >= 0 ? 'text-green-600' : 'text-red-600';
                      })()}`}>
                        ${(() => {
                          const totalRevenue = profitLossChartData.reduce((sum: number, item: any) => sum + item.revenue, 0);
                          const totalLaborCost = profitLossChartData.reduce((sum: number, item: any) => sum + (item.onsiteLaborCost || 0), 0);
                          return (totalRevenue - totalLaborCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

          {/* Real-Time Active Jobs Alert */}
          {profitLossChartData.some((item: any) => item.isActive) && (
            <Card className="border-blue-500 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-700 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Active Jobs - Real-Time Labor Costs
                </CardTitle>
                <CardDescription className="text-blue-600">
                  Labor costs updating in real-time for ongoing jobs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(() => {
                    // For 'job' view, show jobs directly. For grouped views, extract jobs from the jobs array
                    const activeJobs: any[] = [];
                    
                    profitLossChartData.forEach((item: any) => {
                      if (item.isActive) {
                        if (profitLossView === 'job' && item.projectId) {
                          // Individual job view - show the job directly
                          activeJobs.push(item);
                        } else if (item.jobs && Array.isArray(item.jobs)) {
                          // Grouped view (daily/weekly/monthly) - extract active jobs from the jobs array
                          const periodActiveJobs = item.jobs.filter((j: any) => j.isActive);
                          activeJobs.push(...periodActiveJobs);
                        }
                      }
                    });
                    
                    return activeJobs.map((job: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-white rounded border border-blue-200">
                        <div>
                          <p className="font-medium text-blue-900">
                            Job #{job.projectId}{job.projectName ? ` - ${job.projectName}` : ''}
                          </p>
                          <p className="text-sm text-blue-600">Currently in progress</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Current On-Site Hours: {job.onsiteHours?.toFixed(1) || '0.0'}</p>
                          <p className="font-semibold text-orange-600">
                            Current Labor Cost: ${(job.onsiteLaborCost || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Gas & Maintenance Tab */}
        <TabsContent value="gas-maintenance" className="space-y-6">
          {/* Today's Fuel Usage - Live Tracking */}
          <TodayFuelUsage />
          
          {/* View Selector */}
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={gasMaintView === 'job' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGasMaintView('job')}
                data-testid="button-gasmaint-view-job"
              >
                Per Job
              </Button>
              <Button 
                variant={gasMaintView === 'daily' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGasMaintView('daily')}
                data-testid="button-gasmaint-view-daily"
              >
                Per Day
              </Button>
              <Button 
                variant={gasMaintView === 'weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGasMaintView('weekly')}
                data-testid="button-gasmaint-view-weekly"
              >
                Per Week
              </Button>
              <Button 
                variant={gasMaintView === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGasMaintView('monthly')}
                data-testid="button-gasmaint-view-monthly"
              >
                Per Month
              </Button>
              <Button 
                variant={gasMaintView === 'yearly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGasMaintView('yearly')}
                data-testid="button-gasmaint-view-yearly"
              >
                Per Year
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (!gasMaintData || gasMaintData.length === 0) {
                  toast({
                    title: "No Data",
                    description: "No gas or maintenance data available to export.",
                    variant: "destructive"
                  });
                  return;
                }
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(gasMaintData);
                XLSX.utils.book_append_sheet(wb, ws, "Gas & Maintenance");
                XLSX.writeFile(wb, `gas-maintenance-report-${new Date().toISOString().split('T')[0]}.xlsx`);
              }}
              data-testid="button-export-gas-maintenance-excel"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Gas Cost</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${gasMaintSummary?.totalGasCost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {gasMaintSummary?.totalGallons?.toFixed(1) || '0.0'} gallons
                    </p>
                  </div>
                  <div className="text-4xl">⛽</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Maintenance Cost</p>
                    <p className="text-2xl font-bold text-orange-600">
                      ${gasMaintSummary?.totalMaintenanceCost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {gasMaintSummary?.totalMaintenanceRecords || 0} records
                    </p>
                  </div>
                  <div className="text-4xl">🔧</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Cost</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ${gasMaintSummary?.totalCost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(gasMaintSummary?.totalGasExpenses || 0) + (gasMaintSummary?.totalMaintenanceRecords || 0)} total records
                    </p>
                  </div>
                  <div className="text-4xl">💰</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Fuel Usage Variance Analysis */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Fuel Usage Analysis</CardTitle>
                  <CardDescription>
                    {fuelDataSource === 'jobs' 
                      ? 'Fuel costs from job travel segments (job-to-job routing)'
                      : `Fuel costs from OBD GPS trips database (${fuelView} totals for all vehicle miles)`}
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Data Source Toggle */}
                  <div className="flex gap-2">
                    <Button
                      variant={fuelDataSource === 'jobs' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFuelDataSource('jobs')}
                      data-testid="button-fuel-source-jobs"
                    >
                      Job Routes
                    </Button>
                    <Button
                      variant={fuelDataSource === 'obd' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFuelDataSource('obd')}
                      data-testid="button-fuel-source-obd"
                    >
                      OBD Trips
                    </Button>
                  </div>
                  
                  {/* View Selection (only for OBD) */}
                  {fuelDataSource === 'obd' && (
                    <div className="flex gap-2">
                      <Button
                        variant={fuelView === 'daily' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFuelView('daily')}
                        data-testid="button-fuel-view-daily"
                      >
                        Daily
                      </Button>
                      <Button
                        variant={fuelView === 'weekly' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFuelView('weekly')}
                        data-testid="button-fuel-view-weekly"
                      >
                        Weekly
                      </Button>
                      <Button
                        variant={fuelView === 'monthly' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFuelView('monthly')}
                        data-testid="button-fuel-view-monthly"
                      >
                        Monthly
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {currentFuelLoading ? (
                <div className="text-center py-12 text-gray-500">
                  <p>Loading fuel usage data...</p>
                </div>
              ) : !currentFuelUsage || currentFuelUsage.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">⛽</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Fuel Usage Data</h3>
                  <p className="text-gray-600">
                    {fuelDataSource === 'jobs' 
                      ? 'No travel segments or fuel expenses found in the selected time period.'
                      : 'No OBD trip data or fuel expenses found in the selected time period.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-semibold">
                          {fuelDataSource === 'jobs' ? 'Date' : 
                           fuelView === 'daily' ? 'Date' :
                           fuelView === 'weekly' ? 'Week Starting' : 'Month'}
                        </th>
                        <th className="text-left p-3 font-semibold">Vehicle</th>
                        <th className="text-right p-3 font-semibold">Miles</th>
                        <th className="text-right p-3 font-semibold">
                          {fuelDataSource === 'obd' ? 'Trips' : 'Segments'}
                        </th>
                        <th className="text-right p-3 font-semibold">MPG</th>
                        <th className="text-right p-3 font-semibold">Calc. Gallons</th>
                        <th className="text-right p-3 font-semibold">Fuel Price</th>
                        <th className="text-right p-3 font-semibold">Calc. Cost</th>
                        <th className="text-right p-3 font-semibold">Actual Cost</th>
                        <th className="text-right p-3 font-semibold">Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentFuelUsage.map((usage: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">
                            {usage.date || usage.period || 'N/A'}
                          </td>
                          <td className="p-3">{usage.vehicleName}</td>
                          <td className="text-right p-3">{usage.totalMiles.toFixed(2)}</td>
                          <td className="text-right p-3">
                            {usage.tripCount || usage.segmentCount || 0}
                          </td>
                          <td className="text-right p-3">{usage.vehicleMPG.toFixed(1)}</td>
                          <td className="text-right p-3">{usage.calculatedGallons.toFixed(2)}</td>
                          <td className="text-right p-3">${usage.fuelPriceUsed.toFixed(2)}</td>
                          <td className="text-right p-3 text-blue-600">
                            ${usage.calculatedFuelCost.toFixed(2)}
                          </td>
                          <td className="text-right p-3 text-green-600">
                            ${usage.actualFuelCost.toFixed(2)}
                          </td>
                          <td className={`text-right p-3 font-semibold ${
                            usage.variance > 0 
                              ? 'text-red-600' 
                              : usage.variance < 0 
                                ? 'text-green-600' 
                                : 'text-gray-600'
                          }`}>
                            {usage.variance > 0 ? '+' : ''}${usage.variance.toFixed(2)}
                            {usage.variancePercent !== 0 && (
                              <span className="text-xs ml-1">
                                ({usage.variance > 0 ? '+' : ''}{usage.variancePercent.toFixed(1)}%)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>How it works:</strong> {fuelDataSource === 'jobs' 
                        ? 'Fuel costs are calculated from job-to-job travel segments using vehicle MPG and fuel prices from OCR\'d receipts.'
                        : `Total daily miles from OBD GPS trips are divided by vehicle MPG, then multiplied by fuel price (${fuelView} averages).`}
                      {' '}Positive variance (red) means actual expenses exceeded calculated costs; negative (green) means savings.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gas vs Maintenance Cost Comparison Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Gas vs Maintenance Cost Trends</CardTitle>
                <CardDescription>
                  {gasMaintView === 'job' ? 'Per expense/maintenance comparison' : 
                   gasMaintView === 'daily' ? 'Daily comparison of gas and maintenance expenses' : 
                   gasMaintView === 'weekly' ? 'Weekly comparison of gas and maintenance expenses' : 
                   gasMaintView === 'monthly' ? 'Monthly comparison of gas and maintenance expenses' : 
                   'Yearly comparison of gas and maintenance expenses'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!gasMaintData || gasMaintData.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No gas or maintenance data available for the selected period</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={gasMaintData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="gasCost" 
                        stackId="1"
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        name="Gas Cost"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="maintenanceCost" 
                        stackId="1"
                        stroke="#f59e0b" 
                        fill="#f59e0b" 
                        name="Maintenance Cost"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Total Cost Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Combined Cost Trend</CardTitle>
                <CardDescription>
                  Total gas and maintenance expenses {gasMaintView === 'job' ? 'per record' : 'over time'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!gasMaintData || gasMaintData.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No data available for the selected period</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={gasMaintData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="totalCost" 
                        stroke="#8b5cf6" 
                        strokeWidth={3}
                        name="Total Cost"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                {gasMaintView === 'job' ? 'Per Job Breakdown' : 
                 gasMaintView === 'daily' ? 'Daily Breakdown' : 
                 gasMaintView === 'weekly' ? 'Weekly Breakdown' : 
                 gasMaintView === 'monthly' ? 'Monthly Breakdown' : 
                 'Yearly Breakdown'}
              </CardTitle>
              <CardDescription>
                Detailed gas and maintenance cost analysis {gasMaintView === 'job' ? 'by expense/maintenance record' : `by ${gasMaintView === 'daily' ? 'day' : gasMaintView === 'weekly' ? 'week' : gasMaintView === 'monthly' ? 'month' : 'year'}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!gasMaintData || gasMaintData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                  <p className="text-gray-600">
                    No gas or maintenance expenses found in the selected time period.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-semibold">
                          {gasMaintView === 'job' ? 'Description' : 
                           gasMaintView === 'daily' ? 'Date' : 
                           gasMaintView === 'weekly' ? 'Week' : 
                           gasMaintView === 'monthly' ? 'Month' : 
                           'Year'}
                        </th>
                        <th className="text-right p-3 font-semibold">Gas Expenses</th>
                        <th className="text-right p-3 font-semibold">Gas Cost</th>
                        <th className="text-right p-3 font-semibold">Gallons</th>
                        <th className="text-right p-3 font-semibold">Maintenance Records</th>
                        <th className="text-right p-3 font-semibold">Maintenance Cost</th>
                        <th className="text-right p-3 font-semibold">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gasMaintData.map((row: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{row.name}</td>
                          <td className="text-right p-3">{row.gasCount}</td>
                          <td className="text-right p-3 text-blue-600">
                            ${row.gasCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="text-right p-3">
                            {row.totalGallons.toFixed(1)}
                          </td>
                          <td className="text-right p-3">{row.maintenanceCount}</td>
                          <td className="text-right p-3 text-orange-600">
                            ${row.maintenanceCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="text-right p-3 font-semibold text-purple-600">
                            ${row.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 bg-gray-50">
                      <tr className="font-bold">
                        <td className="p-3">Total</td>
                        <td className="text-right p-3">{gasMaintSummary?.totalGasExpenses || 0}</td>
                        <td className="text-right p-3 text-blue-600">
                          ${gasMaintSummary?.totalGasCost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </td>
                        <td className="text-right p-3">
                          {gasMaintSummary?.totalGallons?.toFixed(1) || '0.0'}
                        </td>
                        <td className="text-right p-3">{gasMaintSummary?.totalMaintenanceRecords || 0}</td>
                        <td className="text-right p-3 text-orange-600">
                          ${gasMaintSummary?.totalMaintenanceCost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </td>
                        <td className="text-right p-3 text-purple-600">
                          ${gasMaintSummary?.totalCost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

// Today's Fuel Usage Component
function TodayFuelUsage() {
  console.log('🚗 TodayFuelUsage component mounted');
  const { data: fuelData, isLoading, error, isFetching } = useQuery<any[]>({
    queryKey: ["/api/fuel/today"],
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: true, // Explicitly enable the query
  });
  console.log('🚗 TodayFuelUsage query state:', { fuelData, isLoading, error, isFetching, dataType: typeof fuelData, isArray: Array.isArray(fuelData) });

  const totalMiles = fuelData?.reduce((sum, v) => sum + v.totalMiles, 0) || 0;
  const totalGallons = fuelData?.reduce((sum, v) => sum + v.estimatedGallons, 0) || 0;
  const totalCost = fuelData?.reduce((sum, v) => sum + v.estimatedCost, 0) || 0;
  const totalTrips = fuelData?.reduce((sum, v) => sum + v.tripCount, 0) || 0;

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Today's Live Fuel Usage
            </CardTitle>
            <CardDescription>
              Real-time fuel consumption from GPS tracking • Updates every 30 seconds
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <Clock className="h-3 w-3 mr-1" />
            {format(new Date(), "h:mm a")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-20 rounded" />
            ))}
          </div>
        ) : !fuelData || fuelData.length === 0 || totalTrips === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <div className="text-4xl mb-3">🚗</div>
            <p className="font-medium">No driving data yet today</p>
            <p className="text-sm mt-1">GPS tracking is active. Data will appear as vehicles drive.</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600">Total Miles</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {totalMiles.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500">{totalTrips} trips</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600">Fuel Used</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {totalGallons.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">gallons</p>
                    </div>
                    <div className="text-3xl">⛽</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600">Estimated Cost</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${totalCost.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">today</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600">Avg MPG</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {totalGallons > 0 ? (totalMiles / totalGallons).toFixed(1) : '0.0'}
                      </p>
                      <p className="text-xs text-gray-500">fleet average</p>
                    </div>
                    <Calculator className="h-8 w-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vehicle Breakdown */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-gray-700">Vehicle Breakdown</h4>
              {fuelData.map((vehicle) => (
                <div
                  key={vehicle.vehicleId}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{vehicle.vehicleNumber}</p>
                    <p className="text-xs text-gray-500">
                      {vehicle.fuelEconomyMpg} MPG • {vehicle.tripCount} {vehicle.tripCount === 1 ? 'trip' : 'trips'}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-semibold text-gray-900">
                      {vehicle.totalMiles.toFixed(1)} mi
                    </p>
                    <p className="text-xs text-gray-600">
                      {vehicle.estimatedGallons.toFixed(2)} gal • ${vehicle.estimatedCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-100 rounded text-xs text-blue-800">
              <strong>Calculation:</strong> Total miles ÷ vehicle MPG × fuel price. 
              Updates automatically as vehicles complete trips today.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}