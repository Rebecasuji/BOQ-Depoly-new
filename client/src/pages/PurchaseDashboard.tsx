import { useEffect } from "react";
import { useLocation } from "wouter";
import { useData } from "@/lib/store";

export default function PurchaseDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useData();

  useEffect(() => {
    if (!user || user.role !== 'purchase_team') {
      setLocation("/");
      return;
    }
    // Redirect to admin dashboard for now (purchase team can access admin features)
    setLocation("/admin/dashboard");
  }, [user, setLocation]);

  return null;
}