import { useQuery } from "@tanstack/react-query";
import { StatsCards } from "@/components/stats-cards";
import { RevenueChart } from "@/components/revenue-chart";
import { RecentActivity } from "@/components/recent-activity";
import { InvoicesTable } from "@/components/invoices-table";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/components/invoice-form";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Bell, Plus } from "lucide-react";
import { useState } from "react";

export default function Dashboard() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/invoices"],
  });

  const recentInvoices = invoices?.slice(0, 5) || [];

  return (
    <div className="flex-1">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-600">Welcome back! Here's what's happening with your invoices.</p>
          </div>
          <div className="flex items-center space-x-4">
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <InvoiceForm onSuccess={() => setIsCreateModalOpen(false)} />
              </DialogContent>
            </Dialog>
            <div className="relative">
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Stats Cards */}
        <StatsCards stats={stats} isLoading={statsLoading} />

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Revenue Chart */}
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>

          {/* Recent Activity */}
          <RecentActivity />
        </div>

        {/* Recent Invoices Table */}
        <div className="mt-8">
          <InvoicesTable 
            invoices={recentInvoices} 
            isLoading={invoicesLoading}
            title="Recent Invoices"
            showViewAll={true}
          />
        </div>
      </main>
    </div>
  );
}
