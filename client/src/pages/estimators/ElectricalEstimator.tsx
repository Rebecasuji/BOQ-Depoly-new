import React, { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import EstimatorScaffold from "@/components/estimators/EstimatorScaffold";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/store";
import { roundTwo } from "@/lib/estimators/utils";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectedMaterialConfig {
  materialId: string;
  selectedShopId: string;
}

export default function ElectricalEstimator() {
  const { materials: storeMaterials, shops: storeShops } = useData();
  const [step, setStep] = useState(1);

  const [rooms, setRooms] = useState<number>(1);
  const [outletsPerRoom, setOutletsPerRoom] = useState<number>(4);
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterialConfig[]>([]);

  // Define common electrical codes for selection
  const commonCodes = ["ELEC-001", "ELEC-002", "ELEC-003"];

  const getAvailableMaterials = () => {
    const allMaterials = storeMaterials.filter((m) => commonCodes.includes(m.code));
    const unique = new Map<string, typeof allMaterials[0]>();
    for (const mat of allMaterials) {
      const existing = unique.get(mat.code);
      if (!existing || mat.rate < existing.rate) unique.set(mat.code, mat);
    }
    return Array.from(unique.values());
  };

  const getBestShop = (materialCode: string) => {
    const options = storeMaterials.filter((m) => m.code === materialCode);
    if (options.length === 0) return null;
    const best = options.reduce((p, c) => (c.rate < p.rate ? c : p), options[0]);
    const shop = storeShops.find((s) => s.id === best.shopId);
    return { ...best, shopName: shop?.name || "Unknown" };
  };

  const calculateQuantity = (code: string) => {
    const points = rooms * outletsPerRoom;
    if (code === "ELEC-001") return Math.max(1, points);
    if (code === "ELEC-002") return Math.max(1, Math.ceil(points * 0.2));
    if (code === "ELEC-003") return Math.max(1, Math.ceil(points * 0.1));
    return Math.max(1, points);
  };

  const handleToggleMaterial = (materialId: string) => {
    const existing = selectedMaterials.find((s) => s.materialId === materialId);
    if (existing) {
      setSelectedMaterials((prev) => prev.filter((p) => p.materialId !== materialId));
    } else {
      const mat = storeMaterials.find((m) => m.id === materialId);
      const best = mat ? getBestShop(mat.code) : null;
      if (best) {
        setSelectedMaterials((prev) => [...prev, { materialId, selectedShopId: best.shopId }]);
      }
    }
  };

  const handleChangeShop = (materialId: string, newShopId: string) => {
    setSelectedMaterials((prev) =>
      prev.map((p) => (p.materialId === materialId ? { ...p, selectedShopId: newShopId } : p))
    );
  };

  const getMaterialsWithDetails = () => {
    return selectedMaterials
      .map((sel) => {
        const mat = storeMaterials.find((m) => m.id === sel.materialId);
        if (!mat) return null;
        const qty = calculateQuantity(mat.code);
        const shopMat = storeMaterials.find((m) => m.code === mat.code && m.shopId === sel.selectedShopId) || mat;
        const shop = storeShops.find((s) => s.id === sel.selectedShopId);
        return {
          id: mat.id,
          name: mat.name,
          quantity: qty,
          unit: mat.unit || "nos",
          rate: shopMat.rate || mat.rate,
          shopId: sel.selectedShopId,
          shopName: shop?.name || "Unknown",
        };
      })
      .filter((x) => x !== null) as Array<any>;
  };

  const totalCost = () => getMaterialsWithDetails().reduce((s, m) => s + m.quantity * m.rate, 0);

  const handleExportBOQ = () => {
    const materials = getMaterialsWithDetails();
    const csvLines = [
      "BILL OF QUANTITIES (BOQ)",
      `Generated: ${new Date().toLocaleString()}`,
      `Rooms: ${rooms}, Outlets per Room: ${outletsPerRoom}`,
      "",
      "MATERIALS SCHEDULE",
      "S.No,Description,Unit,Quantity,Rate (₹),Supplier,Amount (₹)",
    ];
    materials.forEach((mat, idx) => {
      csvLines.push(
        `${idx + 1},"${mat.name}","${mat.unit}",${mat.quantity},${mat.rate},"${mat.shopName}",${(mat.quantity * mat.rate).toFixed(
          2
        )}`
      );
    });
    csvLines.push("", `TOTAL COST,,,,,,${roundTwo(totalCost())}`);
    const csv = csvLines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BOQ-Electrical-${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <EstimatorScaffold
        title="Electrical Estimator"
        description="Estimate basic electrical points and produce a BOQ."
        step={step}
        totalSteps={4}
        onBack={step > 1 ? () => setStep(step - 1) : undefined}
        onNext={step < 4 ? () => setStep(step + 1) : undefined}
        onReset={() => {
          setStep(1);
          setRooms(1);
          setOutletsPerRoom(4);
          setSelectedMaterials([]);
        }}
      >
        {/* Step 1: Inputs */}
        {step === 1 && (
          <div className="space-y-4">
            <Label>Number of Rooms</Label>
            <Input type="number" value={rooms} onChange={(e) => setRooms(Number(e.target.value) || 0)} />
            <Label>Outlets per Room</Label>
            <Input type="number" value={outletsPerRoom} onChange={(e) => setOutletsPerRoom(Number(e.target.value) || 0)} />
          </div>
        )}

        {/* Step 2: Material Selection */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Selected Points: {rooms * outletsPerRoom}</p>
            <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-4">
              {getAvailableMaterials().map((mat) => {
                const isSelected = selectedMaterials.some((s) => s.materialId === mat.id);
                const currentSelection = selectedMaterials.find((s) => s.materialId === mat.id);
                const availableShops = storeMaterials
                  .filter((m) => m.code === mat.code)
                  .map((m) => ({ shopId: m.shopId, rate: m.rate, shopName: storeShops.find((s) => s.id === m.shopId)?.name || "Unknown" }))
                  .sort((a, b) => a.rate - b.rate);
                return (
                  <div key={mat.id} className="border rounded-lg p-3 hover:bg-muted/50 transition">
                    <div className="flex items-start gap-3">
                      <input id={mat.id} type="checkbox" checked={isSelected} onChange={() => handleToggleMaterial(mat.id)} />
                      <div className="flex-1">
                        <label htmlFor={mat.id} className="font-medium cursor-pointer">{mat.name}</label>
                        <p className="text-xs text-muted-foreground">{mat.code}</p>
                        {isSelected && availableShops.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <Label className="text-xs">Select Shop:</Label>
                            <select value={currentSelection?.selectedShopId || availableShops[0].shopId} onChange={(e) => handleChangeShop(mat.id, e.target.value)} className="text-xs p-1 border rounded">
                              {availableShops.map((s) => (
                                <option key={s.shopId} value={s.shopId}>
                                  {s.shopName} - ₹{s.rate}/{mat.unit}{s.rate === availableShops[0].rate ? " (Best)" : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Required Quantities */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Label className="text-lg font-semibold">Review Required Materials</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Check calculated quantities and ensure required materials are selected.
            </p>
            <div className="space-y-2">
              {getAvailableMaterials().map((mat) => {
                const selected = selectedMaterials.find((s) => s.materialId === mat.id);
                const qty = calculateQuantity(mat.code);
                const best = getBestShop(mat.code);
                return (
                  <div key={mat.id} className={cn("p-3 border rounded grid grid-cols-5 items-center", !selected && "bg-red-100 border-red-400")}>
                    <span className="col-span-2 font-medium">{mat.name}</span>
                    <span className="col-span-1 text-center">{qty} {mat.unit}</span>
                    <span className="col-span-1 text-center font-semibold">{selected ? storeShops.find((s) => s.id === selected.selectedShopId)?.name || "Unknown" : best?.shopName}</span>
                    <span className="col-span-1 text-center font-semibold">₹{selected ? storeMaterials.find((m) => m.id === selected.materialId)?.rate : best?.rate}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between gap-2 pt-6">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(4)} disabled={selectedMaterials.length === 0}>
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Final BOQ */}
        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h3 className="text-lg font-semibold">BOQ Summary</h3>
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    {["S.No","Description","Unit","Quantity","Rate (₹)","Supplier","Amount (₹)"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getMaterialsWithDetails().map((mat, idx) => (
                    <tr key={mat.id}>
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2">{mat.name}</td>
                      <td className="px-4 py-2 text-center">{mat.unit}</td>
                      <td className="px-4 py-2 text-center">{mat.quantity}</td>
                      <td className="px-4 py-2 text-right">{roundTwo(mat.rate)}</td>
                      <td className="px-4 py-2">{mat.shopName}</td>
                      <td className="px-4 py-2 text-right font-semibold">{roundTwo(mat.quantity * mat.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between pt-4 font-bold text-lg">
              <div>Total Materials: {selectedMaterials.length}</div>
              <div>Grand Total: ₹{roundTwo(totalCost())}</div>
            </div>
            <div className="flex gap-4 pt-4">
              <Button onClick={handleExportBOQ} className="bg-green-500 text-white hover:bg-green-600">
                <Download className="w-4 h-4 mr-2" /> Export BOQ
              </Button>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-2" /> New Estimate
              </Button>
            </div>
          </motion.div>
        )}
      </EstimatorScaffold>
    </Layout>
  );
}
