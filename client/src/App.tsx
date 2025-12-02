import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Menu, Loader2 } from "lucide-react";
import { lazy, Suspense, useEffect, useState, memo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useGPSTracking } from "@/hooks/use-gps-tracking";
import { useAnalytics } from "@/hooks/use-analytics";

const PageLoader = memo(() => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
));
PageLoader.displayName = 'PageLoader';

import Dashboard from "@/pages/dashboard";
import HomePage from "@/pages/home";
import UniversalLogin from "@/pages/universal-login";
import DirectLogin from "@/pages/direct-login";
import NotFound from "@/pages/not-found";

const Projects = lazy(() => import("@/pages/projects"));
const ProjectDetail = lazy(() => import("@/pages/project-detail"));
const CalendarPage = lazy(() => import("@/pages/calendar"));
const Leads = lazy(() => import("@/pages/leads"));
const Money = lazy(() => import("@/pages/money"));
const Expenses = lazy(() => import("@/pages/expenses"));
const TechnicianExpenses = lazy(() => import("@/pages/technician-expenses"));
const ExpenseReports = lazy(() => import("@/pages/expense-reports"));
const ExpenseCategories = lazy(() => import("@/pages/expense-categories"));
const ExpenseCategoryManagement = lazy(() => import("@/pages/expense-category-management"));
const FrontendPageRenderer = lazy(() => import("@/pages/frontend-page-renderer"));
const DynamicExpenseCategory = lazy(() => import("@/pages/dynamic-expense-category"));
const Reports = lazy(() => import("@/pages/reports"));
const GasCardProviders = lazy(() => import("@/pages/gas-card-providers"));
const GasCards = lazy(() => import("@/pages/gas-cards"));
const Quotes = lazy(() => import("@/pages/quotes"));
const Services = lazy(() => import("@/pages/services"));
const Invoices = lazy(() => import("@/pages/invoices"));
const InvoiceTemplates = lazy(() => import("@/pages/invoice-templates"));
const Messages = lazy(() => import("@/pages/messages"));
const Customers = lazy(() => import("@/pages/customers"));
const Payments = lazy(() => import("@/pages/payments"));
const InternalMessages = lazy(() => import("@/pages/internal-messages"));
const ImageGallery = lazy(() => import("@/pages/image-gallery"));
const Users = lazy(() => import("@/pages/users"));
const AdminSettings = lazy(() => import("@/pages/admin-settings"));
const SaasAdmin = lazy(() => import("@/pages/saas-admin"));
const Promotions = lazy(() => import("@/pages/promotions"));
const SpinWheelPage = lazy(() => import("@/pages/spin-wheel"));
const SaasCallManagerPage = lazy(() => import("@/pages/saas-admin/call-manager"));
const CallManager = lazy(() => import("@/pages/call-manager"));
const SmsPage = lazy(() => import("@/pages/sms"));
const Reviews = lazy(() => import("@/pages/reviews"));
const Settings = lazy(() => import("@/pages/settings"));
const HumanResources = lazy(() => import("@/pages/human-resources"));
const FileManager = lazy(() => import("@/pages/file-manager"));
const MyTasks = lazy(() => import("@/pages/my-tasks"));
const JobTasks = lazy(() => import("@/pages/job-tasks"));
const GpsTracking = lazy(() => import("@/pages/gps-tracking"));
const GPSTrackingOBD = lazy(() => import("@/pages/gps-tracking-obd"));
const GPSAnalytics = lazy(() => import("@/pages/gps-analytics"));
const GPSSettings = lazy(() => import("@/pages/gps-settings"));
const FuelUsageToday = lazy(() => import("@/pages/fuel-usage-today"));
const FormBuilder = lazy(() => import("@/pages/form-builder"));
const MobileTest = lazy(() => import("@/pages/mobile-test"));
const TimeClock = lazy(() => import("@/pages/time-clock"));
const Inspections = lazy(() => import("@/pages/inspections"));
const Weather = lazy(() => import("@/pages/weather"));
const FileSecurity = lazy(() => import("@/pages/file-security"));
const PartsSupplies = lazy(() => import("@/pages/parts-supplies"));
const MarketResearch = lazy(() => import("@/pages/market-research"));
const TaskGroups = lazy(() => import("@/pages/task-groups"));
const SmartCapture = lazy(() => import("@/pages/smart-capture"));
const LiveStream = lazy(() => import("@/pages/live-stream"));
const LiveStreamEnhanced = lazy(() => import("@/pages/live-stream-enhanced"));
const Login = lazy(() => import("@/pages/login"));
const SimpleLogin = lazy(() => import("@/pages/simple-login"));
const CustomDomainLogin = lazy(() => import("@/pages/custom-domain-login"));
const DemoSignupPage = lazy(() => import("@/pages/demo-signup"));
const PasswordResetRequest = lazy(() => import("@/pages/password-reset-request"));
const PasswordResetComplete = lazy(() => import("@/pages/password-reset-complete"));
const FeaturesPage = lazy(() => import("@/pages/features"));
const AuthDebug = lazy(() => import("@/pages/auth-debug"));
const Logout = lazy(() => import("@/pages/logout"));
const Tutorials = lazy(() => import("@/pages/tutorials"));
const MySchedule = lazy(() => import("@/pages/my-schedule"));
const Notifications = lazy(() => import("@/pages/notifications"));
const ScreenSharing = lazy(() => import("@/pages/screen-sharing"));
const SharedPhotosViewer = lazy(() => import("@/pages/shared-photos"));
const QuoteResponsePage = lazy(() => import("@/pages/quote-response"));
const QuoteAvailabilityPage = lazy(() => import("@/pages/quote-availability"));
const PublicInvoicePayment = lazy(() => import("@/pages/public-invoice-payment"));
const PublicQuotePayment = lazy(() => import("@/pages/public-quote-payment"));
const PaymentSuccess = lazy(() => import("@/pages/payment-success"));
const PaymentError = lazy(() => import("@/pages/payment-error"));
const DeletedJobs = lazy(() => import("@/pages/deleted-jobs").then(m => ({ default: m.DeletedJobs })));
const CancelledJobs = lazy(() => import("@/pages/cancelled-jobs").then(m => ({ default: m.CancelledJobs })));
const GetStartedPage = lazy(() => import("@/pages/get-started"));
const GeneralContractorsPage = lazy(() => import("@/pages/services/general-contractors"));
const ElectriciansPage = lazy(() => import("@/pages/services/electricians"));
const PlumbersPage = lazy(() => import("@/pages/services/plumbers"));
const ConstructionPage = lazy(() => import("@/pages/services/construction"));
const HandymanPage = lazy(() => import("@/pages/services/handyman"));
const HVACPage = lazy(() => import("@/pages/services/hvac"));
const PressureWashersPage = lazy(() => import("@/pages/services/pressure-washers"));
const WindowWashersPage = lazy(() => import("@/pages/services/window-washers"));
const ServiceTechsPage = lazy(() => import("@/pages/services/service-techs"));
const DeployCWP = lazy(() => import("@/pages/deploy-cwp"));
const FrontendManagement = lazy(() => import("@/pages/frontend-management"));
const SliderManagement = lazy(() => import("@/pages/slider-management"));
const PopupManagement = lazy(() => import("@/pages/popup-management"));
const LiveChatManagement = lazy(() => import("@/pages/live-chat-management"));
const WebsiteAnalytics = lazy(() => import("@/pages/website-analytics"));

function AuthenticatedApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';
  
  useWebSocket();
  useGPSTracking();

  useEffect(() => {
    const handleWebSocketUpdate = (event: CustomEvent) => {
      const eventType = event.detail?.type;
      
      const queryInvalidationMap: Record<string, string[]> = {
        'project_created': ['/api/projects', '/api/dashboard', '/api/calendar/events'],
        'project_updated': ['/api/projects', '/api/dashboard', '/api/calendar/events'],
        'customer_created': ['/api/customers', '/api/dashboard'],
        'customer_updated': ['/api/customers', '/api/dashboard'],
        'invoice_created': ['/api/invoices', '/api/dashboard'],
        'invoice_updated': ['/api/invoices', '/api/dashboard'],
        'quote_created': ['/api/quotes', '/api/dashboard'],
        'quote_updated': ['/api/quotes', '/api/dashboard'],
        'expense_created': ['/api/expenses', '/api/dashboard'],
        'expense_updated': ['/api/expenses', '/api/dashboard'],
        'message_created': ['/api/messages'],
        'message_updated': ['/api/messages'],
        'lead_created': ['/api/leads', '/api/dashboard'],
        'lead_updated': ['/api/leads', '/api/dashboard'],
        'notification_created': ['/api/notifications', '/api/notifications/unread-count'],
        'notification_updated': ['/api/notifications', '/api/notifications/unread-count'],
        'internal_message_created': ['/api/internal-messages', '/api/internal-messages/unread-count'],
        'internal_message_updated': ['/api/internal-messages', '/api/internal-messages/unread-count'],
        'gps_ping_received': ['/api/gps/pings', '/api/gps/devices'],
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
          <div className="w-10" />
        </div>
        
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<PageLoader />}>
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
              {isAdmin && <Route path="/promotions" component={Promotions} />}
              {isAdmin && <Route path="/saas-admin/call-manager" component={SaasCallManagerPage} />}
              <Route path="/call-manager" component={CallManager} />
              <Route path="/settings" component={Settings} />
              <Route path="/fuel-usage-today" component={FuelUsageToday} />
              <Route path="/file-security" component={FileSecurity} />
              {isAdmin && <Route path="/deploy-cwp" component={DeployCWP} />}
              <Route path="/website-preview" component={HomePage} />
              <Route path="/features" component={FeaturesPage} />
              <Route path="/reports" component={Reports} />
              <Route path="/frontend-management" component={FrontendManagement} />
              <Route path="/slider-management" component={SliderManagement} />
              <Route path="/popup-management" component={PopupManagement} />
              <Route path="/live-chat-management" component={LiveChatManagement} />
              <Route path="/website-analytics" component={WebsiteAnalytics} />
              <Route path="/logout" component={Logout} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function PublicRoutes() {
  useAnalytics();

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/website-preview" component={HomePage} />
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
          <Route path="/get-started" component={GetStartedPage} />
          <Route path="/spin-wheel/:id" component={SpinWheelPage} />
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
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  
  console.log('Router state:', { isAuthenticated, isLoading, currentPath: location });

  if (isLoading) {
    return <PageLoader />;
  }

  if (isAuthenticated) {
    return <AuthenticatedApp />;
  }

  return <PublicRoutes />;
}

function App() {
  useEffect(() => {
    const initCustomDomain = async () => {
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
      } catch (error: any) {
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
