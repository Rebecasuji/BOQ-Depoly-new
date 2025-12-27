import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Download } from "lucide-react";
import { useData } from "@/lib/store";
import { WallType, wallOptions, subOptionsMap } from "@/lib/constants";
import { computeRequired, ComputedMaterials } from "./computeRequired";
import { StepIndicator } from "@/components/StepIndicator";
import { CheckCircle2 } from "lucide-react";

interface MaterialWithQuantity {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  shopId: string;
  shopName: string;
}

export default function CivilWallEstimator() {
  const { shops: storeShops, materials: storeMaterials } = useData();

  const [step, setStep] = useState(1);
  const [wallType, setWallType] = useState<WallType | null>("civil");
  const [subOption, setSubOption] = useState<string | null>("9 inch");
  const [length, setLength] = useState<number | null>(10);
  const [height, setHeight] = useState<number | null>(8);
  const [brickWastage, setBrickWastage] = useState(0);

  const [selectedMaterials, setSelectedMaterials] = useState<
    { materialId: string; selectedShopId: string }[]
  >([]);

  const [computed, setComputed] = useState<ComputedMaterials | null>(null);

  // Compute materials automatically
  useEffect(() => {
    if (length && height && wallType && subOption) {
      const result = computeRequired(wallType, length, height, subOption, brickWastage);
      setComputed(result);
    }
  }, [length, height, wallType, subOption, brickWastage]);

  // Get available materials filtered by wall type
  const getAvailableMaterials = () => {
    if (!wallType) return [];
    const categoryMap: Record<string, string[]> = {
      civil: ["Civil"],
      gypsum: ["Gypsum"],
      plywood: ["Plywood"],
      "gypsum-glass": ["Gypsum", "Glass"],
      "plywood-glass": ["Plywood", "Glass"],
    };
    const categories = categoryMap[wallType] || [];
    return storeMaterials.filter((m) => categories.includes(m.category || ""));
  };

  // Toggle material selection
  const handleToggleMaterial = (materialId: string) => {
    setSelectedMaterials((prev) => {
      const exists = prev.find((m) => m.materialId === materialId);
      if (exists) {
        return prev.filter((m) => m.materialId !== materialId);
      } else {
        const availableShops = storeMaterials
          .filter((m) => m.id === materialId)
          .sort((a, b) => a.rate - b.rate);
        const bestShopId = availableShops[0]?.shopId || "";
        return [...prev, { materialId, selectedShopId: bestShopId }];
      }
    });
  };

  // Change shop for a selected material
  const handleChangeShop = (materialId: string, shopId: string) => {
    setSelectedMaterials((prev) =>
      prev.map((m) =>
        m.materialId === materialId ? { ...m, selectedShopId: shopId } : m
      )
    );
  };

  // Get materials with quantities and shop info
  const getMaterialsWithDetails = (): MaterialWithQuantity[] => {
    return selectedMaterials.map(({ materialId, selectedShopId }) => {
      const mat = storeMaterials.find(
        (m) => m.id === materialId && m.shopId === selectedShopId
      );
      if (!mat) return null;

      let quantity = 0;
      let unit = mat.unit || "pcs";
      const rate = mat.rate || 0;

      if (wallType === "civil" && computed) {
        if (mat.id.startsWith("brick")) quantity = computed.bricks || 0;
        else if (mat.id.startsWith("cement")) {
          quantity = computed.cementBags || 0;
          unit = "bags";
        } else if (mat.id.startsWith("sand")) {
          quantity = computed.sandCubicFt || 0;
          unit = "cft";
        }
      } else if (wallType === "gypsum" && computed) {
        if (mat.id.startsWith("gypsum")) quantity = computed.gypsumBoards || 0;
        else if (mat.id.startsWith("rockwool")) {
          quantity = computed.rockwoolBags || 0;
          unit = "bags";
        }
      }

      return {
        id: mat.id,
        name: mat.name,
        quantity: Math.ceil(quantity),
        unit,
        rate,
        shopId: selectedShopId,
        shopName:
          storeShops.find((s) => s.id === selectedShopId)?.name || "Unknown",
      };
    }).filter(Boolean) as MaterialWithQuantity[];
  };

  const calculateTotalCost = () =>
    getMaterialsWithDetails().reduce((sum, m) => sum + m.quantity * m.rate, 0);

  const handleExportBOQ = () => {
    const materials = getMaterialsWithDetails();
    const csvLines = [
      "BILL OF QUANTITIES (BOQ)",
      `Generated: ${new Date().toLocaleString()}`,
      `Wall Type: ${wallType}`,
      `Dimensions: ${length}ft × ${height}ft`,
      "",
      "MATERIALS SCHEDULE",
      "S.No,Item,Unit,Quantity,Unit Rate,Total,Shop",
    ];
    materials.forEach((mat, idx) => {
      const total = mat.quantity * mat.rate;
      csvLines.push(
        `${idx + 1},"${mat.name}","${mat.unit}",${mat.quantity},${mat.rate},${total},"${mat.shopName}"`
      );
    });
    csvLines.push("", `TOTAL COST,,,,${calculateTotalCost().toFixed(2)}`);

    const csv = csvLines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BOQ-${wallType}-${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const steps = [
    { number: 1, title: "Type", description: "Select wall type" },
    { number: 2, title: "Specifications", description: "Choose thickness/config" },
    { number: 3, title: "Dimensions", description: "Enter measurements" },
    { number: 4, title: "Materials", description: "Select materials & shops" },
    { number: 5, title: "BOQ", description: "Review & export" },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Civil Wall Estimator
          </h2>
          <p className="text-muted-foreground mt-1">
            Complete 5-step process to generate your Bill of Quantities
          </p>
        </div>

        <StepIndicator
          steps={steps}
          currentStep={step}
          onStepClick={(s) => s <= step && setStep(s)}
        />

        <Card className="border-border/50">
          <CardContent className="pt-8 min-h-96">
            <AnimatePresence mode="wait">
              {/* Step 1: Wall Type */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <Label className="text-lg">Select Wall Type</Label>
                  <div className="grid gap-3">
                    {wallOptions.map((opt) => (
                      <Button
                        key={opt.value}
                        variant={wallType === opt.value ? "default" : "outline"}
                        onClick={() => {
                          setWallType(opt.value as WallType);
                          setSubOption(null);
                          setSelectedMaterials([]);
                        }}
                        className="justify-start h-auto py-3"
                      >
                        <div className="text-left">
                          <div className="font-semibold">{opt.label}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-6">
                    <Button disabled={!wallType} onClick={() => setStep(2)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Specifications */}
              {step === 2 && wallType && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <Label className="text-lg">Select Thickness/Configuration</Label>
                  <div className="space-y-2">
                    {subOptionsMap[wallType]?.map((opt) => (
                      <Button
                        key={opt}
                        variant={subOption === opt ? "default" : "outline"}
                        onClick={() => setSubOption(opt)}
                        className="w-full justify-start"
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button disabled={!subOption} onClick={() => setStep(3)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Dimensions */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <Label className="text-lg">Enter Wall Dimensions (in feet)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="length">Length</Label>
                      <Input
                        id="length"
                        type="number"
                        value={length || ""}
                        onChange={(e) =>
                          setLength(e.target.value ? parseFloat(e.target.value) : null)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">Height</Label>
                      <Input
                        id="height"
                        type="number"
                        value={height || ""}
                        onChange={(e) =>
                          setHeight(e.target.value ? parseFloat(e.target.value) : null)
                        }
                      />
                    </div>
                  </div>

                  {wallType === "civil" && (
                    <div className="space-y-2">
                      <Label htmlFor="wastage">Brick Wastage (%)</Label>
                      <Input
                        id="wastage"
                        type="number"
                        min="0"
                        max="20"
                        value={brickWastage}
                        onChange={(e) =>
                          setBrickWastage(parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  )}

                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button disabled={!length || !height} onClick={() => setStep(4)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Materials & Shops */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <Label className="text-lg">Select Materials & Shops</Label>
                  <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                    {getAvailableMaterials().map((mat) => {
                      const isSelected = selectedMaterials.some(
                        (m) => m.materialId === mat.id
                      );
                      const currentSelection = selectedMaterials.find(
                        (m) => m.materialId === mat.id
                      );

                      const availableShops = storeMaterials
                        .filter((m) => m.id === mat.id)
                        .map((m) => ({
                          shopId: m.shopId,
                          rate: m.rate,
                          shopName:
                            storeShops.find((s) => s.id === m.shopId)?.name ||
                            "Unknown",
                        }))
                        .sort((a, b) => a.rate - b.rate);

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
                              <label
                                htmlFor={mat.id}
                                className="font-medium cursor-pointer"
                              >
                                {mat.name}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {mat.code || mat.brandName}
                              </p>

                              {isSelected && availableShops.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <Label className="text-xs">Select Shop:</Label>
                                  <Select
                                    value={
                                      currentSelection?.selectedShopId ||
                                      availableShops[0].shopId
                                    }
                                    onValueChange={(newShopId) =>
                                      handleChangeShop(mat.id, newShopId)
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableShops.map((shop) => (
                                        <SelectItem key={shop.shopId} value={shop.shopId}>
                                          {shop.shopName} - ₹{shop.rate}/
                                          {mat.unit}{" "}
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
                    <Button variant="outline" onClick={() => setStep(3)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button
                      disabled={selectedMaterials.length === 0}
                      onClick={() => setStep(5)}
                    >
                      Generate BOQ <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 5: BOQ */}
              {step === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2 mb-6">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold">Bill of Quantities</h3>
                    <p className="text-sm text-muted-foreground">
                      Calculated requirements
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Materials */}
                    <div className="lg:col-span-2 space-y-4">
                      <Card className="border-border/50">
                        <div className="p-6 space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">
                                WALL TYPE
                              </p>
                              <p className="font-semibold capitalize">
                                {wallType} - {subOption}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">
                                AREA
                              </p>
                              <p className="font-semibold">{(length || 0) * (height || 0)} sq ft</p>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <p className="text-xs text-muted-foreground font-medium mb-3">
                              MATERIALS & QUANTITIES
                            </p>
                            <div className="space-y-2">
                              {getMaterialsWithDetails().map((mat) => (
                                <div
                                  key={mat.id}
                                  className="grid grid-cols-12 gap-2 text-xs p-2 bg-muted/30 rounded"
                                >
                                  <div className="col-span-4 font-medium">{mat.name}</div>
                                  <div className="col-span-2 text-right font-bold text-primary">{mat.quantity}</div>
                                  <div className="col-span-2 text-right text-muted-foreground">{mat.unit}</div>
                                  <div className="col-span-2 text-right text-muted-foreground">₹{mat.rate}</div>
                                  <div className="col-span-2 text-right font-semibold">{mat.shopName}</div>
                                  <div className="col-span-2 text-right font-semibold text-primary">₹{(mat.quantity * mat.rate).toFixed(2)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Cost Summary */}
                    <Card className="border-border/50 bg-primary/5 h-fit sticky top-20">
                      <div className="p-6 space-y-4">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground font-medium">
                            ESTIMATED COST
                          </p>
                          <p className="text-3xl font-bold text-primary">
                            ₹{calculateTotalCost().toFixed(2)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Button
                            onClick={handleExportBOQ}
                            className="w-full"
                            disabled={selectedMaterials.length === 0}
                          >
                            <Download className="mr-2 h-4 w-4" /> Export BOQ
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              setStep(1);
                              setWallType(null);
                              setSubOption(null);
                              setLength(null);
                              setHeight(null);
                              setSelectedMaterials([]);
                              setComputed(null);
                            }}
                          >
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
