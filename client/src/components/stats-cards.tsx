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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-200 rounded-lg"></div>
                <div className="ml-3 md:ml-4 flex-1">
                  <div className="h-3 md:h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-5 md:h-6 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="mt-3 md:mt-4 flex items-center">
                <div className="h-2 md:h-3 bg-gray-200 rounded w-12 md:w-16"></div>
                <div className="h-2 md:h-3 bg-gray-200 rounded w-16 md:w-20 ml-2"></div>
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
      value: `$${(stats?.totalRevenue ?? 0).toFixed(2)}`,
      icon: DollarSign,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      change: "↗ 12%",
      changeText: "vs last month",
      changeColor: "text-green-600",
    },
    {
      title: "Pending Invoices",
      value: (stats?.pendingInvoices ?? 0).toString(),
      icon: FileText,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      change: `$${(stats?.pendingValue ?? 0).toFixed(2)}`,
      changeText: "total value",
      changeColor: "text-yellow-600",
    },
    {
      title: "Paid This Month",
      value: (stats?.paidInvoices ?? 0).toString(),
      icon: CheckCircle,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      change: `$${(stats?.paidValue ?? 0).toFixed(2)}`,
      changeText: "total value",
      changeColor: "text-green-600",
    },
    {
      title: "Overdue",
      value: (stats?.overdueInvoices ?? 0).toString(),
      icon: AlertTriangle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      change: `$${(stats?.overdueValue ?? 0).toFixed(2)}`,
      changeText: "total value",
      changeColor: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
      {cards.map((card, index) => (
        <Card key={index} className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className={`w-10 h-10 md:w-12 md:h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                <card.icon className={`${card.iconColor} text-lg md:text-xl`} />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
            <div className="mt-3 md:mt-4 flex items-center">
              <span className={`text-xs md:text-sm ${card.changeColor} font-medium`}>{card.change}</span>
              <span className="text-xs md:text-sm text-gray-500 ml-2">{card.changeText}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
