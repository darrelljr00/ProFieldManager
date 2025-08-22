import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck, 
  Circle, 
  Settings,
  User,
  Users,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  Clock,
  MessageSquare,
  Eye,
  BarChart3,
  Shield
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'user_based' | 'team_based';
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  createdBy?: number;
}

interface NotificationSettings {
  id?: number;
  userId: number;
  organizationId: number;
  // Job notifications
  jobAssignedInApp: boolean;
  jobAssignedEmail: boolean;
  jobAssignedSms: boolean;
  jobCompletedInApp: boolean;
  jobCompletedEmail: boolean;
  jobCompletedSms: boolean;
  // Task notifications
  taskAssignedInApp: boolean;
  taskAssignedEmail: boolean;
  taskAssignedSms: boolean;
  taskCompletedInApp: boolean;
  taskCompletedEmail: boolean;
  taskCompletedSms: boolean;
  taskTriggeredInApp: boolean;
  taskTriggeredEmail: boolean;
  taskTriggeredSms: boolean;
  // Lead notifications
  leadNewInApp: boolean;
  leadNewEmail: boolean;
  leadNewSms: boolean;
  // Invoice notifications
  invoicePaidInApp: boolean;
  invoicePaidEmail: boolean;
  invoicePaidSms: boolean;
  // System notifications
  stockAlertInApp: boolean;
  stockAlertEmail: boolean;
  stockAlertSms: boolean;
  scheduleReminderInApp: boolean;
  scheduleReminderEmail: boolean;
  scheduleReminderSms: boolean;
  // Global settings
  globalInApp: boolean;
  globalEmail: boolean;
  globalSms: boolean;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'job_assignment':
    case 'job_completion':
      return Calendar;
    case 'task_assignment':
    case 'task_completion':
      return CheckCheck;
    case 'task_trigger':
      return AlertCircle;
    case 'lead_assignment':
      return User;
    case 'invoice_payment':
      return DollarSign;
    case 'team_update':
      return Users;
    default:
      return Bell;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500';
    case 'high':
      return 'bg-orange-500';
    case 'normal':
      return 'bg-blue-500';
    case 'low':
      return 'bg-gray-500';
    default:
      return 'bg-blue-500';
  }
};

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  // Fetch notifications
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch notification settings
  const { data: notificationSettings, isLoading: settingsLoading } = useQuery<NotificationSettings>({
    queryKey: ['/api/notification-settings'],
  });

  // Admin queries (only if admin or manager)
  const { data: adminNotifications = [], isLoading: adminLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/notifications'],
    enabled: isAdminOrManager && activeTab === 'admin',
    refetchInterval: 30000,
  });

  const { data: notificationStats = { total: 0, unread: 0, adminViewed: 0, urgentUnread: 0, readPercentage: 0 } } = useQuery<{ total: number; unread: number; adminViewed: number; urgentUnread: number; readPercentage: number }>({
    queryKey: ['/api/admin/notifications/stats'],
    enabled: isAdminOrManager && activeTab === 'admin',
    refetchInterval: 60000,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
  });

  // Update notification settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<NotificationSettings>) => {
      const response = await fetch('/api/notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-settings'] });
      toast({
        title: "Success",
        description: "Notification settings updated",
      });
    },
  });

  // Admin view notification mutation
  const markAdminViewedMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/admin/notifications/${notificationId}/view`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to mark as admin viewed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications/stats'] });
    },
  });

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleSettingChange = (setting: keyof NotificationSettings, value: boolean) => {
    if (notificationSettings) {
      updateSettingsMutation.mutate({
        ...notificationSettings,
        [setting]: value,
      });
    }
  };

  const handleMarkAdminViewed = (notificationId: number) => {
    markAdminViewedMutation.mutate(notificationId);
  };

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    switch (activeTab) {
      case 'unread':
        return !notification.isRead;
      case 'user':
        return notification.category === 'user_based';
      case 'team':
        return notification.category === 'team_based';
      default:
        return true;
    }
  });

  // Sort notifications by creation date (newest first)
  const sortedNotifications = filteredNotifications.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const unreadCount = unreadData?.count || 0;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">Stay updated with your team activities</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button 
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              variant="outline"
              size="sm"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark All Read
            </Button>
          )}
          <Badge variant="secondary" className="text-sm">
            {unreadCount} Unread
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={cn("grid w-full", isAdminOrManager ? "grid-cols-6" : "grid-cols-5")}>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread" className="relative">
            Unread
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="user">Personal</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          {isAdminOrManager && (
            <TabsTrigger value="admin" className="relative">
              <Shield className="w-4 h-4 mr-1" />
              Admin
            </TabsTrigger>
          )}
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <NotificationsList 
            notifications={sortedNotifications}
            loading={notificationsLoading}
            onMarkAsRead={handleMarkAsRead}
            markAsReadPending={markAsReadMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          <NotificationsList 
            notifications={sortedNotifications}
            loading={notificationsLoading}
            onMarkAsRead={handleMarkAsRead}
            markAsReadPending={markAsReadMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="user" className="space-y-4">
          <NotificationsList 
            notifications={sortedNotifications}
            loading={notificationsLoading}
            onMarkAsRead={handleMarkAsRead}
            markAsReadPending={markAsReadMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <NotificationsList 
            notifications={sortedNotifications}
            loading={notificationsLoading}
            onMarkAsRead={handleMarkAsRead}
            markAsReadPending={markAsReadMutation.isPending}
          />
        </TabsContent>

        {isAdminOrManager && (
          <TabsContent value="admin" className="space-y-6">
            <AdminNotificationPanel
              notifications={adminNotifications}
              stats={notificationStats}
              loading={adminLoading}
              onMarkAdminViewed={handleMarkAdminViewed}
              markViewedPending={markAdminViewedMutation.isPending}
            />
          </TabsContent>
        )}

        <TabsContent value="settings" className="space-y-6">
          <NotificationSettings 
            settings={notificationSettings}
            loading={settingsLoading}
            onSettingChange={handleSettingChange}
            updatePending={updateSettingsMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface NotificationsListProps {
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (id: number) => void;
  markAsReadPending: boolean;
}

function NotificationsList({ notifications, loading, onMarkAsRead, markAsReadPending }: NotificationsListProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <BellOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
          <p className="text-gray-600">You're all caught up! Check back later for new updates.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          {notifications.map((notification, index) => {
            const IconComponent = getNotificationIcon(notification.type);
            const priorityColor = getPriorityColor(notification.priority);
            
            return (
              <div key={notification.id}>
                <div className={cn(
                  "p-4 hover:bg-gray-50 transition-colors cursor-pointer",
                  !notification.isRead && "bg-blue-50"
                )}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-full text-white",
                      priorityColor
                    )}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <h4 className={cn(
                          "text-sm font-medium",
                          !notification.isRead && "font-semibold"
                        )}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {notification.category === 'user_based' ? 'Personal' : 'Team'}
                          </Badge>
                          {!notification.isRead && (
                            <Button
                              onClick={() => onMarkAsRead(notification.id)}
                              disabled={markAsReadPending}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{format(new Date(notification.createdAt), 'MMM d, h:mm a')}</span>
                        {!notification.isRead && (
                          <Circle className="w-2 h-2 fill-blue-600 text-blue-600 ml-2" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {index < notifications.length - 1 && <Separator />}
              </div>
            );
          })}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface NotificationSettingsProps {
  settings?: NotificationSettings;
  loading: boolean;
  onSettingChange: (setting: keyof NotificationSettings, value: boolean) => void;
  updatePending: boolean;
}

function NotificationSettings({ settings, loading, onSettingChange, updatePending }: NotificationSettingsProps) {
  if (loading || !settings) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const settingGroups = [
    {
      title: "Job Management",
      icon: Calendar,
      settings: [
        { key: 'jobAssignedInApp', label: 'Job assignments (In-app)', description: 'When you are assigned to a new job' },
        { key: 'jobAssignedEmail', label: 'Job assignments (Email)', description: 'Email notifications for job assignments' },
        { key: 'jobAssignedSms', label: 'Job assignments (SMS)', description: 'SMS notifications for job assignments' },
        { key: 'jobCompletedInApp', label: 'Job completions (In-app)', description: 'When jobs are completed' },
        { key: 'jobCompletedEmail', label: 'Job completions (Email)', description: 'Email notifications for job completions' },
        { key: 'jobCompletedSms', label: 'Job completions (SMS)', description: 'SMS notifications for job completions' },
      ]
    },
    {
      title: "Task Management", 
      icon: CheckCheck,
      settings: [
        { key: 'taskAssignedInApp', label: 'Task assignments (In-app)', description: 'When tasks are assigned to you' },
        { key: 'taskAssignedEmail', label: 'Task assignments (Email)', description: 'Email notifications for task assignments' },
        { key: 'taskAssignedSms', label: 'Task assignments (SMS)', description: 'SMS notifications for task assignments' },
        { key: 'taskCompletedInApp', label: 'Task completions (In-app)', description: 'When tasks are completed' },
        { key: 'taskCompletedEmail', label: 'Task completions (Email)', description: 'Email notifications for task completions' },
        { key: 'taskCompletedSms', label: 'Task completions (SMS)', description: 'SMS notifications for task completions' },
        { key: 'taskTriggeredInApp', label: 'Task triggers (In-app)', description: 'When task triggers are activated' },
        { key: 'taskTriggeredEmail', label: 'Task triggers (Email)', description: 'Email notifications for task triggers' },
        { key: 'taskTriggeredSms', label: 'Task triggers (SMS)', description: 'SMS notifications for task triggers' },
      ]
    },
    {
      title: "Sales & Leads",
      icon: User,
      settings: [
        { key: 'leadNewInApp', label: 'New leads (In-app)', description: 'When new leads are created' },
        { key: 'leadNewEmail', label: 'New leads (Email)', description: 'Email notifications for new leads' },
        { key: 'leadNewSms', label: 'New leads (SMS)', description: 'SMS notifications for new leads' },
      ]
    },
    {
      title: "Financial",
      icon: DollarSign,
      settings: [
        { key: 'invoicePaidInApp', label: 'Invoice payments (In-app)', description: 'When invoices are paid' },
        { key: 'invoicePaidEmail', label: 'Invoice payments (Email)', description: 'Email notifications for invoice payments' },
        { key: 'invoicePaidSms', label: 'Invoice payments (SMS)', description: 'SMS notifications for invoice payments' },
      ]
    },
    {
      title: "System Notifications",
      icon: AlertCircle,
      settings: [
        { key: 'stockAlertInApp', label: 'Stock alerts (In-app)', description: 'When inventory is running low' },
        { key: 'stockAlertEmail', label: 'Stock alerts (Email)', description: 'Email notifications for stock alerts' },
        { key: 'stockAlertSms', label: 'Stock alerts (SMS)', description: 'SMS notifications for stock alerts' },
        { key: 'scheduleReminderInApp', label: 'Schedule reminders (In-app)', description: 'Reminders for upcoming appointments' },
        { key: 'scheduleReminderEmail', label: 'Schedule reminders (Email)', description: 'Email reminders for schedule' },
        { key: 'scheduleReminderSms', label: 'Schedule reminders (SMS)', description: 'SMS reminders for schedule' },
      ]
    },
    {
      title: "Global Settings",
      icon: Settings,
      settings: [
        { key: 'globalInApp', label: 'All in-app notifications', description: 'Master toggle for all in-app notifications' },
        { key: 'globalEmail', label: 'All email notifications', description: 'Master toggle for all email notifications' },
        { key: 'globalSms', label: 'All SMS notifications', description: 'Master toggle for all SMS notifications' },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {settingGroups.map((group) => {
        const IconComponent = group.icon;
        
        return (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconComponent className="w-5 h-5" />
                {group.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.settings.map((setting) => (
                <div key={setting.key} className="flex items-center justify-between py-2">
                  <div className="space-y-1 flex-1">
                    <Label htmlFor={setting.key} className="text-sm font-medium cursor-pointer">
                      {setting.label}
                    </Label>
                    <div className="text-xs text-gray-600">{setting.description}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {settings[setting.key as keyof NotificationSettings] ? "On" : "Off"}
                    </span>
                    <Switch
                      id={setting.key}
                      checked={Boolean(settings[setting.key as keyof NotificationSettings])}
                      onCheckedChange={(checked) => 
                        onSettingChange(setting.key as keyof NotificationSettings, checked)
                      }
                      disabled={updatePending}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface AdminNotificationPanelProps {
  notifications: any[];
  stats?: {
    total: number;
    unread: number;
    adminViewed: number;
    urgentUnread: number;
    readPercentage: number;
  };
  loading: boolean;
  onMarkAdminViewed: (id: number) => void;
  markViewedPending: boolean;
}

function AdminNotificationPanel({ 
  notifications, 
  stats, 
  loading, 
  onMarkAdminViewed, 
  markViewedPending 
}: AdminNotificationPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-gray-600">Total Notifications</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Circle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.unread}</p>
                  <p className="text-sm text-gray-600">Unread</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Eye className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.adminViewed}</p>
                  <p className="text-sm text-gray-600">Read by Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.urgentUnread}</p>
                  <p className="text-sm text-gray-600">Urgent Unread</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.readPercentage}%</p>
                  <p className="text-sm text-gray-600">Read Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Organization Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="p-12 text-center">
              <BellOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-600">Your team is all caught up!</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              {notifications.map((notification, index) => {
                const IconComponent = getNotificationIcon(notification.type);
                const priorityColor = getPriorityColor(notification.priority);
                
                return (
                  <div key={notification.id}>
                    <div className={cn(
                      "p-4 hover:bg-gray-50 transition-colors",
                      !notification.isRead && "bg-blue-50"
                    )}>
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-full text-white",
                          priorityColor
                        )}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between">
                            <h4 className={cn(
                              "text-sm font-medium",
                              !notification.isRead && "font-semibold"
                            )}>
                              {notification.title}
                            </h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {notification.category === 'user_based' ? 'Personal' : 'Team'}
                              </Badge>
                              {notification.adminViewedBy && (
                                <Badge variant="secondary" className="text-xs">
                                  <Eye className="w-3 h-3 mr-1" />
                                  Admin Viewed
                                </Badge>
                              )}
                              {!notification.adminViewedBy && (
                                <Button
                                  onClick={() => onMarkAdminViewed(notification.id)}
                                  disabled={markViewedPending}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Mark Viewed
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>{notification.firstName} {notification.lastName}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{format(new Date(notification.createdAt), 'MMM d, h:mm a')}</span>
                              </div>
                              {!notification.isRead && (
                                <div className="flex items-center gap-1">
                                  <Circle className="w-2 h-2 fill-blue-600 text-blue-600" />
                                  <span>Unread</span>
                                </div>
                              )}
                            </div>
                            {notification.adminViewedAt && (
                              <div className="flex items-center gap-1 text-green-600">
                                <Eye className="w-3 h-3" />
                                <span>Viewed {format(new Date(notification.adminViewedAt), 'MMM d, h:mm a')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < notifications.length - 1 && <Separator />}
                  </div>
                );
              })}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}