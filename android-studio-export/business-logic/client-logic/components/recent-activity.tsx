import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, Clock, UserPlus, AlertTriangle } from "lucide-react";

const mockActivities = [
  {
    id: 1,
    type: "payment",
    message: "Invoice #INV-001 paid",
    details: "Acme Corp • $2,450",
    time: "2h ago",
    icon: CheckCircle,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
  {
    id: 2,
    type: "invoice",
    message: "New invoice created",
    details: "TechStart Inc • $1,200",
    time: "4h ago",
    icon: FileText,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    id: 3,
    type: "reminder",
    message: "Payment reminder sent",
    details: "Design Co • $850",
    time: "6h ago",
    icon: Clock,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  {
    id: 4,
    type: "customer",
    message: "New customer added",
    details: "Global Solutions Ltd",
    time: "1d ago",
    icon: UserPlus,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
  {
    id: 5,
    type: "overdue",
    message: "Invoice overdue",
    details: "Startup Hub • $675",
    time: "2d ago",
    icon: AlertTriangle,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
];

export function RecentActivity() {
  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivities.map((activity) => (
            <div key={activity.id} className="flex items-center">
              <div className={`w-8 h-8 ${activity.iconBg} rounded-full flex items-center justify-center`}>
                <activity.icon className={`${activity.iconColor} text-sm`} />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                <p className="text-xs text-gray-500">{activity.details}</p>
              </div>
              <span className="text-xs text-gray-400">{activity.time}</span>
            </div>
          ))}
        </div>
        <Button variant="outline" className="w-full mt-4 text-primary border-primary hover:bg-blue-50">
          View All Activity
        </Button>
      </CardContent>
    </Card>
  );
}
