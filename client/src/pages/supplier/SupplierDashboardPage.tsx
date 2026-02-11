import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Package, TrendingUp } from "lucide-react";
import { SupplierLayout } from "@/components/layout/SupplierLayout";

interface ActivityStats {
  submitted: number;
  approved: number;
  rejected: number;
  pending: number;
}

interface SupplierDashboardPageProps {
  shopName?: string;
  shopLocation?: string;
}

export function SupplierDashboardPage({
  shopName = "Shop",
  shopLocation = "",
}: SupplierDashboardPageProps) {
  const [stats, setStats] = useState<ActivityStats>({
    submitted: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivityStats();
  }, []);

  const loadActivityStats = async () => {
    try {
      const token = localStorage.getItem("authToken");

      // Get material submissions
      const response = await fetch("/api/supplier/my-submissions", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        console.error("Failed to load stats");
        setLoading(false);
        return;
      }

      const data = await response.json();
      const submissions = data.submissions || [];

      // Calculate stats
      const submitted = submissions.length;
      const approved = submissions.filter(
        (s: any) => s.status === "approved"
      ).length;
      const rejected = submissions.filter(
        (s: any) => s.status === "rejected"
      ).length;
      const pending = submissions.filter(
        (s: any) => s.status === "pending"
      ).length;

      setStats({
        submitted,
        approved,
        rejected,
        pending,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
  }: {
    title: string;
    value: number;
    icon: any;
    color: string;
  }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon size={24} className="text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <SupplierLayout shopName={shopName} shopLocation={shopLocation} shopApproved={true}>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back! Here's your supplier activity overview.
          </p>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="h-20 bg-gray-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Submitted"
              value={stats.submitted}
              icon={Package}
              color="bg-blue-500"
            />
            <StatCard
              title="Approved Materials"
              value={stats.approved}
              icon={CheckCircle2}
              color="bg-green-500"
            />
            <StatCard
              title="Pending Review"
              value={stats.pending}
              icon={AlertCircle}
              color="bg-yellow-500"
            />
            <StatCard
              title="Rejected"
              value={stats.rejected}
              icon={AlertCircle}
              color="bg-red-500"
            />
          </div>
        )}

        {/* Recent Activity Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={20} />
              Quick Summary
            </CardTitle>
            <CardDescription>
              Overview of your materials and approvals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <p className="font-semibold text-gray-900">Success Rate</p>
                  <p className="text-sm text-gray-600">
                    {stats.submitted > 0
                      ? `${Math.round(
                          (stats.approved / stats.submitted) * 100
                        )}% approved`
                      : "No submissions yet"}
                  </p>
                </div>
                <Badge className="bg-blue-600">
                  {stats.approved}/{stats.submitted}
                </Badge>
              </div>

              {stats.pending > 0 && (
                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div>
                    <p className="font-semibold text-gray-900">
                      Pending Review
                    </p>
                    <p className="text-sm text-gray-600">
                      {stats.pending} material(s) awaiting approval
                    </p>
                  </div>
                  <Badge className="bg-yellow-600">{stats.pending}</Badge>
                </div>
              )}

              {stats.rejected > 0 && (
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="font-semibold text-gray-900">
                      Rejected Materials
                    </p>
                    <p className="text-sm text-gray-600">
                      {stats.rejected} material(s) need revision
                    </p>
                  </div>
                  <Badge className="bg-red-600">{stats.rejected}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Have questions about your submissions or need technical support?
              Visit the Messages/Support section or contact our team.
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>• Submit materials using the "Manage Materials" section</p>
              <p>• Review approval status for each submission</p>
              <p>• Contact support for urgent issues</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </SupplierLayout>
  );
}
