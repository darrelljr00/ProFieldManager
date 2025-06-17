import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/sidebar";
import { lazy, Suspense, useEffect } from "react";
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
import SmsPage from "@/pages/sms";
import Reviews from "@/pages/reviews";
import Settings from "@/pages/settings";
import HumanResources from "@/pages/human-resources";
import Login from "@/pages/login";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  const { isAdmin } = useAuth();
  const { isConnected } = useWebSocket();
  
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/projects" component={Projects} />
          <Route path="/projects/:id" component={ProjectDetail} />
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
          {isAdmin && <Route path="/users" component={Users} />}
          {isAdmin && <Route path="/admin-settings" component={AdminSettings} />}
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
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
