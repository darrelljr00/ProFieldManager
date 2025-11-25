import { Switch, Route, useLocation } from "wouter";
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
import { useAnalytics } from "@/hooks/use-analytics";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import CalendarPage from "@/pages/calendar";
import Leads from "@/pages/leads";
import Money from "@/pages/money";
import Expenses from "@/pages/expenses";
import TechnicianExpenses from "@/pages/technician-expenses";
import ExpenseReports from "@/pages/expense-reports";
import ExpenseCategories from "@/pages/expense-categories";
import ExpenseCategoryManagement from "@/pages/expense-category-management";
import FrontendPageRenderer from "@/pages/frontend-page-renderer";
import DynamicExpenseCategory from "@/pages/dynamic-expense-category";
import Reports from "@/pages/reports";
import GasCardProviders from "@/pages/gas-card-providers";
import GasCards from "@/pages/gas-cards";
import Quotes from "@/pages/quotes";
import Services from "@/pages/services";
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
import SaasCallManagerPage from "@/pages/saas-admin/call-manager";
import CallManager from "@/pages/call-manager";
import SmsPage from "@/pages/sms";
import Reviews from "@/pages/reviews";
import Settings from "@/pages/settings";
import HumanResources from "@/pages/human-resources";
import FileManager from "@/pages/file-manager";
import MyTasks from "@/pages/my-tasks";
import JobTasks from "@/pages/job-tasks";
import GpsTracking from "@/pages/gps-tracking";
import GPSTrackingOBD from "@/pages/gps-tracking-obd";
import GPSAnalytics from "@/pages/gps-analytics";
import GPSSettings from "@/pages/gps-settings";
import FuelUsageToday from "@/pages/fuel-usage-today";
import FormBuilder from "@/pages/form-builder";
import MobileTest from "@/pages/mobile-test";
import TimeClock from "@/pages/time-clock";
import Inspections from "@/pages/inspections";
import Weather from "@/pages/weather";
import FileSecurity from "@/pages/file-security";
import PartsSupplies from "@/pages/parts-supplies";
import MarketResearch from "@/pages/market-research";
import TaskGroups from "@/pages/task-groups";
import SmartCapture from "@/pages/smart-capture";
import LiveStream from "@/pages/live-stream";
import LiveStreamEnhanced from "@/pages/live-stream-enhanced";
import Login from "@/pages/login";
import SimpleLogin from "@/pages/simple-login";
import DirectLogin from "@/pages/direct-login";
import CustomDomainLogin from "@/pages/custom-domain-login";
import UniversalLogin from "@/pages/universal-login";
import DemoSignupPage from "@/pages/demo-signup";
import PasswordResetRequest from "@/pages/password-reset-request";
import PasswordResetComplete from "@/pages/password-reset-complete";
import HomePage from "@/pages/home";
import FeaturesPage from "@/pages/features";
import AuthDebug from "@/pages/auth-debug";
import NotFound from "@/pages/not-found";
import SharedPhotosViewer from "@/pages/shared-photos";
import QuoteResponsePage from "@/pages/quote-response";
import QuoteAvailabilityPage from "@/pages/quote-availability";
import { DeletedJobs } from "@/pages/deleted-jobs";
import { CancelledJobs } from "@/pages/cancelled-jobs";
import FrontendManagement from "@/pages/frontend-management";
import SliderManagement from "@/pages/slider-management";
import PopupManagement from "@/pages/popup-management";
import LiveChatManagement from "@/pages/live-chat-management";
import Tutorials from "@/pages/tutorials";
import MySchedule from "@/pages/my-schedule";
import Notifications from "@/pages/notifications";
import ScreenSharing from "@/pages/screen-sharing";
import Logout from "@/pages/logout";
import DeployCWP from "@/pages/deploy-cwp";
import WebsiteAnalytics from "@/pages/website-analytics";
import { HelpButton } from "@/components/help-button";
import { MobileSensorTracker } from "@/components/MobileSensorTracker";
import { LiveChatWidget } from "@/components/LiveChatWidget";
import GeneralContractorsPage from "@/pages/services/general-contractors";
import ElectriciansPage from "@/pages/services/electricians";
import PlumbersPage from "@/pages/services/plumbers";
import ConstructionPage from "@/pages/services/construction";
import HandymanPage from "@/pages/services/handyman";
import HVACPage from "@/pages/services/hvac";
import PressureWashersPage from "@/pages/services/pressure-washers";
import WindowWashersPage from "@/pages/services/window-washers";
import ServiceTechsPage from "@/pages/services/service-techs";
import PublicInvoicePayment from "@/pages/public-invoice-payment";
import PublicQuotePayment from "@/pages/public-quote-payment";
import PaymentSuccess from "@/pages/payment-success";
import PaymentError from "@/pages/payment-error";

function AuthenticatedApp() {
  const { isAdmin, user } = useAuth();
  const { isConnected, lastMessage } = useWebSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  console.log('AuthenticatedApp - isAdmin:', isAdmin, 'user role:', user?.role);
  
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
        'quote_response': ['/api/quotes', '/api/dashboard'],
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
          <Route path="/smart-capture" component={SmartCapture} />
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
          <Route path="/money" component={Money} />
          <Route path="/expenses" component={Expenses} />
          <Route path="/technician-expenses" component={TechnicianExpenses} />
          <Route path="/expense-reports" component={ExpenseReports} />
          <Route path="/expense-category-management" component={ExpenseCategoryManagement} />
          <Route path="/expense-category/:slug" component={DynamicExpenseCategory} />
          <Route path="/expense-categories" component={ExpenseCategories} />
          <Route path="/gas-card-providers" component={GasCardProviders} />
          <Route path="/gas-cards" component={GasCards} />
          <Route path="/quotes" component={Quotes} />
          <Route path="/services" component={Services} />
          <Route path="/invoices" component={Invoices} />
          <Route path="/invoice-templates" component={InvoiceTemplates} />
          <Route path="/messages" component={Messages} />
          <Route path="/customers" component={Customers} />
          <Route path="/payments" component={Payments} />
          <Route path="/internal-messages" component={InternalMessages} />
          <Route path="/live-stream" component={LiveStream} />
          <Route path="/live-stream-enhanced" component={LiveStreamEnhanced} />
          <Route path="/image-gallery" component={ImageGallery} />
          <Route path="/sms" component={SmsPage} />
          <Route path="/reviews" component={Reviews} />
          <Route path="/market-research" component={MarketResearch} />
          <Route path="/human-resources" component={HumanResources} />
          <Route path="/file-manager" component={FileManager} />
          <Route path="/my-tasks" component={MyTasks} />
          <Route path="/task-groups" component={TaskGroups} />
          <Route path="/gps-tracking" component={GpsTracking} />
          <Route path="/gps-tracking-obd" component={GPSTrackingOBD} />
          <Route path="/gps-analytics" component={GPSAnalytics} />
          <Route path="/gps-settings" component={GPSSettings} />
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
          {isAdmin && <Route path="/saas-admin/call-manager" component={SaasCallManagerPage} />}
          {isAdmin && <Route path="/call-manager" component={CallManager} />}
          {isAdmin && <Route path="/file-security" component={FileSecurity} />}
          {isAdmin && <Route path="/frontend-management" component={FrontendManagement} />}
          {isAdmin && <Route path="/slider-management" component={SliderManagement} />}
          {isAdmin && <Route path="/popup-management" component={PopupManagement} />}
          <Route path="/live-chat-management" component={LiveChatManagement} />
          <Route path="/settings" component={Settings} />
          <Route path="/deploy-cwp" component={DeployCWP} />
          <Route path="/website-analytics" component={WebsiteAnalytics} />
          <Route path="/reports" component={Reports} />
          <Route path="/logout" component={Logout} />
          <Route component={NotFound} />
        </Switch>
        </div>
      </div>
      
      {/* Global Help Button */}
      <HelpButton />
      
      {/* Mobile Sensor Tracker for Pro Field Sense */}
      <MobileSensorTracker />
      
      {/* Live Chat Widget for all pages */}
      <LiveChatWidget />
    </div>
  );
}


// Public Routes with automatic analytics tracking for all unauthenticated pages
// Any new public page added here will automatically be tracked
function PublicRoutes() {
  // Centralized analytics tracking for ALL public pages
  // This ensures new pages are automatically tracked without developer intervention
  useAnalytics({ 
    enableInternal: true, 
    organizationId: 4, // Pro Field Manager platform organization
    enableGA: true, 
    enableFB: true 
  });

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
          <Route path="/demo-signup" component={DemoSignupPage} />
          <Route path="/services/general-contractors" component={GeneralContractorsPage} />
          <Route path="/services/electricians" component={ElectriciansPage} />
          <Route path="/services/plumbers" component={PlumbersPage} />
          <Route path="/services/construction" component={ConstructionPage} />
          <Route path="/services/handyman" component={HandymanPage} />
          <Route path="/services/hvac" component={HVACPage} />
          <Route path="/services/pressure-washers" component={PressureWashersPage} />
          <Route path="/services/window-washers" component={WindowWashersPage} />
          <Route path="/services/service-techs" component={ServiceTechsPage} />
          <Route path="/login" component={UniversalLogin} />
          <Route path="/password-reset-request" component={PasswordResetRequest} />
          <Route path="/password-reset-complete" component={PasswordResetComplete} />
          <Route path="/login-simple" component={SimpleLogin} />
          <Route path="/login-full" component={Login} />
          <Route path="/auth-debug" component={AuthDebug} />
          <Route path="/shared/:token" component={SharedPhotosViewer} />
          <Route path="/quote/:action/:token" component={QuoteResponsePage} />
          <Route path="/site/:orgSlug/:pageSlug" component={FrontendPageRenderer} />
          <Route path="/quote-availability/:token" component={QuoteAvailabilityPage} />
          {/* Public payment pages - no authentication required */}
          <Route path="/:orgSlug/invoice/:invoiceId/pay" component={PublicInvoicePayment} />
          <Route path="/:orgSlug/quote/:quoteId/pay" component={PublicQuotePayment} />
          <Route path="/payment/success" component={PaymentSuccess} />
          <Route path="/payment/error" component={PaymentError} />
          
          <Route component={DirectLogin} />
        </Switch>
      </Suspense>
    </div>
  );
}
function Router() {
  const authHook = useAuth();
  const isAuthenticated = authHook?.isAuthenticated ?? false;
  const isLoading = authHook?.isLoading ?? false;
  const [location, setLocation] = useLocation();

  console.log('Router state:', { isAuthenticated, isLoading, currentPath: location });

  // Store intended destination for protected routes when user is not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/' && currentPath !== '/signup' && currentPath !== '/login-full') {
        localStorage.setItem('intended_destination', currentPath);
      }
    }
  }, [isAuthenticated, isLoading]);

  // Handle redirect after successful authentication
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const currentPath = window.location.pathname;
      console.log('🔄 Authentication detected, current path:', currentPath);
      
      // Don't redirect if on logout page (let logout complete)
      if (currentPath === '/logout') {
        console.log('⏳ On logout page, skipping redirect to allow logout to complete');
        return;
      }
      
      if (currentPath === '/login' || currentPath === '/login-full' || currentPath === '/signup' || currentPath === '/') {
        const intendedDestination = localStorage.getItem('intended_destination');
        localStorage.removeItem('intended_destination');
        
        const redirectPath = intendedDestination || '/dashboard';
        console.log('🎯 Redirecting authenticated user to:', redirectPath);
        
        // Use both setLocation and window.location for reliability
        setLocation(redirectPath);
        if (window.location.pathname !== redirectPath) {
          window.history.replaceState({}, '', redirectPath);
        }
      }
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <AuthenticatedApp />;
  }

  return <PublicRoutes />;
}

function App() {
  // Initialize custom domain detection on app startup
  useEffect(() => {
    const initCustomDomain = async () => {
      // Check if we're being loaded from a custom domain context
      try {
        const response = await fetch('/api/init/custom-domain', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.isCustomDomain) {
            console.log('🏷️ CUSTOM DOMAIN DETECTED - Setting flags from server response');
            localStorage.setItem('custom_domain_session', 'true');
            localStorage.setItem('accessed_from_custom_domain', 'true');
          }
        }
      } catch (error) {
        // Silently fail - this is just an initialization check
        console.log('🔍 Custom domain init check failed (expected for Replit domain):', error.message);
      }
    };
    
    initCustomDomain();
  }, []);

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
