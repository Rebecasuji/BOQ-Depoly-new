import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Edit, Loader2, Search } from "lucide-react";
import apiFetch from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout/Layout";

type Product = {
    id: string;
    name: string;
    subcategory: string;
    created_at: string;
    created_by?: string;
};

type Category = {
    id: string;
    name: string;
};

type Subcategory = {
    id: string;
    name: string;
    category: string;
};

type Material = {
    id: string;
    name: string;
    unit: string;
    rate: number;
    category: string;
    subcategory: string;
};

type SelectedMaterial = Material & {
    qty: number;
    amount: number;
    rate: number;
    supplyRate: number;
    installRate: number;
    location: string;
};

export default function ManageProduct() {
    const [step, setStep] = useState(1);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [configName, setConfigName] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
    const [selectedMaterials, setSelectedMaterials] = useState<Material[]>([]);
    const [configMaterials, setConfigMaterials] = useState<SelectedMaterial[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    // Step 1: Fetch Products
    const { data: productsData, isLoading: loadingProducts } = useQuery({
        queryKey: ["/api/products"],
        queryFn: async () => {
            const res = await apiFetch("/api/products");
            if (!res.ok) throw new Error("Failed to fetch products");
            const data = await res.json();
            return (data.products || []) as Product[];
        },
    });

    // Step 2: Fetch Categories
    const { data: categoriesData } = useQuery({
        queryKey: ["/api/material-categories"],
        queryFn: async () => {
            const res = await apiFetch("/api/material-categories");
            if (!res.ok) throw new Error("Failed to fetch categories");
            const data = await res.json();
            return (data.categories || []) as string[];
        },
        enabled: step === 2,
    });

    // Fetch Subcategories based on selected Category
    const { data: subcategoriesData } = useQuery({
        queryKey: ["/api/material-subcategories", selectedCategory],
        queryFn: async () => {
            const res = await apiFetch(`/api/material-subcategories/${selectedCategory}`);
            if (!res.ok) throw new Error("Failed to fetch subcategories");
            const data = await res.json();
            // Subcategories route returns { subcategories: string[] }
            return (data.subcategories || []) as string[];
        },
        enabled: step === 2 && !!selectedCategory && selectedCategory !== " ",
    });

    // Fetch all materials
    const { data: materialsData, isLoading: loadingMaterials } = useQuery({
        queryKey: ["/api/materials"],
        queryFn: async () => {
            const res = await apiFetch("/api/materials");
            if (!res.ok) throw new Error("Failed to fetch materials");
            const data = await res.json();
            return (data.materials || []) as Material[];
        },
        enabled: step === 2,
    });

    const filteredMaterials = (materialsData || []).filter((m) => {
        const matchesCategory = !selectedCategory || m.category === selectedCategory;
        const matchesSubcategory = !selectedSubcategory || m.subcategory === selectedSubcategory;
        return matchesCategory && matchesSubcategory;
    });

    const nextStep = () => {
        if (step === 1 && !selectedProduct) {
            toast({ title: "Product Required", description: "Please select a product to proceed.", variant: "destructive" });
            return;
        }
        if (step === 2 && selectedMaterials.length === 0) {
            toast({ title: "Selection Required", description: "Please select at least one material.", variant: "destructive" });
            return;
        }

        if (step === 2) {
            setConfigMaterials(
                selectedMaterials.map((m) => {
                    const rate = Number(m.rate) || 0;
                    return {
                        ...m,
                        qty: 1,
                        amount: rate,
                        rate: rate,
                        supplyRate: rate,
                        installRate: 0,
                        location: "Main Area"
                    };
                })
            );
        }

        setStep(step + 1);
    };

    const handleSave = async () => {
        if (!selectedProduct) return;

        setIsSaving(true);
        try {
            // Generate unique config name if none provided to ensure new configuration creation
            const uniqueConfigName = configName || `${selectedProduct.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const res = await apiFetch("/api/step11-products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: selectedProduct.id,
                    productName: selectedProduct.name,
                    configName: uniqueConfigName,
                    categoryId: selectedCategory,
                    subcategoryId: selectedSubcategory,
                    totalCost: totalCost,
                    items: configMaterials.map(m => ({
                        materialId: m.id,
                        materialName: m.name,
                        unit: m.unit,
                        qty: m.qty,
                        rate: m.rate,
                        supplyRate: m.supplyRate,
                        installRate: m.installRate,
                        location: m.location,
                        amount: m.amount
                    }))
                }),
            });

            if (!res.ok) throw new Error("Failed to save configuration");

            toast({
                title: "Success",
                description: "Product configuration saved permanently.",
                variant: "default",
            });
            // Optionally redirect or reset
            setStep(1);
            setSelectedProduct(null);
            setConfigName("");
            setSelectedMaterials([]);
            setConfigMaterials([]);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to save configuration",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const loadExistingConfig = async (product: Product) => {
        try {
            const res = await apiFetch(`/api/step11-products/${product.id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.configurations && data.configurations.length > 0) {
                    const configs = data.configurations;
                    const latestConfig = configs[0]; // Most recent (sorted by created_at DESC)

                    if (configs.length === 1) {
                        toast({
                            title: "Configuration Found",
                            description: `Existing configuration "${latestConfig.product.config_name || 'Unnamed'}" for ${product.name} loaded.`,
                        });
                    } else {
                        toast({
                            title: "Multiple Configurations Found",
                            description: `Found ${configs.length} configurations for ${product.name}. Loading the most recent: "${latestConfig.product.config_name || 'Unnamed'}".`,
                        });
                    }

                    // Load the most recent configuration
                    const mappedItems = latestConfig.items.map((item: any) => ({
                        id: item.material_id,
                        name: item.material_name,
                        unit: item.unit,
                        qty: Number(item.qty),
                        rate: Number(item.rate),
                        supplyRate: Number(item.supply_rate || item.rate || 0),
                        installRate: Number(item.install_rate || 0),
                        location: item.location || "Main Area",
                        amount: Number(item.amount),
                        category: "",
                        subcategory: ""
                    }));

                    setConfigName(latestConfig.product.config_name || "");
                    setSelectedCategory(latestConfig.product.category_id || "");
                    setSelectedSubcategory(latestConfig.product.subcategory_id || "");
                    setSelectedMaterials(mappedItems);
                    setConfigMaterials(mappedItems);
                }
            }
        } catch (error) {
            console.error("Failed to load existing config", error);
        }
    };

    const prevStep = () => setStep(step - 1);

    const toggleMaterial = (material: Material) => {
        setSelectedMaterials((prev) =>
            prev.find((m) => m.id === material.id)
                ? prev.filter((m) => m.id !== material.id)
                : [...prev, material]
        );
    };

    const updateConfig = (id: string, field: keyof SelectedMaterial, value: any) => {
        setConfigMaterials((prev) =>
            prev.map((m) => {
                if (m.id === id) {
                    const updated = { ...m, [field]: value };
                    if (field === "qty" || field === "supplyRate" || field === "installRate") {
                        const qty = Number(updated.qty) || 0;
                        const sRate = Number(updated.supplyRate) || 0;
                        const iRate = Number(updated.installRate) || 0;
                        updated.rate = sRate + iRate;
                        updated.amount = qty * updated.rate;
                    }
                    return updated;
                }
                return m;
            })
        );
    };

    const totalCost = configMaterials.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

    return (
        <Layout>
            <div className="container mx-auto py-8 px-4">
                <Card className="max-w-6xl mx-auto shadow-xl border-none">
                    <CardHeader className="bg-primary/5 border-b pb-6">
                        <CardTitle className="flex items-center justify-between">
                            <span className="text-3xl font-extrabold tracking-tight">Manage Product</span>
                            {selectedProduct && (
                                <Badge variant="outline" className="text-sm font-semibold py-1.5 px-4 bg-primary/10 border-primary/20">
                                    {selectedProduct.name}
                                </Badge>
                            )}
                        </CardTitle>
                        {/* Progress Bar Removed */}
                    </CardHeader>

                    <CardContent className="p-8">
                        {/* Step 1: Product Selection */}
                        {step === 1 && (
                            <div className="space-y-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <h2 className="text-2xl font-bold">1. Select Base Product</h2>
                                    <div className="relative w-full md:w-80">
                                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                        <Input placeholder="Search by name..." className="pl-10 h-10" />
                                    </div>
                                </div>

                                {loadingProducts ? (
                                    <div className="flex flex-col items-center justify-center p-20 space-y-4">
                                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                        <p className="text-muted-foreground font-medium">Loading products...</p>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border shadow-sm overflow-hidden bg-white">
                                        <Table>
                                            <TableHeader className="bg-muted/30">
                                                <TableRow>
                                                    <TableHead className="w-[60px]"></TableHead>
                                                    <TableHead className="font-bold">Product Name</TableHead>
                                                    <TableHead className="font-bold">Created Date</TableHead>

                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {productsData?.map((product) => (
                                                    <TableRow
                                                        key={product.id}
                                                        className={`hover:bg-muted/20 transition-colors cursor-pointer ${selectedProduct?.id === product.id ? "bg-primary/5 hover:bg-primary/10" : ""
                                                            }`}
                                                        onClick={() => {
                                                            setSelectedProduct(product);
                                                            // Reset state first
                                                            setConfigName("");
                                                            setSelectedCategory("");
                                                            setSelectedSubcategory("");
                                                            setSelectedMaterials([]);
                                                            setConfigMaterials([]);
                                                            // Then load if exists
                                                            loadExistingConfig(product);
                                                        }}
                                                    >
                                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                                            <Checkbox
                                                                checked={selectedProduct?.id === product.id}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        setSelectedProduct(product);
                                                                        // Reset state first
                                                                        setConfigName("");
                                                                        setSelectedCategory("");
                                                                        setSelectedSubcategory("");
                                                                        setSelectedMaterials([]);
                                                                        setConfigMaterials([]);
                                                                        // Then load if exists
                                                                        loadExistingConfig(product);
                                                                    } else {
                                                                        setSelectedProduct(null);
                                                                    }
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-semibold text-base">{product.name}</TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'}
                                                        </TableCell>

                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}

                                {selectedProduct && (
                                    <div className="space-y-3 p-6 bg-primary/5 rounded-xl border border-primary/20">
                                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                            Configuration Name (Optional)
                                        </label>
                                        <Input
                                            value={configName}
                                            onChange={(e) => setConfigName(e.target.value)}
                                            placeholder="Enter a name for this configuration (e.g., 'Standard', 'Premium', 'Basic')"
                                            className="h-11"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Give this configuration a name to distinguish it from other configurations of the same product.
                                        </p>
                                    </div>
                                )}

                                <div className="flex justify-end pt-4">
                                    <Button size="lg" onClick={nextStep} disabled={!selectedProduct} className="px-8">
                                        Next Step <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Category/Subcategory & Material Selection */}
                        {step === 2 && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Category</label>
                                        <Select
                                            value={selectedCategory}
                                            onValueChange={(val) => {
                                                setSelectedCategory(val);
                                                setSelectedSubcategory("");
                                            }}
                                        >
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="All Categories" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value=" ">All Categories</SelectItem>
                                                {categoriesData?.map((cat) => (
                                                    <SelectItem key={cat} value={cat}>
                                                        {cat}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Subcategory</label>
                                        <Select
                                            value={selectedSubcategory}
                                            onValueChange={setSelectedSubcategory}
                                            disabled={!selectedCategory || selectedCategory === " "}
                                        >
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="All Subcategories" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value=" ">All Subcategories</SelectItem>
                                                {subcategoriesData?.map((sub) => (
                                                    <SelectItem key={sub} value={sub}>
                                                        {sub}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-bold">2. Select Materials/Items</h3>
                                        <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                                            {filteredMaterials.length} results found
                                        </span>
                                    </div>

                                    <div className="rounded-xl border shadow-sm max-h-[450px] overflow-y-auto bg-white">
                                        <Table>
                                            <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10 shadow-sm">
                                                <TableRow>
                                                    <TableHead className="w-[60px]"></TableHead>
                                                    <TableHead className="font-bold">Material Name</TableHead>
                                                    <TableHead className="font-bold">Unit</TableHead>
                                                    <TableHead className="text-right font-bold pr-6">Default Rate</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loadingMaterials ? (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-20">
                                                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                                        </TableCell>
                                                    </TableRow>
                                                ) : filteredMaterials.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">
                                                            No materials found matching the current filters.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    filteredMaterials.map((material) => (
                                                        <TableRow
                                                            key={material.id}
                                                            className={`hover:bg-muted/20 transition-colors cursor-pointer ${selectedMaterials.some(m => m.id === material.id) ? "bg-primary/5 hover:bg-primary/10" : ""
                                                                }`}
                                                            onClick={() => toggleMaterial(material)}
                                                        >
                                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                                <Checkbox
                                                                    checked={selectedMaterials.some(m => m.id === material.id)}
                                                                    onCheckedChange={() => toggleMaterial(material)}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="font-medium">{material.name}</TableCell>
                                                            <TableCell>{material.unit || "-"}</TableCell>
                                                            <TableCell className="text-right pr-6 font-semibold">
                                                                {material.rate ? `₹${material.rate.toLocaleString()}` : "-"}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 mt-4 border-t">
                                    <Button variant="outline" size="lg" onClick={prevStep} className="w-full sm:w-auto px-8">
                                        <ArrowLeft className="mr-2 h-5 w-5" /> Back
                                    </Button>
                                    <div className="flex items-center gap-6 w-full sm:w-auto">
                                        <p className="text-sm font-bold text-muted-foreground whitespace-nowrap">
                                            {selectedMaterials.length} SELECTED
                                        </p>
                                        <Button size="lg" onClick={nextStep} disabled={selectedMaterials.length === 0} className="w-full sm:w-auto px-10">
                                            Review Selection <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Step 9 Table (Configuration) */}
                        {step === 3 && (
                            <div className="space-y-8">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-muted/50 to-muted/20 p-6 rounded-2xl border">
                                    <div>
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Configuration For</h3>
                                        <p className="text-2xl font-extrabold">{selectedProduct?.name}</p>
                                    </div>
                                    <div className="text-center md:text-right">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Current Total</h3>
                                        <p className="text-4xl font-extrabold text-primary">₹{totalCost.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="rounded-xl border shadow-sm overflow-hidden bg-white">
                                    <Table>
                                        <TableHeader className="bg-muted/30">
                                            <TableRow>
                                                <TableHead className="font-bold py-4">Item Name</TableHead>
                                                <TableHead className="w-[120px] font-bold">Location</TableHead>
                                                <TableHead className="w-[80px] font-bold">Unit</TableHead>
                                                <TableHead className="w-[80px] font-bold">Qty</TableHead>
                                                <TableHead className="w-[120px] font-bold">Supply Rate</TableHead>
                                                <TableHead className="w-[120px] font-bold">Install Rate</TableHead>
                                                <TableHead className="w-[140px] text-right font-bold pr-6">Total Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {configMaterials.map((m) => (
                                                <TableRow key={m.id} className="hover:bg-muted/5">
                                                    <TableCell className="font-semibold">{m.name}</TableCell>
                                                    <TableCell>
                                                        <Input
                                                            value={m.location}
                                                            onChange={(e) => updateConfig(m.id, "location", e.target.value)}
                                                            className="h-9 border-muted text-xs"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            value={m.unit}
                                                            onChange={(e) => updateConfig(m.id, "unit", e.target.value)}
                                                            className="h-9 border-muted text-xs"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            value={m.qty}
                                                            onChange={(e) => updateConfig(m.id, "qty", Number(e.target.value))}
                                                            className="h-9 border-muted text-xs"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            value={m.supplyRate}
                                                            onChange={(e) => updateConfig(m.id, "supplyRate", Number(e.target.value))}
                                                            className="h-9 border-muted text-xs"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            value={m.installRate}
                                                            onChange={(e) => updateConfig(m.id, "installRate", Number(e.target.value))}
                                                            className="h-9 border-muted text-xs"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right font-black text-primary pr-6">
                                                        ₹{m.amount.toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 mt-4 border-t">
                                    <Button variant="outline" size="lg" onClick={prevStep} className="w-full sm:w-auto px-8">
                                        <ArrowLeft className="mr-2 h-5 w-5" /> Back to Selection
                                    </Button>
                                    <Button size="lg" onClick={nextStep} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-bold px-12 transition-all">
                                        Continue to Review <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Step 11 Summary (Final Review) - REDESIGNED */}
                        {step === 4 && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                {/* Header Removed */}

                                <div className="grid grid-cols-2 gap-8 py-4 px-6 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/30">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Product Configuration For</p>
                                        <p className="text-xl font-bold uppercase">{selectedProduct?.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Category / Subcategory</p>
                                        <p className="text-lg font-bold">{selectedCategory} <span className="text-muted-foreground mx-1">/</span> {selectedSubcategory}</p>
                                    </div>
                                </div>

                                <div className="overflow-x-auto border-2 border-black rounded-sm shadow-xl">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-white text-black text-[11px] font-black uppercase tracking-widest border-b border-black">
                                                <th rowSpan={2} className="border border-black p-3 text-center w-[50px]">S.No</th>
                                                <th rowSpan={2} className="border border-black p-3 text-left">Item</th>
                                                <th rowSpan={2} className="border border-black p-3 text-center w-[120px]">Location</th>
                                                <th rowSpan={2} className="border border-black p-3 text-left">Description</th>
                                                <th rowSpan={2} className="border border-black p-3 text-center w-[80px]">Unit</th>
                                                <th rowSpan={2} className="border border-black p-3 text-center w-[80px]">Qty</th>
                                                <th colSpan={2} className="border border-black p-3 text-center border-b-0">Rate (INR)</th>
                                                <th colSpan={2} className="border border-black p-3 text-center border-b-0">Amount (INR)</th>
                                            </tr>
                                            <tr className="bg-white text-black text-[9px] font-black uppercase tracking-widest border-t border-black">
                                                <th className="border border-black p-2 text-right w-[100px]">Supply</th>
                                                <th className="border border-black p-2 text-right w-[100px]">Installation</th>
                                                <th className="border border-black p-2 text-right w-[110px]">Supply</th>
                                                <th className="border border-black p-2 text-right w-[110px]">Installation</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {/* Single Consolidated Product Row */}
                                            <tr className="text-[12px] border-b border-black/10 hover:bg-muted/10 transition-colors">
                                                <td className="border-r border-black p-3 text-center font-bold">1</td>
                                                <td className="border-r border-black p-3 font-black text-xs uppercase">
                                                    {selectedProduct?.name}
                                                </td>
                                                <td className="border-r border-black p-3 text-center italic">Main Area</td>
                                                <td className="border-r border-black p-3 text-[10px] text-muted-foreground leading-tight">
                                                    Consolidated configuration for {selectedProduct?.name}
                                                </td>
                                                <td className="border-r border-black p-3 text-center font-bold">set</td>
                                                <td className="border-r border-black p-3 text-center font-black">1</td>
                                                <td className="border-r border-black p-3 text-right font-bold">
                                                    ₹{configMaterials.reduce((sum, m) => sum + (m.qty * (m.supplyRate || m.rate || 0)), 0).toLocaleString()}
                                                </td>
                                                <td className="border-r border-black p-3 text-right font-bold">
                                                    ₹{configMaterials.reduce((sum, m) => sum + (m.qty * (m.installRate || 0)), 0).toLocaleString()}
                                                </td>
                                                <td className="border-r border-black p-3 text-right font-black text-primary">
                                                    ₹{configMaterials.reduce((sum, m) => sum + (m.qty * (m.supplyRate || m.rate || 0)), 0).toLocaleString()}
                                                </td>
                                                <td className="border-black p-3 text-right font-black text-primary">
                                                    ₹{configMaterials.reduce((sum, m) => sum + (m.qty * (m.installRate || 0)), 0).toLocaleString()}
                                                </td>
                                            </tr>
                                        </tbody>
                                        <tfoot className="bg-black/5">
                                            <tr className="border-t-2 border-black font-black">
                                                <td colSpan={8} className="p-4 text-right uppercase tracking-tighter">Grand Total Amount (INR)</td>
                                                <td colSpan={2} className="p-4 text-right pr-6 text-xl text-primary bg-primary/5 border-l border-black/10">₹{totalCost.toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Remarks & Signature Removed */}

                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-12 mt-8 border-t border-black/10">
                                    <Button variant="outline" onClick={prevStep} className="w-full sm:w-auto px-6 font-bold uppercase tracking-wide" disabled={isSaving}>
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 uppercase tracking-wide transition-all shadow-lg hover:scale-105"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Finalizing...
                                            </>
                                        ) : (
                                            "Add to Create BOQ"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
