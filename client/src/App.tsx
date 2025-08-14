import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useGPSTracking } from "@/hooks/use-gps-tracking";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import CalendarPage from "@/pages/calendar";
import Leads from "@/pages/leads";
import Expenses from "@/pages/expenses";
import ExpenseReports from "@/pages/expense-reports";
import ExpenseCategories from "@/pages/expense-categories";
import Reports from "@/pages/reports";
import GasCardProviders from "@/pages/gas-card-providers";
import GasCards from "@/pages/gas-cards";
import Quotes from "@/pages/quotes";
import Invoices from "@/pages/invoices";
import InvoiceTemplates from "@/pages/invoice-templates";
import Messages from "@/pages/messages";
import Customers from "@/pages/customers";
import Payments from "@/pages/payments";
import InternalMessages from "@/pages/internal-messages";
import ImageGallery from "@/pages/image-gallery";
import Users from "@/pages/users";
import AdminSettings from "@/pages/admin-settings";
import SaasAdmin from "@/pages/saas-admin";
import SaasAdminCallManager from "@/pages/saas-admin-call-manager";
import CallManager from "@/pages/call-manager";
import SmsPage from "@/pages/sms";
import Reviews from "@/pages/reviews";
import Settings from "@/pages/settings";
import HumanResources from "@/pages/human-resources";
import FileManager from "@/pages/file-manager";
import MyTasks from "@/pages/my-tasks";
import JobTasks from "@/pages/job-tasks";
import GpsTracking from "@/pages/gps-tracking";
import FormBuilder from "@/pages/form-builder";
import MobileTest from "@/pages/mobile-test";
import TimeClock from "@/pages/time-clock";
import Inspections from "@/pages/inspections";
import Weather from "@/pages/weather";
import FileSecurity from "@/pages/file-security";
import PartsSupplies from "@/pages/parts-supplies";
import MarketResearch from "@/pages/market-research";
import TaskGroups from "@/pages/task-groups";
import Login from "@/pages/login";
import SimpleLogin from "@/pages/simple-login";
import HomePage from "@/pages/home";
import FeaturesPage from "@/pages/features";
import NotFound from "@/pages/not-found";
import { DeletedJobs } from "@/pages/deleted-jobs";
import { CancelledJobs } from "@/pages/cancelled-jobs";
import FrontendManagement from "@/pages/frontend-management";
import Tutorials from "@/pages/tutorials";
import MySchedule from "@/pages/my-schedule";
import Notifications from "@/pages/notifications";
import ScreenSharing from "@/pages/screen-sharing";
import { HelpButton } from "@/components/help-button";

function AuthenticatedApp() {
  const { isAdmin } = useAuth();
  const { isConnected, lastMessage } = useWebSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Start GPS tracking for mobile users
  useGPSTracking();
  
  // Listen for WebSocket updates and invalidate queries
  useEffect(() => {
    const handleWebSocketUpdate = (event: CustomEvent) => {
      const { eventType } = event.detail;
      
      // Invalidate relevant queries based on event type
      const queryInvalidationMap: Record<string, string[]> = {
        'invoice_created': ['/api/invoices', '/api/dashboard'],
        'expense_created': ['/api/expenses', '/api/dashboard'],
        'expense_with_line_items_created': ['/api/expenses', '/api/dashboard'],
        'quote_created': ['/api/quotes', '/api/dashboard'],
        'customer_created': ['/api/customers'],
        'project_created': ['/api/projects', '/api/dashboard'],
        'job_status_changed': ['/api/projects', '/api/dispatch/scheduled-jobs', '/api/dashboard'],
        'sms_sent': ['/api/sms'],
        'lead_created': ['/api/leads'],
        'message_created': ['/api/messages'],
        'new_message': ['/api/internal-messages'],
        'message_sent': ['/api/internal-messages'],
        'calendar_job_created': ['/api/calendar'],
        'gas_card_created': ['/api/gas-cards'],
        'review_request_sent': ['/api/reviews'],
        'user_created': ['/api/users', '/api/reports/employee-data', '/api/reports/data'],
        'payment_processed': ['/api/payments', '/api/invoices', '/api/dashboard'],
        'disciplinary_action_created': ['/api/disciplinary-actions'],
        'project_user_assigned': ['/api/projects'],
        'project_user_removed': ['/api/projects'],
        'project_users_assigned': ['/api/projects'], 
        'project_users_removed': ['/api/projects'],
        'project_deleted': ['/api/projects', '/api/projects/deleted'],
        'project_cancelled': ['/api/projects', '/api/projects/cancelled'],
        'employee_updated': ['/api/users', '/api/reports/employee-data', '/api/reports/data'],
        'employee_deleted': ['/api/users', '/api/reports/employee-data', '/api/reports/data'],
        'employee_permissions_updated': ['/api/users', '/api/reports/employee-data', '/api/reports/data'],
        'employee_activated': ['/api/users', '/api/reports/employee-data', '/api/reports/data'],
        'employee_deactivated': ['/api/users', '/api/reports/employee-data', '/api/reports/data'],
        'navigation_order_updated': ['/api/navigation-order'],
        'navigation_order_reset': ['/api/navigation-order'],
        'navigation_order_forced_update': ['/api/navigation-order']
      };
      
      const queriesToInvalidate = queryInvalidationMap[eventType];
      if (queriesToInvalidate) {
        queriesToInvalidate.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        });
      }
    };

    window.addEventListener('websocket-update', handleWebSocketUpdate as EventListener);
    
    return () => {
      window.removeEventListener('websocket-update', handleWebSocketUpdate as EventListener);
    };
  }, []);
  
  return (
    <div className="flex h-screen w-screen bg-gray-50 fixed inset-0">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-3 sm:p-4 flex items-center justify-between sticky top-0 z-40">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Pro Field Manager</h1>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>
        
        <div className="flex-1 overflow-auto p-2 sm:p-4 md:p-6">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/jobs" component={Projects} />
          <Route path="/jobs/deleted" component={DeletedJobs} />
          <Route path="/jobs/cancelled" component={CancelledJobs} />
          <Route path="/jobs/:id" component={ProjectDetail} />
          <Route path="/jobs/:id/tasks" component={JobTasks} />
          <Route path="/task-groups" component={TaskGroups} />
          <Route path="/leads" component={Leads} />
          <Route path="/expenses" component={Expenses} />
          <Route path="/expense-reports" component={ExpenseReports} />
          <Route path="/expense-categories" component={ExpenseCategories} />
          <Route path="/gas-card-providers" component={GasCardProviders} />
          <Route path="/gas-cards" component={GasCards} />
          <Route path="/quotes" component={Quotes} />
          <Route path="/invoices" component={Invoices} />
          <Route path="/invoice-templates" component={InvoiceTemplates} />
          <Route path="/messages" component={Messages} />
          <Route path="/customers" component={Customers} />
          <Route path="/payments" component={Payments} />
          <Route path="/internal-messages" component={InternalMessages} />
          <Route path="/image-gallery" component={ImageGallery} />
          <Route path="/sms" component={SmsPage} />
          <Route path="/reviews" component={Reviews} />
          <Route path="/market-research" component={MarketResearch} />
          <Route path="/human-resources" component={HumanResources} />
          <Route path="/file-manager" component={FileManager} />
          <Route path="/my-tasks" component={MyTasks} />
          <Route path="/task-groups" component={TaskGroups} />
          <Route path="/gps-tracking" component={GpsTracking} />
          <Route path="/weather" component={Weather} />
          <Route path="/time-clock" component={TimeClock} />
          <Route path="/form-builder" component={FormBuilder} />
          <Route path="/inspections" component={Inspections} />
          <Route path="/tutorials" component={Tutorials} />
          <Route path="/my-schedule" component={MySchedule} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/screen-sharing" component={ScreenSharing} />
          <Route path="/mobile-test" component={MobileTest} />
          <Route path="/users" component={Users} />
          <Route path="/parts-supplies" component={PartsSupplies} />
          {isAdmin && <Route path="/admin-settings" component={AdminSettings} />}
          {isAdmin && <Route path="/saas-admin" component={SaasAdmin} />}
          {isAdmin && <Route path="/saas-admin/call-manager" component={SaasAdminCallManager} />}
          {isAdmin && <Route path="/call-manager" component={CallManager} />}
          {isAdmin && <Route path="/file-security" component={FileSecurity} />}
          {isAdmin && <Route path="/frontend-management" component={FrontendManagement} />}
          <Route path="/settings" component={Settings} />
          <Route path="/reports" component={Reports} />
          <Route component={NotFound} />
        </Switch>
        </div>
      </div>
      
      {/* Global Help Button */}
      <HelpButton />
    </div>
  );
}

function Router() {
  const authHook = useAuth();
  const isAuthenticated = authHook?.isAuthenticated ?? false;
  const isLoading = authHook?.isLoading ?? false;
  const error = false; // Remove error property as it doesn't exist in useAuth

  console.log('Router state:', { isAuthenticated, isLoading, hasError: !!error });

  // Store intended destination for protected routes when user is not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && error) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/' && currentPath !== '/signup') {
        localStorage.setItem('intended_destination', currentPath);
      }
    }
  }, [isAuthenticated, isLoading, error]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isAuthenticated) {
    // Ensure we redirect to dashboard if user is on login page or unknown route
    const currentPath = window.location.pathname;
    if (currentPath === '/login' || currentPath === '/login-full' || currentPath === '/signup') {
      window.history.replaceState({}, '', '/');
    }
    return <AuthenticatedApp />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/features" component={FeaturesPage} />
          <Route path="/signup" component={FeaturesPage} />
          <Route path="/login" component={SimpleLogin} />
          <Route path="/login-full" component={Login} />
          <Route component={SimpleLogin} />
        </Switch>
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
