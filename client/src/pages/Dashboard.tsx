import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Building2, MessageSquare, Trash2 } from "lucide-react";
import { useData } from "@/lib/store";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import SupplierMaterials from "@/pages/supplier/SupplierMaterials";

function ClientDashboard() {
  const { toast } = useToast();
  const { addSupportMessage, deleteMessage, supportMessages, user } = useData();
  const [showSupport, setShowSupport] = useState(false);
  const [supportSenderName, setSupportSenderName] = useState("");
  const [supportSenderInfo, setSupportSenderInfo] = useState("");
  const [supportMsg, setSupportMsg] = useState("");

  const handleSupportSubmit = () => {
    if (!supportMsg || !supportSenderName) {
      toast({
        title: "Error",
        description: "Name and message are required",
        variant: "destructive",
      });
      return;
    }
    (async () => {
      try {
        await addSupportMessage?.(supportSenderName, supportMsg, supportSenderInfo);
        toast({
          title: "Request Sent",
          description: "Message sent to Admin & Software Team.",
        });
        setSupportMsg("");
        setSupportSenderName("");
        setSupportSenderInfo("");
        setShowSupport(false);
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
      }
    })();
  };

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

        {/* Technical Support Section */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <div>
                  <CardTitle>Technical Support</CardTitle>
                  <CardDescription>Send a message to the admin team</CardDescription>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowSupport(!showSupport)}
              >
                {showSupport ? "Cancel" : "Send Message"}
              </Button>
            </div>
          </CardHeader>
          
          {showSupport && (
            <CardContent className="space-y-4">
              {/* Sender Name Input */}
              <div className="space-y-2">
                <Label>Your Name <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Enter your name..."
                  value={supportSenderName}
                  onChange={(e) => setSupportSenderName(e.target.value)}
                />
              </div>

              {/* Additional Info Input */}
              <div className="space-y-2">
                <Label>Additional Information (Optional)</Label>
                <Textarea
                  placeholder="Any additional context..."
                  className="min-h-[80px]"
                  value={supportSenderInfo}
                  onChange={(e) => setSupportSenderInfo(e.target.value)}
                />
              </div>

              {/* Message Input */}
              <div className="space-y-2">
                <Label>Message <span className="text-red-500">*</span></Label>
                <Textarea
                  placeholder="Describe your issue or request..."
                  className="min-h-[150px]"
                  value={supportMsg}
                  onChange={(e) => setSupportMsg(e.target.value)}
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded text-sm text-blue-700 dark:text-blue-300">
                ✓ This message will be sent to Admin & Software Team
              </div>

              <Button onClick={handleSupportSubmit}>
                <MessageSquare className="mr-2 h-4 w-4" /> Send Request
              </Button>
            </CardContent>
          )}

          {/* Display sent messages */}
          {((supportMessages || []).filter((msg: any) => msg.sender_name === supportSenderName && msg.sender_name)).length > 0 && (
            <CardContent className="space-y-3 border-t pt-4">
              <p className="font-semibold text-sm">Your Messages:</p>
              {(supportMessages || []).filter((msg: any) => msg.sender_name === supportSenderName && msg.sender_name).map((msg: any) => (
                <Card key={msg.id} className="border-border/50">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          Sent: {new Date(msg.sent_at || msg.sentAt).toLocaleString()}
                        </p>
                        {msg.info && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-semibold">Info: </span>{msg.info}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          (async () => {
                            try {
                              await deleteMessage?.(msg.id);
                              toast({
                                title: "Success",
                                description: "Message deleted",
                              });
                            } catch (err) {
                              toast({
                                title: "Error",
                                description: "Failed to delete message",
                                variant: "destructive",
                              });
                            }
                          })();
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    <p className="text-sm leading-relaxed bg-muted/50 p-3 rounded">
                      {msg.message}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          )}
        </Card>
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
      return;
    }

    // Redirect to role-specific dashboards
    switch (user.role) {
      case 'admin':
        setLocation("/admin/dashboard");
        break;
      case 'software_team':
        setLocation("/software/dashboard");
        break;
      case 'purchase_team':
        setLocation("/purchase/dashboard");
        break;
      case 'supplier':
        setLocation("/supplier/dashboard");
        break;
      default:
        // Stay on generic dashboard for users
        break;
    }
  }, [user, setLocation]);

  if (!user) return null;

  // This component should now redirect, but keep as fallback
  if (user.role === 'admin' || user.role === 'software_team') {
    return <AdminDashboard />;
  }

  if (user.role === 'supplier') {
     return <SupplierMaterials />;
  }

  if (user.role === 'purchase_team') {
     return <AdminDashboard />;
  }

  // Client / User role
  return <ClientDashboard />;
}
