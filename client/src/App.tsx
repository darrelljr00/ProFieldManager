import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import CalendarPage from "@/pages/calendar";
import Leads from "@/pages/leads";
import Expenses from "@/pages/expenses";
import ExpenseReports from "@/pages/expense-reports";
import GasCards from "@/pages/gas-cards";
import Quotes from "@/pages/quotes";
import Invoices from "@/pages/invoices";
import Customers from "@/pages/customers";
import Payments from "@/pages/payments";
import InternalMessages from "@/pages/internal-messages";
import ImageGallery from "@/pages/image-gallery";
import Users from "@/pages/users";
import AdminSettings from "@/pages/admin-settings";
import SaasAdmin from "@/pages/saas-admin";
import SmsPage from "@/pages/sms";
import Reviews from "@/pages/reviews";
import Settings from "@/pages/settings";
import HumanResources from "@/pages/human-resources";
import FileManager from "@/pages/file-manager";
import MyTasks from "@/pages/my-tasks";
import Login from "@/pages/login";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  const { isAdmin } = useAuth();
  const { isConnected, lastMessage } = useWebSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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
        'sms_sent': ['/api/sms'],
        'lead_created': ['/api/leads'],
        'message_created': ['/api/messages'],
        'calendar_job_created': ['/api/calendar'],
        'gas_card_created': ['/api/gas-cards'],
        'review_request_sent': ['/api/reviews'],
        'user_created': ['/api/users'],
        'payment_processed': ['/api/payments', '/api/invoices', '/api/dashboard'],
        'disciplinary_action_created': ['/api/disciplinary-actions']
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="p-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Pro Field Manager</h1>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>
        
        <div className="flex-1 overflow-auto p-4 md:p-6">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/jobs" component={Projects} />
          <Route path="/jobs/:id" component={ProjectDetail} />
          <Route path="/leads" component={Leads} />
          <Route path="/expenses" component={Expenses} />
          <Route path="/expense-reports" component={ExpenseReports} />
          <Route path="/gas-cards" component={GasCards} />
          <Route path="/quotes" component={Quotes} />
          <Route path="/invoices" component={Invoices} />
          <Route path="/customers" component={Customers} />
          <Route path="/payments" component={Payments} />
          <Route path="/internal-messages" component={InternalMessages} />
          <Route path="/image-gallery" component={ImageGallery} />
          <Route path="/sms" component={SmsPage} />
          <Route path="/reviews" component={Reviews} />
          <Route path="/human-resources" component={HumanResources} />
          <Route path="/file-manager" component={FileManager} />
          <Route path="/my-tasks" component={MyTasks} />
          {isAdmin && <Route path="/users" component={Users} />}
          {isAdmin && <Route path="/admin-settings" component={AdminSettings} />}
          {isAdmin && <Route path="/saas-admin" component={SaasAdmin} />}
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
        </div>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

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

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/signup" component={Landing} />
      <Route path="/login" component={Login} />
      <Route component={Login} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
