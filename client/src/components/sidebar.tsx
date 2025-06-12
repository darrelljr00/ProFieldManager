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
  UserCog,
  LogOut,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Quotes", href: "/quotes", icon: Quote },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Text Messaging", href: "/messages", icon: MessageSquare },
  { name: "User Management", href: "/users", icon: UserCog },
  { name: "Reports", href: "/reports", icon: FileBarChart },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout, isAdmin } = useAuth();

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

  const filteredNavigation = navigation.filter(item => {
    if (item.href === "/users") {
      return isAdmin;
    }
    return true;
  });

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <FileText className="text-white text-lg" />
          </div>
          <h1 className="ml-3 text-xl font-bold text-gray-900">InvoicePro</h1>
        </div>
      </div>
      
      {/* User Info Section */}
      {user && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {getInitials(user.firstName, user.lastName, user.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user.username
                  }
                </p>
                {isAdmin && <Shield className="h-3 w-3 text-red-500" />}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                {getRoleBadge(user.role)}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a className={cn(
                    "flex items-center px-4 py-3 rounded-lg font-medium transition-colors",
                    isActive 
                      ? "text-primary bg-blue-50" 
                      : "text-gray-700 hover:bg-gray-100"
                  )}>
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-600 hover:text-gray-900"
          onClick={logout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
