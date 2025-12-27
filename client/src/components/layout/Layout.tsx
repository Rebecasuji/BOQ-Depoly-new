import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="md:pl-64 min-h-screen transition-all duration-200">
        <div className="container mx-auto p-4 md:p-8 pt-16 md:pt-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
