import { Link, useLocation } from "wouter";
import { 
  FileText, 
  BarChart3, 
  Users, 
  CreditCard, 
  FileBarChart, 
  Settings,
  User,
  Quote,
  MessageSquare,
  Smartphone,
  UserCog,
  LogOut,
  Shield,
  FolderOpen,
  Receipt,
  UserPlus,
  Calendar,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  ImageIcon,
  Star,
  Briefcase,
  Server,
  Folder,
  Menu,
  X,
  CheckSquare,
  MapPin,
  Clock,
  Bell,
  MessageCircle,
  Cloud,
  GripVertical,
  Search,
  FileType,
  Mail,
  Box,
  Monitor,
  BookOpen,
  HelpCircle,
  Building,
  Phone,
  Video,
  Scan
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  requiresAuth?: boolean;
  adminOnly?: boolean;
  subItems?: NavigationItem[];
  permission?: string;
  unreadCount?: number;
}

// Sortable Navigation Item Component
function SortableNavItem({ 
  item, 
  isCollapsed, 
  isCurrentPath, 
  expandedItems, 
  toggleExpanded, 
  setIsOpen, 
  unreadCount 
}: {
  item: NavigationItem;
  isCollapsed: boolean;
  isCurrentPath: (href: string) => boolean;
  expandedItems: {[key: string]: boolean};
  toggleExpanded: (itemName: string) => void;
  setIsOpen: (open: boolean) => void;
  unreadCount: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isExpanded = expandedItems[item.name];
  const hasSubItems = item.subItems && item.subItems.length > 0;
  const isActive = isCurrentPath(item.href);

  return (
    <li ref={setNodeRef} style={style} className="relative">
      <div className="flex items-center">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded mr-2 opacity-50 hover:opacity-100"
        >
          <GripVertical className="w-3 h-3" />
        </div>

        {/* Navigation Item */}
        <div className="flex-1">
          {!hasSubItems ? (
            <Link
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted hover:text-foreground"
              )}
              onClick={() => setIsOpen(false)}
            >
              <item.icon className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3" />
              {!isCollapsed && (
                <>
                  {item.name}
                  {(item.name === "Team Messages" || item.name === "Notifications") && item.unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {item.unreadCount > 99 ? "99+" : item.unreadCount}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          ) : (
            <>
              <button
                onClick={() => toggleExpanded(item.name)}
                className={cn(
                  "flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  "text-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.name}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </>
                )}
              </button>
              {isExpanded && !isCollapsed && item.subItems && (
                <ul className="mt-1 ml-6 space-y-1">
                  {item.subItems.map((subItem) => (
                    <li key={subItem.name}>
                      <Link
                        href={subItem.href}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                          isCurrentPath(subItem.href)
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        <subItem.icon className="w-4 h-4 mr-2" />
                        {subItem.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}

// Default navigation order
const DEFAULT_NAVIGATION_ORDER = [
  "Dashboard",
  "Calendar",
  "My Schedule",
  "Time Clock",
  "Jobs",
  "My Tasks",
  "Leads",
  "Expenses",
  "Quotes",
  "Invoices",
  "Invoice Templates",
  "Customers",
  "Payments",
  "File Manager",
  "Parts & Supplies",
  "Form Builder",
  "Inspections",
  "Team Messages",
  "Image Gallery",
  "SMS",
  "Messages",
  "GPS Tracking",
  "Weather",
  "Reviews",
  "Market Research",
  "Screen Sharing",
  "Human Resources",
  "User Management",
  "SaaS Admin",
  "Admin Settings",
  "Reports",
  "Settings"
];

export function Sidebar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { lastMessage } = useWebSocket();
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({});
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [navigationOrder, setNavigationOrder] = useState<string[]>(DEFAULT_NAVIGATION_ORDER);
  const [searchQuery, setSearchQuery] = useState("");

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Save navigation order mutation
  const saveOrderMutation = useMutation({
    mutationFn: async (newOrder: string[]) => {
      return apiRequest('/api/navigation-order', 'POST', { navigationItems: newOrder });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/navigation-order'] });
    },
  });

  // Fetch unread message count
  const { data: messages } = useQuery({
    queryKey: ["/api/internal-messages"],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  // Fetch unread notification count
  const { data: notificationData } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    enabled: isAuthenticated,
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Load custom navigation order
  const { data: savedOrder } = useQuery({
    queryKey: ["/api/navigation-order"],
    enabled: isAuthenticated && !!user?.id,
  });

  // Fallback polling for navigation updates when WebSocket is not connected
  const { data: navigationUpdates } = useQuery({
    queryKey: ["/api/navigation/check-updates"],
    queryFn: async () => {
      const lastCheck = localStorage.getItem('last_navigation_check') || '1970-01-01T00:00:00.000Z';
      const response = await fetch(`/api/navigation/check-updates?lastCheck=${encodeURIComponent(lastCheck)}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (data.hasUpdates) {
        console.log('📱 Navigation updates received via polling:', data);
        localStorage.setItem('last_navigation_check', new Date().toISOString());
        // Invalidate the navigation order query to refresh the sidebar
        queryClient.invalidateQueries({ queryKey: ["/api/navigation-order"] });
      }
      
      return data;
    },
    enabled: isAuthenticated && !!user?.id,
    refetchInterval: 10000, // Poll every 10 seconds
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
      setNavigationOrder(savedOrder as string[]);
    }
  }, [savedOrder]);

  useEffect(() => {
    if (messages && Array.isArray(messages)) {
      const unread = messages.filter((msg: any) => !msg.isRead && msg.senderId !== user?.id).length;
      setUnreadCount(unread);
    }
  }, [messages, user?.id]);

  useEffect(() => {
    if (notificationData && typeof (notificationData as any).count === 'number') {
      setUnreadNotificationsCount((notificationData as any).count);
    }
  }, [notificationData]);

  // WebSocket real-time updates for notification counts in sidebar
  useEffect(() => {
    if (!lastMessage) return;

    const { type, eventType } = lastMessage;

    if (type === 'update' && eventType) {
      // Handle notification-related events that should refresh notification counts
      const notificationEvents = [
        'notification_created',
        'notification_read',
        'task_completed',
        'project_completed',
        'user_clock_in',
        'user_clock_out',
        'user_late'
      ];

      if (notificationEvents.includes(eventType)) {
        // Invalidate notification count queries for real-time updates
        queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      }

      // Handle message events for Team Messages count
      if (eventType === 'new_message' || eventType === 'message_sent') {
        queryClient.invalidateQueries({ queryKey: ['/api/internal-messages'] });
      }
    }
  }, [lastMessage, queryClient]);

  // Debug: log user data and permissions
  useEffect(() => {
    if (user) {
      console.log('Current user:', user);
      console.log('User permissions:', {
        canAccessHR: (user as any).canAccessHR,
        canAccessUserManagement: (user as any).canAccessUserManagement,
        canAccessSaasAdmin: (user as any).canAccessSaasAdmin,
        canAccessAdminSettings: (user as any).canAccessAdminSettings,
        canAccessReports: (user as any).canAccessReports
      });
    }
  }, [user]);

  // Clear search when sidebar is collapsed
  useEffect(() => {
    if (isCollapsed) {
      setSearchQuery("");
    }
  }, [isCollapsed]);

  const navigationItems: NavigationItem[] = [
    { name: "Dashboard", href: "/", icon: BarChart3, requiresAuth: true, permission: "canAccessDashboard" },
    { name: "Calendar", href: "/calendar", icon: Calendar, requiresAuth: true, permission: "canAccessCalendar" },
    { name: "My Schedule", href: "/my-schedule", icon: Calendar, requiresAuth: true, permission: "canAccessMySchedule" },
    { name: "Time Clock", href: "/time-clock", icon: Clock, requiresAuth: true, permission: "canAccessTimeClock" },
    { 
      name: "Jobs", 
      href: "/jobs", 
      icon: Briefcase, 
      requiresAuth: true, 
      permission: "canAccessJobs",
      subItems: [
        { name: "All Jobs", href: "/jobs", icon: Briefcase },
        { name: "Task Groups", href: "/task-groups", icon: Folder }
      ]
    },
    { name: "My Tasks", href: "/my-tasks", icon: CheckSquare, requiresAuth: true, permission: "canAccessMyTasks" },
    { name: "Leads", href: "/leads", icon: UserPlus, requiresAuth: true, permission: "canAccessLeads" },
    { 
      name: "Expenses", 
      href: "/expenses", 
      icon: Receipt, 
      requiresAuth: true,
      permission: "canAccessExpenses",
      subItems: [
        { name: "All Expenses", href: "/expenses", icon: Receipt },
        { name: "Expense Reports", href: "/expense-reports", icon: FileBarChart },
        { name: "Categories", href: "/expense-categories", icon: Folder },
        { name: "Gas Card Providers", href: "/gas-card-providers", icon: CreditCard },
        { name: "Gas Cards", href: "/gas-cards", icon: CreditCard }
      ]
    },
    { name: "Quotes", href: "/quotes", icon: Quote, requiresAuth: true, permission: "canAccessQuotes" },
    { name: "Invoices", href: "/invoices", icon: FileText, requiresAuth: true, permission: "canAccessInvoices" },
    { name: "Invoice Templates", href: "/invoice-templates", icon: FileType, requiresAuth: true, permission: "canAccessInvoices" },
    { name: "Customers", href: "/customers", icon: Users, requiresAuth: true, permission: "canAccessCustomers" },
    { name: "Payments", href: "/payments", icon: CreditCard, requiresAuth: true, permission: "canAccessPayments" },
    { name: "File Manager", href: "/file-manager", icon: FolderOpen, requiresAuth: true, permission: "canAccessFileManager" },
    { name: "Parts & Supplies", href: "/parts-supplies", icon: Box, requiresAuth: true, permission: "canAccessPartsSupplies" },
    { name: "Smart Capture", href: "/smart-capture", icon: Scan, requiresAuth: true, permission: "canAccessPartsSupplies" },
    { name: "Form Builder", href: "/form-builder", icon: ClipboardList, requiresAuth: true, permission: "canAccessFormBuilder" },
    { name: "Inspections", href: "/inspections", icon: CheckSquare, requiresAuth: true, permission: "canAccessInspections" },
    { 
      name: "Team Messages", 
      href: "/internal-messages", 
      icon: MessageSquare, 
      requiresAuth: true,
      permission: "canAccessInternalMessages",
      unreadCount: unreadCount
    },
    { name: "Live Stream", href: "/live-stream", icon: Video, requiresAuth: true, permission: "canAccessLiveStream" },
    { name: "Notifications", href: "/notifications", icon: Bell, requiresAuth: true, permission: "canAccessNotifications", unreadCount: unreadNotificationsCount },
    { name: "Image Gallery", href: "/image-gallery", icon: ImageIcon, requiresAuth: true, permission: "canAccessImageGallery" },
    { name: "SMS", href: "/sms", icon: Smartphone, requiresAuth: true, permission: "canAccessSMS" },
    { name: "Messages", href: "/messages", icon: Mail, requiresAuth: true, permission: "canAccessMessages" },
    { name: "GPS Tracking", href: "/gps-tracking", icon: MapPin, requiresAuth: true, permission: "canAccessGpsTracking" },
    { name: "Weather", href: "/weather", icon: Cloud, requiresAuth: true, permission: "canAccessWeather" },
    { name: "Reviews", href: "/reviews", icon: Star, requiresAuth: true, permission: "canAccessReviews" },
    { name: "Market Research", href: "/market-research", icon: BarChart3, requiresAuth: true, permission: "canAccessMarketResearch" },
    { name: "Call Manager", href: "/call-manager", icon: Phone, requiresAuth: true, permission: "canAccessSaasAdmin" },
    { name: "Tutorials", href: "/tutorials", icon: BookOpen, requiresAuth: true, permission: "canAccessTutorials" },
    { name: "Screen Sharing", href: "/screen-sharing", icon: Monitor, requiresAuth: true, permission: "canAccessMessages" },
    { name: "Human Resources", href: "/human-resources", icon: User, requiresAuth: true, permission: "canAccessHR" },
    { name: "User Management", href: "/users", icon: UserCog, requiresAuth: true, permission: "canAccessUsers" },
    { 
      name: "SaaS Admin", 
      href: "/saas-admin", 
      icon: Server, 
      requiresAuth: true, 
      permission: "canAccessSaasAdmin",
      subItems: [
        { name: "Organizations", href: "/saas-admin", icon: Building },
        { name: "Call Manager", href: "/saas-admin/call-manager", icon: Phone }
      ]
    },
    { name: "Frontend", href: "/frontend-management", icon: Monitor, requiresAuth: true, permission: "canAccessSaasAdmin" },
    {
      name: "Admin Settings",
      href: "/admin-settings",
      icon: Shield,
      requiresAuth: true,
      permission: "canAccessAdminSettings",
      subItems: [
        { name: "General Settings", href: "/admin-settings", icon: Settings },
        { name: "File Security", href: "/file-security", icon: Shield },
        { name: "Mobile Test", href: "/mobile-test", icon: Smartphone }
      ]
    },
    { name: "Reports", href: "/reports", icon: BarChart3, requiresAuth: true, permission: "canAccessReports" },
    { 
      name: "Settings", 
      href: "/settings", 
      icon: Settings, 
      requiresAuth: true,
      subItems: [
        { name: "General", href: "/settings", icon: Settings },
        { name: "Dashboard", href: "/settings?tab=dashboard", icon: BarChart3 },
        { name: "Notifications", href: "/settings?tab=notifications", icon: Bell },
        { name: "Messages", href: "/settings?tab=messages", icon: MessageCircle },
        { name: "Weather", href: "/settings?tab=weather", icon: Cloud }
      ]
    }
  ];

  // Define permission checking function first to avoid hoisting issues
  const hasPermission = (item: NavigationItem): boolean => {
    if (!item.permission) return true;
    if (!user) return false;
    
    // Admin users have access to everything
    if (user.role === 'admin') {
      console.log(`✅ ADMIN ACCESS GRANTED for ${item.name} - user role: ${user.role}`);
      return true;
    }
    
    // Debug: log permission checks and user object structure for debugging auth issue
    if (item.name === 'SaaS Admin' || item.name === 'Call Manager') {
      console.log(`🔍 SIDEBAR DEBUG - User object for ${item.name}:`, {
        username: user.username,
        role: user.role,
        permission: item.permission,
        permissionValue: (user as any)[item.permission],
        hasCanAccessSaasAdmin: (user as any).canAccessSaasAdmin,
        can_access_saas_admin: (user as any).can_access_saas_admin,
        allUserKeys: Object.keys(user).filter(key => key.includes('Access') || key.includes('saas')).slice(0, 15),
        fullUserObject: JSON.stringify(user, null, 2)
      });
    }
    
    console.log(`Checking permission for ${item.name}: ${item.permission} = ${(user as any)[item.permission]}`);
    
    // Check the specific permission - handle both camelCase and snake_case
    const hasAccess = (user as any)[item.permission];
    
    // If camelCase doesn't work, try snake_case conversion as fallback
    if (hasAccess === undefined && item.permission) {
      const snakeCasePermission = item.permission.replace(/([A-Z])/g, '_$1').toLowerCase();
      const snakeCaseAccess = (user as any)[snakeCasePermission];
      console.log(`🔄 PERMISSION FALLBACK: ${item.permission} -> ${snakeCasePermission} = ${snakeCaseAccess}`);
      return snakeCaseAccess === true;
    }
    
    return hasAccess === true;
  };

  // Get ordered navigation items with permission and search filtering
  const getOrderedNavigationItems = () => {
    const orderedItems: NavigationItem[] = [];
    
    // Add items in the order specified by navigationOrder
    navigationOrder.forEach(orderName => {
      const item = navigationItems.find(item => item.name === orderName);
      if (item) {
        orderedItems.push(item);
      }
    });
    
    // Add any remaining items that might not be in the order
    navigationItems.forEach(item => {
      if (!orderedItems.find(orderedItem => orderedItem.name === item.name)) {
        orderedItems.push(item);
      }
    });
    
    // Filter by permissions first - this is the key change for hiding disabled tabs
    const permissionFilteredItems = orderedItems.filter(item => {
      // Always show items without permission requirements
      if (!item.permission) return true;
      
      // Admin override - show all tabs for admin users
      if (user?.role === 'admin') return true;
      
      // Check user permissions for non-admin users
      return hasPermission(item);
    });
    
    // Filter by search query if present
    if (searchQuery.trim()) {
      return permissionFilteredItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.subItems && item.subItems.some(subItem => 
          subItem.name.toLowerCase().includes(searchQuery.toLowerCase())
        ))
      );
    }
    
    return permissionFilteredItems;
  };

  const orderedItems = getOrderedNavigationItems();

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = navigationOrder.indexOf(active.id as string);
      const newIndex = navigationOrder.indexOf(over?.id as string);
      
      const newOrder = arrayMove(navigationOrder, oldIndex, newIndex);
      setNavigationOrder(newOrder);
      
      // Save to backend
      saveOrderMutation.mutate(newOrder);
    }
  };

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  const isCurrentPath = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  const handleLogout = () => {
    logout();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-50 h-screen bg-background border-r border-border transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              {!isCollapsed && (
                <h2 className="text-lg font-semibold text-foreground">
                  Pro Field Manager
                </h2>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {user?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.username}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user?.role}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          {!isCollapsed && (
            <div className="p-4 border-b border-border flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search navigation tabs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-8 text-sm bg-muted/50 border-muted-foreground/20 focus:bg-background"
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedItems.map(item => item.name)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-1">
                  {orderedItems.map((item) => {
                    if (item.adminOnly && user?.role !== "admin") return null;
                    // Temporarily disable permission checks to see all tabs
                    // if (item.permission && !hasPermission(item)) return null;

                    return (
                      <SortableNavItem
                        key={item.name}
                        item={item}
                        isCollapsed={isCollapsed}
                        isCurrentPath={isCurrentPath}
                        expandedItems={expandedItems}
                        toggleExpanded={toggleExpanded}
                        setIsOpen={setIsOpen}
                        unreadCount={unreadCount}
                      />
                    );
                  })}
                </ul>
              </SortableContext>
            </DndContext>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {!isCollapsed && "Logout"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}