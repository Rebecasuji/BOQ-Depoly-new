import { useState } from "react";
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
import { useData, Material } from "@/lib/store";
import {
  doorFrameLengthLegacyFeet,
  glassAreaLegacySqft,
  glassPerimeterLegacyFeet,
} from "@/lib/estimators/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Download, CheckCircle2, Star } from "lucide-react";

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

// Door configuration with material requirements
const DOOR_CONFIG = {
  panel: {
    label: "Door with Panel",
    types: {
      flush: {
        label: "Flush Door",
        requiresGlazing: false,
        materialRequirements: [
          { code: "DOOR-002", label: "Flush Door Shutter" },
          { code: "DOOR-001", label: "Door Frame" },
          { code: "DOOR-005", label: "Door Hinges (SS)" },
          { code: "DOOR-006", label: "Door Lock" },
        ],
      },
      teak: {
        label: "Teak Wood Door",
        requiresGlazing: false,
        materialRequirements: [
          { code: "DOOR-003", label: "Wooden Panel Door" },
          { code: "DOOR-001", label: "Door Frame" },
          { code: "DOOR-005", label: "Door Hinges (SS)" },
          { code: "DOOR-006", label: "Door Lock" },
        ],
      },
      wpc: {
        label: "WPC Door",
        requiresGlazing: false,
        materialRequirements: [
          { code: "DOOR-004", label: "UPVC Door" },
          { code: "DOOR-001", label: "Door Frame" },
          { code: "DOOR-005", label: "Door Hinges (SS)" },
        ],
      },
    },
  },
  nopanel: {
    label: "Door without Panel (Glass)",
    types: {
      glassdoor: {
        label: "Glass Door",
        requiresGlazing: true,
        materialRequirements: [
          { code: "GLASS-001", label: "Clear Tempered Glass" },
          { code: "DOOR-001", label: "Door Frame" },
          { code: "FRAME-001", label: "Aluminum Frame" },
          { code: "DOOR-005", label: "Door Hinges (SS)" },
        ],
      },
      glasspanel: {
        label: "Glass Panel Door",
        requiresGlazing: true,
        materialRequirements: [
          { code: "GLASS-002", label: "Frosted Tempered Glass" },
          { code: "DOOR-001", label: "Door Frame" },
          { code: "FRAME-001", label: "Aluminum Frame" },
          { code: "DOOR-005", label: "Door Hinges (SS)" },
        ],
      },
    },
  },
};

export default function DoorsEstimator() {
  const { shops: storeShops, materials: storeMaterials } = useData();

  const [step, setStep] = useState(1);
  const [panelType, setPanelType] = useState<"panel" | "nopanel" | null>(null);
  const [doorType, setDoorType] = useState<string | null>(null);
  const [glazingType, setGlazingType] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(1);
  const [height, setHeight] = useState<number | null>(7);
  const [width, setWidth] = useState<number | null>(3);
  const [glassHeight, setGlassHeight] = useState<number | null>(6);
  const [glassWidth, setGlassWidth] = useState<number | null>(2);
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterialConfig[]>([]);

  // Get available door types based on panel type
  const getAvailableDoorTypes = () => {
    if (!panelType) return [];
    const config = DOOR_CONFIG[panelType];
    return Object.entries(config.types).map(([key, value]) => ({
      value: key,
      label: value.label,
    }));
  };

  // Get current door config
  const getCurrentDoorConfig = () => {
    if (!panelType || !doorType) return null;
    return DOOR_CONFIG[panelType].types[doorType as any];
  };

  // Get materials for the selected door type (deduplicated by code)
  const getAvailableMaterials = () => {
    const doorConfig = getCurrentDoorConfig();
    if (!doorConfig) return [];

    const requiredCodes = doorConfig.materialRequirements.map((r) => r.code);
    const allMaterials = storeMaterials.filter((m) => requiredCodes.includes(m.code));
    
    // Deduplicate by code - keep only one instance per material code (cheapest option)
    const uniqueMaterialsMap = new Map<string, typeof allMaterials[0]>();
    
    for (const material of allMaterials) {
      const existing = uniqueMaterialsMap.get(material.code);
      if (!existing || material.rate < existing.rate) {
        uniqueMaterialsMap.set(material.code, material);
      }
    }
    
    return Array.from(uniqueMaterialsMap.values());
  };

  // Find best (cheapest) shop for each material
  const getBestShop = (materialCode: string): { shopId: string; shopName: string; rate: number } | null => {
    const materialsByCode = storeMaterials.filter((m) => m.code === materialCode);
    if (materialsByCode.length === 0) return null;

    let bestOption = materialsByCode[0];
    for (const mat of materialsByCode) {
      if (mat.rate < bestOption.rate) {
        bestOption = mat;
      }
    }

    const shop = storeShops.find((s) => s.id === bestOption.shopId);
    return {
      shopId: bestOption.shopId,
      shopName: shop?.name || "Unknown",
      rate: bestOption.rate,
    };
  };

  // Calculate quantities based on dimensions and door type
  const calculateQuantity = (materialCode: string, materialUnit: string): number => {
    const c = count || 1;
    const h = height || 7;
    const w = width || 3;
    const gh = glassHeight || 6;
    const gw = glassWidth || 2;

    // Frame length using legacy estimator formula
    const frameLength = doorFrameLengthLegacyFeet(h, w);

    let quantity = 0;

    if (materialCode === "DOOR-001") {
      // Door Frame - based on perimeter
      quantity = frameLength * c;
    } else if (
      materialCode === "DOOR-002" ||
      materialCode === "DOOR-003" ||
      materialCode === "DOOR-004"
    ) {
      // Door shutters - one per door
      quantity = c;
    } else if (materialCode === "DOOR-005") {
      // Hinges - 3 per door
      quantity = c * 3;
    } else if (materialCode === "DOOR-006" || materialCode === "DOOR-007" || materialCode === "DOOR-008") {
      // Door hardware - one per door
      quantity = c;
    } else if (materialCode === "GLASS-001" || materialCode === "GLASS-002") {
      // Glass - based on glass area (legacy estimator formula)
      const glassArea = glassAreaLegacySqft(gh, gw);
      quantity = glassArea * c;
    } else if (materialCode === "FRAME-001") {
      // Aluminum frame - based on glass perimeter (legacy formula)
      const glassPerimeter = glassPerimeterLegacyFeet(gh, gw);
      quantity = glassPerimeter * c;
    } else {
      quantity = c;
    }

    return Math.max(1, Math.ceil(quantity));
  };

  // Get materials with quantities and shop info
  const getMaterialsWithDetails = (): MaterialWithQuantity[] => {
    const doorConfig = getCurrentDoorConfig();
    if (!doorConfig) return [];

    const requiredCodes = doorConfig.materialRequirements.map((r) => r.code);
    const materials = storeMaterials.filter((m) => requiredCodes.includes(m.code));

    return selectedMaterials
      .map((selection) => {
        const material = materials.find((m) => m.id === selection.materialId);
        if (!material) return null;

        const shop = storeShops.find((s) => s.id === selection.selectedShopId);
        const quantity = calculateQuantity(material.code, material.unit);

        return {
          id: material.id,
          name: material.name,
          quantity,
          unit: material.unit,
          rate: material.rate,
          shopId: selection.selectedShopId,
          shopName: shop?.name || "Unknown",
        };
      })
      .filter((m): m is MaterialWithQuantity => m !== null);
  };

  const calculateTotalCost = (): number => {
    return getMaterialsWithDetails().reduce((sum, m) => sum + m.quantity * m.rate, 0);
  };

  const handleToggleMaterial = (materialId: string) => {
    const existingSelection = selectedMaterials.find((m) => m.materialId === materialId);

    if (existingSelection) {
      setSelectedMaterials((prev) => prev.filter((m) => m.materialId !== materialId));
    } else {
      const bestShop = getBestShop(storeMaterials.find((m) => m.id === materialId)?.code || "");
      if (bestShop) {
        setSelectedMaterials((prev) => [
          ...prev,
          { materialId, selectedShopId: bestShop.shopId },
        ]);
      }
    }
  };

  const handleChangeShop = (materialId: string, newShopId: string) => {
    setSelectedMaterials((prev) =>
      prev.map((m) =>
        m.materialId === materialId ? { ...m, selectedShopId: newShopId } : m
      )
    );
  };
const handleExportPDF = async () => {
  const element = document.getElementById("boq-pdf");

  if (!element) {
    alert("BOQ content not found");
    return;
  }

  const html2pdf = (await import("html2pdf.js")).default;

  html2pdf()
    .set({
      margin: 10,
      filename: "Door_BOQ.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff", // must be a simple color
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(element)
    .save();
};


  const handleExportBOQ = () => {
    const materials = getMaterialsWithDetails();
    const doorConfig = getCurrentDoorConfig();
    const csvLines = [
      "BILL OF QUANTITIES (BOQ)",
      `Generated: ${new Date().toLocaleString()}`,
      `Door Type: ${panelType === "panel" ? "With Panel" : "Without Panel"} - ${doorConfig?.label}`,
      `Dimensions: ${height}ft × ${width}ft (Count: ${count})`,
      ...(glazingType ? [`Glazing: ${glazingType}`] : []),
      "",
      "MATERIALS SCHEDULE",
      "S.No,Item,Unit,Quantity,Unit Rate,Shop,Total",
    ];

    

    materials.forEach((mat, idx) => {
      const total = mat.quantity * mat.rate;
      csvLines.push(
        `${idx + 1},"${mat.name}","${mat.unit}",${mat.quantity},${mat.rate},"${mat.shopName}",${total}`
      );
    });

    csvLines.push("", `TOTAL COST,,,,,${calculateTotalCost().toFixed(2)}`);

    const csv = csvLines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BOQ-Doors-${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Door Estimator</h2>
          <p className="text-muted-foreground mt-1">
            Complete the process to generate your Bill of Quantities with precise calculations
          </p>
        </div>

        <Card className="border-border/50">
          <CardContent className="pt-8 min-h-96">
            <AnimatePresence mode="wait">
              {/* STEP 1: Panel Type */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <Label className="text-lg font-semibold">Select Panel Type</Label>
                  <div className="grid gap-3">
                    <Button
                      variant={panelType === "panel" ? "default" : "outline"}
                      onClick={() => {
                        setPanelType("panel");
                        setDoorType(null);
                      }}
                      className="justify-start h-auto py-4 text-left"
                    >
                      <div>
                        <div className="font-semibold">Door With Panel</div>
                        <div className="text-xs text-muted-foreground">
                          Flush, Teak Wood, WPC
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant={panelType === "nopanel" ? "default" : "outline"}
                      onClick={() => {
                        setPanelType("nopanel");
                        setDoorType(null);
                      }}
                      className="justify-start h-auto py-4 text-left"
                    >
                      <div>
                        <div className="font-semibold">Door Without Panel (Glass)</div>
                        <div className="text-xs text-muted-foreground">
                          Glass Door, Glass Panel Door
                        </div>
                      </div>
                    </Button>
                  </div>
                  <div className="flex justify-end gap-2 pt-6">
                    <Button disabled={!panelType} onClick={() => setStep(2)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Door Type */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <Label className="text-lg font-semibold">Select Door Type</Label>
                  <div className="grid gap-3">
                    {getAvailableDoorTypes().map((opt) => (
                      <Button
                        key={opt.value}
                        variant={doorType === opt.value ? "default" : "outline"}
                        onClick={() => setDoorType(opt.value)}
                        className="justify-start h-auto py-3"
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button disabled={!doorType} onClick={() => {
                      const config = getCurrentDoorConfig();
                      if (config?.requiresGlazing) {
                        setStep(3);
                      } else {
                        setStep(4);
                      }
                    }}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Glazing (if applicable) */}
              {step === 3 && getCurrentDoorConfig()?.requiresGlazing && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <Label className="text-lg font-semibold">Select Glazing Type</Label>
                  <div className="grid gap-3">
                    <Button
                      variant={glazingType === "single" ? "default" : "outline"}
                      onClick={() => setGlazingType("single")}
                      className="justify-start h-auto py-3"
                    >
                      Single Glazing
                    </Button>
                    <Button
                      variant={glazingType === "double" ? "default" : "outline"}
                      onClick={() => setGlazingType("double")}
                      className="justify-start h-auto py-3"
                    >
                      Double Glazing
                    </Button>
                  </div>
                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button disabled={!glazingType} onClick={() => setStep(4)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: Dimensions */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <Label className="text-lg font-semibold">Door Dimensions (in feet)</Label>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="count">Count</Label>
                      <Input
                        id="count"
                        type="number"
                        placeholder="1"
                        value={count || ""}
                        onChange={(e) =>
                          setCount(e.target.value ? parseFloat(e.target.value) : null)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">Height</Label>
                      <Input
                        id="height"
                        type="number"
                        placeholder="7"
                        value={height || ""}
                        onChange={(e) =>
                          setHeight(e.target.value ? parseFloat(e.target.value) : null)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="width">Width</Label>
                      <Input
                        id="width"
                        type="number"
                        placeholder="3"
                        value={width || ""}
                        onChange={(e) =>
                          setWidth(e.target.value ? parseFloat(e.target.value) : null)
                        }
                      />
                    </div>
                  </div>

                  {getCurrentDoorConfig()?.requiresGlazing && (
                    <div className="mt-6 pt-4 border-t">
                      <Label className="text-lg font-semibold block mb-4">
                        Glass Dimensions (in inches)
                      </Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="glassHeight">Glass Height</Label>
                          <Input
                            id="glassHeight"
                            type="number"
                            placeholder="72"
                            value={glassHeight || ""}
                            onChange={(e) =>
                              setGlassHeight(e.target.value ? parseFloat(e.target.value) : null)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="glassWidth">Glass Width</Label>
                          <Input
                            id="glassWidth"
                            type="number"
                            placeholder="24"
                            value={glassWidth || ""}
                            onChange={(e) =>
                              setGlassWidth(e.target.value ? parseFloat(e.target.value) : null)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(getCurrentDoorConfig()?.requiresGlazing ? 3 : 2)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button
                      disabled={!count || !height || !width || (getCurrentDoorConfig()?.requiresGlazing && (!glassHeight || !glassWidth))}
                      onClick={() => setStep(5)}
                    >
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: Material Selection */}
              {step === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <Label className="text-lg font-semibold">Select Materials & Shops</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Available materials for {getCurrentDoorConfig()?.label}. Best price shop is pre-selected.
                  </p>

                  <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                    {getAvailableMaterials().map((mat) => {
                      const isSelected = selectedMaterials.some(
                        (m) => m.materialId === mat.id
                      );
                      const currentSelection = selectedMaterials.find(
                        (m) => m.materialId === mat.id
                      );
                      const availableShops = storeMaterials
                        .filter((m) => m.code === mat.code)
                        .map((m) => ({
                          shopId: m.shopId,
                          rate: m.rate,
                          shopName:
                            storeShops.find((s) => s.id === m.shopId)?.name || "Unknown",
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
                              <label htmlFor={mat.id} className="font-medium cursor-pointer">
                                {mat.name}
                              </label>
                              <p className="text-xs text-muted-foreground">{mat.code}</p>

                              {isSelected && availableShops.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <Label className="text-xs">Select Shop:</Label>
                                  <Select
                                    value={currentSelection?.selectedShopId || availableShops[0].shopId}
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
                    <Button variant="outline" onClick={() => setStep(4)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button
                      disabled={selectedMaterials.length === 0}
                      onClick={() => setStep(6)}
                    >
                     Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}


              {/* STEP 6: Required Materials Check */}
{/* STEP 6: Required Materials Check */}
{step === 6 && (
  <motion.div
    key="step6-required"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="space-y-4"
  >
    <Label className="text-lg font-semibold">Review Required Materials</Label>
    <p className="text-sm text-muted-foreground mb-4">
      Ensure all required materials are selected with correct quantities.
    </p>

    <div className="space-y-2">
    {getCurrentDoorConfig()?.materialRequirements.map((req) => {
  const selected = selectedMaterials.find(
    (m) => storeMaterials.find(mat => mat.id === m.materialId)?.code === req.code
  );

  const requiredQty = calculateQuantity(req.code);

  let shopName = "Unknown";
  let rate = 0;
  let unit = "";

  if (selected) {
    // ✅ ALWAYS resolve using selected.materialId
    const selectedMaterial = storeMaterials.find(
      (m) => m.id === selected.materialId
    );

    if (selectedMaterial) {
      unit = selectedMaterial.unit;
      rate = selectedMaterial.rate;
      shopName =
        storeShops.find((s) => s.id === selected.selectedShopId)?.name ||
        "Unknown";
    }
  } else {
    // fallback → best shop
    const bestShop = getBestShop(req.code);
    const material = storeMaterials.find((m) => m.code === req.code);

    unit = material?.unit || "";
    rate = bestShop?.rate || 0;
    shopName = bestShop?.shopName || "Unknown";
  }

  return (
    <div
      key={req.code}
      className={cn(
        "p-3 border rounded grid grid-cols-6 items-center",
        !selected && "bg-red-100 border-red-400"
      )}
    >
      <span className="col-span-2 font-medium">{req.label}</span>

      <span className="col-span-1 text-center">
        {requiredQty} {unit}
      </span>

      <span className="col-span-1 text-center font-semibold">
        {shopName}
      </span>

      <span className="col-span-1 text-center font-semibold">
        ₹{rate}
      </span>

      {selected ? (
        <span className="col-span-1 text-green-600 font-semibold text-center">
          Selected
        </span>
      ) : (
        <Button
          size="sm"
          className="col-span-1"
          onClick={() => {
            const material = storeMaterials.find((m) => m.code === req.code);
            const bestShop = getBestShop(req.code);

            if (material && bestShop) {
              setSelectedMaterials((prev) => [
                ...prev,
                {
                  materialId: material.id,
                  selectedShopId: bestShop.shopId,
                },
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
      <Button variant="outline" onClick={() => setStep(5)}>
        <ChevronLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <Button
        disabled={selectedMaterials.length === 0}
        onClick={() => setStep(7)}
      >
         Generate BOQ  <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  </motion.div>
)}


               {/* STEP 7: BOQ Review */}
             {/* STEP 7: Final BOQ */}
{step === 7 && (
  <motion.div
    key="step7"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="space-y-6"
  >
    {/* Header */}
    <div className="text-center space-y-2">
      <div
        style={{
          width: "64px",
          height: "64px",
          backgroundColor: "rgba(34,197,94,0.1)", // Safe green background
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto",
          color: "#22c55e", // Tailwind green-500
        }}
      >
        <CheckCircle2 style={{ width: "32px", height: "32px" }} />
      </div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Bill of Quantities (BOQ)</h2>
      <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
        Generated on {new Date().toLocaleDateString()}
      </p>
    </div>

    {/* BOQ CONTENT (PDF TARGET) */}
    <div
      id="boq-pdf"
      style={{
        backgroundColor: "#ffffff", // white background
        color: "#000000",           // black text
        fontFamily: "Arial, sans-serif",
        padding: "16px",
      }}
    >
      {/* Project / Door Details */}
      <div style={{ border: "1px solid #d1d5db", borderRadius: "8px", marginBottom: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", padding: "16px", fontSize: "0.875rem" }}>
          <div>
            <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>DOOR TYPE</p>
            <p style={{ fontWeight: 600 }}>
              {panelType === "panel" ? "With Panel" : "Without Panel"} – {getCurrentDoorConfig()?.label}
            </p>
          </div>
          <div>
            <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>DIMENSIONS</p>
            <p style={{ fontWeight: 600 }}>
              {height} ft × {width} ft (Qty: {count})
            </p>
          </div>
          {glazingType && (
            <div>
              <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>GLAZING</p>
              <p style={{ fontWeight: 600, textTransform: "capitalize" }}>{glazingType}</p>
            </div>
          )}
          {getCurrentDoorConfig()?.requiresGlazing && (
            <div>
              <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>GLASS SIZE</p>
              <p style={{ fontWeight: 600 }}>
                {glassHeight}" × {glassWidth}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Materials Table */}
      <div style={{ border: "1px solid #d1d5db", borderRadius: "8px", marginBottom: "16px", overflow: "hidden" }}>
        <div style={{ padding: "16px" }}>
          <h3 style={{ fontWeight: 600, marginBottom: "8px" }}>Materials Schedule</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead style={{ backgroundColor: "#f3f4f6" }}>
              <tr>
                {["S.No","Description","Unit","Qty","Rate (₹)","Supplier","Amount (₹)"].map((h) => (
                  <th key={h} style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: h === "Qty" || h.includes("Rate") || h.includes("Amount") ? "right" : "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {getMaterialsWithDetails().map((mat, index) => (
                <tr key={mat.id}>
                  <td style={{ border: "1px solid #d1d5db", padding: "8px" }}>{index + 1}</td>
                  <td style={{ border: "1px solid #d1d5db", padding: "8px", fontWeight: 500 }}>{mat.name}</td>
                  <td style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "center" }}>{mat.unit}</td>
                  <td style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "center" }}>{mat.quantity}</td>
                  <td style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>{mat.rate}</td>
                  <td style={{ border: "1px solid #d1d5db", padding: "8px" }}>{mat.shopName}</td>
                  <td style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right", fontWeight: 600 }}>
                    {(mat.quantity * mat.rate).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total Summary */}
      <div style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "16px", display: "flex", justifyContent: "space-between", backgroundColor: "#eff6ff" }}>
        <div>
          <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Total Materials</p>
          <p style={{ fontWeight: 600 }}>{selectedMaterials.length}</p>
        </div>

        <div>
          <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Total Quantity</p>
          <p style={{ fontWeight: 600 }}>{getMaterialsWithDetails().reduce((s, m) => s + m.quantity, 0)}</p>
        </div>

        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Grand Total</p>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1d4ed8" }}>
            ₹{calculateTotalCost().toFixed(2)}
          </p>
        </div>
      </div>
    </div>

    {/* ACTION BUTTONS */}
    {/* ACTION BUTTONS */}
<div className="flex flex-wrap gap-4 justify-end pt-4">
  {/* Export Excel */}
  <button
    onClick={handleExportBOQ}
    className="flex items-center gap-2 bg-green-500 text-white font-semibold px-4 py-2 rounded-lg shadow hover:bg-green-600 transition"
  >
    <Download className="w-5 h-5" />
    Export Excel
  </button>

  {/* Export PDF */}
  <button
    onClick={handleExportPDF}
    className="flex items-center gap-2 bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition"
  >
    <Download className="w-5 h-5 rotate-12" />
    Export PDF
  </button>

  {/* New Estimate */}
  <button
    onClick={() => {
      setStep(1);
      setPanelType(null);
      setDoorType(null);
      setGlazingType(null);
      setCount(1);
      setHeight(7);
      setWidth(3);
      setGlassHeight(6);
      setGlassWidth(2);
      setSelectedMaterials([]);
    }}
    className="flex items-center gap-2 bg-gray-200 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow hover:bg-gray-300 transition"
  >
    <ChevronLeft className="w-5 h-5" />
    New Estimate
  </button>
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