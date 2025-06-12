import { Link, useLocation } from "wouter";
import { 
  FileText, 
  BarChart3, 
  Users, 
  CreditCard, 
  FileBarChart, 
  Settings,
  User,
  Quote
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Reports", href: "/reports", icon: FileBarChart },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

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
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
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
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Demo User</p>
            <p className="text-xs text-gray-500">demo@example.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
