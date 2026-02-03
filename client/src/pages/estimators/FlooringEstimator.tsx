import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import html2pdf from "html2pdf.js";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useData, Material, Product } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  Download,
  CheckCircle2,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import apiFetch from "@/lib/api";

const ctintLogo = "/image.png";

interface SelectedMaterialConfig {
  materialId: string;
  selectedShopId: string;
  selectedBrand?: string;
}

interface MaterialWithQuantity {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  shopId: string;
  shopName: string;
  installRate?: number;
}

// Flooring-specific matchers
const normText = (s?: string) => (s || "").toString().toUpperCase();
const norm = (s?: string) =>
  (s || "")
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();

const flooringKeywords = ["FLOOR", "TILE", "MARBLE", "WOOD", "LAMINATE", "VINYL", "CARPET"];

const isFlooringMaterial = (m: any) => {
  const prod = normText(m.product);
  const name = normText(m.name);
  const cat = normText(m.category);
  return flooringKeywords.some(
    (kw) => prod.includes(kw) || name.includes(kw) || cat.includes(kw),
  );
};

const getBrandOfMaterial = (m: any) =>
  (m.brandName || m.brand || m.make || m.manufacturer || m.company || "Generic").toString();

export default function FlooringEstimator() {
  const {
    shops: storeShops,
    materials: storeMaterials,
    products: storeProducts,
  } = useData();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [selectedFlooringProductId, setSelectedFlooringProductId] = useState<string>("");
  const [selectedFlooringProductLabel, setSelectedFlooringProductLabel] = useState<string>("");
  const [areaName, setAreaName] = useState<string>("");
  const [length, setLength] = useState<number>(10);
  const [width, setWidth] = useState<number>(10);
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterialConfig[]>([]);
  const [editableMaterials, setEditableMaterials] = useState<
    Record<string, { quantity: number; supplyRate: number; installRate: number }>
  >({});
  const [materialDescriptions, setMaterialDescriptions] = useState<Record<string, string>>({});
  const [materialLocations, setMaterialLocations] = useState<Record<string, string>>({});
  const [materialQtys, setMaterialQtys] = useState<Record<string, number>>({});
  const [materialUnits, setMaterialUnits] = useState<Record<string, string>>({});
  const [step11SupplyRates, setStep11SupplyRates] = useState<Record<string, number>>({});
  const [step11InstallRates, setStep11InstallRates] = useState<Record<string, number>>({});
  const [finalBillNo, setFinalBillNo] = useState<string>("");
  const [finalBillDate, setFinalBillDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [finalCustomerName, setFinalCustomerName] = useState<string>("");
  const [finalCustomerAddress, setFinalCustomerAddress] = useState<string>("");
  const [finalCompanyName, setFinalCompanyName] = useState<string>("Concept Trunk Interiors");
  const [finalCompanyAddress, setFinalCompanyAddress] = useState<string>(
    "12/36A, Indira Nagar\nMedavakkam\nChennai Tamil Nadu 600100\nIndia",
  );
  const [finalCompanyGST, setFinalCompanyGST] = useState<string>("33ASOPS5560M1Z1");
  const [finalShopDetails, setFinalShopDetails] = useState<string>("");
  const [dbStep11Items, setDbStep11Items] = useState<any[]>([]);
  const [savingStep4, setSavingStep4] = useState<boolean>(false);

  // Get flooring products only
  const flooringProducts = (storeProducts || [])
    .filter((p: any) => {
      const name = normText(p.name || p.title || p.label || "");
      return flooringKeywords.some((kw) => name.includes(kw));
    })
    .slice()
    .sort((a: any, b: any) => {
      const la = (a?.name || "").toString();
      const lb = (b?.name || "").toString();
      return la.localeCompare(lb);
    });

  // Get flooring materials only
  const getAvailableMaterials = () => {
    if (!selectedFlooringProductLabel || !storeMaterials.length) return [];
    const prodLabel = selectedFlooringProductLabel.toString();
    let matched = storeMaterials.filter((m) => {
      const prod = normText(m.product);
      const name = normText(m.name);
      const p = normText(prodLabel);
      return (prod.includes(p) || p.includes(prod)) && isFlooringMaterial(m);
    });

    if (!matched || matched.length === 0) {
      matched = storeMaterials.filter(
        (m) => isFlooringMaterial(m) && normText(m.product).includes(normText(prodLabel)),
      );
    }

    const uniqueMap = new Map<string, (typeof matched)[0]>();
    for (const mat of matched) {
      const key = `${normText(mat.product)}__${normText(mat.name)}__${norm(mat.code)}`;
      const existing = uniqueMap.get(key);
      if (!existing || (mat.rate || 0) < (existing.rate || 0)) uniqueMap.set(key, mat);
    }
    return Array.from(uniqueMap.values());
  };

  const availableMaterials = getAvailableMaterials();

  const getProductLabel = (p: any) =>
    (p?.name || p?.title || p?.label || p?.productName || p?.product || "").toString();

  const handleSelectFlooringProduct = (p: Product) => {
    const label = getProductLabel(p);
    setSelectedFlooringProductId((p as any).id || label);
    setSelectedFlooringProductLabel(label);
    setSelectedMaterials([]);
    setEditableMaterials({});
    setMaterialDescriptions({});
    setMaterialLocations({});
  };

  const handleToggleMaterial = (matId: string) => {
    const isSelected = selectedMaterials.some((m) => m.materialId === matId);
    if (isSelected) {
      setSelectedMaterials(selectedMaterials.filter((m) => m.materialId !== matId));
    } else {
      const material = availableMaterials.find((m) => m.id === matId);
      if (!material) return;
      const variants = storeMaterials.filter(
        (m) =>
          normText(m.product) === normText(material.product) &&
          normText(m.name) === normText(material.name),
      );
      const bestShop = variants.sort((a, b) => (a.rate || 0) - (b.rate || 0))[0];
      setSelectedMaterials([
        ...selectedMaterials,
        { materialId: matId, selectedShopId: bestShop?.shopId || "" },
      ]);
    }
  };

  const handleChangeBrand = (matId: string, newBrand: string) => {
    setSelectedMaterials(
      selectedMaterials.map((m) =>
        m.materialId === matId ? { ...m, selectedBrand: newBrand } : m,
      ),
    );
  };

  const handleChangeShop = (matId: string, newShopId: string) => {
    setSelectedMaterials(
      selectedMaterials.map((m) =>
        m.materialId === matId ? { ...m, selectedShopId: newShopId } : m,
      ),
    );
  };

  const calculateQty = () => Math.ceil(length * width * 1.1);

  const getMaterialsWithDetails = (): MaterialWithQuantity[] => {
    return selectedMaterials
      .map((selection) => {
        let base = availableMaterials.find((m) => m.id === selection.materialId);
        if (!base) base = storeMaterials.find((m) => m.id === selection.materialId) || null;
        if (!base) return null;

        const chosen =
          storeMaterials.find((m) => {
            const sameProd = normText(m.product) === normText(base.product);
            const sameName = normText(m.name) === normText(base.name);
            const sameShop = m.shopId === selection.selectedShopId;
            const sameBrand = getBrandOfMaterial(m) === (selection.selectedBrand || "Generic");
            return sameProd && sameName && sameShop && sameBrand;
          }) || base;

        const shop = storeShops.find((s) => s.id === selection.selectedShopId);
        const override = editableMaterials[chosen.id];
        const computedQty = calculateQty();
        const quantity = override?.quantity ?? computedQty;
        const supplyRate = override?.supplyRate ?? chosen.rate ?? 0;
        const installRate = override?.installRate ?? 0;

        return {
          id: chosen.id,
          name: chosen.name,
          quantity,
          unit: chosen.unit,
          rate: supplyRate,
          shopId: selection.selectedShopId,
          shopName: shop?.name || "Unknown",
          installRate,
        };
      })
      .filter((m): m is MaterialWithQuantity => m !== null);
  };

  const calculateTotalCost = (): number => {
    return getMaterialsWithDetails().reduce((sum, m) => sum + m.quantity * m.rate, 0);
  };

  const handleSaveStep4 = async () => {
    setSavingStep4(true);
    try {
      const groups = getMaterialsWithDetails().map((m, idx) => ({
        estimator: "flooring",
        session_id: finalBillNo,
        s_no: idx + 1,
        item_name: m.name,
        unit: m.unit || "sqft",
        quantity: m.quantity,
        location: areaName,
        description: materialDescriptions[m.id || ""] || "",
        supply_rate: m.rate || 0,
        install_rate: m.installRate || 0,
        supply_amount: m.quantity * (m.rate || 0),
        install_amount: m.quantity * (m.installRate || 0),
      }));

      const res = await apiFetch("/api/estimator-step11-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups }),
      });

      if (!res.ok) throw new Error("Save failed");

      toast({
        title: "Success",
        description: "Flooring BOQ saved successfully!",
      });
    } catch (err) {
      console.error("Save error:", err);
      toast({
        title: "Error",
        description: "Failed to save BOQ.",
        variant: "destructive",
      });
    } finally {
      setSavingStep4(false);
    }
  };

  useEffect(() => {
    if (step === 11 && finalBillNo) {
      apiFetch(`/api/estimator-step11-groups?session_id=${finalBillNo}&estimator=flooring`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => setDbStep11Items(data.items || []))
        .catch((err) => console.error("Failed to load step 11 data", err));
    }
  }, [step, finalBillNo]);

  useEffect(() => {
    if (step === 7) {
      const details = getMaterialsWithDetails();
      const map: Record<string, { quantity: number; supplyRate: number; installRate: number }> = {};
      details.forEach((d) => {
        map[d.id] = {
          quantity: d.quantity || 0,
          supplyRate: d.rate || 0,
          installRate: 0,
        };
      });
      setEditableMaterials(map);
    }
  }, [step, selectedMaterials]);

  const displayMaterials = getMaterialsWithDetails();
  const subTotal = calculateTotalCost();
  const sgst = subTotal * 0.09;
  const cgst = subTotal * 0.09;
  const grandTotal = subTotal + sgst + cgst;
  const roundOff = Math.round(grandTotal) - grandTotal;

  const handleExportPDF = () => {
    const element = document.getElementById("boq-pdf");
    if (!element) return;
    html2pdf()
      .set({
        margin: 10,
        filename: `Flooring_BOQ_${finalBillNo}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(element)
      .save();
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <h2 className="text-3xl font-bold">Flooring Estimator</h2>

        <Card className="border-border/50">
          <CardContent className="pt-8 min-h-96">
            <AnimatePresence mode="wait">
              {/* STEP 1: Select Product */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <Label className="text-lg font-semibold">Select Flooring Product</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose a flooring product type.
                  </p>

                  <div className="grid gap-3">
                    {flooringProducts.length === 0 ? (
                      <div className="p-4 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded">
                        No flooring products found.
                      </div>
                    ) : (
                      flooringProducts.map((p: any) => {
                        const label = getProductLabel(p);
                        const pid = (p?.id || label).toString();
                        const isActive = selectedFlooringProductId === pid;
                        return (
                          <Button
                            key={pid}
                            variant={isActive ? "default" : "outline"}
                            onClick={() => handleSelectFlooringProduct(p)}
                            className="justify-start h-auto py-4"
                          >
                            <div className="font-semibold">{label}</div>
                          </Button>
                        );
                      })
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!selectedFlooringProductId}
                    >
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Material Selection */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <Label className="text-lg font-semibold">Select Materials</Label>

                  <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                    {availableMaterials.length === 0 ? (
                      <div className="text-sm text-yellow-700 bg-yellow-50 p-4 rounded">
                        No materials found for {selectedFlooringProductLabel}.
                      </div>
                    ) : (
                      availableMaterials.map((mat) => {
                        const isSelected = selectedMaterials.some((m) => m.materialId === mat.id);
                        const currentSelection = selectedMaterials.find((m) => m.materialId === mat.id);
                        const variants = storeMaterials
                          .filter(
                            (m) =>
                              normText(m.product) === normText(mat.product) &&
                              normText(m.name) === normText(mat.name),
                          )
                          .map((m) => ({
                            id: m.id,
                            brand: getBrandOfMaterial(m),
                            shopId: m.shopId,
                            rate: m.rate,
                            shopName: storeShops.find((s) => s.id === m.shopId)?.name || "Unknown",
                          }));
                        const availableBrands = Array.from(new Set(variants.map((v) => v.brand))).sort();
                        const selectedBrand =
                          currentSelection?.selectedBrand || availableBrands[0] || "Generic";
                        const brandShops = variants
                          .filter((v) => v.brand === selectedBrand)
                          .sort((a, b) => (a.rate || 0) - (b.rate || 0));

                        return (
                          <div
                            key={mat.id}
                            className="border rounded-lg p-3 hover:bg-muted/50 transition"
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={mat.id}
                                checked={isSelected}
                                onCheckedChange={() => handleToggleMaterial(mat.id)}
                              />
                              <div className="flex-1">
                                <label htmlFor={mat.id} className="font-medium cursor-pointer">
                                  {mat.name}
                                </label>
                                <p className="text-xs text-muted-foreground">{mat.code}</p>

                                {isSelected && availableBrands.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    <Label className="text-xs">Select Brand:</Label>
                                    <Select
                                      value={selectedBrand}
                                      onValueChange={(newBrand) => handleChangeBrand(mat.id, newBrand)}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {availableBrands.map((b) => (
                                          <SelectItem key={b} value={b}>
                                            {b}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {isSelected && brandShops.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    <Label className="text-xs">Select Shop:</Label>
                                    <Select
                                      value={currentSelection?.selectedShopId || brandShops[0]?.shopId || ""}
                                      onValueChange={(newShopId) => handleChangeShop(mat.id, newShopId)}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {brandShops.map((shop) => (
                                          <SelectItem key={shop.shopId} value={shop.shopId || ""}>
                                            {shop.shopName} - ₹{shop.rate}
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
                      })
                    )}
                  </div>

                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button disabled={selectedMaterials.length === 0} onClick={() => setStep(3)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Project Dimensions */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <Label className="text-lg font-semibold">Project Area</Label>

                  <div className="space-y-4">
                    <div>
                      <Label>Area Name</Label>
                      <Input
                        placeholder="e.g., Living Room"
                        value={areaName}
                        onChange={(e) => setAreaName(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Length (ft)</Label>
                        <Input
                          type="number"
                          value={length}
                          onChange={(e) => setLength(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label>Width (ft)</Label>
                        <Input
                          type="number"
                          value={width}
                          onChange={(e) => setWidth(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm">
                        <strong>Calculated Area:</strong> {(length * width).toFixed(2)} sqft
                        (with 10% wastage: {calculateQty()} sqft)
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button onClick={() => setStep(4)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: BOQ Preview & Generate */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <Label className="text-lg font-semibold">BOQ Summary</Label>

                  {displayMaterials.length === 0 ? (
                    <div className="text-yellow-700 bg-yellow-50 p-4 rounded">
                      No materials selected.
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 space-y-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left">Material</th>
                            <th className="text-right">Qty</th>
                            <th className="text-right">Unit</th>
                            <th className="text-right">Rate</th>
                            <th className="text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayMaterials.map((m) => (
                            <tr key={m.id} className="border-b">
                              <td>{m.name}</td>
                              <td className="text-right">{m.quantity}</td>
                              <td className="text-right">{m.unit}</td>
                              <td className="text-right">₹{m.rate.toFixed(2)}</td>
                              <td className="text-right">₹{(m.quantity * m.rate).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between font-semibold">
                          <span>Subtotal:</span>
                          <span>₹{subTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SGST (9%):</span>
                          <span>₹{sgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CGST (9%):</span>
                          <span>₹{cgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 font-bold">
                          <span>Grand Total:</span>
                          <span>₹{grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(3)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button onClick={() => setStep(5)}>
                      Continue <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEPS 5-10 Placeholder */}
              {[5, 6, 7, 8, 9, 10].includes(step) && (
                <motion.div
                  key={`step${step}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <Label className="text-lg font-semibold">Step {step}</Label>
                  <p className="text-muted-foreground">Step {step} content coming soon...</p>

                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(step - 1)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button onClick={() => setStep(step + 1)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 11: Final BOQ */}
              {step === 11 && (
                <motion.div
                  key="step11"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <Label className="text-lg font-semibold">Final BOQ</Label>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Bill No</Label>
                        <Input
                          value={finalBillNo}
                          onChange={(e) => setFinalBillNo(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Bill Date</Label>
                        <Input
                          type="date"
                          value={finalBillDate}
                          onChange={(e) => setFinalBillDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Customer Name</Label>
                        <Input
                          value={finalCustomerName}
                          onChange={(e) => setFinalCustomerName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Customer Address</Label>
                        <Input
                          value={finalCustomerAddress}
                          onChange={(e) => setFinalCustomerAddress(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(10)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button onClick={handleSaveStep4} disabled={savingStep4}>
                      {savingStep4 ? "Saving..." : "Save BOQ"}
                    </Button>
                    <Button onClick={() => setStep(12)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 12: QA & Review */}
              {step === 12 && (
                <motion.div
                  key="step12"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <Label className="text-lg font-semibold">QA & Review</Label>
                  <p className="text-muted-foreground">Review and finalize your flooring BOQ.</p>

                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(11)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button onClick={handleExportPDF}>
                      <Download className="mr-2 h-4 w-4" /> Export PDF
                    </Button>
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
