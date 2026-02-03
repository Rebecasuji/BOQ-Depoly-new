import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData, Product } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Download, ChevronLeft, ChevronRight } from "lucide-react";
import html2pdf from "html2pdf.js";

const ctintLogo = "/image.png";

interface SelectedMaterialConfig {
  materialId: string;
  selectedShopId: string;
  selectedBrand?: string;
  batchId?: string;
}

type EditableBag = Record<string, { quantity: number; supplyRate: number; installRate: number }>;

const norm = (s?: string) =>
  (s || "")
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();

const normText = (s?: string) => (s || "").toString().toUpperCase();

const getBrandOfMaterial = (m: any) => {
  return (m.brandName || m.brand || m.make || m.manufacturer || m.company || "Generic").toString();
};

export default function BlindsEstimator() {
  const { shops: storeShops, materials: storeMaterials, products: storeProducts } = useData();

  const [step, setStep] = useState(1);

  // ----------- Product selection (Step 1) -----------
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedProductLabel, setSelectedProductLabel] = useState<string>("");

  const getProductLabel = (p: any) => (p?.name || p?.title || p?.label || p?.productName || p?.product || "").toString();
  const getProductCategory = (p: any) => (p?.category || p?.type || p?.group || p?.section || "").toString();
  const isBlindsProduct = (p: any) => {
    const label = normText(getProductLabel(p));
    const cat = normText(getProductCategory(p));
    return label.includes("BLIND") || cat.includes("BLIND");
  };
  const blindsProducts = (storeProducts || []).filter(isBlindsProduct).slice().sort((a: any, b: any) => {
    const la = getProductLabel(a);
    const lb = getProductLabel(b);
    return la.localeCompare(lb);
  });

  const handleSelectProduct = (p: Product) => {
    const label = getProductLabel(p);
    const pid = ((p as any)?.id || label).toString();
    setSelectedProductId(pid);
    setSelectedProductLabel(label);
    // Reset selections
    setSelectedMaterials([]);
    setEditableMaterials({});
    setMaterialDescriptions({});
    setMaterialLocations({});
    setMaterialUnits({});
    setMaterialQtys({});
    setStep11SupplyRates({});
    setStep11InstallRates({});
    setGroupQtys({});
    setSelectedGroupIds([]);
    setQaSelectedIds([]);
    setStep(3); // go to dimensions
  };

  // ----------- Base config (Steps 2/3) -----------
  const BLIND_TYPES = [
    "Roller Blinds",
    "Zebra Blinds",
    "Roman Blinds",
    "Venetian Blinds",
    "Vertical Blinds",
    "Wooden Blinds",
  ];

  const [blindType, setBlindType] = useState<string>("Roller Blinds");
  const [width, setWidth] = useState<number>(4);
  const [height, setHeight] = useState<number>(5);
  const [count, setCount] = useState<number>(1);

  // ----------- Manual fields (PO / Step 10) -----------
  const [finalCustomerName, setFinalCustomerName] = useState<string>("");
  const [finalTerms, setFinalTerms] = useState<string>("50% Advance and 50% on Completion");
  const [finalBillNo, setFinalBillNo] = useState<string>("");
  const [finalBillDate, setFinalBillDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [finalDueDate, setFinalDueDate] = useState<string>("");
  const [finalShopDetails, setFinalShopDetails] = useState<string>("");

  // Material-wise descriptions / locations
  const [materialDescriptions, setMaterialDescriptions] = useState<Record<string, string>>({});
  const [materialLocations, setMaterialLocations] = useState<Record<string, string>>({});
  const [materialQtys, setMaterialQtys] = useState<Record<string, number>>({});
  const [materialUnits, setMaterialUnits] = useState<Record<string, string>>({});

  // Editable rates on Step 11
  const [step11SupplyRates, setStep11SupplyRates] = useState<Record<string, number>>({});
  const [step11InstallRates, setStep11InstallRates] = useState<Record<string, number>>({});

  // ----------- Step 6 selections -----------
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterialConfig[]>([]);
  const [editableMaterials, setEditableMaterials] = useState<EditableBag>({});

  // Step 9 cart selections (batch-aware)
  const [cartSelections, setCartSelections] = useState<SelectedMaterialConfig[]>([]);
  const [cartEditableMaterials, setCartEditableMaterials] = useState<EditableBag>({});
  const [savedStep9Materials, setSavedStep9Materials] = useState<any[] | null>(null);
  const [savedStep9Meta, setSavedStep9Meta] = useState<any | null>(null);

  // Step 11 group/QA selection
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [qaSelectedIds, setQaSelectedIds] = useState<string[]>([]);
  const [groupQtys, setGroupQtys] = useState<Record<string, number>>({});

  // Saved BOQs list
  const [savedBoqs, setSavedBoqs] = useState<any[]>([]);
  const [currentSavedBoq, setCurrentSavedBoq] = useState<any | null>(null);

  // ---------- Helpers ----------
  const getCurrentConfigLabel = (opts?: { blindType?: string; productLabel?: string }) => {
    const bt = opts?.blindType ?? blindType;
    const pl = opts?.productLabel ?? selectedProductLabel;
    const left = bt || "Blinds";
    const right = pl ? ` – ${pl}` : "";
    return `${left}${right}`;
  };

  // Material matching:
  // Prefer DB `product` field matching selected product label; fallback to "blind" keyword.
  const getAvailableMaterials = () => {
    if (!storeMaterials?.length) return [];
    const expectedProduct = (selectedProductLabel || "").toString();

    let matched = expectedProduct
      ? storeMaterials.filter((m: any) => {
          const prod = (m.product || "").toString();
          if (!prod) return false;
          const p = normText(prod);
          const e = normText(expectedProduct);
          return p.includes(e) || e.includes(p);
        })
      : [];

    if (!matched || matched.length === 0) {
      const bt = normText(blindType);
      matched = storeMaterials.filter((m: any) => {
        const name = normText(m.name);
        const cat = normText(m.category);
        const sub = normText(m.subCategory);
        const prod = normText(m.product);
        return name.includes("BLIND") || cat.includes("BLIND") || sub.includes("BLIND") || prod.includes("BLIND") || (bt && (name.includes(bt) || prod.includes(bt)));
      });
    }

    // Deduplicate by product+name+code, keep lowest rate
    const unique = new Map<string, any>();
    for (const mat of matched) {
      const key = `${normText(mat.product)}__${normText(mat.name)}__${norm(mat.code)}`;
      const existing = unique.get(key);
      if (!existing || (mat.rate || 0) < (existing.rate || 0)) unique.set(key, mat);
    }
    return Array.from(unique.values());
  };

  const availableMaterials = getAvailableMaterials();

  const calculateQuantity = (mat: any) => {
    const area = (Number(width || 0) * Number(height || 0)) * Number(count || 1);
    const unit = (mat?.unit || "").toString().toLowerCase();
    const name = (mat?.name || "").toString().toLowerCase();

    // Kits / Nos / Pieces are per blind
    if (unit === "nos" || unit === "pcs" || name.includes("kit") || name.includes("bracket") || name.includes("chain") || name.includes("motor")) {
      return Math.max(1, Math.ceil(Number(count || 1)));
    }

    // Fabric / material is per sqft (fallback)
    return Math.max(1, Math.ceil(area));
  };

  const getMaterialsWithDetails = (selectionsParam?: SelectedMaterialConfig[], editableOverride?: EditableBag) => {
    const selections = selectionsParam || selectedMaterials;
    const bag = editableOverride || editableMaterials;

    return selections
      .map((sel) => {
        // base material row (dedup list)
        let base = availableMaterials.find((m: any) => m.id === sel.materialId);
        if (!base) base = storeMaterials.find((m: any) => m.id === sel.materialId) || null;
        if (!base) return null;

        // Resolve exact DB variant by product+name+brand+shop if possible
        const chosen =
          storeMaterials.find((m: any) => {
            const sameProd = normText(m.product) === normText(base.product);
            const sameName = normText(m.name) === normText(base.name);
            const sameShop = m.shopId === sel.selectedShopId;
            const sameBrand = getBrandOfMaterial(m) === (sel.selectedBrand || "Generic");
            return sameProd && sameName && sameShop && sameBrand;
          }) || base;

        const shop = storeShops.find((s: any) => s.id === sel.selectedShopId);
        const rowId = `${sel.batchId || ""}-${chosen.id}`;

        const override = bag[rowId] || bag[chosen.id] || bag[base.id];
        const computedQty = calculateQuantity(chosen);
        const quantity = override?.quantity ?? computedQty;
        const supplyRate = override?.supplyRate ?? chosen.rate ?? 0;
        const installRate = override?.installRate ?? 0;

        return {
          id: chosen.id,
          batchId: sel.batchId,
          rowId,
          name: chosen.name,
          unit: chosen.unit,
          quantity,
          rate: supplyRate,
          supplyRate,
          installRate,
          shopId: sel.selectedShopId,
          shopName: shop?.name || "Unknown",
          // batch meta
          blindType,
          productLabel: selectedProductLabel,
        } as any;
      })
      .filter(Boolean);
  };

  const calculateTotalCost = (selectionsParam?: SelectedMaterialConfig[], editableOverride?: EditableBag) => {
    const bag = editableOverride || editableMaterials;
    const mats = getMaterialsWithDetails(selectionsParam, editableOverride);
    return mats.reduce((sum: number, m: any) => {
      const key = (m as any).rowId || `${(m as any).batchId || ""}-${m.id}`;
      const sr = Number(bag[key]?.supplyRate ?? bag[m.id]?.supplyRate ?? m.supplyRate ?? m.rate ?? 0);
      const ir = Number(bag[key]?.installRate ?? bag[m.id]?.installRate ?? m.installRate ?? 0);
      const qty = Number(bag[key]?.quantity ?? bag[m.id]?.quantity ?? m.quantity ?? 0);
      return sum + qty * (sr + ir);
    }, 0);
  };

  // ---------- Step 7 editable map bootstrap ----------
  useEffect(() => {
    if (step === 7) {
      const details = getMaterialsWithDetails();
      const map: EditableBag = {};
      details.forEach((d: any) => {
        map[d.id] = { quantity: d.quantity || 0, supplyRate: d.rate || 0, installRate: 0 };
      });
      setEditableMaterials(map);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedMaterials]);

  // ---------- Step 9 cart persistence ----------
  const cartStorageKey = "blinds_cart_v1";
  const saveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    // restore meta only (so early steps don't get cluttered)
    try {
      const meta = localStorage.getItem("blinds_saved_step9_meta");
      if (meta) setSavedStep9Meta(JSON.parse(meta));
    } catch {}
    try {
      const s9 = localStorage.getItem("blinds_saved_step9");
      if (s9) setSavedStep9Materials(JSON.parse(s9));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const payload: any = {
        estimator: "blinds",
        bill_no: finalBillNo,
        product_label: selectedProductLabel,
        blind_type: blindType,
        qty: count,
        height,
        width,
        selectedMaterials,
        editableMaterials,
        materialDescriptions,
        materialLocations,
        created_at: new Date().toISOString(),
      };
      try {
        localStorage.setItem(cartStorageKey, JSON.stringify(payload));
      } catch {}

      // Optional server autosave (non-blocking)
      try {
        await fetch("/api/boq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            materials: getMaterialsWithDetails().map((m: any) => ({
              id: m.id,
              name: m.name,
              unit: m.unit,
              quantity: editableMaterials[m.id]?.quantity ?? m.quantity,
              supplyRate: editableMaterials[m.id]?.supplyRate ?? m.rate,
              installRate: editableMaterials[m.id]?.installRate ?? 0,
              shopId: m.shopId,
              shopName: m.shopName,
              description: materialDescriptions[m.id] || "",
              location: materialLocations[m.id] || "",
            })),
          }),
        });
      } catch {}
    }, 800);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMaterials, editableMaterials, materialDescriptions, materialLocations, blindType, width, height, count, finalBillNo, selectedProductLabel]);

  // ---------- Saved BOQs ----------
  const fetchSavedBoqs = async () => {
    try {
      const res = await fetch("/api/boq");
      if (!res.ok) return;
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) return;
      const data = await res.json();
      setSavedBoqs(data.boqs || []);
    } catch {}
  };

  useEffect(() => {
    if (step === 9) fetchSavedBoqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleSaveBOQ = async () => {
    try {
      const payload = {
        estimator: "blinds",
        billNo: finalBillNo,
        productLabel: selectedProductLabel,
        blindType,
        qty: count,
        height,
        width,
        materials: (savedStep9Materials && savedStep9Materials.length > 0) ? savedStep9Materials : getMaterialsWithDetails(),
        subtotal: subTotal,
        sgst,
        cgst,
        roundOff,
        grandTotal,
      };
      const res = await fetch("/api/boq", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) return false;
      await fetchSavedBoqs();
      const ct = res.headers.get("content-type") || "";
      const saved = ct.includes("application/json") ? await res.json() : null;
      setCurrentSavedBoq(saved?.boq || saved?.boqs?.[0] || null);
      return true;
    } catch {
      return false;
    }
  };

  const handleDeleteSavedBoq = async (id: string) => {
    try {
      const res = await fetch(`/api/boq/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      await fetchSavedBoqs();
    } catch {}
  };

  const handleLoadBoq = (b: any) => {
    setFinalBillNo(b.bill_no || "");
    setSelectedProductLabel(b.product_label || b.productLabel || "");
    setBlindType(b.blind_type || b.blindType || "Roller Blinds");
    setCount(b.qty || 1);
    setHeight(b.height || 5);
    setWidth(b.width || 4);

    if (Array.isArray(b.materials)) {
      const selections: SelectedMaterialConfig[] = b.materials.map((m: any) => ({
        materialId: m.id,
        selectedShopId: m.shopId || m.shop_id || "",
        selectedBrand: m.brand || m.selectedBrand || undefined,
      }));
      setSelectedMaterials(selections.filter(Boolean));
    }
    setCurrentSavedBoq(b);
    setStep(7);
  };

  // ---------- Material toggles / shop+brand ----------
  const handleToggleMaterial = (materialId: string) => {
    const material = availableMaterials.find((m: any) => m.id === materialId);
    if (!material) return;

    const existing = selectedMaterials.find((m) => m.materialId === materialId);
    if (existing) {
      setSelectedMaterials((prev) => prev.filter((m) => m.materialId !== materialId));
      return;
    }

    // Pick default brand and cheapest shop for that brand
    const variants = storeMaterials
      .filter((m: any) => normText(m.product) === normText(material.product) && normText(m.name) === normText(material.name))
      .map((m: any) => ({ brand: getBrandOfMaterial(m), shopId: m.shopId, rate: m.rate || 0 }));

    const brands = Array.from(new Set(variants.map((v) => v.brand))).sort();
    const selectedBrand = brands[0] || "Generic";
    const best = variants.filter((v) => v.brand === selectedBrand).sort((a, b) => a.rate - b.rate)[0];

    if (!best?.shopId) return;

    setSelectedMaterials((prev) => [...prev, { materialId, selectedShopId: best.shopId, selectedBrand }]);
  };

  const handleChangeShop = (materialId: string, newShopId: string) => {
    setSelectedMaterials((prev) => prev.map((m) => (m.materialId === materialId ? { ...m, selectedShopId: newShopId } : m)));
  };

  const handleChangeBrand = (materialId: string, newBrand: string) => {
    const material = availableMaterials.find((m: any) => m.id === materialId);
    if (!material) return;

    const variants = storeMaterials
      .filter((m: any) => normText(m.product) === normText(material.product) && normText(m.name) === normText(material.name))
      .map((m: any) => ({ brand: getBrandOfMaterial(m), shopId: m.shopId, rate: m.rate || 0 }))
      .filter((v) => v.brand === newBrand)
      .sort((a, b) => a.rate - b.rate);

    const bestShopId = variants[0]?.shopId || "";

    setSelectedMaterials((prev) =>
      prev.map((m) => (m.materialId === materialId ? { ...m, selectedBrand: newBrand, selectedShopId: bestShopId || m.selectedShopId } : m))
    );
  };

  // ---------- Editable setters (step-aware: normal vs cart) ----------
  const setEditableQuantity = (key: string, quantity: number) => {
    const q = Math.max(0, Math.ceil(Number(quantity || 0)));
    if (step === 9) {
      setCartEditableMaterials((prev) => ({ ...prev, [key]: { ...(prev[key] || { supplyRate: 0, installRate: 0 }), quantity: q } }));
    } else {
      setEditableMaterials((prev) => ({ ...prev, [key]: { ...(prev[key] || { supplyRate: 0, installRate: 0 }), quantity: q } }));
    }
  };

  const setEditableRate = (key: string, rate: number) => {
    const r = Math.max(0, Number(rate || 0));
    if (step === 9) {
      setCartEditableMaterials((prev) => ({ ...prev, [key]: { ...(prev[key] || { quantity: 0, installRate: 0 }), supplyRate: r, installRate: prev[key]?.installRate || 0 } }));
    } else {
      setEditableMaterials((prev) => ({ ...prev, [key]: { ...(prev[key] || { quantity: 0, installRate: 0 }), supplyRate: r, installRate: prev[key]?.installRate || 0 } }));
    }
  };

  const setEditableInstallRate = (key: string, rate: number) => {
    const r = Math.max(0, Number(rate || 0));
    if (step === 9) {
      setCartEditableMaterials((prev) => ({ ...prev, [key]: { ...(prev[key] || { quantity: 0, supplyRate: 0 }), installRate: r, supplyRate: prev[key]?.supplyRate || 0 } }));
    } else {
      setEditableMaterials((prev) => ({ ...prev, [key]: { ...(prev[key] || { quantity: 0, supplyRate: 0 }), installRate: r, supplyRate: prev[key]?.supplyRate || 0 } }));
    }
  };

  // ---------- Export helpers ----------
  const handleExportPDF = () => {
    const element = document.getElementById("boq-pdf");
    if (!element) {
      alert("BOQ content not found");
      return;
    }

    setTimeout(() => {
      html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: "Blinds_BOM.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(element)
        .save()
        .catch((err: any) => {
          console.error("PDF Export Error:", err);
          alert("PDF export failed. Check console.");
        });
    }, 100);
  };

  const handleExportCSV = () => {
    const mats = getMaterialsWithDetails();
    const csvLines = [
      "BILL OF MATERIALS (BOM)",
      `Generated: ${new Date().toLocaleString()}`,
      `Product: ${getCurrentConfigLabel()}`,
      `Dimensions: ${width}ft × ${height}ft (Qty: ${count})`,
      "",
      "S.No,Item,Unit,Quantity,Supply Rate,Install Rate,Shop,Total",
    ];

    mats.forEach((m: any, idx: number) => {
      const qty = Number(editableMaterials[m.id]?.quantity ?? m.quantity);
      const sr = Number(editableMaterials[m.id]?.supplyRate ?? m.supplyRate ?? m.rate ?? 0);
      const ir = Number(editableMaterials[m.id]?.installRate ?? m.installRate ?? 0);
      const total = qty * (sr + ir);
      csvLines.push(`${idx + 1},"${m.name}","${m.unit}",${qty},${sr},${ir},"${m.shopName}",${total.toFixed(2)}`);
    });

    const sub = calculateTotalCost();
    csvLines.push("", `TOTAL,,,,,,${sub.toFixed(2)}`);

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BOM-Blinds-${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- Step 8 -> Step 9 (Add to cart) ----------
  const addToCartAndOpenStep9 = () => {
    const batchId = `batch-${Date.now()}`;
    const mats = getMaterialsWithDetails(selectedMaterials, editableMaterials).map((m: any) => ({
      id: m.id,
      batchId,
      rowId: `${batchId}-${m.id}`,
      name: m.name,
      unit: m.unit,
      quantity: editableMaterials[m.id]?.quantity ?? m.quantity,
      supplyRate: editableMaterials[m.id]?.supplyRate ?? m.rate,
      installRate: editableMaterials[m.id]?.installRate ?? 0,
      shopId: m.shopId,
      shopName: m.shopName,
      description: materialDescriptions[m.id] || "",
      location: materialLocations[m.id] || "",
      blindType,
      productLabel: selectedProductLabel,
      width,
      height,
      count,
    }));

    const existing = (() => {
      try {
        return savedStep9Materials || JSON.parse(localStorage.getItem("blinds_saved_step9") || "null") || [];
      } catch {
        return savedStep9Materials || [];
      }
    })();

    const merged = [...(existing || []), ...mats];
    setSavedStep9Materials(merged);

    setCartSelections(merged.map((m: any) => ({ materialId: m.id, selectedShopId: m.shopId || "", selectedBrand: m.brand || undefined, batchId: m.batchId })));
    const cartEdits: EditableBag = {};
    merged.forEach((m: any) => {
      cartEdits[`${m.batchId}-${m.id}`] = { quantity: Number(m.quantity || 0), supplyRate: Number(m.supplyRate || m.rate || 0), installRate: Number(m.installRate || 0) };
    });
    setCartEditableMaterials(cartEdits);

    try {
      localStorage.setItem("blinds_saved_step9", JSON.stringify(merged));
    } catch {}

    try {
      const subTotalStep8 = calculateTotalCost();
      const sgstStep8 = subTotalStep8 * 0.09;
      const cgstStep8 = subTotalStep8 * 0.09;
      const roundOffStep8 = Math.round(subTotalStep8 + sgstStep8 + cgstStep8) - (subTotalStep8 + sgstStep8 + cgstStep8);
      const grandTotalStep8 = subTotalStep8 + sgstStep8 + cgstStep8 + roundOffStep8;
      const meta: any = {
        blindType,
        productLabel: selectedProductLabel,
        count,
        height,
        width,
        subtotal: subTotalStep8,
        sgst: sgstStep8,
        cgst: cgstStep8,
        round_off: roundOffStep8,
        grand_total: grandTotalStep8,
      };
      setSavedStep9Meta(meta);
      localStorage.setItem("blinds_saved_step9_meta", JSON.stringify(meta));
    } catch {}

    setStep(9);
  };

  // ---------- Step 9 view data ----------
  const materials = step === 9 ? getMaterialsWithDetails(cartSelections, cartEditableMaterials) : getMaterialsWithDetails();
  const currentEditableBag = step === 9 ? cartEditableMaterials : editableMaterials;

  const subTotal = materials.reduce((sum: number, m: any) => {
    const key = (m as any).rowId || `${(m as any).batchId || ""}-${m.id}`;
    const qty = Number(currentEditableBag[key]?.quantity ?? currentEditableBag[m.id]?.quantity ?? m.quantity ?? 0);
    const sr = Number(currentEditableBag[key]?.supplyRate ?? currentEditableBag[m.id]?.supplyRate ?? m.supplyRate ?? m.rate ?? 0);
    const ir = Number(currentEditableBag[key]?.installRate ?? currentEditableBag[m.id]?.installRate ?? m.installRate ?? 0);
    return sum + qty * (sr + ir);
  }, 0);

  const sgst = subTotal * 0.09;
  const cgst = subTotal * 0.09;
  const roundOff = Math.round(subTotal + sgst + cgst) - (subTotal + sgst + cgst);
  const grandTotal = subTotal + sgst + cgst + roundOff;

  // Step 11 grouped lines (one group per batchId OR per config)
  const _srcMaterials: any[] =
    (currentSavedBoq && currentSavedBoq.materials && currentSavedBoq.materials.length > 0)
      ? (Array.isArray(currentSavedBoq.materials) ? currentSavedBoq.materials : JSON.parse(currentSavedBoq.materials || "[]"))
      : (savedStep9Materials && savedStep9Materials.length > 0) ? savedStep9Materials : materials;

  const grouped = (() => {
    const map = new Map<string, any[]>();
    for (const m of (_srcMaterials || [])) {
      const bt = (m as any).blindType || blindType || "Blinds";
      const pl = (m as any).productLabel || selectedProductLabel || "";
      const key = `${bt}||${pl}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }

    const out: any[] = [];
    for (const [key, items] of map.entries()) {
      const [bt, pl] = key.split("||");
      const gid = `group_${key}`;

      const groupDesc = materialDescriptions[gid] || "";
      const groupLoc = materialLocations[gid] || "";

      let groupQty = Number(groupQtys[gid] ?? (savedStep9Meta?.count ?? count ?? 1));
      const match = String(groupDesc).match(/Qty:\s*(\d+(?:\.\d+)?)/);
      if (match && (groupQtys[gid] === undefined || groupQtys[gid] === null)) groupQty = Number(match[1]);

      const supplyTotal = items.reduce((s: number, it: any) => s + (Number(it.quantity || 0) * Number(it.supplyRate ?? it.rate ?? 0)), 0);
      const installTotal = items.reduce((s: number, it: any) => s + (Number(it.quantity || 0) * Number(it.installRate ?? 0)), 0);

      const supplyRatePerUnit = groupQty > 0 ? (supplyTotal / groupQty) : supplyTotal;
      const installRatePerUnit = groupQty > 0 ? (installTotal / groupQty) : installTotal;

      const label = `${bt}${pl ? " – " + pl : ""}`;
      const cleanedDesc = String(groupDesc).replace(/\n?Qty:\s*\d+(?:\.\d+)?\s*$/, "").trim();

      out.push({
        id: gid,
        groupKey: key,
        name: label,
        location: groupLoc || "",
        description: cleanedDesc || "",
        unit: "pcs",
        quantity: groupQty,
        supplyRate: Number(supplyRatePerUnit || 0),
        installRate: Number(step11InstallRates[gid] ?? installRatePerUnit ?? 0),
        supplyAmount: Number((supplyRatePerUnit * groupQty) || 0),
        installAmount: Number(((step11InstallRates[gid] ?? installRatePerUnit) * groupQty) || 0),
      });
    }
    return out;
  })();

  const displayMaterials = grouped;
  const qaMaterials = displayMaterials.filter((m) => qaSelectedIds.includes(m.id));

  const displaySupplySubtotal = displayMaterials.reduce((s: number, it: any) => {
    const qty = Number(materialQtys[it.id] ?? (it.quantity || 0));
    const supplyRate = Number(step11SupplyRates[it.id] ?? it.supplyRate ?? it.rate ?? 0);
    return s + qty * supplyRate;
  }, 0);
  const displayInstallSubtotal = displayMaterials.reduce((s: number, it: any) => {
    const qty = Number(materialQtys[it.id] ?? (it.quantity || 0));
    return s + qty * Number(it.installRate || 0);
  }, 0);

  const qaSupplySubtotal = qaMaterials.reduce((s: number, it: any) => {
    const qty = Number(materialQtys[it.id] ?? (it.quantity || 0));
    const supplyRate = Number(step11SupplyRates[it.id] ?? it.supplyRate ?? it.rate ?? 0);
    return s + qty * supplyRate;
  }, 0);

  const displaySgst = displaySupplySubtotal * 0.09;
  const displayCgst = displaySupplySubtotal * 0.09;
  const displayRoundOff = Math.round(displaySupplySubtotal + displaySgst + displayCgst) - (displaySupplySubtotal + displaySgst + displayCgst);
  const displayGrandTotal = displaySupplySubtotal + displayInstallSubtotal + displaySgst + displayCgst + displayRoundOff;

  // Prefill shop details on Step 9 from first cart line
  useEffect(() => {
    if (step === 9) {
      const details = getMaterialsWithDetails(cartSelections, cartEditableMaterials);
      if (details.length > 0) {
        const firstShopId = details[0].shopId;
        const shop = storeShops.find((s: any) => s.id === firstShopId);
        if (shop) {
          const parts = [
            shop.name || "",
            shop.address || "",
            shop.area || "",
            shop.city || "",
            shop.state || "",
            shop.pincode || "",
            shop.gstNo ? `GSTIN: ${shop.gstNo}` : "",
            shop.phone || "",
          ].filter(Boolean);
          setFinalShopDetails(parts.join("\n"));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, cartSelections, cartEditableMaterials, storeShops]);

  // Restore cart selections when opening step 9
  useEffect(() => {
    if (step === 9) {
      try {
        const s9 = savedStep9Materials || JSON.parse(localStorage.getItem("blinds_saved_step9") || "null");
        if (Array.isArray(s9) && s9.length > 0) {
          const selections: SelectedMaterialConfig[] = [];
          const editMap: EditableBag = {};
          const descMap: Record<string, string> = {};
          const locMap: Record<string, string> = {};

          for (const m of s9) {
            const materialId = m.id || "";
            if (!materialId) continue;
            const rowKey = m.rowId || (m.batchId ? `${m.batchId}-${materialId}` : `${materialId}`);
            const shopId = m.shopId || m.shop_id || "";
            const brand = m.brand || m.selectedBrand || undefined;

            selections.push({ materialId, selectedShopId: shopId, selectedBrand: brand, batchId: m.batchId || undefined });
            editMap[rowKey] = { quantity: Number(m.quantity || 0), supplyRate: Number(m.supplyRate || m.rate || 0), installRate: Number(m.installRate || 0) };
            if (m.description) descMap[rowKey] = m.description;
            if (m.location) locMap[rowKey] = m.location;
          }

          setCartSelections(selections);
          setCartEditableMaterials(editMap);
          setMaterialDescriptions((prev) => ({ ...prev, ...descMap }));
          setMaterialLocations((prev) => ({ ...prev, ...locMap }));
          setSavedStep9Materials(s9);
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ---------- Step 9 selection for delete ----------
  const [selectedForDelete, setSelectedForDelete] = useState<string[]>([]);
  const toggleSelectRow = (rowId: string) => {
    setSelectedForDelete((prev) => (prev.includes(rowId) ? prev.filter((x) => x !== rowId) : [...prev, rowId]));
  };
  const toggleSelectAll = () => {
    const ids = getMaterialsWithDetails(cartSelections, cartEditableMaterials).map((m: any) => (m as any).rowId || `${(m as any).batchId || ""}-${m.id}`);
    setSelectedForDelete((prev) => (prev.length === ids.length ? [] : ids));
  };

  const handleDeleteSelected = () => {
    if (selectedForDelete.length === 0) return;

    setCartSelections((prev) => prev.filter((s) => !selectedForDelete.includes(`${s.batchId || ""}-${s.materialId}`)));
    setCartEditableMaterials((prev) => {
      const copy = { ...prev };
      selectedForDelete.forEach((id) => delete copy[id]);
      return copy;
    });
    setSavedStep9Materials((prev) => {
      const next = (prev || []).filter((m: any) => !selectedForDelete.includes(`${m.batchId || ""}-${m.id}`));
      try {
        localStorage.setItem("blinds_saved_step9", JSON.stringify(next));
      } catch {}
      return next;
    });

    setSelectedForDelete([]);
  };

  // ---------- Step 9 save (persist locally + server) ----------
  const handleSaveStep9 = async () => {
    const mats = getMaterialsWithDetails(cartSelections, cartEditableMaterials).map((m: any) => {
      const rowId = (m as any).rowId || `${(m as any).batchId || ""}-${m.id}`;
      return {
        id: m.id,
        rowId,
        batchId: (m as any).batchId || null,
        name: m.name,
        unit: m.unit,
        quantity: cartEditableMaterials[rowId]?.quantity ?? m.quantity,
        supplyRate: cartEditableMaterials[rowId]?.supplyRate ?? m.rate,
        installRate: cartEditableMaterials[rowId]?.installRate ?? 0,
        shopId: m.shopId,
        shopName: m.shopName,
        description: materialDescriptions[rowId] || "",
        location: materialLocations[rowId] || "",
        blindType: (m as any).blindType || blindType,
        productLabel: (m as any).productLabel || selectedProductLabel,
        width,
        height,
        count,
      };
    });

    const sub = mats.reduce((s, it) => s + (Number(it.quantity || 0) * (Number(it.supplyRate || 0) + Number(it.installRate || 0))), 0);
    const sg = sub * 0.09;
    const cg = sub * 0.09;
    const ro = Math.round(sub + sg + cg) - (sub + sg + cg);
    const gt = sub + sg + cg + ro;

    setSavedStep9Materials(mats);
    try {
      localStorage.setItem("blinds_saved_step9", JSON.stringify(mats));
      const meta = { blindType, productLabel: selectedProductLabel, count, height, width, subtotal: sub, sgst: sg, cgst: cg, round_off: ro, grand_total: gt };
      setSavedStep9Meta(meta);
      localStorage.setItem("blinds_saved_step9_meta", JSON.stringify(meta));
    } catch {}

    try {
      await handleSaveBOQ();
      alert("BOQ saved locally and sent to server (if authenticated).");
    } catch {
      alert("BOQ saved locally. Server save may have failed (check console).");
    }
  };

  // ---------- Step 10 export final PO ----------
  const handleExportFinalPO = async () => {
    const element = document.getElementById("po-final-pdf");
    if (!element) {
      alert("Final PO content not found");
      return;
    }

    const html2pdfMod = (await import("html2pdf.js")).default;

    html2pdfMod()
      .set({
        margin: 10,
        filename: `PO-Blinds-${finalBillNo || new Date().getTime()}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(element)
      .save();
  };

  // ---------- Step 11 export grouped CSV ----------
  const handleExportExcelStep11 = () => {
    const mats = displayMaterials || [];
    const lines: string[] = [];
    lines.push("S.No,Item,Location,Description,Unit,Qty,Supply Rate,Install Rate,Supply Amount,Install Amount");
    mats.forEach((m: any, idx: number) => {
      const supplyRate = Number(step11SupplyRates[m.id] ?? m.supplyRate ?? m.rate ?? 0);
      const installRate = Number(step11InstallRates[m.id] ?? m.installRate ?? 0);
      const qty = Number(materialQtys[m.id] ?? (m.quantity || 0));
      const supplyAmt = qty * supplyRate;
      const installAmt = qty * installRate;

      const location = (materialLocations[m.id] ?? m.location ?? "").toString().replace(/"/g, '""');
      const desc = (materialDescriptions[m.id] ?? m.description ?? "").toString().replace(/"/g, '""');
      const item = (m.name || "").toString().replace(/"/g, '""');
      const unit = (materialUnits[m.id] ?? m.unit ?? "pcs").toString().replace(/"/g, '""');

      lines.push(`${idx + 1},"${item}","${location}","${desc}","${unit}",${qty},${supplyRate.toFixed(2)},${installRate.toFixed(2)},${supplyAmt.toFixed(2)},${installAmt.toFixed(2)}`);
    });

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BOQ-Blinds-Step11-${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Blinds Estimator</h2>
          <p className="text-muted-foreground mt-1">Select a product, pick materials & shops, and generate BOQ.</p>
        </div>

        <Card className="border-border/50">
          <CardContent className="pt-8 min-h-96">
            <AnimatePresence mode="wait">
              {/* STEP 1: Select Product */}
              {step === 1 && (
                <motion.div key="step1-product" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <Label className="text-lg font-semibold">Select Blinds Product</Label>
                  <p className="text-sm text-muted-foreground">Choose a product from your database.</p>

                  <div className="space-y-3 max-h-72 overflow-y-auto border rounded-lg p-4">
                    {blindsProducts.length === 0 ? (
                      <div className="p-4 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="font-medium mb-2">No blinds products found in DB.</div>
                        <div className="text-xs">Tip: Ensure your products have a category/type/name that includes “Blind”.</div>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {blindsProducts.map((p: any) => {
                          const label = getProductLabel(p);
                          const pid = (p?.id || label).toString();
                          const isActive = selectedProductId === pid;
                          return (
                            <Button
                              key={pid}
                              variant={isActive ? "default" : "outline"}
                              onClick={() => handleSelectProduct(p)}
                              className="justify-start h-auto py-4 text-left"
                            >
                              <div>
                                <div className="font-semibold">{label || "Unnamed Product"}</div>
                                <div className="text-xs text-muted-foreground">{getProductCategory(p) || "Blinds"}</div>
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setStep(2)}>Skip Product</Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Select Blind Type (optional) */}
              {step === 2 && (
                <motion.div key="step2-type" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <Label className="text-lg font-semibold">Select Blind Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {BLIND_TYPES.map((t) => (
                      <Button key={t} variant={blindType === t ? "default" : "outline"} onClick={() => setBlindType(t)} className="justify-start">
                        {t}
                      </Button>
                    ))}
                  </div>

                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button onClick={() => setStep(3)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Dimensions */}
              {step === 3 && (
                <motion.div key="step3-dims" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <Label className="text-lg font-semibold">Blinds Configuration</Label>

                  <div className="space-y-2">
                    <Label>Blind Type</Label>
                    <Select value={blindType} onValueChange={setBlindType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BLIND_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="count">Qty</Label>
                      <Input id="count" type="number" value={count} onChange={(e) => setCount(Number(e.target.value || 0))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="width">Width (ft)</Label>
                      <Input id="width" type="number" value={width} onChange={(e) => setWidth(Number(e.target.value || 0))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">Height (ft)</Label>
                      <Input id="height" type="number" value={height} onChange={(e) => setHeight(Number(e.target.value || 0))} />
                    </div>
                  </div>

                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(selectedProductLabel ? 1 : 2)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button disabled={!count || !width || !height} onClick={() => setStep(6)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 6: Material Selection */}
              {step === 6 && (
                <motion.div key="step6-materials" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <Label className="text-lg font-semibold">Select Materials & Shops</Label>
                  <p className="text-sm text-muted-foreground">
                    Available materials for {getCurrentConfigLabel()}. Best price shop is pre-selected.
                  </p>

                  <div className="flex items-center gap-2 mb-4">
                    <Checkbox
                      id="select-all-materials"
                      checked={selectedMaterials.length === availableMaterials.length && availableMaterials.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const allSelections: SelectedMaterialConfig[] = availableMaterials.map((mat: any) => {
                            const variants = storeMaterials
                              .filter((m: any) => normText(m.product) === normText(mat.product) && normText(m.name) === normText(mat.name))
                              .map((m: any) => ({ brand: getBrandOfMaterial(m), shopId: m.shopId, rate: m.rate || 0 }));
                            const brands = Array.from(new Set(variants.map((v) => v.brand))).sort();
                            const selectedBrand = brands[0] || "Generic";
                            const best = variants.filter((v) => v.brand === selectedBrand).sort((a, b) => a.rate - b.rate)[0];
                            return { materialId: mat.id, selectedBrand, selectedShopId: best?.shopId || "" };
                          });
                          setSelectedMaterials(allSelections.filter((s) => !!s.selectedShopId));
                        } else {
                          setSelectedMaterials([]);
                        }
                      }}
                    />
                    <Label htmlFor="select-all-materials">Select All</Label>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                    {availableMaterials.length === 0 ? (
                      <div className="p-4 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="font-medium mb-2">No materials found for this selection.</div>
                        <div>Product: {selectedProductLabel || "(not set)"}</div>
                        <div>Blind type: {blindType}</div>
                        <div className="mt-2 text-xs">
                          Tip: Ensure your materials have the correct <code>product</code> field or include “Blind” in name/category.
                        </div>
                      </div>
                    ) : (
                      availableMaterials.map((mat: any) => {
                        const isSelected = selectedMaterials.some((m) => m.materialId === mat.id);
                        const currentSelection = selectedMaterials.find((m) => m.materialId === mat.id);

                        const variants = storeMaterials
                          .filter((m: any) => normText(m.product) === normText(mat.product) && normText(m.name) === normText(mat.name))
                          .map((m: any) => ({
                            brand: getBrandOfMaterial(m),
                            shopId: m.shopId,
                            rate: m.rate,
                            unit: m.unit,
                            shopName: storeShops.find((s: any) => s.id === m.shopId)?.name || "Unknown",
                          }));

                        const availableBrands = Array.from(new Set(variants.map((v) => v.brand))).sort();
                        const selectedBrand = currentSelection?.selectedBrand || availableBrands[0] || "Generic";
                        const brandShops = variants.filter((v) => v.brand === selectedBrand).sort((a, b) => (a.rate || 0) - (b.rate || 0));

                        return (
                          <div key={mat.id} className="border rounded-lg p-3 hover:bg-muted/50 transition">
                            <div className="flex items-start gap-3">
                              <Checkbox id={mat.id} checked={isSelected} onCheckedChange={() => handleToggleMaterial(mat.id)} />
                              <div className="flex-1">
                                <label htmlFor={mat.id} className="font-medium cursor-pointer">{mat.name}</label>
                                <p className="text-xs text-muted-foreground">{mat.code}</p>

                                {isSelected && availableBrands.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    <Label className="text-xs">Select Brand:</Label>
                                    <Select value={selectedBrand} onValueChange={(b) => handleChangeBrand(mat.id, b)}>
                                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {availableBrands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {isSelected && brandShops.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    <Label className="text-xs">Select Shop:</Label>
                                    <Select value={currentSelection?.selectedShopId || brandShops[0]?.shopId} onValueChange={(sid) => handleChangeShop(mat.id, sid)}>
                                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {brandShops.map((shop) => (
                                          <SelectItem key={shop.shopId} value={shop.shopId || ""}>
                                            {shop.shopName} - ₹{shop.rate}/{mat.unit}{shop.rate === brandShops[0]?.rate ? " (Best)" : ""}
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
                    <Button variant="outline" onClick={() => setStep(3)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button disabled={selectedMaterials.length === 0} onClick={() => setStep(7)}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 7: Selected Materials Review */}
              {step === 7 && (
                <motion.div key="step7-review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <Label className="text-lg font-semibold">Selected Materials</Label>
                  <p className="text-sm text-muted-foreground mb-4">Edit quantities or rates before generating BOM.</p>

                  <div className="space-y-2">
                    {getMaterialsWithDetails().length > 0 ? (
                      <>
                        <div className="grid grid-cols-9 gap-2 p-2 text-sm text-muted-foreground">
                          <div className="col-span-2 font-medium">Item</div>
                          <div>Description</div>
                          <div className="text-center">Brand</div>
                          <div className="text-center">Qty</div>
                          <div className="text-center">Unit</div>
                          <div className="text-center">Shop</div>
                          <div className="text-center">Supply (₹)</div>
                          <div className="text-right">Amount (₹)</div>
                        </div>

                        {getMaterialsWithDetails().map((mat: any) => {
                          const selection = selectedMaterials.find((s) => s.materialId === mat.id);
                          return (
                            <div key={mat.id} className={cn("p-3 border rounded grid grid-cols-9 items-center")}>
                              <span className="col-span-2 font-medium">{mat.name}</span>
                              <span className="text-sm">{materialDescriptions[mat.id] || mat.name}</span>
                              <div className="col-span-1 text-center font-semibold">{selection?.selectedBrand || "-"}</div>
                              <div className="col-span-1 text-center">
                                <Input
                                  type="number"
                                  value={editableMaterials[mat.id]?.quantity ?? mat.quantity}
                                  onChange={(e) => setEditableQuantity(mat.id, parseInt(e.target.value || "0", 10))}
                                  className="w-20 mx-auto"
                                />
                              </div>
                              <span className="col-span-1 text-center text-muted-foreground">{mat.unit}</span>
                              <div className="col-span-1 text-center font-semibold">{mat.shopName || "-"}</div>
                              <div className="col-span-1 text-center">
                                <Input
                                  type="number"
                                  value={editableMaterials[mat.id]?.supplyRate ?? mat.rate}
                                  onChange={(e) => setEditableRate(mat.id, parseFloat(e.target.value || "0"))}
                                  className="w-24 mx-auto"
                                />
                              </div>
                              <div className="col-span-1 text-right font-semibold">
                                ₹{(
                                  (Number(editableMaterials[mat.id]?.quantity ?? mat.quantity) *
                                    Number(editableMaterials[mat.id]?.supplyRate ?? mat.rate))
                                ).toFixed(2)}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">No materials selected</p>
                    )}
                  </div>

                  <div className="flex justify-between gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(6)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button onClick={() => setStep(8)} disabled={getMaterialsWithDetails().length === 0}>
                      Next: Generate BOM <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 8: BOM */}
              {step === 8 && (
                <motion.div key="step8-bom" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
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
                    <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Bill of Materials (BOM)</h2>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Generated on {new Date().toLocaleDateString()}</p>
                  </div>

                  <div id="boq-pdf" style={{ backgroundColor: "#ffffff", color: "#000000", fontFamily: "Arial, sans-serif", padding: "16px" }}>
                    <div style={{ border: "1px solid #d1d5db", borderRadius: "8px", marginBottom: "16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", padding: "16px", fontSize: "0.875rem" }}>
                        <div>
                          <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>PRODUCT</p>
                          <p style={{ fontWeight: 600 }}>{getCurrentConfigLabel()}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>DIMENSIONS</p>
                          <p style={{ fontWeight: 600 }}>{width} ft × {height} ft (Qty: {count})</p>
                        </div>
                      </div>
                    </div>

                    <div style={{ border: "1px solid #d1d5db", borderRadius: "8px", marginBottom: "16px", overflow: "hidden" }}>
                      <div style={{ padding: "16px" }}>
                        <h3 style={{ fontWeight: 600, marginBottom: "8px" }}>Materials Schedule</h3>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                          <thead style={{ backgroundColor: "#f3f4f6" }}>
                            <tr>
                              {["S.No", "Description", "Unit", "Qty", "Rate (₹)", "Supplier", "Amount (₹)"].map((h) => (
                                <th key={h} style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: h === "Qty" || h.includes("Rate") || h.includes("Amount") ? "right" : "left" }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {getMaterialsWithDetails().map((mat: any, index: number) => (
                              <tr key={mat.id}>
                                <td style={{ border: "1px solid #d1d5db", padding: "8px" }}>{index + 1}</td>
                                <td style={{ border: "1px solid #d1d5db", padding: "8px", fontWeight: 500 }}>{mat.name}</td>
                                <td style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "center" }}>{mat.unit}</td>
                                <td style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "center" }}>{mat.quantity}</td>
                                <td style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>{mat.rate}</td>
                                <td style={{ border: "1px solid #d1d5db", padding: "8px" }}>{mat.shopName}</td>
                                <td style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right", fontWeight: 600 }}>
                                  {(Number(mat.quantity || 0) * Number(mat.rate || 0)).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "16px", display: "flex", justifyContent: "space-between", backgroundColor: "#eff6ff" }}>
                      <div>
                        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Total Materials</p>
                        <p style={{ fontWeight: 600 }}>{selectedMaterials.length}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Grand Total</p>
                        <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1d4ed8" }}>₹{calculateTotalCost().toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 justify-end pt-4">
                    <Button onClick={() => setStep(7)} variant="outline">Back</Button>
                    <button onClick={handleExportCSV} className="flex items-center gap-2 bg-green-500 text-white font-semibold px-4 py-2 rounded-lg shadow hover:bg-green-600 transition">
                      <Download className="w-5 h-5" /> Export Excel
                    </button>
                    <button onClick={handleExportPDF} className="flex items-center gap-2 bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition">
                      <Download className="w-5 h-5 rotate-12" /> Export PDF
                    </button>
                    <Button onClick={addToCartAndOpenStep9} disabled={getMaterialsWithDetails().length === 0}>
                      Add to BOM <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 9: Add to BOQ (Cart) */}
              {step === 9 && (
                <motion.div key="step9-cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <h2 className="text-xl font-semibold">Add to BOQ</h2>

                  <div className="flex items-center justify-between">
                    <div />
                    <div className="flex gap-2">
                      <Button variant="destructive" onClick={handleDeleteSelected} disabled={selectedForDelete.length === 0}>Delete Selected</Button>
                      <Button onClick={handleSaveStep9} disabled={materials.length === 0}>Save</Button>
                      <Button onClick={async () => {
                        // finalize into Step 11 (grouped)
                        const allMats = getMaterialsWithDetails(cartSelections, cartEditableMaterials);
                        const selectedMats = selectedForDelete.length > 0
                          ? allMats.filter((m: any) => selectedForDelete.includes((m as any).rowId || `${(m as any).batchId}-${m.id}`))
                          : allMats;

                        const mats = selectedMats.map((m: any) => {
                          const rowId = (m as any).rowId || `${(m as any).batchId || ""}-${m.id}`;
                          return {
                            id: m.id,
                            rowId,
                            batchId: (m as any).batchId,
                            name: m.name,
                            unit: m.unit,
                            quantity: cartEditableMaterials[rowId]?.quantity ?? m.quantity,
                            supplyRate: cartEditableMaterials[rowId]?.supplyRate ?? m.rate,
                            installRate: cartEditableMaterials[rowId]?.installRate ?? 0,
                            shopId: m.shopId,
                            shopName: m.shopName,
                            description: materialDescriptions[rowId] || "",
                            location: materialLocations[rowId] || "",
                            blindType: (m as any).blindType || blindType,
                            productLabel: (m as any).productLabel || selectedProductLabel,
                          };
                        });

                        if (mats.length === 0) return;

                        const localBoq = {
                          id: `local-${Date.now()}`,
                          estimator: "blinds",
                          bill_no: finalBillNo,
                          blind_type: mats[0]?.blindType || blindType,
                          product_label: mats[0]?.productLabel || selectedProductLabel,
                          qty: count,
                          height,
                          width,
                          materials: mats,
                          subtotal: mats.reduce((s: number, it: any) => s + (Number(it.quantity || 0) * (Number(it.supplyRate || 0) + Number(it.installRate || 0))), 0),
                          sgst: 0, cgst: 0, round_off: 0, grand_total: 0,
                          created_at: new Date().toISOString(),
                        };

                        setCurrentSavedBoq(localBoq);
                        try { await handleSaveBOQ(); } catch {}
                        setSelectedForDelete([]);
                        setStep(11);
                      }} disabled={materials.length === 0}>
                        Add to BOQ
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Saved BOQs</Label>
                    {savedBoqs.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No saved BOQs</div>
                    ) : (
                      <div className="grid gap-2">
                        {savedBoqs.map((b) => (
                          <div key={b.id} className="p-2 border rounded flex justify-between items-center">
                            <div>
                              <div className="font-medium">{b.bill_no || `${b.estimator} - ${b.blind_type || "Blinds"}`}</div>
                              <div className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()}</div>
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={() => handleLoadBoq(b)} size="sm">Load</Button>
                              <Button variant="destructive" onClick={() => handleDeleteSavedBoq(b.id)} size="sm">Delete</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div id="boq-pdf" className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full border-collapse text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border px-2 py-2">
                            <Checkbox
                              id="select-all"
                              checked={(() => {
                                const ids = getMaterialsWithDetails(cartSelections, cartEditableMaterials).map((m: any) => (m as any).rowId || `${(m as any).batchId || ""}-${m.id}`);
                                return selectedForDelete.length === ids.length && ids.length > 0;
                              })()}
                              onCheckedChange={toggleSelectAll}
                            />
                          </th>
                          <th className="border px-2 py-2">S.No</th>
                          <th className="border px-2 py-2">Item</th>
                          <th className="border px-2 py-2">Description</th>
                          <th className="border px-2 py-2">Unit</th>
                          <th className="border px-2 py-2">Qty</th>
                          <th className="border px-2 py-2 text-right">Rate</th>
                          <th className="border px-2 py-2 text-right">Amount</th>
                        </tr>
                      </thead>

                      <tbody>
                        {getMaterialsWithDetails(cartSelections, cartEditableMaterials).map((m: any, idx: number) => {
                          const rowId = (m as any).rowId || `${(m as any).batchId || ""}-${m.id}`;
                          const qty = Number(cartEditableMaterials[rowId]?.quantity ?? m.quantity ?? 0);
                          const sr = Number(cartEditableMaterials[rowId]?.supplyRate ?? m.rate ?? 0);
                          const ir = Number(cartEditableMaterials[rowId]?.installRate ?? 0);
                          const rate = sr + ir;
                          const amount = qty * rate;

                          return (
                            <tr key={rowId}>
                              <td className="border px-2 py-1 text-center">
                                <Checkbox checked={selectedForDelete.includes(rowId)} onCheckedChange={() => toggleSelectRow(rowId)} />
                              </td>
                              <td className="border px-2 py-1 text-center">{idx + 1}</td>
                              <td className="border px-2 py-1">{m.name}</td>
                              <td className="border px-2 py-1" style={{ maxWidth: 450, wordBreak: "break-word" }}>
                                <textarea
                                  placeholder="Description"
                                  className="h-20 w-full p-2 border rounded"
                                  value={materialDescriptions[rowId] ?? ""}
                                  onChange={(e) => setMaterialDescriptions((prev) => ({ ...prev, [rowId]: e.target.value }))}
                                />
                              </td>
                              <td className="border px-2 py-1 text-center">{materialUnits[rowId] ?? m.unit}</td>
                              <td className="border px-2 py-1 text-center">
                                <Input type="number" className="h-8 text-center" value={qty as any} onChange={(e) => setEditableQuantity(rowId, e.target.value ? parseFloat(e.target.value) : 0)} />
                              </td>
                              <td className="border px-2 py-1 text-right">
                                <Input
                                  type="number"
                                  value={rate as any}
                                  onChange={(e) => {
                                    const v = parseFloat(e.target.value || "0");
                                    const newSupply = Number(cartEditableMaterials[rowId]?.supplyRate ?? sr);
                                    const newInstall = Math.max(0, v - newSupply);
                                    setEditableRate(rowId, newSupply);
                                    setEditableInstallRate(rowId, newInstall);
                                  }}
                                  className="w-28 mx-auto"
                                />
                              </td>
                              <td className="border px-2 py-1 text-right font-medium">₹{amount.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setStep(8)}><ChevronLeft className="mr-2 h-4 w-4" /> Back</Button>
                    <Button onClick={() => setStep(10)}>Finalize PO</Button>
                    <Button onClick={handleExportPDF}>Export PDF <Download className="ml-2 h-4 w-4" /></Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 10: Finalize PO */}
              {step === 10 && (
                <motion.div key="step10-po" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Bill No</Label>
                      <Input value={finalBillNo} onChange={(e) => setFinalBillNo(e.target.value)} />
                    </div>
                    <div>
                      <Label>Bill Date</Label>
                      <Input type="date" value={finalBillDate} onChange={(e) => setFinalBillDate(e.target.value)} />
                    </div>
                    <div>
                      <Label>Due Date</Label>
                      <Input type="date" value={finalDueDate} onChange={(e) => setFinalDueDate(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Customer Name</Label>
                      <Input value={finalCustomerName} onChange={(e) => setFinalCustomerName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Shop Details</Label>
                      <Input value={finalShopDetails} onChange={(e) => setFinalShopDetails(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <Label>Terms & Conditions</Label>
                    <Input value={finalTerms} onChange={(e) => setFinalTerms(e.target.value)} />
                  </div>

                  <div id="po-final-pdf" style={{ width: "210mm", minHeight: "297mm", padding: "20mm", background: "#fff", color: "#000", fontFamily: "Arial", fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <img src={ctintLogo} alt="Concept Trunk Interiors" style={{ height: 60 }} />
                      <div style={{ textAlign: "right" }}>
                        <h2 style={{ margin: 0 }}>PURCHASE ORDER</h2>
                        <div>Bill No: {finalBillNo || "-"}</div>
                      </div>
                    </div>

                    <hr style={{ margin: "10px 0" }} />

                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                      <div style={{ width: "55%", lineHeight: 1.5 }}>
                        <strong>Concept Trunk Interiors</strong><br />
                        12/36A, Indira Nagar<br />
                        Medavakkam<br />
                        Chennai – 600100<br />
                        GSTIN: 33ASOPS5560M1Z1
                        <br /><br />
                        <strong>Bill From</strong><br />
                        <pre style={{ margin: 0, fontFamily: "Arial", whiteSpace: "pre-wrap" }}>{finalShopDetails}</pre>
                      </div>

                      <div style={{ width: "40%", lineHeight: 1.6 }}>
                        <div><strong>Bill Date</strong> : {finalBillDate}</div>
                        <div><strong>Due Date</strong> : {finalDueDate}</div>
                        <div style={{ marginTop: 6 }}><strong>Terms</strong> : {finalTerms}</div>
                        <div style={{ marginTop: 6 }}><strong>Customer Name</strong> : {finalCustomerName || "-"}</div>
                      </div>
                    </div>

                    <table style={{ width: "100%", marginTop: 20, borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {["S.No", "Item", "Description", "Qty", "Rate", "Supplier", "Amount"].map((h) => (
                            <th key={h} style={{ border: "1px solid #000", padding: 6, background: "#000", color: "#fff", fontSize: 11 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {materials.map((m: any, i: number) => {
                          const rowId = (m as any).rowId || `${(m as any).batchId || ""}-${m.id}`;
                          const qty = Number(currentEditableBag[rowId]?.quantity ?? currentEditableBag[m.id]?.quantity ?? m.quantity ?? 0);
                          const sr = Number(currentEditableBag[rowId]?.supplyRate ?? currentEditableBag[m.id]?.supplyRate ?? m.supplyRate ?? m.rate ?? 0);
                          const ir = Number(currentEditableBag[rowId]?.installRate ?? currentEditableBag[m.id]?.installRate ?? m.installRate ?? 0);
                          const amt = qty * (sr + ir);
                          return (
                            <tr key={rowId}>
                              <td style={{ border: "1px solid #000", padding: 6 }}>{i + 1}</td>
                              <td style={{ border: "1px solid #000", padding: 6 }}>{m.name}</td>
                              <td style={{ border: "1px solid #000", padding: 6 }}>{materialDescriptions[rowId] || m.name || "-"}</td>
                              <td style={{ border: "1px solid #000", padding: 6 }}>{qty}</td>
                              <td style={{ border: "1px solid #000", padding: 6 }}>{(sr + ir).toFixed(2)}</td>
                              <td style={{ border: "1px solid #000", padding: 6 }}>{m.shopName}</td>
                              <td style={{ border: "1px solid #000", padding: 6, textAlign: "right" }}>{amt.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                      <table style={{ width: 300 }}>
                        <tbody>
                          <tr><td>Sub Total</td><td style={{ textAlign: "right" }}>{subTotal.toFixed(2)}</td></tr>
                          <tr><td>SGST 9%</td><td style={{ textAlign: "right" }}>{sgst.toFixed(2)}</td></tr>
                          <tr><td>CGST 9%</td><td style={{ textAlign: "right" }}>{cgst.toFixed(2)}</td></tr>
                          <tr><td>Round Off</td><td style={{ textAlign: "right" }}>{roundOff.toFixed(2)}</td></tr>
                          <tr><td><strong>Total</strong></td><td style={{ textAlign: "right" }}><strong>₹{grandTotal.toFixed(2)}</strong></td></tr>
                        </tbody>
                      </table>
                    </div>

                    <div style={{ marginTop: 50 }}>
                      <div style={{ width: 200, borderTop: "1px solid #000" }} />
                      <div>Authorized Signature</div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button onClick={() => setStep(9)} variant="outline">Back</Button>
                    <Button onClick={handleExportFinalPO}>Export PDF</Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 11: Finalize BOQ (Grouped lines) */}
              {step === 11 && (
                <motion.div key="step11-finalize" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <img src={ctintLogo} alt="logo" style={{ height: 56 }} />
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>CONCEPT TRUNK INTERIORS</h1>
                      <div style={{ fontSize: 12, color: "#555" }}>BILL OF QUANTITIES (BOQ)</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12 }}>{finalBillDate}</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto border rounded-lg p-2">
                    <table className="min-w-full border-collapse text-sm w-full">
                      <thead>
                        <tr style={{ background: "#f3f4f6" }}>
                          <th rowSpan={2} className="border px-2 py-2">
                            <Checkbox
                              id="select-all-groups"
                              checked={(() => {
                                const ids = (displayMaterials || []).map((m: any) => m.id);
                                return ids.length > 0 && ids.every((id) => selectedGroupIds.includes(id));
                              })()}
                              onCheckedChange={(v) => {
                                if (v) setSelectedGroupIds((displayMaterials || []).map((m: any) => m.id));
                                else setSelectedGroupIds([]);
                              }}
                            />
                          </th>
                          <th rowSpan={2} className="border px-2 py-2">S.No</th>
                          <th rowSpan={2} className="border px-2 py-2">Item</th>
                          <th rowSpan={2} className="border px-2 py-2">Location</th>
                          <th rowSpan={2} className="border px-2 py-2">Description</th>
                          <th rowSpan={2} className="border px-2 py-2">Unit</th>
                          <th rowSpan={2} className="border px-2 py-2">Qty</th>
                          <th colSpan={2} className="border px-2 py-2 text-center">Rate</th>
                          <th colSpan={2} className="border px-2 py-2 text-center">Amount</th>
                        </tr>
                        <tr style={{ background: "#f9fafb" }}>
                          <th className="border px-2 py-1 text-center">Supply</th>
                          <th className="border px-2 py-1 text-center">Installation</th>
                          <th className="border px-2 py-1 text-center">Supply</th>
                          <th className="border px-2 py-1 text-center">Installation</th>
                        </tr>
                      </thead>

                      <tbody>
                        {(displayMaterials || []).map((m: any, i: number) => {
                          const supplyRate = Number(step11SupplyRates[m.id] ?? m.supplyRate ?? m.rate ?? 0);
                          const installRate = Number(step11InstallRates[m.id] ?? m.installRate ?? 0);
                          const qty = Number(materialQtys[m.id] ?? (m.quantity || 0));
                          const supplyAmt = qty * supplyRate;
                          const installAmt = qty * installRate;

                          return (
                            <tr key={m.id}>
                              <td className="border px-2 py-1 text-center">
                                <Checkbox checked={selectedGroupIds.includes(m.id)} onCheckedChange={() => {
                                  setSelectedGroupIds(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id]);
                                }} />
                              </td>
                              <td className="border px-2 py-1 text-center">{i + 1}</td>
                              <td className="border px-2 py-1">{m.name}</td>
                              <td className="border px-2 py-1 text-center">
                                <Input value={materialLocations[m.id] ?? m.location ?? ""} onChange={(e) => setMaterialLocations(prev => ({ ...prev, [m.id]: e.target.value }))} placeholder="Location" className="w-32 mx-auto" />
                              </td>
                              <td className="border px-2 py-1" style={{ maxWidth: 650, wordBreak: "break-word" }}>
                                <textarea value={materialDescriptions[m.id] ?? (m.description ?? "")} onChange={(e) => setMaterialDescriptions(prev => ({ ...prev, [m.id]: e.target.value }))} placeholder="Group description" className="w-full min-h-20 p-2 rounded border" />
                              </td>
                              <td className="border px-2 py-1 text-center">
                                <Input value={materialUnits[m.id] ?? m.unit ?? "pcs"} onChange={(e) => setMaterialUnits(prev => ({ ...prev, [m.id]: e.target.value }))} placeholder="Unit" className="w-20 mx-auto" />
                              </td>
                              <td className="border px-2 py-1 text-center">
                                <Input type="number" value={qty} onChange={(e) => setMaterialQtys(prev => ({ ...prev, [m.id]: Number(e.target.value || 0) }))} className="w-20 mx-auto" />
                              </td>
                              <td className="border px-2 py-1 text-right">
                                <Input type="number" value={supplyRate} onChange={(e) => setStep11SupplyRates(prev => ({ ...prev, [m.id]: Number(e.target.value || 0) }))} className="w-28 mx-auto" />
                              </td>
                              <td className="border px-2 py-1 text-right">
                                <Input type="number" value={installRate} onChange={(e) => setStep11InstallRates(prev => ({ ...prev, [m.id]: Number(e.target.value || 0) }))} className="w-28 mx-auto" />
                              </td>
                              <td className="border px-2 py-1 text-right font-medium">₹{supplyAmt.toFixed(2)}</td>
                              <td className="border px-2 py-1 text-right font-medium">₹{installAmt.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>

                      <tfoot>
                        <tr style={{ borderTop: "2px solid #000" }}>
                          <td className="border px-2 py-1 text-right" colSpan={10}><strong>Supply Subtotal</strong></td>
                          <td className="border px-2 py-1 text-right font-medium">₹{displaySupplySubtotal.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="border px-2 py-1 text-right" colSpan={10}><strong>Grand Total</strong></td>
                          <td className="border px-2 py-1 text-right font-medium">₹{displayGrandTotal.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setStep(9)}>Back</Button>
                    <Button onClick={() => { setQaSelectedIds(selectedGroupIds); setStep(12); }} disabled={selectedGroupIds.length === 0}>Create BOQ</Button>
                    <Button onClick={handleExportExcelStep11}>Export Excel</Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 12: QA BOQ */}
              {step === 12 && (
                <motion.div key="step12-qa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <img src={ctintLogo} alt="logo" style={{ height: 56 }} />
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>CONCEPT TRUNK INTERIORS</h1>
                      <div style={{ fontSize: 12, color: "#555" }}>QA BILL OF QUANTITIES (BOQ)</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12 }}>{finalBillDate}</div>
                    </div>
                  </div>

                  {(!qaMaterials || qaMaterials.length === 0) ? (
                    <div className="text-center py-8">
                      <p>No QA rows selected. Select rows in Step 11 first.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border rounded-lg p-2">
                      <table className="min-w-full border-collapse text-sm w-full">
                        <thead>
                          <tr style={{ background: "#f3f4f6" }}>
                            <th className="border px-2 py-2">S.No</th>
                            <th className="border px-2 py-2">Item</th>
                            <th className="border px-2 py-2">Location</th>
                            <th className="border px-2 py-2">Description</th>
                            <th className="border px-2 py-2">Unit</th>
                            <th className="border px-2 py-2">Qty</th>
                            <th colSpan={2} className="border px-2 py-2 text-center">Rate</th>
                            <th colSpan={2} className="border px-2 py-2 text-center">Amount</th>
                          </tr>
                          <tr style={{ background: "#f9fafb" }}>
                            <th className="border px-2 py-1"></th>
                            <th className="border px-2 py-1"></th>
                            <th className="border px-2 py-1"></th>
                            <th className="border px-2 py-1"></th>
                            <th className="border px-2 py-1"></th>
                            <th className="border px-2 py-1"></th>
                            <th className="border px-2 py-1 text-center">Supply</th>
                            <th className="border px-2 py-1 text-center">Installation</th>
                            <th className="border px-2 py-1 text-center">Supply</th>
                            <th className="border px-2 py-1 text-center">Installation</th>
                          </tr>
                        </thead>

                        <tbody>
                          {qaMaterials.map((m: any, i: number) => {
                            const supplyRate = Number(step11SupplyRates[m.id] ?? m.supplyRate ?? m.rate ?? 0);
                            const installRate = Number(step11InstallRates[m.id] ?? m.installRate ?? 0);
                            const qty = Number(materialQtys[m.id] ?? (m.quantity || 0));
                            const supplyAmt = qty * supplyRate;
                            const installAmt = qty * installRate;
                            const locVal = materialLocations[m.id] ?? m.location ?? "";
                            const descVal = materialDescriptions[m.id] ?? m.description ?? "";
                            return (
                              <tr key={m.id}>
                                <td className="border px-2 py-1 text-center">{i + 1}</td>
                                <td className="border px-2 py-1">{m.name}</td>
                                <td className="border px-2 py-1 text-center"><div className="text-sm">{locVal || "—"}</div></td>
                                <td className="border px-2 py-1" style={{ maxWidth: 650, wordBreak: "break-word" }}><div className="text-sm whitespace-pre-wrap">{descVal || "—"}</div></td>
                                <td className="border px-2 py-1 text-center">{materialUnits[m.id] ?? m.unit}</td>
                                <td className="border px-2 py-1 text-center">{qty}</td>
                                <td className="border px-2 py-1 text-right">₹{supplyRate.toFixed(2)}</td>
                                <td className="border px-2 py-1 text-right">₹{installRate.toFixed(2)}</td>
                                <td className="border px-2 py-1 text-right font-medium">₹{supplyAmt.toFixed(2)}</td>
                                <td className="border px-2 py-1 text-right font-medium">₹{installAmt.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>

                        <tfoot>
                          <tr>
                            <td className="border px-2 py-1 text-right" colSpan={9}><strong>Subtotal</strong></td>
                            <td className="border px-2 py-1 text-right font-medium">₹{qaSupplySubtotal.toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setStep(11)}>Back</Button>
                    <Button onClick={handleExportExcelStep11}>Export Excel</Button>
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
