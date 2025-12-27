import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Zap, Building2 } from "lucide-react";
import { useData } from "@/lib/store";
import { useEffect } from "react";
import AdminDashboard from "@/pages/admin/AdminDashboard";

function ClientDashboard() {
  const estimators = [
    { title: "Civil Wall", desc: "Brick walls & partitions", href: "/estimators/civil-wall", icon: Building2 },
    { title: "Doors", desc: "Door frames & shutters", href: "/estimators/doors", icon: Building2 },
    { title: "Flooring", desc: "Tiles & wooden floors", href: "/estimators/flooring", icon: Building2 },
    { title: "Electrical", desc: "Wiring & lighting", href: "/estimators/electrical", icon: Zap },
    { title: "Plumbing", desc: "Pipes & fixtures", href: "/estimators/plumbing", icon: Building2 },
    { title: "Fire-Fighting", desc: "Safety systems", href: "/estimators/fire-fighting", icon: Zap },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold font-heading">Estimator Dashboard</h1>
          <p className="text-muted-foreground mt-2">Select an estimator to calculate material requirements</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {estimators.map((est) => (
            <Link key={est.href} href={est.href}>
              <Card className="group cursor-pointer hover:border-primary hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <est.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>{est.title}</CardTitle>
                  <CardDescription>{est.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between group-hover:translate-x-1 transition-transform">
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}

export default function Dashboard() {
  const { user } = useData();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  if (!user) return null;

  if (user.role === 'admin' || user.role === 'software_team') {
    return <AdminDashboard />;
  }

  if (user.role === 'supplier' || user.role === 'purchase_team') {
     // For now redirect supplier/purchase to Admin Dashboard but they will see limited views in future
     // Or we can create specific dashboard for them.
     // Requirement: "Supplier add materials... Purchase team logins and try to add materials"
     // So they primarily need Item Master access.
     return <AdminDashboard />; 
  }

  // Client / User role
  return <ClientDashboard />;
}
