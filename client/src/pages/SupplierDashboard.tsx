import { useEffect } from "react";
import { useLocation } from "wouter";
import { useData } from "@/lib/store";

export default function SupplierDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useData();

  useEffect(() => {
    if (!user || user.role !== 'supplier') {
      setLocation("/");
      return;
    }
    // Redirect to supplier materials page
    setLocation("/supplier/materials");
  }, [user, setLocation]);

  return null;
}