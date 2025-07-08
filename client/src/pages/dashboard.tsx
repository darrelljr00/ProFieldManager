import { useQuery } from "@tanstack/react-query";
import { StatsCards } from "@/components/stats-cards";
import { RevenueChart } from "@/components/revenue-chart";
import { RecentActivity } from "@/components/recent-activity";
import { InvoicesTable } from "@/components/invoices-table";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/components/invoice-form";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Plus, Calendar, MessageCircle, Users, CheckSquare, Cloud, Briefcase } from "lucide-react";
import { useState } from "react";

type DashboardSettings = {
  // Widget visibility
  showStatsCards: boolean;
  showRevenueChart: boolean;
  showRecentActivity: boolean;
  showRecentInvoices: boolean;
  showNotifications: boolean;
  showQuickActions: boolean;
  showProjectsOverview: boolean;
  showWeatherWidget: boolean;
  showTasksWidget: boolean;
  showCalendarWidget: boolean;
  showMessagesWidget: boolean;
  showTeamOverview: boolean;
  
  // Layout and appearance
  widgetOrder: string[];
  layoutType: 'grid' | 'list' | 'compact';
  gridColumns: number;
  widgetSize: 'small' | 'medium' | 'large';
  colorTheme: 'default' | 'dark' | 'blue' | 'green' | 'purple';
  animationsEnabled: boolean;
  
  // Widget-specific settings
  statsCardsCount: number;
  recentItemsCount: number;
  refreshInterval: number;
  showWelcomeMessage: boolean;
  compactMode: boolean;
};

export default function Dashboard() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/invoices"],
  });

  const { data: dashboardSettings, isLoading: settingsLoading } = useQuery<DashboardSettings>({
    queryKey: ["/api/settings/dashboard"],
  });

  // Use default settings if not loaded yet
  const settings = dashboardSettings || {
    showStatsCards: true,
    showRevenueChart: true,
    showRecentActivity: true,
    showRecentInvoices: true,
    showNotifications: true,
    showQuickActions: true,
    showProjectsOverview: false,
    showWeatherWidget: false,
    showTasksWidget: false,
    showCalendarWidget: false,
    showMessagesWidget: false,
    showTeamOverview: false,
    layoutType: 'grid' as const,
    gridColumns: 3,
    widgetSize: 'medium' as const,
    colorTheme: 'default' as const,
    animationsEnabled: true,
    statsCardsCount: 4,
    recentItemsCount: 5,
    refreshInterval: 30,
    showWelcomeMessage: true,
    compactMode: false,
    widgetOrder: ['stats', 'revenue', 'activity', 'invoices']
  };

  const recentInvoices = invoices?.slice(0, settings.recentItemsCount || 5) || [];

  return (
    <div className="flex-1">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 hidden sm:block">Welcome back! Here's what's happening with your invoices.</p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
            {settings.showQuickActions && (
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-blue-700 flex-1 sm:flex-none text-sm sm:text-base">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">New Invoice</span>
                    <span className="xs:hidden">New</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-[85vw] md:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <InvoiceForm onSuccess={() => setIsCreateModalOpen(false)} />
                </DialogContent>
              </Dialog>
            )}
            {settings.showNotifications && (
              <div className="relative">
                <Button variant="ghost" size="icon">
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[10px] md:text-xs">
                    3
                  </span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 md:p-6">
        {/* Stats Cards */}
        {settings.showStatsCards && (
          <StatsCards stats={stats} isLoading={statsLoading} />
        )}

        {/* Main Dashboard Grid */}
        {(settings.showRevenueChart || settings.showRecentActivity) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mt-6 md:mt-8">
            {/* Revenue Chart */}
            {settings.showRevenueChart && (
              <div className={settings.showRecentActivity ? "lg:col-span-2" : "lg:col-span-3"}>
                <RevenueChart />
              </div>
            )}

            {/* Recent Activity */}
            {settings.showRecentActivity && (
              <div className={settings.showRevenueChart ? "" : "lg:col-span-3"}>
                <RecentActivity />
              </div>
            )}
          </div>
        )}

        {/* Recent Invoices Table */}
        {settings.showRecentInvoices && (
          <div className="mt-6 md:mt-8">
            <InvoicesTable 
              invoices={recentInvoices} 
              isLoading={invoicesLoading}
              title="Recent Invoices"
              showViewAll={true}
            />
          </div>
        )}

        {/* Additional Widgets Row */}
        {(settings.showProjectsOverview || settings.showWeatherWidget || settings.showTasksWidget || settings.showCalendarWidget || settings.showMessagesWidget || settings.showTeamOverview) && (
          <div className={`mt-6 md:mt-8 ${settings.layoutType === 'grid' ? `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(settings.gridColumns, 3)} gap-4 md:gap-6` : 'space-y-4'}`}>
            
            {/* Projects Overview Widget */}
            {settings.showProjectsOverview && (
              <Card className={`${settings.animationsEnabled ? 'transition-all duration-300 hover:shadow-lg' : ''} ${settings.widgetSize === 'small' ? 'p-3' : settings.widgetSize === 'large' ? 'p-6' : 'p-4'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                    Active Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">In Progress</span>
                      <span className="font-semibold">8</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Completed</span>
                      <span className="font-semibold text-green-600">24</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">On Hold</span>
                      <span className="font-semibold text-yellow-600">3</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Weather Widget */}
            {settings.showWeatherWidget && (
              <Card className={`${settings.animationsEnabled ? 'transition-all duration-300 hover:shadow-lg' : ''} ${settings.widgetSize === 'small' ? 'p-3' : settings.widgetSize === 'large' ? 'p-6' : 'p-4'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Cloud className="h-5 w-5 text-blue-500" />
                    Weather
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold">72°F</div>
                    <div className="text-sm text-gray-600">
                      <div>Partly Cloudy</div>
                      <div>Dallas, TX</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tasks Widget */}
            {settings.showTasksWidget && (
              <Card className={`${settings.animationsEnabled ? 'transition-all duration-300 hover:shadow-lg' : ''} ${settings.widgetSize === 'small' ? 'p-3' : settings.widgetSize === 'large' ? 'p-6' : 'p-4'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckSquare className="h-5 w-5 text-green-600" />
                    My Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Complete project report</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Review invoices</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Team meeting at 3 PM</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Calendar Widget */}
            {settings.showCalendarWidget && (
              <Card className={`${settings.animationsEnabled ? 'transition-all duration-300 hover:shadow-lg' : ''} ${settings.widgetSize === 'small' ? 'p-3' : settings.widgetSize === 'large' ? 'p-6' : 'p-4'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    Upcoming
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <div className="font-semibold">Client Meeting</div>
                      <div className="text-gray-600">Today, 2:00 PM</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-semibold">Project Deadline</div>
                      <div className="text-gray-600">Tomorrow, 5:00 PM</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Messages Widget */}
            {settings.showMessagesWidget && (
              <Card className={`${settings.animationsEnabled ? 'transition-all duration-300 hover:shadow-lg' : ''} ${settings.widgetSize === 'small' ? 'p-3' : settings.widgetSize === 'large' ? 'p-6' : 'p-4'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageCircle className="h-5 w-5 text-indigo-600" />
                    Messages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">JD</div>
                      <div className="text-sm">
                        <div className="font-semibold">John Doe</div>
                        <div className="text-gray-600">Project update ready</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">SM</div>
                      <div className="text-sm">
                        <div className="font-semibold">Sarah Miller</div>
                        <div className="text-gray-600">Invoice approved</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Team Overview Widget */}
            {settings.showTeamOverview && (
              <Card className={`${settings.animationsEnabled ? 'transition-all duration-300 hover:shadow-lg' : ''} ${settings.widgetSize === 'small' ? 'p-3' : settings.widgetSize === 'large' ? 'p-6' : 'p-4'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-orange-600" />
                    Team Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Online</span>
                      <span className="font-semibold text-green-600">6</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">In Field</span>
                      <span className="font-semibold text-blue-600">4</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Offline</span>
                      <span className="font-semibold text-gray-600">2</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {/* Settings Note */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Dashboard Customization:</strong> Your dashboard layout is now customizable! 
            Go to <strong>Settings → Dashboard</strong> to control which widgets appear, adjust the layout, 
            and personalize your experience.
          </p>
        </div>
      </main>
    </div>
  );
}
