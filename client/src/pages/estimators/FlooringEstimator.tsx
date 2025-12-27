import { useState, useEffect } from "react";
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

interface MaterialWithQuantity {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
}

export default function FlooringEstimator() {
  const { shops: storeShops, materials: storeMaterials } = useData();
  const [step, setStep] = useState(1);
  const [flooringType, setFlooringType] = useState<string | null>("tiles");
  const [length, setLength] = useState<number | null>(10);
  const [width, setWidth] = useState<number | null>(8);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | null>(storeShops[0]?.id);

  const steps = [
    { number: 1, title: "Type", description: "Select flooring type" },
    { number: 2, title: "Dimensions", description: "Enter measurements" },
    { number: 3, title: "Materials", description: "Select materials" },
    { number: 4, title: "Shop", description: "Choose supplier" },
    { number: 5, title: "BOQ", description: "Review & export" },
  ];

  const flooringTypes = [
    { label: "Vitrified Tiles", value: "tiles" },
    { label: "Marble", value: "marble" },
    { label: "Granite", value: "granite" },
    { label: "Wooden Flooring", value: "wooden" },
  ];

  const getMaterialsForType = () => {
    if (!flooringType || !selectedShop) return [];
    return storeMaterials.filter(m => 
      m.shopId === selectedShop && 
      m.category === "Flooring"
    );
  };

  const handleToggleMaterial = (materialId: string) => {
    setSelectedMaterials(prev =>
      prev.includes(materialId)
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  const getMaterialsWithQuantities = (): MaterialWithQuantity[] => {
    const area = (length || 0) * (width || 0);
    const wastage = area * 0.10;
    const totalArea = area + wastage;

    const allMaterials = getMaterialsForType()
      .filter(m => selectedMaterials.includes(m.id));

    return allMaterials.map(mat => {
      let quantity = 0;
      if (mat.code.startsWith("FLOOR-001") || mat.code.startsWith("FLOOR-002") || 
          mat.code.startsWith("FLOOR-003") || mat.code.startsWith("FLOOR-004")) {
        quantity = totalArea;
      } else if (mat.code.startsWith("FLOOR-ADH")) {
        quantity = totalArea / 40;
      } else if (mat.code.startsWith("FLOOR-GROUT")) {
        quantity = totalArea * 0.15;
      }
      
      return {
        id: mat.id,
        name: mat.name,
        quantity: Math.ceil(quantity),
        unit: mat.unit || "sqft",
        rate: mat.rate || 0,
      };
    });
  };

  const calculateTotalCost = (): number => {
    const materials = getMaterialsWithQuantities();
    return materials.reduce((sum, m) => sum + (m.quantity * m.rate), 0);
  };

  const handleExportBOQ = () => {
    const materials = getMaterialsWithQuantities();
    const currentShop = storeShops.find(s => s.id === selectedShop);
    const csvLines = [
      "BILL OF QUANTITIES (BOQ)",
      `Generated: ${new Date().toLocaleString()}`,
      `Flooring Type: ${flooringType}`,
      `Dimensions: ${length}ft × ${width}ft`,
      `Shop: ${currentShop?.name}`,
      "",
      "MATERIALS SCHEDULE",
      "S.No,Item,Unit,Quantity,Unit Rate,Total",
    ];

    materials.forEach((mat, idx) => {
      const total = mat.quantity * mat.rate;
      csvLines.push(
        `${idx + 1},"${mat.name}","${mat.unit}",${mat.quantity},${mat.rate},${total}`
      );
    });

    csvLines.push("", `TOTAL COST,,,,${calculateTotalCost().toFixed(2)}`);

    const csv = csvLines.join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BOQ-Flooring-${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Flooring Estimator</h2>
          <p className="text-muted-foreground mt-1">Complete 5-step process to generate your Bill of Quantities</p>
        </div>

        <StepIndicator steps={steps} currentStep={step} onStepClick={(s) => s <= step && setStep(s)} />

        <Card className="border-border/50">
          <CardContent className="pt-8 min-h-96">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <Label className="text-lg">Select Flooring Type</Label>
                  <div className="grid gap-3">
                    {flooringTypes.map((opt) => (
                      <Button
                        key={opt.value}
                        variant={flooringType === opt.value ? "default" : "outline"}
                        onClick={() => setFlooringType(opt.value)}
                        className="justify-start h-auto py-3"
                        data-testid={`button-flooring-${opt.value}`}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-6">
                    <Button disabled={!flooringType} onClick={() => setStep(2)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <Label className="text-lg">Room Dimensions (in feet)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="length">Length</Label>
                      <Input id="length" type="number" placeholder="e.g., 10" value={length || ""} onChange={(e) => setLength(e.target.value ? parseFloat(e.target.value) : null)} data-testid="input-length" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="width">Width</Label>
                      <Input id="width" type="number" placeholder="e.g., 8" value={width || ""} onChange={(e) => setWidth(e.target.value ? parseFloat(e.target.value) : null)} data-testid="input-width" />
                    </div>
                  </div>
                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button disabled={!length || !width} onClick={() => setStep(3)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <Label className="text-lg">Select Shop</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {storeShops.map((shop) => (
                      <div
                        key={shop.id}
                        onClick={() => setSelectedShop(shop.id)}
                        className={cn(
                          "p-3 rounded-lg border-2 cursor-pointer transition-all hover-elevate",
                          selectedShop === shop.id ? "border-primary bg-primary/5" : "border-border/50"
                        )}
                        data-testid={`button-shop-${shop.id}`}
                      >
                        <div className="flex justify-between">
                          <div>
                            <p className="font-semibold text-sm">{shop.name}</p>
                            <p className="text-xs text-muted-foreground">{shop.location}</p>
                          </div>
                          {shop.rating && (
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={cn("h-3 w-3", i < Math.round(shop.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button disabled={!selectedShop} onClick={() => setStep(4)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <Label className="text-lg">Select Materials</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {getMaterialsForType().map((mat) => (
                      <div key={mat.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                        <Checkbox id={mat.id} checked={selectedMaterials.includes(mat.id)} onCheckedChange={() => handleToggleMaterial(mat.id)} data-testid={`checkbox-${mat.id}`} />
                        <div className="flex-1">
                          <label htmlFor={mat.id} className="font-medium cursor-pointer">{mat.name}</label>
                          <p className="text-xs text-muted-foreground">{mat.brandName || mat.code}</p>
                          <p className="text-xs text-primary font-semibold mt-1">₹{mat.rate}/{mat.unit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(3)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button disabled={selectedMaterials.length === 0} onClick={() => setStep(5)}>
                      Generate BOQ <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div key="step5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div className="text-center space-y-2 mb-6">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold">Bill of Quantities</h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                      <Card className="border-border/50">
                        <div className="p-6 space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">FLOORING TYPE</p>
                              <p className="font-semibold capitalize">{flooringType}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">AREA</p>
                              <p className="font-semibold">{(length || 0) * (width || 0)} sq ft</p>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <p className="text-xs text-muted-foreground font-medium mb-3">MATERIALS & QUANTITIES</p>
                            <div className="space-y-2">
                              {getMaterialsWithQuantities().map((mat) => (
                                <div key={mat.id} className="grid grid-cols-12 gap-2 text-xs p-2 bg-muted/30 rounded">
                                  <div className="col-span-4 font-medium">{mat.name}</div>
                                  <div className="col-span-3 text-right font-bold text-primary">{mat.quantity}</div>
                                  <div className="col-span-2 text-right text-muted-foreground">{mat.unit}</div>
                                  <div className="col-span-3 text-right font-semibold">₹{(mat.quantity * mat.rate).toFixed(2)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>

                    <Card className="border-border/50 bg-primary/5 h-fit sticky top-20">
                      <div className="p-6 space-y-4">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground font-medium">ESTIMATED COST</p>
                          <p className="text-3xl font-bold text-primary">₹{calculateTotalCost().toFixed(2)}</p>
                        </div>
                        {selectedShop && (
                          <div className="text-center p-2 bg-background/50 rounded text-xs">
                            <p className="text-muted-foreground">Shop: <span className="font-semibold text-foreground">{storeShops.find(s => s.id === selectedShop)?.name}</span></p>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Button onClick={handleExportBOQ} className="w-full" data-testid="button-export-boq">
                            <Download className="mr-2 h-4 w-4" /> Export BOQ
                          </Button>
                          <Button variant="outline" className="w-full" onClick={() => { setStep(1); setFlooringType(null); setLength(null); setWidth(null); setSelectedMaterials([]); setSelectedShop(storeShops[0]?.id || null); }} data-testid="button-new-estimate">
                            New Estimate
                          </Button>
                        </div>
                      </div>
                    </Card>
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
