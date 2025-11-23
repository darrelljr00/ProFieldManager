import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type Invoice = {
  id: number;
  total: string;
  status: string;
  invoiceDate: string;
  paidAt: string | null;
};

type ChartDataPoint = {
  month: string;
  revenue: number;
  paidRevenue: number;
  pendingRevenue: number;
};

export function RevenueChart() {
  const [timePeriod, setTimePeriod] = useState<'6M' | '3M' | '1M'>('6M');

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const chartData = useMemo(() => {
    if (!invoices) return [];

    const months = timePeriod === '6M' ? 6 : timePeriod === '3M' ? 3 : 1;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // Initialize month map
    const monthMap = new Map<string, ChartDataPoint>();
    
    // Create entries for each month in the period
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthMap.set(monthKey, {
        month: monthKey,
        revenue: 0,
        paidRevenue: 0,
        pendingRevenue: 0,
      });
    }

    // Process invoices
    invoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.invoiceDate);
      
      // Only include invoices within the selected time period
      if (invoiceDate >= startDate) {
        const monthKey = invoiceDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const existing = monthMap.get(monthKey);
        
        if (existing) {
          const amount = parseFloat(invoice.total);
          
          if (invoice.status === 'paid') {
            existing.paidRevenue += amount;
            existing.revenue += amount;
          } else if (invoice.status === 'sent' || invoice.status === 'pending_approval') {
            existing.pendingRevenue += amount;
            existing.revenue += amount;
          }
        }
      }
    });

    // Convert to array and reverse to show oldest to newest
    return Array.from(monthMap.values()).reverse();
  }, [invoices, timePeriod]);

  const totalRevenue = useMemo(() => {
    return chartData.reduce((sum, data) => sum + data.revenue, 0);
  }, [chartData]);

  const totalPaidRevenue = useMemo(() => {
    return chartData.reduce((sum, data) => sum + data.paidRevenue, 0);
  }, [chartData]);

  const totalPendingRevenue = useMemo(() => {
    return chartData.reduce((sum, data) => sum + data.pendingRevenue, 0);
  }, [chartData]);

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Revenue Overview</CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              onClick={() => setTimePeriod('6M')}
              className={timePeriod === '6M' ? "bg-primary text-white" : ""}
              variant={timePeriod === '6M' ? "default" : "ghost"}
              data-testid="button-revenue-6m"
            >
              6M
            </Button>
            <Button 
              size="sm" 
              onClick={() => setTimePeriod('3M')}
              className={timePeriod === '3M' ? "bg-primary text-white" : ""}
              variant={timePeriod === '3M' ? "default" : "ghost"}
              data-testid="button-revenue-3m"
            >
              3M
            </Button>
            <Button 
              size="sm" 
              onClick={() => setTimePeriod('1M')}
              className={timePeriod === '1M' ? "bg-primary text-white" : ""}
              variant={timePeriod === '1M' ? "default" : "ghost"}
              data-testid="button-revenue-1m"
            >
              1M
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-2 animate-pulse" />
              <p className="text-gray-500 text-sm">Loading revenue data...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            <div className="text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 font-medium">No Revenue Data</p>
              <p className="text-sm text-gray-400 mt-1">Create invoices to see revenue trends</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-blue-700 font-medium">Total Revenue</span>
                </div>
                <p className="text-xl font-bold text-blue-900" data-testid="text-total-revenue">
                  ${totalRevenue.toFixed(2)}
                </p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">Paid</span>
                </div>
                <p className="text-xl font-bold text-green-900" data-testid="text-paid-revenue">
                  ${totalPaidRevenue.toFixed(2)}
                </p>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs text-yellow-700 font-medium">Pending</span>
                </div>
                <p className="text-xl font-bold text-yellow-900" data-testid="text-pending-revenue">
                  ${totalPendingRevenue.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Chart */}
            <div className="h-64" data-testid="revenue-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                    iconType="circle"
                  />
                  <Bar 
                    dataKey="paidRevenue" 
                    fill="#10b981" 
                    name="Paid Revenue"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="pendingRevenue" 
                    fill="#f59e0b" 
                    name="Pending Revenue"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
