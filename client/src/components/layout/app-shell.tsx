import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calculator,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  Users,
  Video,
  LifeBuoy,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Define navigation items based on role
  const getNavItems = () => {
    const items = [
      // Common or Dashboard
      { 
        label: "Dashboard", 
        href: "/", 
        icon: LayoutDashboard,
        roles: ["admin", "supplier", "purchase_team", "software_team", "user"] 
      },
      // Estimator - User (Client) & Admin
      { 
        label: "Estimator", 
        href: "/estimator", 
        icon: Calculator,
        roles: ["admin", "user", "software_team"] 
      },
      // Materials - Purchase Team, Admin, Software, Supplier (View only?)
      { 
        label: "Materials", 
        href: "/materials", 
        icon: Package,
        roles: ["admin", "purchase_team", "software_team", "supplier"] 
      },
      // Orders/Purchases
      { 
        label: "Orders", 
        href: "/orders", 
        icon: ShoppingCart,
        roles: ["admin", "purchase_team", "software_team"] 
      },
      // Users/Clients - Admin & Software
      { 
        label: "Users", 
        href: "/users", 
        icon: Users,
        roles: ["admin", "software_team"] 
      },
      // Demo Videos - All
      { 
        label: "Demos & Help", 
        href: "/demos", 
        icon: Video,
        roles: ["admin", "supplier", "user", "purchase_team", "software_team"] 
      },
       // Support - Supplier
       { 
        label: "Tech Support", 
        href: "/support", 
        icon: LifeBuoy,
        roles: ["supplier"] 
      },
      // Settings - Admin & Software
      { 
        label: "Settings", 
        href: "/settings", 
        icon: Settings,
        roles: ["admin", "software_team"] 
      },
    ];

    return items.filter(item => user?.role && item.roles.includes(user.role));
  };

  const navItems = getNavItems();

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
            WB
          </div>
          WallBuilder
        </h1>
        <p className="text-xs text-sidebar-foreground/60 mt-1 pl-1">
          {user?.role ? user.role.replace("_", " ").toUpperCase() : "GUEST"} PORTAL
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              onClick={() => setIsMobileOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/20">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center border border-sidebar-border">
            <span className="text-sm font-bold">{user?.name?.charAt(0)}</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground bg-transparent"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </Button>
      </div>
    </div>
  );

  if (!user) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r border-border shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 border-r-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden border-b bg-background p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 font-bold font-heading text-lg">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground text-xs">
              WB
            </div>
            WallBuilder
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
        </header>

        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
