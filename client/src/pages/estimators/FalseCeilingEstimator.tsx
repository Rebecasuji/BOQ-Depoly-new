import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Download, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { useData } from "@/lib/store";

interface SelectedMaterialConfig {
  materialId: string;
  selectedShopId?: string;
}

interface MaterialWithQuantity {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  rate?: number;
  shopName?: string;
  available: boolean;
}

// Ceiling types and required materials
const CEILING_TYPES = {
  gypsum: {
    label: "Gypsum Board Ceiling",
    materials: ["GYPSUM-001", "METAL-001", "HANGER-001", "COMPOUND-001"],
  },
  pop: {
    label: "POP Ceiling",
    materials: ["POP-001", "METAL-001", "HANGER-001", "COMPOUND-001"],
  },
  metal: {
    label: "Metal Suspended Ceiling",
    materials: ["METAL-002", "HANGER-001", "SCREWS-001"],
  },
};

export default function FalseCeilingEstimator() {
  const { shops: storeShops, materials: storeMaterials } = useData();

  const [step, setStep] = useState(1);
  const [ceilingType, setCeilingType] = useState<keyof typeof CEILING_TYPES | null>(null);
  const [length, setLength] = useState<number | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [dropHeight, setDropHeight] = useState<number | null>(0.5);
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterialConfig[]>([]);

  const getCurrentCeilingConfig = () => ceilingType ? CEILING_TYPES[ceilingType] : null;

  const getAvailableMaterials = (): MaterialWithQuantity[] => {
    const ceilingConfig = getCurrentCeilingConfig();
    if (!ceilingConfig) return [];
    return ceilingConfig.materials.map((code) => {
      const mat = storeMaterials.find((m) => m.code === code);
      if (!mat) return { id: code, name: code, quantity: 0, unit: "-", available: false };

      const qty = calculateQuantity(mat.code, mat.unit);
      const bestShop = getBestShop(mat.code);
      return {
        id: mat.id,
        name: mat.name,
        quantity: qty,
        unit: mat.unit,
        rate: bestShop?.rate,
        shopName: bestShop?.shopName,
        available: true,
      };
    });
  };

  // Auto-select available materials on Step 3
  useEffect(() => {
    if (step === 3) {
      const availableMats = getAvailableMaterials().filter((m) => m.available);
      setSelectedMaterials(availableMats.map((m) => ({ materialId: m.id, selectedShopId: m.shopName ? storeShops.find(s => s.name === m.shopName)?.id : undefined })));
    }
  }, [step, ceilingType, length, width]);

  const getBestShop = (materialCode: string) => {
    const mats = storeMaterials.filter((m) => m.code === materialCode);
    if (!mats.length) return null;
    const best = mats.reduce((prev, curr) => curr.rate < prev.rate ? curr : prev, mats[0]);
    const shop = storeShops.find((s) => s.id === best.shopId);
    return { shopId: best.shopId, shopName: shop?.name || "Unknown", rate: best.rate };
  };

  const calculateQuantity = (code: string, unit: string) => {
    const l = length || 0;
    const w = width || 0;
    const area = l * w;
    switch (code) {
      case "GYPSUM-001":
      case "POP-001": return Math.ceil(area / 48); // 4x12 ft board
      case "METAL-001":
      case "METAL-002": return Math.ceil((l + w) * 2);
      case "HANGER-001": return Math.ceil(area / 10);
      case "COMPOUND-001": return Math.ceil(area / 100);
      case "SCREWS-001": return Math.ceil(area / 5);
      default: return 1;
    }
  };

  const handleToggleMaterial = (materialId: string) => {
    const exists = selectedMaterials.find((m) => m.materialId === materialId);
    if (exists) setSelectedMaterials((prev) => prev.filter((m) => m.materialId !== materialId));
    else setSelectedMaterials((prev) => [...prev, { materialId }]);
  };

  const handleChangeShop = (materialId: string, shopId: string) => {
    setSelectedMaterials((prev) =>
      prev.map((m) => (m.materialId === materialId ? { ...m, selectedShopId: shopId } : m))
    );
  };

  const getMaterialsWithDetails = () => {
    const mats = getAvailableMaterials();
    return selectedMaterials.map((sel) => {
      const mat = mats.find((m) => m.id === sel.materialId || m.id === sel.materialId);
      if (!mat) return null;
      return { ...mat, shopName: sel.selectedShopId ? storeShops.find((s) => s.id === sel.selectedShopId)?.name : mat.shopName };
    }).filter((m): m is MaterialWithQuantity => m !== null);
  };

  const calculateTotalCost = () => getMaterialsWithDetails().reduce((sum, m) => m.rate ? sum + m.quantity * m.rate : sum, 0);

  const handleExportBOQ = () => {
    const materials = getMaterialsWithDetails();
    const csvLines = [
      "BILL OF QUANTITIES (FALSE CEILING)",
      `Generated: ${new Date().toLocaleString()}`,
      `Ceiling Type: ${getCurrentCeilingConfig()?.label}`,
      `Dimensions: ${length}ft × ${width}ft, Drop Height: ${dropHeight}ft`,
      "",
      "MATERIALS SCHEDULE",
      "S.No,Item,Unit,Quantity,Unit Rate,Shop,Total",
    ];
    materials.forEach((mat, idx) => {
      const total = mat.rate ? mat.quantity * mat.rate : 0;
      csvLines.push(`${idx + 1},"${mat.name}","${mat.unit}",${mat.quantity},${mat.rate || 0},"${mat.shopName || "-"}",${total}`);
    });
    csvLines.push("", `TOTAL COST,,,,,${calculateTotalCost().toFixed(2)}`);
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BOQ-FalseCeiling-${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">False Ceiling Estimator</h2>
          <p className="text-muted-foreground mt-1">Generate BOQ for false ceilings using real construction calculations.</p>
        </div>

        <Card className="border-border/50">
          <CardContent className="pt-8 min-h-96">
            <AnimatePresence mode="wait">

              {/* STEP 1: Ceiling Type */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <Label className="text-lg font-semibold">Select Ceiling Type</Label>
                  <div className="grid gap-3">
                    {Object.entries(CEILING_TYPES).map(([key, val]) => (
                      <Button
                        key={key}
                        variant={ceilingType === key ? "default" : "outline"}
                        onClick={() => { setCeilingType(key as any); setSelectedMaterials([]); }}
                        className="justify-start h-auto py-4 text-left"
                      >
                        <div><div className="font-semibold">{val.label}</div></div>
                      </Button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-6">
                    <Button disabled={!ceilingType} onClick={() => setStep(2)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Dimensions */}
              {step === 2 && ceilingType && (
                <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <Label className="text-lg font-semibold">Enter Dimensions (ft)</Label>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2"><Label>Length</Label><Input type="number" value={length || ""} onChange={(e) => setLength(parseFloat(e.target.value) || null)} /></div>
                    <div className="space-y-2"><Label>Width</Label><Input type="number" value={width || ""} onChange={(e) => setWidth(parseFloat(e.target.value) || null)} /></div>
                    <div className="space-y-2"><Label>Drop Height</Label><Input type="number" value={dropHeight || ""} onChange={(e) => setDropHeight(parseFloat(e.target.value) || null)} /></div>
                  </div>
                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="mr-2 h-4 w-4" /> Back</Button>
                    <Button disabled={!length || !width} onClick={() => setStep(3)}>Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Material Selection */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <Label className="text-lg font-semibold">Select Materials</Label>
                  <p className="text-sm text-muted-foreground mb-4">Available materials are auto-selected. Missing items are highlighted.</p>
                  <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                    {getAvailableMaterials().map((mat) => {
                      const isSelected = selectedMaterials.some((m) => m.materialId === mat.id);
                      const currentSelection = selectedMaterials.find((m) => m.materialId === mat.id);
                      const availableShops = storeMaterials
                        .filter((m) => m.code === mat.id)
                        .map((m) => ({ shopId: m.shopId, shopName: storeShops.find((s) => s.id === m.shopId)?.name || "Unknown", rate: m.rate }))
                        .sort((a, b) => a.rate - b.rate);

                      return (
                        <div key={mat.id} className={`border rounded-lg p-3 ${!mat.available ? "bg-red-50" : "hover:bg-muted/50"} transition`}>
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={mat.id}
                              disabled={!mat.available}
                              checked={isSelected}
                              onCheckedChange={() => handleToggleMaterial(mat.id)}
                            />
                            <div className="flex-1">
                              <label htmlFor={mat.id} className="font-medium cursor-pointer">
                                {mat.name} {!mat.available && "(Required but not available)"}
                              </label>
                              <p className="text-xs text-muted-foreground">{mat.unit}</p>

                              {isSelected && mat.available && availableShops.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <Label className="text-xs">Select Shop:</Label>
                                  <Select
                                    value={currentSelection?.selectedShopId || availableShops[0].shopId}
                                    onValueChange={(shopId) => handleChangeShop(mat.id, shopId)}
                                  >
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {availableShops.map((shop) => (
                                        <SelectItem key={shop.shopId} value={shop.shopId}>
                                          {shop.shopName} - ₹{shop.rate}/{mat.unit} {shop.rate === availableShops[0].rate && "(Best)"}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="mr-2 h-4 w-4" /> Back</Button>
                    <Button disabled={selectedMaterials.length === 0} onClick={() => setStep(4)}>Generate BOQ <ChevronRight className="ml-2 h-4 w-4" /></Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: BOQ Review */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div className="text-center space-y-2 mb-6">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold">Bill of Quantities</h3>
                  </div>

                  <div className="space-y-4">
                    {getMaterialsWithDetails().map((mat, idx) => (
                      <div key={mat.id} className="grid grid-cols-12 gap-2 text-xs p-2 bg-muted/30 rounded">
                        <div className="col-span-3 font-medium">{mat.name}</div>
                        <div className="col-span-2 text-right font-bold text-primary">{mat.quantity}</div>
                        <div className="col-span-1 text-right text-muted-foreground">{mat.unit}</div>
                        <div className="col-span-1 text-right text-muted-foreground">₹{mat.rate || "-"}</div>
                        <div className="col-span-3 text-right font-semibold">{mat.shopName || "-"}</div>
                        <div className="col-span-2 text-right font-semibold text-primary">{mat.rate ? (mat.quantity * mat.rate).toFixed(2) : "-"}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between pt-6">
                    <Button variant="outline" onClick={() => setStep(3)}><ChevronLeft className="mr-2 h-4 w-4" /> Back</Button>
                    <Button onClick={handleExportBOQ}><Download className="mr-2 h-4 w-4" /> Export BOQ</Button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
