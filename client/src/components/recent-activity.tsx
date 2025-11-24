import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, Clock, UserPlus, AlertTriangle, Briefcase, MessageCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

const iconMap: Record<string, any> = {
  CheckCircle,
  FileText,
  Clock,
  UserPlus,
  AlertTriangle,
  Briefcase,
  MessageCircle,
};

export function RecentActivity() {
  const [, navigate] = useLocation();

  const { data: activities = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/dashboard/recent-activity"],
    refetchInterval: 30000,
  });

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No recent activity</p>
            <p className="text-xs text-gray-400 mt-1">Activity will appear here as you use the system</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const IconComponent = iconMap[activity.icon] || FileText;
                return (
                  <div key={index} className="flex items-center">
                    <div className={`w-8 h-8 ${activity.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className={`${activity.iconColor} text-sm`} />
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.message}</p>
                      <p className="text-xs text-gray-500 truncate">{activity.details}</p>
                    </div>
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{activity.time}</span>
                  </div>
                );
              })}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4 text-primary border-primary hover:bg-blue-50"
              onClick={() => navigate("/activity")}
            >
              View All Activity
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
