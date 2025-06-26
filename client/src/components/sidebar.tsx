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
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Time Clock", href: "/time-clock", icon: Clock },
  { name: "Jobs", href: "/jobs", icon: FolderOpen },
  { name: "My Tasks", href: "/my-tasks", icon: CheckSquare },
  { name: "Leads", href: "/leads", icon: UserPlus },
  { 
    name: "Expenses", 
    icon: Receipt, 
    hasSubmenu: true,
    items: [
      { name: "All Expenses", href: "/expenses" },
      { name: "Expense Reports", href: "/expense-reports" },
      { name: "Gas Card Providers", href: "/gas-card-providers" },
      { name: "Gas Cards", href: "/gas-cards" }
    ]
  },
  { name: "Quotes", href: "/quotes", icon: Quote },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "File Manager", href: "/file-manager", icon: Folder },
  { name: "Form Builder", href: "/form-builder", icon: FileText },
  { name: "Team Messages", href: "/internal-messages", icon: MessageSquare },
  { name: "Image Gallery", href: "/image-gallery", icon: ImageIcon },
  { name: "Text Messaging", href: "/sms", icon: Smartphone },
  { name: "GPS Tracking", href: "/gps-tracking", icon: MapPin },
  { name: "Reviews", href: "/reviews", icon: Star },
  { name: "Human Resources", href: "/human-resources", icon: Briefcase },
  { name: "User Management", href: "/users", icon: UserCog },
  { name: "SaaS Admin", href: "/saas-admin", icon: Server },
  { 
    name: "Admin Settings", 
    icon: Shield,
    hasSubmenu: true,
    items: [
      { name: "Settings", href: "/admin-settings" },
      { name: "Mobile Test", href: "/mobile-test" }
    ]
  },
  { name: "Reports", href: "/reports", icon: FileBarChart },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, isOpen]);

  const getInitials = (firstName?: string, lastName?: string, username?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (username) {
      return username.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      admin: "destructive",
      manager: "secondary",
      user: "outline"
    };
    return <Badge variant={colors[role] || "outline"} className="text-xs">{role}</Badge>;
  };

  const toggleMenu = (menuName: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuName)) {
      newExpanded.delete(menuName);
    } else {
      newExpanded.add(menuName);
    }
    setExpandedMenus(newExpanded);
  };

  const filteredNavigation = navigation.filter(item => {
    if (item.href === "/users" || item.name === "Admin Settings") {
      return isAdmin;
    }
    return true;
  });

  const isActiveItem = (href?: string) => {
    if (!href) return false;
    return location === href || (href === "/dashboard" && location === "/");
  };

  const isExpensesActive = location === "/expenses" || location === "/expense-reports";
  const isAdminSettingsActive = location === "/admin-settings" || location === "/mobile-test";



  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  // Fetch unread team messages count
  const { data: messagesData } = useQuery<any[]>({
    queryKey: ["/api/internal-messages"],
    enabled: !!user,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch unread SMS messages count
  const { data: smsData } = useQuery<any[]>({
    queryKey: ["/api/sms/messages"],
    enabled: !!user,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Calculate unread team messages count
  const unreadTeamMessages = messagesData ? messagesData.filter((message: any) => 
    message.recipients && 
    Array.isArray(message.recipients) && 
    message.recipients.some((r: any) => r && r.recipientId === user?.id && !r.isRead)
  ).length : 0;

  // Calculate unread SMS messages count (assuming SMS messages have a status field)
  const unreadSmsMessages = smsData ? smsData.filter((message: any) => 
    message.status === 'received' && !message.isRead
  ).length : 0;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 z-40 mobile-overlay md:hidden" 
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        isMobile && !isOpen && "-translate-x-full",
        isMobile && isOpen && "translate-x-0"
      )}>
      <div className="p-4 md:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-lg flex items-center justify-center">
              <Briefcase className="text-white text-sm md:text-lg" />
            </div>
            <h1 className="ml-2 md:ml-3 text-lg md:text-xl font-bold text-gray-900">Pro Field Manager</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Team Messages Notification */}
            <Link href="/internal-messages" className="relative">
              <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                <MessageCircle className="h-4 w-4 text-gray-600" />
                {unreadTeamMessages > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-4 w-4 text-xs p-0 flex items-center justify-center bg-red-500 text-white border-0 min-w-[16px]"
                  >
                    {unreadTeamMessages > 99 ? '99+' : unreadTeamMessages}
                  </Badge>
                )}
              </Button>
            </Link>
            
            {/* SMS Messages Notification */}
            <Link href="/sms" className="relative">
              <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                <Smartphone className="h-4 w-4 text-gray-600" />
                {unreadSmsMessages > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-4 w-4 text-xs p-0 flex items-center justify-center bg-red-500 text-white border-0 min-w-[16px]"
                  >
                    {unreadSmsMessages > 99 ? '99+' : unreadSmsMessages}
                  </Badge>
                )}
              </Button>
            </Link>
            
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-1 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* User Info Section */}
      {user && (
        <div className="p-3 md:p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2 md:space-x-3">
            <Avatar className="h-8 w-8 md:h-10 md:w-10">
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs md:text-sm">
                {getInitials(user.firstName, user.lastName, user.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 md:gap-2">
                <p className="text-xs md:text-sm font-medium text-gray-900 truncate">
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user.username
                  }
                </p>
                {isAdmin && <Shield className="h-2.5 w-2.5 md:h-3 md:w-3 text-red-500" />}
              </div>
              <div className="flex items-center gap-1 md:gap-2 mt-0.5 md:mt-1">
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                {getRoleBadge(user.role)}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <nav className="flex-1 p-2 md:p-4 overflow-y-auto">
        <ul className="space-y-1 md:space-y-2">
          {filteredNavigation.map((item) => {
            if (item.hasSubmenu) {
              const isExpanded = expandedMenus.has(item.name) || 
                               (item.name === "Expenses" && isExpensesActive) ||
                               (item.name === "Admin Settings" && isAdminSettingsActive);
              const isActiveMenu = (item.name === "Expenses" && isExpensesActive) ||
                                 (item.name === "Admin Settings" && isAdminSettingsActive);
              return (
                <li key={item.name}>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 md:px-4 md:py-3 rounded-lg font-medium transition-colors text-sm md:text-base",
                      isActiveMenu
                        ? "text-primary bg-blue-50" 
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <div className="flex items-center">
                      <item.icon className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3" />
                      {item.name}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />
                    ) : (
                      <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                    )}
                  </button>
                  {isExpanded && (
                    <ul className="ml-6 md:ml-8 mt-1 md:mt-2 space-y-1">
                      {item.items?.map((subItem) => (
                        <li key={subItem.name}>
                          <Link
                            href={subItem.href}
                            onClick={handleLinkClick}
                            className={cn(
                              "flex items-center px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors",
                              isActiveItem(subItem.href)
                                ? "text-primary bg-blue-50"
                                : "text-gray-600 hover:bg-gray-100"
                            )}
                          >
                            {subItem.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            } else {
              const isActive = isActiveItem(item.href);
              return (
                <li key={item.name}>
                  <Link 
                    href={item.href}
                    onClick={handleLinkClick}
                    className={cn(
                      "flex items-center px-3 py-2 md:px-4 md:py-3 rounded-lg font-medium transition-colors text-sm md:text-base",
                      isActive 
                        ? "text-primary bg-blue-50" 
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <item.icon className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3" />
                    {item.name}
                  </Link>
                </li>
              );
            }
          })}
        </ul>
      </nav>
      
      {/* Logout Button */}
      <div className="p-3 md:p-4 border-t border-gray-200">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-600 hover:text-gray-900 text-sm md:text-base"
          onClick={() => {
            logout();
            handleLinkClick();
          }}
        >
          <LogOut className="mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5" />
          Sign Out
        </Button>
      </div>
    </div>
    </>
  );
}
