import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, FileText, CheckCircle, AlertTriangle } from "lucide-react";

interface StatsCardsProps {
  stats?: {
    totalRevenue: number;
    pendingInvoices: number;
    paidInvoices: number;
    overdueInvoices: number;
    pendingValue: number;
    paidValue: number;
    overdueValue: number;
  };
  isLoading?: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <div className="h-3 bg-gray-200 rounded w-16"></div>
                <div className="h-3 bg-gray-200 rounded w-20 ml-2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Revenue",
      value: `$${stats?.totalRevenue.toFixed(2) || "0.00"}`,
      icon: DollarSign,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      change: "↗ 12%",
      changeText: "vs last month",
      changeColor: "text-green-600",
    },
    {
      title: "Pending Invoices",
      value: stats?.pendingInvoices.toString() || "0",
      icon: FileText,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      change: `$${stats?.pendingValue.toFixed(2) || "0.00"}`,
      changeText: "total value",
      changeColor: "text-yellow-600",
    },
    {
      title: "Paid This Month",
      value: stats?.paidInvoices.toString() || "0",
      icon: CheckCircle,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      change: `$${stats?.paidValue.toFixed(2) || "0.00"}`,
      changeText: "total value",
      changeColor: "text-green-600",
    },
    {
      title: "Overdue",
      value: stats?.overdueInvoices.toString() || "0",
      icon: AlertTriangle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      change: `$${stats?.overdueValue.toFixed(2) || "0.00"}`,
      changeText: "total value",
      changeColor: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <Card key={index} className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                <card.icon className={`${card.iconColor} text-xl`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`text-sm ${card.changeColor} font-medium`}>{card.change}</span>
              <span className="text-sm text-gray-500 ml-2">{card.changeText}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
