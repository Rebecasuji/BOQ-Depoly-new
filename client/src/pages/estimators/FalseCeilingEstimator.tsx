// client/src/pages/estimators/FalseCeilingEstimator.tsx
import { useEffect, useMemo, useRef, useState } from "react";
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
import { useData, Material, Product } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, CheckCircle2 } from "lucide-react";
import html2pdf from "html2pdf.js";
import { useToast } from "@/hooks/use-toast";

const CTINT_LOGO = "/image.png";

/**
 * API helper (DB-only)
 * - No localStorage/sessionStorage usage.
 * - Uses cookie-based auth; always send cookies via `credentials: "include"`.
 */
const toHeaderRecord = (h?: HeadersInit): Record<string, string> => {
  if (!h) return {};
  if (h instanceof Headers) return Object.fromEntries(h.entries());
  if (Array.isArray(h)) return Object.fromEntries(h);
  return h as Record<string, string>;
};

const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  return fetch(input, {
    ...init,
    credentials: "include",
    headers: toHeaderRecord(init.headers),
  });
};

type SelectedMaterialConfig = {
  materialId: string;
  selectedBrand: string;
  selectedShopId: string;
};

const norm = (v: unknown) => String(v ?? "").trim();
const normText = (v: unknown) => norm(v).toUpperCase().replace(/\s+/g, " ");

const safeId = (): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = typeof crypto !== "undefined" ? crypto : null;
  if (c?.randomUUID) return c.randomUUID();
  return `row_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const getBrandOfMaterial = (m: any) => {
  return (m.brandName || m.brand || m.make || m.manufacturer || m.company || "Generic").toString();
};

const matchesEstimator = (p: any, estimator: string) => {
  const bag = [
    p?.estimator,
    p?.estimatorKey,
    p?.category,
    p?.type,
    p?.group,
    p?.name,
    p?.label,
  ]
    .filter(Boolean)
    .map((x: any) => normText(x));
  const key = normText(estimator);
  const keyLoose = key.replace(/[^A-Z0-9]/g, "");
  return bag.some((x) => x.includes(key) || x.replace(/[^A-Z0-9]/g, "").includes(keyLoose));
};

const sanitizeForPdf = (root: HTMLElement): HTMLElement => {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("*").forEach((el) => {
    const e = el as HTMLElement;
    e.style.color = "#000";
    e.style.backgroundColor = e.style.backgroundColor || "#fff";
    e.style.fontFamily = "Arial, sans-serif";
    e.style.fontSize = "12px";
  });
  return clone;
};

const exportPdfFromElement = async (element: HTMLElement, filename: string) => {
  const clone = sanitizeForPdf(element);
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opt: any = {
      margin: 10,
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (html2pdf() as any).from(clone).set(opt).save();
  } finally {
    document.body.removeChild(container);
  }
};

export default function FalseCeilingEstimator() {
  const estimatorKey = "falseceiling";
  const title = "False Ceiling";

  const { shops: storeShops, materials: storeMaterials, products: storeProducts } = useData();
  const { toast } = useToast();

  const [step, setStep] = useState<number>(1);

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedProductLabel, setSelectedProductLabel] = useState<string>("");

  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterialConfig[]>([]);
  const [editableMaterials, setEditableMaterials] = useState<Record<string, { quantity: number; supplyRate: number; installRate: number }>>({});
  const [materialDescriptions, setMaterialDescriptions] = useState<Record<string, string>>({});
  const [materialLocations, setMaterialLocations] = useState<Record<string, string>>({});

  // Step 9 meta
  const [billNo, setBillNo] = useState<string>("");
  const [projectName, setProjectName] = useState<string>("");
  const [siteLocation, setSiteLocation] = useState<string>("");

  const [createdBoq, setCreatedBoq] = useState<any>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const productOptions = useMemo<Product[]>(() => {
    const list = (storeProducts || []) as any[];
    const filtered = list.filter((p) => matchesEstimator(p, estimatorKey));
    return (filtered.length ? filtered : list) as Product[];
  }, [storeProducts, estimatorKey]);

  const availableMaterials = useMemo<Material[]>(() => {
    if (!selectedProductLabel) return [];
    const expected = normText(selectedProductLabel);
    const matched = (storeMaterials || []).filter(
      (m: any) => normText(m.product).includes(expected) || expected.includes(normText(m.product))
    );
    if (!matched.length) return [];
    const map = new Map<string, any>();
    for (const mat of matched) {
      const key = `${normText(mat.product)}__${normText(mat.name)}__${norm(mat.code)}`;
      const ex = map.get(key);
      if (!ex || (mat.rate || 0) < (ex.rate || 0)) map.set(key, mat);
    }
    return Array.from(map.values());
  }, [storeMaterials, selectedProductLabel]);

  const getMaterialWithShop = (materialId: string, selection: SelectedMaterialConfig | undefined) => {
    const base =
      availableMaterials.find((m: any) => m.id === materialId) ||
      (storeMaterials as any[]).find((m) => m.id === materialId);
    if (!base) return null;

    const variants = (storeMaterials as any[])
      .filter((m) => normText(m.product) === normText(base.product) && normText(m.name) === normText(base.name))
      .map((m) => ({
        id: m.id,
        brand: getBrandOfMaterial(m),
        shopId: m.shopId,
        rate: m.rate ?? 0,
        unit: m.unit,
        shopName: (storeShops as any[]).find((s) => s.id === m.shopId)?.name || "Unknown",
      }));

    const brands = Array.from(new Set(variants.map((v) => v.brand))).sort();
    const selectedBrand = selection?.selectedBrand || brands[0] || getBrandOfMaterial(base);

    const shopsForBrand = variants
      .filter((v) => v.brand === selectedBrand)
      .sort((a, b) => (a.rate || 0) - (b.rate || 0));
    const selectedShopId = selection?.selectedShopId || shopsForBrand[0]?.shopId || base.shopId || "";

    const chosen =
      (storeMaterials as any[]).find(
        (m) =>
          m.shopId === selectedShopId &&
          getBrandOfMaterial(m) === selectedBrand &&
          normText(m.product) === normText(base.product) &&
          normText(m.name) === normText(base.name)
      ) || base;

    const qty = editableMaterials[materialId]?.quantity ?? 1;
    const supplyRate = editableMaterials[materialId]?.supplyRate ?? (chosen.rate ?? base.rate ?? 0);
    const installRate = editableMaterials[materialId]?.installRate ?? 0;

    return {
      base,
      chosen,
      brands,
      shopsForBrand,
      selectedBrand,
      selectedShopId,
      qty,
      supplyRate,
      installRate,
      shopName:
        (storeShops as any[]).find((s) => s.id === selectedShopId)?.name || chosen.shopName || "Unknown",
      unit: chosen.unit || base.unit || "-",
    };
  };

  const selectedMaterialRows = useMemo(() => {
    return selectedMaterials
      .map((s) => getMaterialWithShop(s.materialId, s))
      .filter(Boolean) as ReturnType<typeof getMaterialWithShop>[];
  }, [selectedMaterials, availableMaterials, storeMaterials, storeShops, editableMaterials]);

  const totals = useMemo(() => {
    const subtotal = selectedMaterialRows.reduce((acc, r) => acc + r.qty * (r.supplyRate + r.installRate), 0);
    const sgst = subtotal * 0.09;
    const cgst = subtotal * 0.09;
    return { subtotal, sgst, cgst, grandTotal: subtotal + sgst + cgst };
  }, [selectedMaterialRows]);

  const handleSelectProduct = (p: any) => {
    setSelectedProductId(p.id || "");
    setSelectedProductLabel(p.label || p.name || p.product || "");
    setSelectedMaterials([]);
    setEditableMaterials({});
    setMaterialDescriptions({});
    setMaterialLocations({});
    setStep(6);
  };

  const handleToggleMaterial = (materialId: string) => {
    setSelectedMaterials((prev) => {
      const exists = prev.find((x) => x.materialId === materialId);
      if (exists) return prev.filter((x) => x.materialId !== materialId);

      const row = getMaterialWithShop(materialId, undefined);
      const brand = row?.selectedBrand || "Generic";
      const shopId = row?.selectedShopId || "";
      return [...prev, { materialId, selectedBrand: brand, selectedShopId: shopId }];
    });
  };

  const handleChangeBrand = (materialId: string, newBrand: string) => {
    setSelectedMaterials((prev) =>
      prev.map((s) => (s.materialId === materialId ? { ...s, selectedBrand: newBrand, selectedShopId: "" } : s))
    );
  };

  const handleChangeShop = (materialId: string, newShopId: string) => {
    setSelectedMaterials((prev) => prev.map((s) => (s.materialId === materialId ? { ...s, selectedShopId: newShopId } : s)));
  };

  const setEditableQuantity = (materialId: string, quantity: number) => {
    setEditableMaterials((prev) => {
      const cur = prev[materialId] || { quantity: 1, supplyRate: 0, installRate: 0 };
      return { ...prev, [materialId]: { ...cur, quantity: Math.max(1, Math.floor(Number(quantity) || 1)) } };
    });
  };

  const setEditableSupplyRate = (materialId: string, supplyRate: number) => {
    setEditableMaterials((prev) => {
      const cur = prev[materialId] || { quantity: 1, supplyRate: 0, installRate: 0 };
      return { ...prev, [materialId]: { ...cur, supplyRate: Math.max(0, Number(supplyRate) || 0) } };
    });
  };

  const setEditableInstallRate = (materialId: string, installRate: number) => {
    setEditableMaterials((prev) => {
      const cur = prev[materialId] || { quantity: 1, supplyRate: 0, installRate: 0 };
      return { ...prev, [materialId]: { ...cur, installRate: Math.max(0, Number(installRate) || 0) } };
    });
  };

  const ensureBillNo = (): boolean => {
    if (billNo.trim()) return true;
    toast({
      title: "Bill No required",
      description: "Please enter Bill No in Step 9 before saving BOQ.",
      variant: "destructive",
    });
    return false;
  };

  const saveStep9ToDb = async () => {
    if (!ensureBillNo()) return;

    const payload = {
      estimator: estimatorKey,
      session_id: billNo.trim(),
      meta: { billNo: billNo.trim(), projectName, siteLocation, selectedProductId, selectedProductLabel, totals },
      items: selectedMaterialRows.map((r) => {
        const id = r.chosen?.id || r.base?.id || safeId();
        const mid = r.base?.id || id;
        return {
          id,
          materialId: mid,
          name: r.base?.name || "",
          code: r.base?.code || "",
          product: r.base?.product || selectedProductLabel,
          unit: r.unit,
          quantity: r.qty,
          supplyRate: r.supplyRate,
          installRate: r.installRate,
          shopId: r.selectedShopId,
          shopName: r.shopName,
          brand: r.selectedBrand,
          description: materialDescriptions[mid] || "",
          location: materialLocations[mid] || "",
        };
      }),
    };

    try {
      const res = await apiFetch(`/api/estimator-step9-items?session_id=${encodeURIComponent(billNo.trim())}&estimator=${encodeURIComponent(estimatorKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} ${txt}`.trim());
      }
      toast({ title: "Saved", description: "Step 9 cart saved to database." });
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.message || "Failed to save Step 9 data. Please check your connection and try again.",
        variant: "destructive",
      });
    }
  };

  const debouncedAutoSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (!billNo.trim()) return;
      saveStep9ToDb().catch(() => void 0);
    }, 800);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const fetchStep9FromDb = async () => {
    if (!ensureBillNo()) return;
    try {
      const res = await apiFetch(`/api/estimator-step9-items?session_id=${encodeURIComponent(billNo.trim())}&estimator=${encodeURIComponent(estimatorKey)}`);
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (!data) return;

      const items = (data.items || data.rows || []) as any[];
      const desc: Record<string, string> = {};
      const loc: Record<string, string> = {};
      const edits: Record<string, any> = {};
      const sels: SelectedMaterialConfig[] = [];

      for (const it of items) {
        const mid = it.materialId || it.material_id || it.id;
        if (!mid) continue;
        desc[mid] = it.description || "";
        loc[mid] = it.location || "";
        edits[mid] = {
          quantity: Number(it.quantity || 1),
          supplyRate: Number(it.supplyRate ?? it.supply_rate ?? 0),
          installRate: Number(it.installRate ?? it.install_rate ?? 0),
        };
        sels.push({
          materialId: mid,
          selectedBrand: it.brand || "Generic",
          selectedShopId: it.shopId || it.shop_id || "",
        });
      }

      setMaterialDescriptions(desc);
      setMaterialLocations(loc);
      setEditableMaterials(edits);
      setSelectedMaterials(sels);
    } catch {
      // ignore
    }
  };

  const handleCreateBoq = async () => {
    if (!ensureBillNo()) return;

    try {
      await saveStep9ToDb();

      const res = await apiFetch(`/api/boq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimator: estimatorKey,
          session_id: billNo.trim(),
          bill_no: billNo.trim(),
          project_name: projectName,
          site_location: siteLocation,
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} ${txt}`.trim());
      }
      const saved = await res.json().catch(() => ({}));
      setCreatedBoq(saved);
      toast({ title: "BOQ created", description: "BOQ saved successfully to database." });
      setStep(12);
    } catch (e: any) {
      toast({
        title: "Create BOQ failed",
        description: e?.message || "Failed to create BOQ.",
        variant: "destructive",
      });
    }
  };

  const StepPill = ({ n, label }: { n: number; label: string }) => {
    const active = step === n;
    return (
      <div className={cn("flex items-center gap-3 px-3 py-2 rounded-lg border text-sm", active ? "bg-muted" : "bg-background")}>
        <div className={cn("h-6 w-6 rounded-full grid place-items-center text-xs font-bold", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          {n}
        </div>
        <div className={cn(active ? "font-semibold" : "text-muted-foreground")}>{label}</div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="flex gap-6">
        <div className="hidden lg:block w-72 space-y-2 sticky top-6 self-start">
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="font-semibold mb-2">{title} Estimator</div>
              <StepPill n={1} label="Products" />
              <StepPill n={6} label="Materials & Shops" />
              <StepPill n={7} label="Review" />
              <StepPill n={8} label="BOM" />
              <StepPill n={9} label="BOQ Cart" />
              <StepPill n={10} label="Finalize" />
              <StepPill n={11} label="Create BOQ" />
              <StepPill n={12} label="QA / Done" />
            </CardContent>
          </Card>
        </div>

        <div className="flex-1">
          <Card>
            <CardContent className="p-6">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold">Step 1: Select Product</h2>
                      <p className="text-sm text-muted-foreground">Available products under {title} (from DB). Select one to continue.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {productOptions.map((p: any) => {
                        const label = p.label || p.name || p.product || `Product ${p.id}`;
                        const active = selectedProductId === p.id;
                        return (
                          <Card key={p.id || label} className={cn("cursor-pointer hover:bg-muted/40 transition", active && "ring-2 ring-primary")}>
                            <CardContent className="p-4 flex items-center justify-between gap-3">
                              <div>
                                <div className="font-medium">{label}</div>
                                <div className="text-xs text-muted-foreground">{p.category || p.type || p.estimator || ""}</div>
                              </div>
                              <Button onClick={() => handleSelectProduct(p)} size="sm">
                                Select <ChevronRight className="ml-2 h-4 w-4" />
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {productOptions.length === 0 && (
                      <div className="p-4 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded">
                        No products found in DB for estimator <b>{estimatorKey}</b>.
                      </div>
                    )}
                  </motion.div>
                )}

                {step === 6 && (
                  <motion.div key="step6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold">Step 6: Select Materials & Shops</h2>
                      <p className="text-sm text-muted-foreground">
                        Available materials for <b>{selectedProductLabel}</b>. Best price shop is pre-selected.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedMaterials.length === availableMaterials.length && availableMaterials.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const all = availableMaterials.map((mat: any) => {
                              const variants = (storeMaterials as any[])
                                .filter((m) => normText(m.product) === normText(mat.product) && normText(m.name) === normText(mat.name))
                                .map((m) => ({ brand: getBrandOfMaterial(m), shopId: m.shopId, rate: m.rate ?? 0 }));

                              const brands = Array.from(new Set(variants.map((v) => v.brand))).sort();
                              const brand = brands[0] || "Generic";
                              const shops = variants.filter((v) => v.brand === brand).sort((a, b) => (a.rate || 0) - (b.rate || 0));
                              return { materialId: mat.id, selectedBrand: brand, selectedShopId: shops[0]?.shopId || "" };
                            });
                            setSelectedMaterials(all);
                          } else {
                            setSelectedMaterials([]);
                          }
                        }}
                      />
                      <Label htmlFor="select-all">Select All</Label>
                    </div>

                    <div className="space-y-3 max-h-72 overflow-y-auto border rounded-lg p-4">
                      {availableMaterials.length === 0 ? (
                        <div className="p-4 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded">
                          <div className="font-medium mb-2">No materials found for selected product.</div>
                          <div>
                            Selected product: <b>{selectedProductLabel || "(not set)"}</b>
                          </div>
                          <div className="mt-2">Tip: Check DB materials `product` field matches the product label.</div>
                        </div>
                      ) : (
                        availableMaterials.map((mat: any) => {
                          const isSelected = selectedMaterials.some((m) => m.materialId === mat.id);
                          const selection = selectedMaterials.find((m) => m.materialId === mat.id);

                          const variants = (storeMaterials as any[])
                            .filter((m) => normText(m.product) === normText(mat.product) && normText(m.name) === normText(mat.name))
                            .map((m) => ({
                              id: m.id,
                              brand: getBrandOfMaterial(m),
                              shopId: m.shopId,
                              rate: m.rate ?? 0,
                              unit: m.unit,
                              shopName: (storeShops as any[]).find((s) => s.id === m.shopId)?.name || "Unknown",
                            }));

                          const brands = Array.from(new Set(variants.map((v) => v.brand))).sort();
                          const selectedBrand = selection?.selectedBrand || brands[0] || "Generic";
                          const shopsForBrand = variants.filter((v) => v.brand === selectedBrand).sort((a, b) => (a.rate || 0) - (b.rate || 0));

                          return (
                            <div key={mat.id} className="border rounded-lg p-3 hover:bg-muted/50 transition">
                              <div className="flex items-start gap-3">
                                <Checkbox id={mat.id} checked={isSelected} onCheckedChange={() => handleToggleMaterial(mat.id)} />
                                <div className="flex-1">
                                  <label htmlFor={mat.id} className="font-medium cursor-pointer">
                                    {mat.name}
                                  </label>
                                  <p className="text-xs text-muted-foreground">{mat.code}</p>

                                  {isSelected && brands.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      <Label className="text-xs">Select Brand</Label>
                                      <Select value={selectedBrand} onValueChange={(b) => handleChangeBrand(mat.id, b)}>
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {brands.map((b) => (
                                            <SelectItem key={b} value={b}>
                                              {b}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}

                                  {isSelected && shopsForBrand.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      <Label className="text-xs">Select Shop</Label>
                                      <Select
                                        value={selection?.selectedShopId || shopsForBrand[0]?.shopId || ""}
                                        onValueChange={(sid) => handleChangeShop(mat.id, sid)}
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {shopsForBrand.map((s) => (
                                            <SelectItem key={s.shopId || s.id} value={s.shopId || ""}>
                                              {s.shopName} - ₹{s.rate}/{mat.unit} {s.rate === shopsForBrand[0].rate ? "(Best)" : ""}
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
                      <Button disabled={selectedMaterials.length === 0} onClick={() => setStep(7)}>
                        Next <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === 7 && (
                  <motion.div key="step7" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold">Step 7: Review Selected Materials</h2>
                      <p className="text-sm text-muted-foreground">Edit quantities or rates before generating BOM.</p>
                    </div>

                    <div className="space-y-2">
                      {selectedMaterialRows.length > 0 ? (
                        <>
                          <div className="grid grid-cols-9 gap-2 p-2 text-sm text-muted-foreground">
                            <div className="col-span-2 font-medium">Item</div>
                            <div>Description</div>
                            <div className="text-center">Brand</div>
                            <div className="text-center">Qty</div>
                            <div className="text-center">Unit</div>
                            <div className="text-center">Shop</div>
                            <div className="text-center">Supply (₹)</div>
                            <div className="text-center">Install (₹)</div>
                            <div className="text-right">Amount (₹)</div>
                          </div>

                          {selectedMaterialRows.map((r) => {
                            const id = r.base.id;
                            const amount = r.qty * (r.supplyRate + r.installRate);
                            return (
                              <div key={id} className={cn("p-3 border rounded grid grid-cols-9 items-center gap-2")}>
                                <div className="col-span-2 font-medium">{r.base.name}</div>
                                <Input
                                  value={materialDescriptions[id] || ""}
                                  placeholder="Description"
                                  onChange={(e) => {
                                    setMaterialDescriptions((prev) => ({ ...prev, [id]: e.target.value }));
                                    debouncedAutoSave();
                                  }}
                                />
                                <div className="text-center font-semibold">{r.selectedBrand}</div>
                                <div className="text-center">
                                  <Input
                                    type="number"
                                    value={editableMaterials[id]?.quantity ?? r.qty}
                                    onChange={(e) => {
                                      setEditableQuantity(id, Number(e.target.value || 1));
                                      debouncedAutoSave();
                                    }}
                                    className="w-20 mx-auto"
                                  />
                                </div>
                                <div className="text-center text-muted-foreground">{r.unit}</div>
                                <div className="text-center font-semibold">{r.shopName}</div>
                                <div className="text-center">
                                  <Input
                                    type="number"
                                    value={editableMaterials[id]?.supplyRate ?? r.supplyRate}
                                    onChange={(e) => {
                                      setEditableSupplyRate(id, Number(e.target.value || 0));
                                      debouncedAutoSave();
                                    }}
                                    className="w-24 mx-auto"
                                  />
                                </div>
                                <div className="text-center">
                                  <Input
                                    type="number"
                                    value={editableMaterials[id]?.installRate ?? r.installRate}
                                    onChange={(e) => {
                                      setEditableInstallRate(id, Number(e.target.value || 0));
                                      debouncedAutoSave();
                                    }}
                                    className="w-24 mx-auto"
                                  />
                                </div>
                                <div className="text-right font-semibold">₹{amount.toFixed(2)}</div>
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        <p className="text-center text-muted-foreground py-4">No materials selected.</p>
                      )}
                    </div>

                    <div className="flex justify-between gap-2 pt-6">
                      <Button variant="outline" onClick={() => setStep(6)}>
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button onClick={() => setStep(8)} disabled={selectedMaterialRows.length === 0}>
                        Next: Generate BOM <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === 8 && (
                  <motion.div key="step8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="text-center space-y-2">
                      <div style={{ width: 64, height: 64, backgroundColor: "rgba(34,197,94,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", color: "#22c55e" }}>
                        <CheckCircle2 style={{ width: 32, height: 32 }} />
                      </div>
                      <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Bill of Materials (BOM)</h2>
                      <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Generated on {new Date().toLocaleDateString()}</p>
                    </div>

                    <div id="boq-pdf" style={{ backgroundColor: "#ffffff", color: "#000000", fontFamily: "Arial, sans-serif", padding: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 700 }}>CTINT BOQ</div>
                          <div style={{ fontSize: 12 }}>{title} Estimator</div>
                        </div>
                        <img src={CTINT_LOGO} alt="logo" style={{ height: 40 }} />
                      </div>

                      <div style={{ border: "1px solid #d1d5db", borderRadius: 8, marginBottom: 16 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, padding: 16, fontSize: 14 }}>
                          <div><b>Product:</b> {selectedProductLabel}</div>
                          <div><b>Date:</b> {new Date().toLocaleDateString()}</div>
                        </div>
                      </div>

                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ border: "1px solid #d1d5db", padding: 8, textAlign: "left" }}>Item</th>
                            <th style={{ border: "1px solid #d1d5db", padding: 8 }}>Qty</th>
                            <th style={{ border: "1px solid #d1d5db", padding: 8 }}>Unit</th>
                            <th style={{ border: "1px solid #d1d5db", padding: 8 }}>Supply</th>
                            <th style={{ border: "1px solid #d1d5db", padding: 8 }}>Install</th>
                            <th style={{ border: "1px solid #d1d5db", padding: 8 }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedMaterialRows.map((r) => (
                            <tr key={r.base.id}>
                              <td style={{ border: "1px solid #d1d5db", padding: 8 }}>{r.base.name}</td>
                              <td style={{ border: "1px solid #d1d5db", padding: 8, textAlign: "center" }}>{r.qty}</td>
                              <td style={{ border: "1px solid #d1d5db", padding: 8, textAlign: "center" }}>{r.unit}</td>
                              <td style={{ border: "1px solid #d1d5db", padding: 8, textAlign: "right" }}>₹{r.supplyRate}</td>
                              <td style={{ border: "1px solid #d1d5db", padding: 8, textAlign: "right" }}>₹{r.installRate}</td>
                              <td style={{ border: "1px solid #d1d5db", padding: 8, textAlign: "right" }}>₹{(r.qty * (r.supplyRate + r.installRate)).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                        <div style={{ width: 320, fontSize: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><b>₹{totals.subtotal.toFixed(2)}</b></div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}><span>SGST (9%)</span><b>₹{totals.sgst.toFixed(2)}</b></div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}><span>CGST (9%)</span><b>₹{totals.cgst.toFixed(2)}</b></div>
                          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #d1d5db", paddingTop: 6, marginTop: 6 }}><span>Grand Total</span><b>₹{totals.grandTotal.toFixed(2)}</b></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-between gap-2 pt-2">
                      <Button variant="outline" onClick={() => setStep(7)}>
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={async () => {
                          const el = document.getElementById("boq-pdf");
                          if (!el) return;
                          await exportPdfFromElement(el, `${title}_BOM.pdf`);
                        }}>
                          <Download className="mr-2 h-4 w-4" /> Export PDF
                        </Button>
                        <Button onClick={() => setStep(9)}>
                          Next <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 9 && (
                  <motion.div key="step9" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold">Step 9: BOQ Cart</h2>
                      <p className="text-sm text-muted-foreground">Enter Bill No and save cart to DB (no local storage).</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2"><Label>Bill No</Label><Input value={billNo} onChange={(e) => setBillNo(e.target.value)} placeholder="Ex: BOQ-001" /></div>
                      <div className="space-y-2"><Label>Project Name</Label><Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project" /></div>
                      <div className="space-y-2"><Label>Site Location</Label><Input value={siteLocation} onChange={(e) => setSiteLocation(e.target.value)} placeholder="Location" /></div>
                    </div>

                    <div className="border rounded-lg p-3">
                      <div className="font-medium mb-2">Items</div>
                      {selectedMaterialRows.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No items in cart.</div>
                      ) : (
                        <div className="space-y-2">
                          {selectedMaterialRows.map((r) => {
                            const id = r.base.id;
                            return (
                              <div key={id} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center border rounded p-2">
                                <div className="md:col-span-2 font-medium">{r.base.name}</div>
                                <Input value={materialLocations[id] || ""} placeholder="Location" onChange={(e) => { setMaterialLocations((p) => ({ ...p, [id]: e.target.value })); debouncedAutoSave(); }} />
                                <Input value={materialDescriptions[id] || ""} placeholder="Description" onChange={(e) => { setMaterialDescriptions((p) => ({ ...p, [id]: e.target.value })); debouncedAutoSave(); }} />
                                <Input type="number" value={editableMaterials[id]?.quantity ?? r.qty} onChange={(e) => { setEditableQuantity(id, Number(e.target.value || 1)); debouncedAutoSave(); }} />
                                <div className="text-right font-semibold">₹{(r.qty * (r.supplyRate + r.installRate)).toFixed(2)}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between gap-2 pt-2">
                      <Button variant="outline" onClick={() => setStep(8)}><ChevronLeft className="mr-2 h-4 w-4" /> Back</Button>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={async () => { await fetchStep9FromDb(); toast({ title: "Loaded", description: "Tried loading Step 9 from DB (if saved)." }); }}>Load Saved</Button>
                        <Button onClick={async () => { await saveStep9ToDb(); setStep(10); }}>Save & Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 10 && (
                  <motion.div key="step10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <h2 className="text-xl font-semibold">Step 10: Finalize</h2>
                    <div className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between"><span>Subtotal</span><b>₹{totals.subtotal.toFixed(2)}</b></div>
                      <div className="flex justify-between"><span>SGST (9%)</span><b>₹{totals.sgst.toFixed(2)}</b></div>
                      <div className="flex justify-between"><span>CGST (9%)</span><b>₹{totals.cgst.toFixed(2)}</b></div>
                      <div className="flex justify-between border-t pt-2"><span>Grand Total</span><b>₹{totals.grandTotal.toFixed(2)}</b></div>
                    </div>

                    <div className="flex justify-between gap-2 pt-2">
                      <Button variant="outline" onClick={() => setStep(9)}><ChevronLeft className="mr-2 h-4 w-4" /> Back</Button>
                      <Button onClick={() => setStep(11)}>Next: Create BOQ <ChevronRight className="ml-2 h-4 w-4" /></Button>
                    </div>
                  </motion.div>
                )}

                {step === 11 && (
                  <motion.div key="step11" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <h2 className="text-xl font-semibold">Step 11: Create BOQ</h2>
                    <p className="text-sm text-muted-foreground">Creates BOQ in database for Bill No: <b>{billNo || "-"}</b></p>

                    <div className="flex justify-between gap-2 pt-2">
                      <Button variant="outline" onClick={() => setStep(9)}><ChevronLeft className="mr-2 h-4 w-4" /> Back</Button>
                      <Button onClick={handleCreateBoq}>Create BOQ <ChevronRight className="ml-2 h-4 w-4" /></Button>
                    </div>
                  </motion.div>
                )}

                {step === 12 && (
                  <motion.div key="step12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <h2 className="text-xl font-semibold">Step 12: Done</h2>
                    <p className="text-sm text-muted-foreground">BOQ is created. You can export PDF.</p>

                    <div className="border rounded-lg p-4 space-y-2" id="final-boq-pdf">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">Bill No: {billNo || "-"}</div>
                          <div className="text-sm text-muted-foreground">{projectName} {siteLocation ? `• ${siteLocation}` : ""}</div>
                        </div>
                        <img src={CTINT_LOGO} alt="logo" style={{ height: 40 }} />
                      </div>

                      <div className="text-sm">Estimator: <b>{estimatorKey}</b></div>
                      {createdBoq?.id && <div className="text-sm">BOQ ID: <b>{createdBoq.id}</b></div>}

                      <div className="pt-2 border-t">
                        <div className="font-medium mb-2">Items</div>
                        <div className="space-y-1 text-sm">
                          {selectedMaterialRows.map((r) => (
                            <div key={r.base.id} className="flex justify-between">
                              <span>{r.base.name} ({r.qty} {r.unit})</span>
                              <b>₹{(r.qty * (r.supplyRate + r.installRate)).toFixed(2)}</b>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t flex justify-between">
                        <span>Grand Total</span>
                        <b>₹{totals.grandTotal.toFixed(2)}</b>
                      </div>
                    </div>

                    <div className="flex justify-between gap-2 pt-2">
                      <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="mr-2 h-4 w-4" /> Start New</Button>
                      <Button variant="outline" onClick={async () => {
                        const el = document.getElementById("final-boq-pdf");
                        if (!el) return;
                        await exportPdfFromElement(el, `${title}_BOQ.pdf`);
                      }}>
                        <Download className="mr-2 h-4 w-4" /> Export PDF
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
