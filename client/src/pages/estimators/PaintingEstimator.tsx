import { useState } from "react";
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
import { cn } from "@/lib/utils";
import { useData, Material } from "@/lib/store";
import html2pdf from "html2pdf.js";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Download, CheckCircle2 } from "lucide-react";

interface MaterialWithQuantity {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  shopId: string;
  shopName: string;
}

interface SelectedMaterialConfig {
  materialId: string;
  selectedShopId: string;
}

export default function PaintingEstimator() {
  const { shops: storeShops, materials: storeMaterials } = useData();

  const [step, setStep] = useState(1);
  const [paintType, setPaintType] = useState<"interior" | "exterior" | null>(null);
  const [length, setLength] = useState<number | null>(20);
  const [height, setHeight] = useState<number | null>(10);
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterialConfig[]>([]);

  // Filter only painting materials
  const getAvailableMaterials = () => {
    const paintingMaterials = storeMaterials.filter((m) => m.category === "Painting");
    return paintingMaterials.map((mat) => {
      const bestShop = getBestShop(mat.code);
      return {
        ...mat,
        selectedShopId: bestShop?.shopId || mat.shopId,
      };
    });
  };

  // Find best shop by lowest rate
  const getBestShop = (materialCode: string) => {
    const materials = storeMaterials.filter((m) => m.code === materialCode);
    if (!materials.length) return null;

    let best = materials[0];
    for (const m of materials) {
      if (m.rate < best.rate) best = m;
    }

    const shop = storeShops.find((s) => s.id === best.shopId);
    return {
      shopId: best.shopId,
      shopName: shop?.name || "Unknown",
      rate: best.rate,
    };
  };

  // Calculate quantities based on wall area
  const calculateQuantity = (materialCode: string) => {
    const area = (length || 0) * (height || 0);
    if (materialCode === "PAINT-001" || materialCode === "PAINT-002" || materialCode === "PAINT-005") {
      // 1 liter covers 100 sqft
      return Math.ceil(area / 100);
    } else if (materialCode === "PAINT-004") {
      // Putty - 1 kg per 50 sqft
      return Math.ceil(area / 50);
    } else if (materialCode === "PAINT-003") {
      // Sandpaper - 1 sheet per 50 sqft
      return Math.ceil(area / 50);
    }
    return 1;
  };

  const handleToggleMaterial = (materialId: string) => {
    const existing = selectedMaterials.find((m) => m.materialId === materialId);
    if (existing) {
      setSelectedMaterials((prev) => prev.filter((m) => m.materialId !== materialId));
    } else {
      const mat = storeMaterials.find((m) => m.id === materialId);
      if (mat) {
        const bestShop = getBestShop(mat.code);
        if (bestShop) {
          setSelectedMaterials((prev) => [
            ...prev,
            { materialId, selectedShopId: bestShop.shopId },
          ]);
        }
      }
    }
  };

  const handleChangeShop = (materialId: string, newShopId: string) => {
    setSelectedMaterials((prev) =>
      prev.map((m) => (m.materialId === materialId ? { ...m, selectedShopId: newShopId } : m))
    );
  };

  const getMaterialsWithDetails = (): MaterialWithQuantity[] => {
    return selectedMaterials
      .map((sel) => {
        const material = storeMaterials.find((m) => m.id === sel.materialId);
        const shop = storeShops.find((s) => s.id === sel.selectedShopId);
        if (!material) return null;

        return {
          id: material.id,
          name: material.name,
          quantity: calculateQuantity(material.code),
          unit: material.unit,
          rate: material.rate,
          shopId: sel.selectedShopId,
          shopName: shop?.name || "Unknown",
        };
      })
      .filter((m): m is MaterialWithQuantity => m !== null);
  };

  const calculateTotalCost = () =>
    getMaterialsWithDetails().reduce((sum, m) => sum + m.quantity * m.rate, 0);

  const handleExportBOQ = () => {
    const materials = getMaterialsWithDetails();
    const csvLines = [
      "PAINTING ESTIMATOR BOQ",
      `Generated: ${new Date().toLocaleString()}`,
      `Paint Type: ${paintType || "-"}`,
      `Dimensions: ${length}ft × ${height}ft`,
      "",
      "MATERIALS SCHEDULE",
      "S.No,Item,Unit,Quantity,Unit Rate,Shop,Total",
    ];

    materials.forEach((mat, idx) => {
      csvLines.push(
        `${idx + 1},"${mat.name}","${mat.unit}",${mat.quantity},${mat.rate},"${mat.shopName}",${(
          mat.quantity * mat.rate
        ).toFixed(2)}`
      );
    });

    csvLines.push("", `TOTAL COST,,,,,${calculateTotalCost().toFixed(2)}`);

    const csv = csvLines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BOQ-Painting-${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    const element = document.getElementById("boq-pdf");
    if (!element) return alert("BOQ content not found");

    const html2pdf = (await import("html2pdf.js")).default;
    html2pdf()
      .set({
        margin: 10,
        filename: "Painting_BOQ.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(element)
      .save();
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Painting Estimator</h2>
          <p className="text-muted-foreground mt-1">
            Complete the process to generate your Painting BOQ with accurate quantities
          </p>
        </div>

        <Card className="border-border/50">
          <CardContent className="pt-8 min-h-96">
            <AnimatePresence mode="wait">
              {/* STEP 1: Paint Type */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <Label className="text-lg font-semibold">Select Paint Type</Label>
                  <div className="grid gap-3">
                    <Button
                      variant={paintType === "interior" ? "default" : "outline"}
                      onClick={() => setPaintType("interior")}
                      className="justify-start h-auto py-4 text-left"
                    >
                      Interior Paint
                    </Button>
                    <Button
                      variant={paintType === "exterior" ? "default" : "outline"}
                      onClick={() => setPaintType("exterior")}
                      className="justify-start h-auto py-4 text-left"
                    >
                      Exterior Paint
                    </Button>
                  </div>
                  <div className="flex justify-end gap-2 pt-6">
                    <Button disabled={!paintType} onClick={() => setStep(2)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Dimensions */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <Label className="text-lg font-semibold">Wall Dimensions (ft)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="length">Length</Label>
                      <Input
                        id="length"
                        type="number"
                        value={length || ""}
                        onChange={(e) => setLength(e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">Height</Label>
                      <Input
                        id="height"
                        type="number"
                        value={height || ""}
                        onChange={(e) => setHeight(e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button disabled={!length || !height} onClick={() => setStep(3)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Material Selection */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <Label className="text-lg font-semibold">Select Materials & Shops</Label>
                  <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                    {getAvailableMaterials().map((mat) => {
                      const isSelected = selectedMaterials.some((m) => m.materialId === mat.id);
                      const currentSelection = selectedMaterials.find((m) => m.materialId === mat.id);
                      const availableShops = storeMaterials
                        .filter((m) => m.code === mat.code)
                        .map((m) => ({
                          shopId: m.shopId,
                          rate: m.rate,
                          shopName: storeShops.find((s) => s.id === m.shopId)?.name || "Unknown",
                        }))
                        .sort((a, b) => a.rate - b.rate);

                      return (
                        <div key={mat.id} className="border rounded-lg p-3 hover:bg-muted/50 transition">
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
                              {isSelected && availableShops.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <Label className="text-xs">Select Shop:</Label>
                                  <Select
                                    value={currentSelection?.selectedShopId || availableShops[0].shopId}
                                    onValueChange={(newShopId) => handleChangeShop(mat.id, newShopId)}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableShops.map((shop) => (
                                        <SelectItem key={shop.shopId} value={shop.shopId}>
                                          {shop.shopName} - ₹{shop.rate}/{mat.unit}
                                          {shop.rate === availableShops[0].rate && " (Best)"}
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
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button disabled={selectedMaterials.length === 0} onClick={() => setStep(4)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: BOQ Review with Material Check */}
{step === 4 && (
  <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
    <div className="text-center space-y-2">
      <h2 className="text-xl font-bold">Review Selected Materials</h2>
      <p className="text-sm text-muted-foreground">Ensure all required materials are selected with correct quantities.</p>
    </div>

    <div className="space-y-2">
      {getAvailableMaterials().map((mat) => {
        const selected = selectedMaterials.find((m) => m.materialId === mat.id);
        const requiredQty = calculateQuantity(mat.code);

        let shopName = "Unknown";
        let rate = mat.rate;
        let unit = mat.unit;

        if (selected) {
          const selectedMaterial = storeMaterials.find((m) => m.id === selected.materialId);
          if (selectedMaterial) {
            unit = selectedMaterial.unit;
            rate = selectedMaterial.rate;
            shopName =
              storeShops.find((s) => s.id === selected.selectedShopId)?.name || "Unknown";
          }
        } else {
          const bestShop = getBestShop(mat.code);
          if (bestShop) {
            rate = bestShop.rate;
            shopName = bestShop.shopName;
          }
        }

        return (
          <div
            key={mat.id}
            className={cn(
              "p-3 border rounded grid grid-cols-6 items-center",
              !selected && "bg-red-100 border-red-400"
            )}
          >
            <span className="col-span-2 font-medium">{mat.name}</span>
            <span className="col-span-1 text-center">{requiredQty} {unit}</span>
            <span className="col-span-1 text-center font-semibold">{shopName}</span>
            <span className="col-span-1 text-center font-semibold">₹{rate}</span>
            {selected ? (
              <span className="col-span-1 text-green-600 font-semibold text-center">Selected</span>
            ) : (
              <Button
                size="sm"
                className="col-span-1"
                onClick={() => {
                  const bestShop = getBestShop(mat.code);
                  if (bestShop) {
                    setSelectedMaterials((prev) => [
                      ...prev,
                      { materialId: mat.id, selectedShopId: bestShop.shopId },
                    ]);
                  }
                }}
              >
                Add
              </Button>
            )}
          </div>
        );
      })}
    </div>

    <div className="flex justify-between gap-2 pt-6">
      <Button variant="outline" onClick={() => setStep(3)}>
        <ChevronLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <Button disabled={selectedMaterials.length === 0} onClick={() => setStep(5)}>
        Next <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  </motion.div>
)}


              {step === 5 && (
  <motion.div key="step5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
    <div className="text-center space-y-2">
      <div
        style={{
          width: "64px",
          height: "64px",
          backgroundColor: "rgba(34,197,94,0.1)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto",
          color: "#22c55e",
        }}
      >
        <CheckCircle2 style={{ width: "32px", height: "32px" }} />
      </div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Painting BOQ</h2>
      <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
        Generated on {new Date().toLocaleDateString()}
      </p>
    </div>

    <div id="boq-pdf" className="bg-white p-4 border rounded">
      <div className="mb-4">
        <p><strong>Paint Type:</strong> {paintType}</p>
        <p><strong>Dimensions:</strong> {length}ft × {height}ft</p>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="bg-gray-100">
          <tr>
            {["S.No", "Material", "Unit", "Qty", "Rate", "Shop", "Amount"].map((h) => (
              <th key={h} className="border px-2 py-1 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {getMaterialsWithDetails().map((mat, idx) => (
            <tr key={mat.id}>
              <td className="border px-2 py-1">{idx + 1}</td>
              <td className="border px-2 py-1">{mat.name}</td>
              <td className="border px-2 py-1 text-center">{mat.unit}</td>
              <td className="border px-2 py-1 text-center">{mat.quantity}</td>
              <td className="border px-2 py-1 text-right">{mat.rate}</td>
              <td className="border px-2 py-1">{mat.shopName}</td>
              <td className="border px-2 py-1 text-right">{(mat.quantity * mat.rate).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 text-right font-bold text-lg">
        Grand Total: ₹{calculateTotalCost().toFixed(2)}
      </div>
    </div>

    <div className="flex flex-wrap gap-4 justify-end pt-4">
      <Button variant="outline" onClick={() => setStep(4)}>
        <ChevronLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <Button className="bg-green-500 text-white" onClick={handleExportBOQ}>
        <Download className="w-5 h-5" /> Export CSV
      </Button>
      <Button className="bg-blue-500 text-white" onClick={handleExportPDF}>
        <Download className="w-5 h-5 rotate-12" /> Export PDF
      </Button>
      <Button
        className="bg-gray-200 text-gray-800"
        onClick={() => {
          setStep(1);
          setPaintType(null);
          setLength(20);
          setHeight(10);
          setSelectedMaterials([]);
        }}
      >
        <ChevronLeft className="w-5 h-5" /> New Estimate
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
