import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BrickWall,
  DoorOpen,
  Cloud,
  Layers,
  PaintBucket,
  Blinds,
  Zap,
  Droplets,
  Hammer,
  ShieldAlert,
  Menu,
  X,
  LogOut,
  Settings,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/store";

const estimatorItems = [
  { icon: BrickWall, label: "Civil Wall", href: "/estimators/civil-wall" },
  { icon: DoorOpen, label: "Doors", href: "/estimators/doors" },
  { icon: Cloud, label: "False Ceiling", href: "/estimators/false-ceiling" },
  { icon: Layers, label: "Flooring", href: "/estimators/flooring" },
  { icon: PaintBucket, label: "Painting", href: "/estimators/painting" },
  { icon: Blinds, label: "Blinds", href: "/estimators/blinds" },
  { icon: Zap, label: "Electrical", href: "/estimators/electrical" },
  { icon: Droplets, label: "Plumbing", href: "/estimators/plumbing" },
  { icon: Hammer, label: "MS Work", href: "/estimators/ms-work" },
  { icon: Hammer, label: "SS Work", href: "/estimators/ss-work" },
  { icon: ShieldAlert, label: "Fire-Fighting", href: "/estimators/fire-fighting" },
];

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const { user, logout } = useData();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const isAdminOrSoftware = user?.role === 'admin' || user?.role === 'software_team';
  const isSupplierOrPurchase = user?.role === 'supplier' || user?.role === 'purchase_team';
  const isClient = user?.role === 'user';

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform bg-sidebar border-r border-sidebar-border transition-transform duration-200 ease-in-out md:translate-x-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-center border-b border-sidebar-border bg-sidebar-primary/10">
          <h1 className="text-xl font-bold tracking-tight text-sidebar-primary font-heading">
            BUILD<span className="text-foreground">ESTIMATE</span>
          </h1>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {/* Dashboard Link - varies by role */}
          <Link href="/dashboard">
            <a className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors mb-4", location === "/dashboard" ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </a>
          </Link>

          {(isAdminOrSoftware || isSupplierOrPurchase) && (
             <Link href="/admin/dashboard">
                <a className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors mb-4", location === "/admin/dashboard" ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
                  <Settings className="h-4 w-4" />
                  {isAdminOrSoftware ? "Admin Panel" : "Manage Materials"}
                </a>
             </Link>
          )}

          {/* Estimators Section */}
          {(isClient || isAdminOrSoftware) && (
            <>
              <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Estimators
              </div>
              {estimatorItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      location === item.href
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </a>
                </Link>
              ))}
            </>
          )}

          {/* Other Links */}
          <div className="mt-6 px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Resources
          </div>
          <Link href="/subscription">
            <a className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent">
              <Package className="h-4 w-4" />
              Subscription
            </a>
          </Link>
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-bold">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-sidebar-foreground truncate">{user?.name || "Guest"}</span>
              <span className="text-xs text-muted-foreground truncate capitalize">{user?.role?.replace('_', ' ') || "Visitor"}</span>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
        </div>
      </aside>
    </>
  );
}
