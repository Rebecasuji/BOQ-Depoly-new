import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Download } from "lucide-react";
import { StepIndicator } from "@/components/StepIndicator";
import { CheckCircle2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MaterialWithQuantity {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  shopName?: string;
}

export default function BlindsEstimator() {
  const { materials: storeMaterials } = useData();

  // STEP STATES
  const [step, setStep] = useState(1);
  const [blindType, setBlindType] = useState<string | null>(null);
  const [width, setWidth] = useState<number | null>(4);
  const [height, setHeight] = useState<number | null>(5);
  const [count, setCount] = useState<number | null>(1);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);

  const steps = [
    { number: 1, title: "Type", description: "Select blind type" },
    { number: 2, title: "Dimensions", description: "Enter measurements" },
    { number: 3, title: "Materials", description: "Select materials" },
    { number: 4, title: "BOQ", description: "Review & export" },
  ];

  const blindTypes = [
    { label: "Roller Blinds", value: "roller" },
    { label: "Venetian Blinds", value: "venetian" },
    { label: "Roman Blinds", value: "roman" },
  ];

  // Get all blinds materials (ignore shop)
  const getAllBlindsMaterials = () => storeMaterials.filter(m => m.category === "Blinds");

  const handleToggleMaterial = (materialId: string) => {
    setSelectedMaterials(prev =>
      prev.includes(materialId)
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  const getMaterialsWithDetails = (): MaterialWithQuantity[] => {
    const w = width || 0;
    const h = height || 0;
    const c = count || 1;
    const area = w * h * c;

    return getAllBlindsMaterials()
      .filter(m => selectedMaterials.includes(m.id))
      .map(mat => {
        let quantity = 0;
        if (mat.code.startsWith("BLIND-001") || mat.code.startsWith("BLIND-002") || mat.code.startsWith("BLIND-003")) {
          quantity = area;
        } else if (mat.code.startsWith("BLIND-KIT") || mat.code.startsWith("BLIND-005")) {
          quantity = c;
        }
        return {
          id: mat.id,
          name: mat.name,
          quantity: Math.ceil(quantity),
          unit: mat.unit || "sqft",
          rate: mat.rate || 0,
          shopName: mat.shopName || "N/A",
        };
      });
  };

  const calculateTotalCost = (): number => {
    return getMaterialsWithDetails().reduce((sum, m) => sum + m.quantity * m.rate, 0);
  };

  const handleExportBOQ = () => {
    const materials = getMaterialsWithDetails();
    const csvLines = [
      "BILL OF QUANTITIES (BOQ)",
      `Generated: ${new Date().toLocaleString()}`,
      `Blind Type: ${blindType}`,
      `Dimensions: ${width}ft × ${height}ft (Count: ${count})`,
      "",
      "MATERIALS SCHEDULE",
      "S.No,Item,Unit,Quantity,Rate (₹),Supplier,Amount (₹)",
    ];

    materials.forEach((mat, idx) => {
      const total = mat.quantity * mat.rate;
      csvLines.push(`${idx + 1},"${mat.name}","${mat.unit}",${mat.quantity},${mat.rate},"${mat.shopName}",${total}`);
    });

    csvLines.push("", `GRAND TOTAL,,,,,,${calculateTotalCost().toFixed(2)}`);

    const csv = csvLines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BOQ-Blinds-${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const materials = getMaterialsWithDetails();

    doc.setFontSize(16);
    doc.text("Bill of Quantities (BOQ)", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Blind Type: ${blindType}`, 14, 34);
    doc.text(`Dimensions: ${width}ft × ${height}ft (Count: ${count})`, 14, 40);

    const tableData = materials.map((m, i) => [
      i + 1,
      m.name,
      m.unit,
      m.quantity,
      m.rate,
      m.shopName,
      (m.quantity * m.rate).toFixed(2),
    ]);

    autoTable(doc, {
      startY: 50,
      head: [["S.No","Description","Unit","Qty","Rate (₹)","Supplier","Amount (₹)"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [243,244,246] },
    });

    doc.text(`Grand Total: ₹${calculateTotalCost().toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);

    doc.save(`BOQ-Blinds-${new Date().getTime()}.pdf`);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Blinds Estimator</h2>
          <p className="text-muted-foreground mt-1">Complete 4-step process to generate your Bill of Quantities</p>
        </div>

        <StepIndicator steps={steps} currentStep={step} onStepClick={s => s <= step && setStep(s)} />

        <Card className="border-border/50">
          <CardContent className="pt-8 min-h-96">
            <AnimatePresence mode="wait">
              {/* STEP 1: Blind Type */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <Label className="text-lg">Select Blind Type</Label>
                  <div className="grid gap-3">
                    {blindTypes.map(opt => (
                      <Button
                        key={opt.value}
                        variant={blindType === opt.value ? "default" : "outline"}
                        onClick={() => setBlindType(opt.value)}
                        className="justify-start h-auto py-3"
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-6">
                    <Button disabled={!blindType} onClick={() => setStep(2)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Dimensions */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <Label className="text-lg">Window Dimensions (in feet)</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="width">Width</Label>
                      <Input id="width" type="number" value={width || ""} onChange={e => setWidth(e.target.value ? parseFloat(e.target.value) : null)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">Height</Label>
                      <Input id="height" type="number" value={height || ""} onChange={e => setHeight(e.target.value ? parseFloat(e.target.value) : null)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="count">Quantity</Label>
                      <Input id="count" type="number" value={count || ""} onChange={e => setCount(e.target.value ? parseFloat(e.target.value) : null)} />
                    </div>
                  </div>
                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button disabled={!width || !height || !count} onClick={() => setStep(3)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Materials */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <Label className="text-lg">Select Materials</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {getAllBlindsMaterials().map(mat => (
                      <div key={mat.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                        <Checkbox id={mat.id} checked={selectedMaterials.includes(mat.id)} onCheckedChange={() => handleToggleMaterial(mat.id)} />
                        <div className="flex-1">
                          <label htmlFor={mat.id} className="font-medium cursor-pointer">{mat.name}</label>
                          <p className="text-xs text-muted-foreground">{mat.brandName || mat.code}</p>
                          <p className="text-xs text-primary font-semibold mt-1">₹{mat.rate}/{mat.unit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button disabled={selectedMaterials.length === 0} onClick={() => setStep(4)}>
                      Generate BOQ <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: BOQ */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div className="text-center space-y-2 mb-6">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold">Bill of Quantities</h3>
                  </div>

                  <div id="boq-pdf" className="space-y-4">
                    <div className="border border-gray-300 rounded p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">BLIND TYPE</p>
                          <p className="font-semibold capitalize">{blindType}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">SIZE</p>
                          <p className="font-semibold">{width}ft × {height}ft</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">COUNT</p>
                          <p className="font-semibold">{count}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-300 rounded overflow-hidden">
                      <table className="w-full border-collapse text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            {["S.No","Description","Unit","Qty","Rate (₹)","Supplier","Amount (₹)"].map(h => (
                              <th key={h} className={cn("border p-2 text-left", h === "Qty" || h.includes("Rate") || h.includes("Amount") ? "text-right" : "text-left")}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {getMaterialsWithDetails().map((mat, i) => (
                            <tr key={mat.id} className="hover:bg-gray-50">
                              <td className="border p-2">{i+1}</td>
                              <td className="border p-2 font-medium">{mat.name}</td>
                              <td className="border p-2 text-center">{mat.unit}</td>
                              <td className="border p-2 text-center">{mat.quantity}</td>
                              <td className="border p-2 text-right">{mat.rate}</td>
                              <td className="border p-2">{mat.shopName}</td>
                              <td className="border p-2 text-right font-semibold">{(mat.quantity * mat.rate).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="border border-gray-300 rounded p-4 flex justify-between bg-blue-50">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Materials</p>
                        <p className="font-semibold">{selectedMaterials.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Quantity</p>
                        <p className="font-semibold">{getMaterialsWithDetails().reduce((s,m)=>s+m.quantity,0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Grand Total</p>
                        <p className="text-2xl font-bold text-blue-700">₹{calculateTotalCost().toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex flex-wrap gap-4 justify-end pt-4">
                    <Button className="flex items-center gap-2 bg-green-500 text-white" onClick={handleExportBOQ}>
                      <Download className="w-5 h-5"/> Export Excel
                    </Button>
                    <Button className="flex items-center gap-2 bg-blue-500 text-white" onClick={handleExportPDF}>
                      <Download className="w-5 h-5 rotate-12"/> Export PDF
                    </Button>
                    <Button className="flex items-center gap-2 bg-gray-200 text-gray-800" onClick={() => {
                      setStep(1); setBlindType(null); setWidth(4); setHeight(5); setCount(1); setSelectedMaterials([]);
                    }}>
                      <ChevronLeft className="w-5 h-5"/> New Estimate
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
