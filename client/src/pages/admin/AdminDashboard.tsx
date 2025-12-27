import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useData, Material, Shop, ShopApprovalRequest } from "@/lib/store";
import {
  Plus,
  Trash2,
  Building2,
  Package,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* 🔴 REQUIRED ASTERISK */
const Required = () => <span className="text-red-500 ml-1">*</span>;

const UNIT_OPTIONS = [
  "pcs",
  "kg",
  "meter",
  "sqft",
  "cum",
  "litre",
  "set",
  "nos",
];
const CATEGORY_OPTIONS = [
  "Civil",
  "Plumbing",
  "Electrical",
  "Tiles",
  "Doors",
  "Paint",
  "Hardware",
  "Glass",
];

const COUNTRY_CODES = [
  { code: "+91", country: "India" },
  { code: "+1", country: "USA" },
  { code: "+44", country: "UK" },
  { code: "+61", country: "Australia" },
  { code: "+971", country: "UAE" },
  { code: "+81", country: "Japan" },
  { code: "+49", country: "Germany" },
];


export default function AdminDashboard() {
  const { toast } = useToast();
  const {
    shops,
    materials,
    addShop,
    addMaterial,
    user,
    approvalRequests,
    supportMessages,
    submitShopForApproval,
    submitMaterialForApproval, // ✅ ADD THIS
    approveShop,
    rejectShop,
    addSupportMessage,
  } = useData();

  const {
  materialApprovalRequests,
  approveMaterial,
  rejectMaterial,
} = useData();
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);


   // ==== LOCAL STORAGE STATES ====
  const [materialRequests, setMaterialRequests] = useState(() => {
    const saved = localStorage.getItem("materialApprovalRequests");
    return saved ? JSON.parse(saved) : [];
  });

  const [shopRequests, setShopRequests] = useState(() => {
    const saved = localStorage.getItem("shopApprovalRequests");
    return saved ? JSON.parse(saved) : [];
  });

  const [supportMsgs, setSupportMsgs] = useState(() => {
    const saved = localStorage.getItem("supportMessages");
    return saved ? JSON.parse(saved) : [];
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem("materialApprovalRequests", JSON.stringify(materialRequests));
  }, [materialRequests]);

  useEffect(() => {
    localStorage.setItem("shopApprovalRequests", JSON.stringify(shopRequests));
  }, [shopRequests]);

  useEffect(() => {
    localStorage.setItem("supportMessages", JSON.stringify(supportMsgs));
  }, [supportMsgs]);

  // State for new material
  const [newMaterial, setNewMaterial] = useState<Partial<Material>>({
    name: "",
    code: "",
    rate: 0,
    unit: "pcs",
    category: "",
    subCategory: "",
    brandName: "",
    modelNumber: "",
    technicalSpecification: "",
    dimensions: "",
    finish: "",
    metalType: "",
  });

  // State for new shop
  const [newShop, setNewShop] = useState<Partial<Shop>>({
    name: "",
    location: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    phoneCountryCode: "+91",
    //contactNumber: "",
    gstNo: "",
    rating: 5,
  });

  // State for support message
  const [supportMsg, setSupportMsg] = useState("");

  // Auto-generate code when name changes
  useEffect(() => {
    if (newMaterial.name) {
      const code =
        newMaterial.name.substring(0, 3).toUpperCase() +
        "-" +
        Math.floor(1000 + Math.random() * 9000);
      setNewMaterial((prev) => ({ ...prev, code }));
    }
  }, [newMaterial.name]);

  const handleAddMaterial = () => {
    if (!newMaterial.name || !newMaterial.rate) {
      toast({
        title: "Error",
        description: "Name and Rate are required",
        variant: "destructive",
      });
      return;
    }

    // Determine Shop ID based on role
    let shopId = "1";
    if (user?.role === "supplier" && user.shopId) {
      shopId = user.shopId;
    } else if (user?.role === "purchase_team" && newMaterial.shopId) {
      shopId = newMaterial.shopId;
    }

    // Mock validation (keep this as is)
    if (
      newMaterial.name.toLowerCase().includes("toy") ||
      newMaterial.name.toLowerCase().includes("game")
    ) {
      toast({
        title: "Warning Sent to Admin",
        description: "Irrelevant material detected. Flagged for review.",
        variant: "destructive",
      });
      return;
    }

    // 🔴 CHANGE IS HERE 👇
    const newRequest = {
  id: Math.random().toString(),
  material: { ...newMaterial },
  submittedBy: user?.name,
  submittedAt: new Date().toISOString(),
  status: "pending",
};

setMaterialRequests(prev => [...prev, newRequest]);

    // 🔴 DO NOT use addMaterial()

    toast({
      title: "Success",
      description:
        "Material submitted for approval. Software team will review and approve/reject.",
    });

    setNewMaterial({
      name: "",
      code: "",
      rate: 0,
      unit: "pcs",
      category: "",
      subCategory: "",
      brandName: "",
      modelNumber: "",
      technicalSpecification: "",
      dimensions: "",
      finish: "",
      metalType: "",
    });
  };

  const handleAddShop = () => {
    if (
      !newShop.name ||
      !newShop.phoneCountryCode ||
      //!newShop.contactNumber ||
      !newShop.city ||
      !newShop.state ||
      !newShop.country ||
      !newShop.pincode
    ) {
      toast({
        title: "Error",
        description: "All fields are required (GST is optional)",
        variant: "destructive",
      });
      return;
    }
    // This part should be **outside the if-block**
const newRequest = {
  id: Math.random().toString(),
  shop: { ...newShop },
  submittedBy: user?.name,
  submittedAt: new Date().toISOString(),
  status: "pending",
};

setShopRequests(prev => [...prev, newRequest]);
    setNewShop({
      name: "",
      location: "",
      city: "",
      phoneCountryCode: "+91",
      //contactNumber: "",
      state: "",
      country: "",
      pincode: "",
      gstNo: "",
    });
    toast({
      title: "Success",
      description:
        "Shop submitted for approval. Software team will review and approve/reject.",
    });
  };

  const handleApproveShop = (requestId: string) => {
    approveShop(requestId);
    toast({
      title: "Approved",
      description: "Shop has been approved and added to the system",
    });
  };

  const handleRejectShop = (requestId: string) => {
    if (!rejectReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }
    rejectShop(requestId, rejectReason);
    setRejectingId(null);
    setRejectReason("");
    toast({ title: "Rejected", description: "Shop has been rejected" });
  };

  const handleSupportSubmit = () => {
    if (!supportMsg) return;
    addSupportMessage(supportMsg);
    toast({
      title: "Request Sent",
      description: "Message sent to Admin & Software Team.",
    });
    setSupportMsg("");
  };

  const canViewSupportMessages =
    user?.role === "admin" || user?.role === "software_team";

  const canManageShops =
    user?.role === "admin" ||
    user?.role === "software_team" ||
    user?.role === "supplier" ||
    user?.role === "purchase_team";
  const canAddMaterials =
    user?.role === "admin" ||
    user?.role === "supplier" ||
    user?.role === "purchase_team";
  const canAccessSupport = user?.role === "supplier" || user?.role === "user";

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-heading">
            {user?.role === "supplier" ? "Supplier Portal" : "Admin Dashboard"}
          </h2>
          <p className="text-muted-foreground">
            Manage your inventory and settings
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Shops
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{shops.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Materials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{materials.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6" /> 2
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs
          defaultValue={
            canAddMaterials
              ? "materials"
              : canManageShops
                ? "shops"
                : canAccessSupport
                  ? "support"
                  : "materials"
          }
          className="w-full"
        >
     <TabsList
  className={cn(
    "w-full flex gap-2 flex-nowrap overflow-x-auto whitespace-nowrap",
    "bg-white rounded-xl p-1",
    "border border-gray-200",
    "shadow-sm"
  )}
>
  {canAddMaterials && (
    <TabsTrigger value="materials">📦 Manage Materials</TabsTrigger>
  )}

  {canManageShops && (
    <TabsTrigger value="shops">🏟️ Manage Shops</TabsTrigger>
  )}

  {(user?.role === "admin" || user?.role === "software_team") && (
    <TabsTrigger value="approvals">
      Shop Approvals ({shopRequests.filter((r) => r.status === "pending").length})
    </TabsTrigger>
  )}

  {(user?.role === "admin" || user?.role === "software_team") && (
    <TabsTrigger value="material-approvals">
  Material Approvals ({materialRequests.filter((r) => r.status === "pending").length})
</TabsTrigger>

  )}

  {canViewSupportMessages && (
    <TabsTrigger value="messages">
      💬 Messages ({supportMessages.filter((m) => !m.isRead).length})
    </TabsTrigger>
  )}

  {canAccessSupport && <TabsTrigger value="support">Technical Support</TabsTrigger>}
</TabsList>


          {/* === MATERIALS TAB === */}
          <TabsContent value="materials" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Add New Material</CardTitle>
                <CardDescription>
                  Enter details to list a new item in the master database.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Basic Info */}
                  <div className="space-y-2">
                    <Label>
                      Material Name <span className="text-red-500">*</span>
                    </Label>

                    <Input
                      value={newMaterial.name}
                      onChange={(e) =>
                        setNewMaterial({ ...newMaterial, name: e.target.value })
                      }
                      placeholder="e.g. 18mm Plywood"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Item Code (Auto)</Label>
                    <Input
                      value={newMaterial.code}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rate (₹) <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      value={newMaterial.rate}
                      onChange={(e) =>
                        setNewMaterial({
                          ...newMaterial,
                          rate: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>

                  {/* Classification */}
                  <div className="space-y-2">
                    <Label>Category <span className="text-red-500">*</span> </Label>
                    <Select
                      onValueChange={(v) =>
                        setNewMaterial({ ...newMaterial, category: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sub Category <span className="text-red-500">*</span> </Label>
                    <Input
                      value={newMaterial.subCategory}
                      onChange={(e) =>
                        setNewMaterial({
                          ...newMaterial,
                          subCategory: e.target.value,
                        })
                      }
                      placeholder="e.g. Commercial"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit <span className="text-red-500">*</span> 
                    </Label>
                    <Select
                      onValueChange={(v) =>
                        setNewMaterial({ ...newMaterial, unit: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Purchase Team Only: Select Shop */}
                  {user?.role === "purchase_team" && (
                    <div className="space-y-2">
                      <Label className="text-blue-600 font-bold">
                        Select Shop (Purchase Team)
                      </Label>
                      <Select
                        onValueChange={(v) =>
                          setNewMaterial({ ...newMaterial, shopId: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {shops.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Technical Specs */}
                  <div className="space-y-2">
                    <Label>Brand Name <span className="text-red-500">*</span> </Label>
                    <Input
                      value={newMaterial.brandName}
                      onChange={(e) =>
                        setNewMaterial({
                          ...newMaterial,
                          brandName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Model Number <span className="text-red-500">*</span> </Label>
                    <Input
                      value={newMaterial.modelNumber}
                      onChange={(e) =>
                        setNewMaterial({
                          ...newMaterial,
                          modelNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dimensions</Label>
                    <Input
                      value={newMaterial.dimensions}
                      onChange={(e) =>
                        setNewMaterial({
                          ...newMaterial,
                          dimensions: e.target.value,
                        })
                      }
                      placeholder="L x W x H"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Finish</Label>
                    <Input
                      value={newMaterial.finish}
                      onChange={(e) =>
                        setNewMaterial({
                          ...newMaterial,
                          finish: e.target.value,
                        })
                      }
                      placeholder="e.g. Matte, Glossy"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Metal Type</Label>
                    <Input
                      value={newMaterial.metalType}
                      onChange={(e) =>
                        setNewMaterial({
                          ...newMaterial,
                          metalType: e.target.value,
                        })
                      }
                      placeholder="e.g. SS 304, Aluminum"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Technical Specification</Label>
                  <Textarea
                    value={newMaterial.technicalSpecification}
                    onChange={(e) =>
                      setNewMaterial({
                        ...newMaterial,
                        technicalSpecification: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Product Image</Label>
                  <Input type="file" className="cursor-pointer" />
                </div>

                <Button
                  onClick={handleAddMaterial}
                  className="w-full md:w-auto"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Material
                </Button>
              </CardContent>
            </Card>

            {/* Existing Materials List */}
            <div className="grid gap-4 md:grid-cols-2">
              {materials.map((mat) => (
                <Card key={mat.id}>
                  <CardContent className="flex flex-row items-center justify-between p-6">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Package className="h-4 w-4" /> {mat.name}
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        Code: {mat.code} • ₹{mat.rate}/{mat.unit}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {mat.category} &gt; {mat.subCategory}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* === SHOPS TAB === */}
          <TabsContent value="shops" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Add New Shop</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Shop Name <span className="text-red-500">*</span></Label>
                    <Input
                      value={newShop.name}
                      onChange={(e) =>
                        setNewShop({ ...newShop, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location <span className="text-red-500">*</span> </Label>
                    <Input
                      value={newShop.location}
                      onChange={(e) =>
                        setNewShop({ ...newShop, location: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City <span className="text-red-500">*</span> </Label>
                    <Input
                      value={newShop.city}
                      onChange={(e) =>
                        setNewShop({ ...newShop, city: e.target.value })
                      }
                    />
                  </div>

               <div className="space-y-2">
  <Label>
    Phone Number <span className="text-red-500">*</span>
  </Label>

  <div className="flex gap-2">
    {/* Country Code Dropdown */}
    <Select
      value={newShop.phoneCountryCode}
      onValueChange={(value) =>
        setNewShop({ ...newShop, phoneCountryCode: value })
      }
    >
      <SelectTrigger className="w-28">
        <SelectValue placeholder="+91" />
      </SelectTrigger>
      <SelectContent>
        {COUNTRY_CODES.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.country} ({c.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Phone Number Input */}
    <Input
      value={newShop.contactNumber}
      onChange={(e) =>
        setNewShop({
          ...newShop,
          contactNumber: e.target.value,
        })
      }
      placeholder="Enter phone number"
      type="tel"
    />
  </div>
</div>


                  <div className="space-y-2">
                    <Label>State <span className="text-red-500">*</span></Label>
                    <Input
                      value={newShop.state}
                      onChange={(e) =>
                        setNewShop({ ...newShop, state: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Country <span className="text-red-500">*</span></Label>
                    <Input
                      value={newShop.country}
                      onChange={(e) =>
                        setNewShop({ ...newShop, country: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Pincode / Zipcode <span className="text-red-500">*</span></Label>
                    <Input
                      value={newShop.pincode}
                      onChange={(e) =>
                        setNewShop({ ...newShop, pincode: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>GST No (Optional)</Label>
                    <Input
                      value={newShop.gstNo}
                      onChange={(e) =>
                        setNewShop({ ...newShop, gstNo: e.target.value })
                      }
                      placeholder="29ABCDE1234F1Z5"
                    />
                  </div>
                </div>
                <Button onClick={handleAddShop}>Add Shop</Button>
              </CardContent>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              {shops.map((shop) => (
                <Card key={shop.id}>
                  <CardContent className="flex flex-row items-center justify-between p-6">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Building2 className="h-4 w-4" /> {shop.name}
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        {shop.location}, {shop.city}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* === APPROVALS TAB === */}
          {canManageShops && (
  <TabsContent value="approvals" className="space-y-4 mt-4">
    <Card>
      <CardHeader>
        <CardTitle>Shop Approval Requests</CardTitle>
        <CardDescription>
          Review and approve/reject new shop submissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {shopRequests.filter((r) => r.status === "pending").length === 0 ? (
          <p className="text-muted-foreground">
            No pending approval requests
          </p>
        ) : (
          shopRequests
            .filter((r) => r.status === "pending")
            .map((request) => (
              <Card key={request.id} className="border-border/50">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold">{request.shop.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Submitted by: {request.submittedBy} at{" "}
                      {new Date(request.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium">Location:</span>{" "}
                      {request.shop.location}
                    </div>
                    <div>
                      <span className="font-medium">City:</span>{" "}
                      {request.shop.city}
                    </div>
                    <div>
                      <span className="font-medium">State:</span>{" "}
                      {request.shop.state}
                    </div>
                    <div>
                      <span className="font-medium">Country:</span>{" "}
                      {request.shop.country}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span>{" "}
                      {request.shop.phoneCountryCode}{" "}
                      {request.shop.contactNumber}
                    </div>
                    <div>
                      <span className="font-medium">Pincode:</span>{" "}
                      {request.shop.pincode}
                    </div>
                    {request.shop.gstNo && (
                      <div className="col-span-2">
                        <span className="font-medium">GST:</span>{" "}
                        {request.shop.gstNo}
                      </div>
                    )}
                  </div>

                  {/* Approve / Reject Buttons */}
                  <div className="flex gap-2">
                    {/* Approve */}
                    <Button
                      size="sm"
                      onClick={() =>
                        setShopRequests((prev) =>
                          prev.map((r) =>
                            r.id === request.id ? { ...r, status: "approved" } : r
                          )
                        )
                      }
                      className="gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </Button>

                    {/* Reject */}
                    {rejectingId === request.id ? (
                      <div className="flex gap-2 flex-1">
                        <Input
                          placeholder="Rejection reason..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            setShopRequests((prev) =>
                              prev.map((r) =>
                                r.id === request.id
                                  ? { ...r, status: "rejected", rejectionReason: rejectReason }
                                  : r
                              )
                            );
                            setRejectingId(null);
                            setRejectReason("");
                          }}
                          variant="destructive"
                        >
                          Confirm
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectingId(request.id)}
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </CardContent>

      {/* Processed Requests */}
      {shopRequests.filter((r) => r.status !== "pending").length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Processed Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shopRequests
              .filter((r) => r.status !== "pending")
              .map((request) => (
                <div
                  key={request.id}
                  className="flex justify-between items-start p-3 bg-muted/50 rounded"
                >
                  <div>
                    <p className="font-medium">{request.shop.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.submittedBy}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={request.status === "approved" ? "default" : "destructive"}
                    >
                      {request.status.toUpperCase()}
                    </Badge>
                    {request.rejectionReason && (
                      <p className="text-xs mt-1">Reason: {request.rejectionReason}</p>
                    )}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </Card>
  </TabsContent>
)}


          {/* === MATERIAL APPROVALS TAB === */}
<TabsContent value="material-approvals" className="space-y-4 mt-4">
  <Card>
    <CardHeader>
      <CardTitle>Material Approval Requests</CardTitle>
      <CardDescription>
        Review and approve/reject new material submissions
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {materialRequests.filter(r => r.status === "pending").length === 0 ? (
        <p className="text-muted-foreground">No pending material approvals</p>
      ) : (
        materialRequests
          .filter(r => r.status === "pending")
          .map((request) => (
            <Card key={request.id} className="border-border/50">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h3 className="text-lg font-bold">{request.material.name}</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                    <div><b>Item Code:</b> {request.material.code}</div>
                    <div><b>Rate:</b> ₹{request.material.rate}</div>
                    <div><b>Category:</b> {request.material.category}</div>
                    <div><b>Sub Category:</b> {request.material.subCategory}</div>
                    <div><b>Unit:</b> {request.material.unit}</div>
                    <div><b>Brand:</b> {request.material.brandName || "—"}</div>
                    <div><b>Model:</b> {request.material.modelNumber || "—"}</div>
                    <div><b>Finish:</b> {request.material.finish || "—"}</div>
                    <div><b>Metal Type:</b> {request.material.metalType || "—"}</div>
                    <div className="col-span-2"><b>Dimensions:</b> {request.material.dimensions || "—"}</div>
                    <div className="col-span-2"><b>Technical Spec:</b> {request.material.technicalSpecification || "—"}</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Submitted by: {request.submittedBy} at {new Date(request.submittedAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      setMaterialRequests(prev =>
                        prev.map(r =>
                          r.id === request.id ? { ...r, status: "approved" } : r
                        )
                      )
                    }
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setMaterialRequests(prev =>
                        prev.map(r =>
                          r.id === request.id ? { ...r, status: "rejected" } : r
                        )
                      )
                    }
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
      )}
    </CardContent>
  </Card>
</TabsContent>


          {/* === MESSAGES TAB (Admin/Software Team Only) === */}
          {canViewSupportMessages && (
            <TabsContent value="messages" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Support Messages</CardTitle>
                  <CardDescription>
                    Messages from suppliers and users sent to Admin & Software
                    Team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {supportMessages.length === 0 ? (
                    <p className="text-muted-foreground">No messages yet</p>
                  ) : (
                    supportMessages.map((msg) => (
                      <Card key={msg.id} className="border-border/50">
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">{msg.sentBy}</p>
                              <p className="text-xs text-muted-foreground">
                                Role: {msg.sentByRole} •{" "}
                                {new Date(msg.sentAt).toLocaleString()}
                              </p>
                            </div>
                            {!msg.isRead && <Badge>New</Badge>}
                          </div>
                          <p className="text-sm leading-relaxed bg-muted/50 p-3 rounded">
                            {msg.message}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* === SUPPORT TAB === */}
          {/* === SUPPORT TAB === */}
<TabsContent value="support" className="space-y-4 mt-4">
  <Card>
    <CardHeader>
      <CardTitle>Technical Support</CardTitle>
      <CardDescription>
        Request new categories or report issues to the software team.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Input for new support message */}
      <div className="space-y-2">
        <Label>Message / Request</Label>
        <Textarea
          placeholder="I need a new category for 'Smart Home Devices'..."
          className="min-h-[150px]"
          value={supportMsg}
          onChange={(e) => setSupportMsg(e.target.value)}
          data-testid="textarea-support-message"
        />
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded text-sm text-blue-700 dark:text-blue-300">
        ✓ This message will be sent to Admin & Software Team
      </div>

      <Button
        onClick={handleSupportSubmit}
        data-testid="button-send-support"
      >
        <MessageSquare className="mr-2 h-4 w-4" /> Send Request
      </Button>

      {/* Display list of messages */}
      {supportMsgs.length === 0 ? (
        <p className="text-muted-foreground">No messages yet</p>
      ) : (
        supportMsgs.map((msg) => (
          <Card key={msg.id} className="border-border/50">
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{msg.sentBy}</p>
                  <p className="text-xs text-muted-foreground">
                    Role: {msg.sentByRole} • {new Date(msg.sentAt).toLocaleString()}
                  </p>
                </div>
                {!msg.isRead && <Badge>New</Badge>}
              </div>
              <p className="text-sm leading-relaxed bg-muted/50 p-3 rounded">
                {msg.message}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </CardContent>
  </Card>
</TabsContent>

        </Tabs>
      </div>
    </Layout>
  );
}
