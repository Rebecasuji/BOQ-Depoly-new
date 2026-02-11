import { useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Package, 
  MessageSquare, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

interface SupplierLayoutProps {
  children: React.ReactNode;
  shopName?: string;
  shopLocation?: string;
  shopApproved?: boolean;
}

export function SupplierLayout({ 
  children, 
  shopName = "Shop",
  shopLocation = "",
  shopApproved = false
}: SupplierLayoutProps) {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const navItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/supplier/dashboard",
    },
    ...(shopApproved ? [{
      label: "Manage Materials",
      icon: Package,
      path: "/supplier/materials",
    }] : []),
    {
      label: "Messages / Support",
      icon: MessageSquare,
      path: "/supplier/support",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <div className="hidden lg:block">
                <h2 className="text-xl font-bold text-gray-900">{shopName}</h2>
                {shopLocation && (
                  <p className="text-sm text-gray-500">{shopLocation}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-16 left-0 w-64 bg-white border-r border-gray-200 
            transition-transform duration-300 ease-in-out
            lg:static lg:inset-auto lg:translate-x-0 lg:w-64
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            z-30
          `}
        >
          <nav className="space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    setLocation(item.path);
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition"
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
