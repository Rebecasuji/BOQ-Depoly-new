import React, { useEffect, useState, useRef } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import VersionHistory from "@/components/VersionHistory"; // Not found
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import apiFetch from "@/lib/api";
import { computeBoq, UnitType } from "@/lib/boqCalc";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Trash2, Copy, GripVertical, GripHorizontal } from "lucide-react";

type Project = {
  id: string;
  name: string;
  client: string;
  budget: string;
  location?: string;
  status?: string;
};

type BOMVersion = {
  id: string;
  project_id: string;
  version_number: number;
  status: "draft" | "submitted";
  created_at: string;
  updated_at: string;
  project_name?: string;
  project_client?: string;
  project_location?: string;
};

type BOMItem = {
  id: string;
  estimator: string;
  session_id: string;
  table_data: any;
  created_at: string;
};

type Product = {
  id: string;
  name: string;
  code: string;
  category?: string;
  subcategory?: string;
  description?: string;
  category_name?: string;
  subcategory_name?: string;
};

type Step11Item = {
  id?: string;
  s_no?: number;
  bill_no?: string;
  estimator?: string;
  group_id?: string;
  title?: string;
  description?: string;
  unit?: string;
  qty?: number;
  supply_rate?: number;
  install_rate?: number;
  [key: string]: any;
};

export default function FinalizeBoq() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [boqItems, setBoqItems] = useState<BOMItem[]>([]);
  const [versions, setVersions] = useState<BOMVersion[]>([]);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [budget, setBudget] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null,
  );
  const [showFinalizedPicker, setShowFinalizedPicker] = useState(false);
  const [finalizedItems, setFinalizedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Per-product custom columns: { [boqItemId]: { name: string, isTotal: boolean }[] }
  const [customColumns, setCustomColumns] = useState<{ [id: string]: { name: string, isTotal: boolean }[] }>({});
  // Per-product custom column cell values: { [boqItemId]: { [rowIdx]: { [colName]: string } } }
  const [customColumnValues, setCustomColumnValues] = useState<{ [id: string]: { [rowIdx: number]: { [col: string]: string } } }>({});
  // Selected product IDs for bulk delete
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  // Manual description per boqItem
  const [productDescriptions, setProductDescriptions] = useState<{ [id: string]: string }>({});
  // Which product is currently being saved
  const [savingLayoutId, setSavingLayoutId] = useState<string | null>(null);

  const allCols = React.useMemo(() => {
    const cols: { name: string, isTotal: boolean, isPercentage?: boolean, percentageValue?: number, baseValue?: number, baseSource?: string }[] = [];
    boqItems.forEach(item => {
      (customColumns[item.id] || []).forEach(col => {
        if (!cols.find(c => c.name === col.name)) cols.push(col);
      });
    });
    return cols;
  }, [boqItems, customColumns]);

  const handleColumnReorder = async (newOrder: typeof allCols) => {
    // Optimistically update local state for all items
    const nextColsMap: any = {};
    boqItems.forEach(item => {
      const itemCols = customColumns[item.id] || [];
      // align this item's columns to the new global sequence
      const sorted = newOrder
        .map(oc => itemCols.find(ic => ic.name === oc.name))
        .filter(Boolean);
      nextColsMap[item.id] = sorted;
    });

    setCustomColumns(prev => ({ ...prev, ...nextColsMap }));

    try {
      // Persist to each item in the version
      const updates = boqItems.map(item => saveItemLayout(item.id, nextColsMap[item.id]));
      await Promise.all(updates);
      toast({ title: "Order Saved", description: "Column sequence updated." });
    } catch (e) {
      console.error("Column sort failed:", e);
      toast({ title: "Error", description: "Failed to save column order", variant: "destructive" });
    }
  };

  const getItemTotal = (boqItem: BOMItem) => {
    let td = boqItem.table_data || {};
    if (typeof td === 'string') try { td = JSON.parse(td); } catch { td = {}; }
    let total = 0;
    if (td.materialLines && td.targetRequiredQty !== undefined) {
      total = computeBoq(td.configBasis, td.materialLines, td.targetRequiredQty).grandTotal;
    } else {
      const items = Array.isArray(td.step11_items) ? td.step11_items : [];
      total = items.reduce((s: number, it: any) =>
        s + (it.qty || 0) * ((it.supply_rate || 0) + (it.install_rate || 0)), 0);
    }
    return total;
  };

  const [editedFields, setEditedFields] = useState<{
    [key: string]: {
      description?: string;
      unit?: string;
      qty?: number;
      supply_rate?: number;
      install_rate?: number;
    };
  }>({});
  // Keep a ref in sync to avoid state-update races when user types and clicks Save quickly.
  const editedFieldsRef = useRef(editedFields);
  useEffect(() => {
    editedFieldsRef.current = editedFields;
  }, [editedFields]);

  // Load projects from DB on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await apiFetch("/api/boq-projects", {
          headers: {},
        });
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
        }
      } catch (err) {
        console.error("Failed to load projects:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  // Load versions when project is selected
  useEffect(() => {
    if (!selectedProjectId) {
      setVersions([]);
      setSelectedVersionId(null);
      setBoqItems([]);
      return;
    }

    const loadVersions = async () => {
      try {
        const response = await apiFetch(
          `/api/boq-versions/${encodeURIComponent(selectedProjectId)}`,
          { headers: {} },
        );
        if (response.ok) {
          const data = await response.json();
          const versionList = data.versions || [];
          setVersions(versionList);

          // If we already have a selectedVersionId and it's still present, keep it.
          if (
            selectedVersionId &&
            versionList.some((v: BOMVersion) => v.id === selectedVersionId)
          ) {
            // keep current selection
          } else {
            // Auto-select first draft version, or first version
            const draftVersion = versionList.find(
              (v: BOMVersion) => v.status === "draft",
            );
            if (draftVersion) {
              setSelectedVersionId(draftVersion.id);
            } else if (versionList.length > 0) {
              setSelectedVersionId(versionList[0].id);
            } else {
              setSelectedVersionId(null);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load versions:", err);
      }
    };

    loadVersions();
  }, [selectedProjectId]);

  // Load BOM items for selected version
  useEffect(() => {
    if (!selectedVersionId) {
      setBoqItems([]);
      setEditedFields({});
      editedFieldsRef.current = {};
      return;
    }

    const loadBoqItemsAndEdits = async () => {
      try {
        // Helper to safely parse JSON responses and log non-JSON bodies
        const safeParseJson = async (res: Response) => {
          const ct = (res.headers.get("content-type") || "").toLowerCase();
          const text = await res.text();

          // Allow empty/no-content responses (204) — treat as empty object
          if (res.status === 204 || text.trim() === "") {
            return {};
          }

          // If Content-Type explicitly says JSON, parse it
          if (ct.includes("application/json")) {
            try {
              return JSON.parse(text);
            } catch (e) {
              console.error("safeParseJson: JSON parse failed", { url: res.url, status: res.status, bodySnippet: text.slice(0, 300), error: e });
              throw new Error("Invalid JSON response from server");
            }
          }

          // If Content-Type is missing or not JSON but body *looks like* JSON, try parsing
          const trimmed = text.trim();
          if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            try {
              return JSON.parse(trimmed);
            } catch (e) {
              console.error("safeParseJson: body looks like JSON but parse failed", { url: res.url, status: res.status, bodySnippet: trimmed.slice(0, 300), error: e });
              throw new Error("Invalid JSON response from server");
            }
          }

          // Helpful debug when server returns HTML (Vite index.html) or other unexpected body
          console.error(
            "safeParseJson: server returned non-JSON response",
            { url: res.url, status: res.status, contentType: ct, bodySnippet: text.slice(0, 200) },
          );
          const hint = trimmed.startsWith("<!DOCTYPE html")
            ? "Looks like the request hit the frontend dev server (index.html) instead of the backend API. Check VITE_API_BASE_URL and dev server ports."
            : undefined;
          const errMsg = `Server returned non-JSON response (status=${res.status})${hint ? ' - ' + hint : ''}`;
          throw new Error(errMsg);
        };

        // Load BOM items
        const response = await apiFetch(
          `/api/boq-items/version/${encodeURIComponent(selectedVersionId)}`,
          { headers: {} },
        );
        if (response.ok) {
          try {
            const data = await safeParseJson(response as unknown as Response);
            const items: BOMItem[] = data.items || [];
            setBoqItems(items);

            // --- Restore finalize layout from saved table_data ---
            const restoredCols: { [id: string]: { name: string, isTotal: boolean }[] } = {};
            const restoredVals: { [id: string]: { [rowIdx: number]: { [col: string]: string } } } = {};
            const restoredDescs: { [id: string]: string } = {};
            for (const item of items) {
              let td = item.table_data || {};
              if (typeof td === "string") try { td = JSON.parse(td); } catch { td = {}; }
              if (Array.isArray(td.finalize_columns) && td.finalize_columns.length > 0) {
                // Backward compatibility: convert string arrays to objects
                restoredCols[item.id] = td.finalize_columns.map((c: any) =>
                  typeof c === "string" ? { name: c, isTotal: false } : c
                );
              }
              if (td.finalize_column_values && typeof td.finalize_column_values === "object") {
                restoredVals[item.id] = td.finalize_column_values;
              }
              if (typeof td.finalize_description === "string") {
                restoredDescs[item.id] = td.finalize_description;
              }
            }
            if (Object.keys(restoredCols).length > 0) setCustomColumns(restoredCols);
            if (Object.keys(restoredVals).length > 0) setCustomColumnValues(restoredVals);
            if (Object.keys(restoredDescs).length > 0) setProductDescriptions(restoredDescs);
          } catch (e) {
            toast({ title: "Error", description: "Failed to parse BOM items response", variant: "destructive" });
            console.error("BOM items parse error:", e);
          }
        } else {
          const body = await response.text();
          console.error("Failed to fetch BOM items:", response.status, body);
          toast({ title: "Error", description: `Failed to load BOM items (${response.status})`, variant: "destructive" });
        }
      } catch (err) {
        console.error("Failed to load BOM items:", err);
        toast({ title: "Error", description: "Failed to load BOM items", variant: "destructive" });
      }
    };

    loadBoqItemsAndEdits();
  }, [selectedVersionId]);

  // If URL contains ?project=, auto-select that project
  // Only auto-select a project from the URL if it exists in the loaded projects.
  useEffect(() => {
    try {
      const qs =
        typeof location === "string" ? location.split("?")[1] || "" : "";
      const params = new URLSearchParams(qs);
      const projectParam = params.get("project");
      if (projectParam && projectParam !== selectedProjectId) {
        const exists = projects.find((p) => p.id === projectParam);
        if (exists) setSelectedProjectId(projectParam);
      }
    } catch (e) {
      // ignore
    }
  }, [location, projects]);

  const addProject = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiFetch("/api/boq-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          client: client.trim(),
          budget: budget.trim(),
          location: projectLocation.trim(),
        }),
      });

      if (response.ok) {
        const newProject = await response.json();
        setProjects((prev) => [newProject, ...prev]);
        setName("");
        setClient("");
        setBudget("");
        setProjectLocation("");
        setSelectedProjectId(newProject.id);
        toast({
          title: "Success",
          description: "Project created",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create project",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Failed to create project:", err);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    }
  };

  const handleAddFinalized = async () => {
    if (!selectedProjectId) return;
    try {
      const response = await apiFetch("/api/boq-items/finalized", { headers: {} });
      if (response.ok) {
        const data = await response.json();
        setFinalizedItems(data.items || []);
        setShowFinalizedPicker(true);
      } else {
        toast({ title: "Error", description: "Failed to load finalized items", variant: "destructive" });
      }
    } catch (e) {
      console.error("Failed to load finalized items", e);
      toast({ title: "Error", description: "Failed to load finalized items", variant: "destructive" });
    }
  };

  const handleSelectFinalizedItem = async (originalItem: any) => {
    if (!selectedProjectId || !selectedVersionId) return;

    try {
      // Clone the item
      const tableData = typeof originalItem.table_data === 'string'
        ? JSON.parse(originalItem.table_data)
        : originalItem.table_data;

      const response = await apiFetch("/api/boq-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: selectedProjectId,
          version_id: selectedVersionId,
          estimator: originalItem.estimator,
          table_data: tableData, // Copy exact data including is_finalized flag
        }),
      });

      if (response.ok) {
        const newItem = await response.json();
        setBoqItems(prev => [...prev, newItem]);
        setShowFinalizedPicker(false);
        toast({ title: "Success", description: "Added finalized item" });
      } else {
        throw new Error("Failed to add item");
      }
    } catch (e) {
      console.error("Failed to add finalized item", e);
      toast({ title: "Error", description: "Failed to add item", variant: "destructive" });
    }
  };



  const updateEditedField = (itemKey: string, field: string, value: any) => {
    setEditedFields((prev) => {
      const next = {
        ...prev,
        [itemKey]: {
          ...prev[itemKey],
          [field]: value,
        },
      };
      // keep ref in sync immediately to avoid races when Save is clicked right away
      editedFieldsRef.current = next;
      return next;
    });
  };

  const saveItemLayout = async (boqItemId: string, updatedCols?: any[], updatedVals?: any, updatedDesc?: string) => {
    try {
      const boqItem = boqItems.find(i => i.id === boqItemId);
      if (!boqItem) return;

      let existingTd = boqItem.table_data || {};
      if (typeof existingTd === "string") {
        try { existingTd = JSON.parse(existingTd); } catch { existingTd = {}; }
      }

      const updatedTd = {
        ...existingTd,
        finalize_columns: updatedCols !== undefined ? updatedCols : (customColumns[boqItemId] || []),
        finalize_column_values: updatedVals !== undefined ? updatedVals : (customColumnValues[boqItemId] || {}),
        finalize_description: updatedDesc !== undefined ? updatedDesc : (productDescriptions[boqItemId] ?? ""),
      };

      const resp = await apiFetch(`/api/boq-items/${boqItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_data: updatedTd }),
      });

      if (resp.ok) {
        setBoqItems(prev => prev.map(i =>
          i.id === boqItemId ? { ...i, table_data: updatedTd } : i
        ));
      } else {
        throw new Error("Save failed");
      }
    } catch (e) {
      console.error("Failed to save item layout:", e);
      toast({ title: "Error", description: "Failed to persist changes to database", variant: "destructive" });
    }
  };

  const handleDeleteColumn = async (boqItemId: string, colIdx: number) => {
    const colName = customColumns[boqItemId][colIdx].name;
    if (!confirm(`Are you sure you want to delete the column "${colName}"?`)) return;

    const nextCols = [...(customColumns[boqItemId] || [])];
    nextCols.splice(colIdx, 1);

    const itemValues = { ...(customColumnValues[boqItemId] || {}) };
    Object.keys(itemValues).forEach((rowIdxStr) => {
      const rowIdx = parseInt(rowIdxStr);
      const rowVals = { ...itemValues[rowIdx] };
      delete rowVals[colName];
      itemValues[rowIdx] = rowVals;
    });

    setCustomColumns((prev) => ({ ...prev, [boqItemId]: nextCols }));
    setCustomColumnValues((prev) => ({ ...prev, [boqItemId]: itemValues }));

    await saveItemLayout(boqItemId, nextCols, itemValues);
    toast({ title: "Column Deleted", description: `Column "${colName}" removed and saved.` });
  };

  const handleCloneColumn = async (boqItemId: string, colIdx: number) => {
    const originalCol = customColumns[boqItemId][colIdx];
    const newColName = `${originalCol.name} (Copy)`;

    const nextCols = [...(customColumns[boqItemId] || []), { ...originalCol, name: newColName }];

    const itemValues = { ...(customColumnValues[boqItemId] || {}) };
    Object.keys(itemValues).forEach((rowIdxStr) => {
      const rowIdx = parseInt(rowIdxStr);
      const rowVals = { ...(itemValues[rowIdx] || {}) };
      if (rowVals[originalCol.name] !== undefined) {
        rowVals[newColName] = rowVals[originalCol.name];
      }
      itemValues[rowIdx] = rowVals;
    });

    setCustomColumns((prev) => ({ ...prev, [boqItemId]: nextCols }));
    setCustomColumnValues((prev) => ({ ...prev, [boqItemId]: itemValues }));

    await saveItemLayout(boqItemId, nextCols, itemValues);
    toast({ title: "Column Cloned", description: `Column "${originalCol.name}" cloned to "${newColName}" and saved.` });
  };

  const handleGlobalCalculation = async (colName: string, base: number, pct: number, baseSource: string = "manual") => {
    const nextColsMap: any = {};
    const nextValsMap: any = {};

    boqItems.forEach(item => {
      let rowBase = base;

      if (baseSource !== "manual") {
        if (baseSource === "Total Value (₹)") {
          let td = item.table_data || {};
          if (typeof td === "string") try { td = JSON.parse(td); } catch { td = {}; }
          const step11Items: Step11Item[] = Array.isArray(td.step11_items) ? td.step11_items : [];

          if (td.materialLines && td.targetRequiredQty !== undefined) {
            rowBase = computeBoq(td.configBasis, td.materialLines, td.targetRequiredQty).grandTotal;
          } else {
            rowBase = step11Items.reduce((s: number, it: any) =>
              s + (it.qty || 0) * ((it.supply_rate || 0) + (it.install_rate || 0)), 0);
          }
        } else {
          // Look up value from another custom column in the same row
          const valStr = customColumnValues[item.id]?.[0]?.[baseSource] || "0";
          rowBase = parseFloat(valStr) || 0;
        }
      }

      const itemCols = (customColumns[item.id] || []).map(c =>
        c.name === colName ? { ...c, baseValue: base, percentageValue: pct, baseSource } : c
      );
      nextColsMap[item.id] = itemCols;

      const calculated = (pct / 100) * rowBase;

      const itemVals = { ...(customColumnValues[item.id] || {}) };
      itemVals[0] = { ...(itemVals[0] || {}), [colName]: calculated.toFixed(2) };
      nextValsMap[item.id] = itemVals;
    });

    setCustomColumns(prev => ({ ...prev, ...nextColsMap }));
    setCustomColumnValues(prev => ({ ...prev, ...nextValsMap }));

    await Promise.all(boqItems.map(item =>
      saveItemLayout(item.id, nextColsMap[item.id], nextValsMap[item.id])
    ));
  };

  const getEditedValue = (
    itemKey: string,
    field: string,
    originalValue: any,
  ) => {
    return (
      editedFields[itemKey]?.[
      field as keyof (typeof editedFields)[keyof typeof editedFields]
      ] ?? originalValue
    );
  };

  const handleSaveProject = async () => {
    if (!selectedVersionId) return;
    console.log("[FinalizeBoq] handleSaveProject START. editedFields (ref snapshot):", JSON.stringify(editedFieldsRef.current));

    try {
      // Permanently save the current edited fields to the database (use ref to avoid race)
      const payload = editedFieldsRef.current || {};
      const response = await apiFetch(
        `/api/boq-versions/${encodeURIComponent(selectedVersionId)}/save-edits`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ editedFields: payload }),
        },
      );

      console.log("[FinalizeBoq] Save API response status:", response.status);

      if (response.ok) {
        // Prefer authoritative data from server when available (server will return
        // `updatedItems`). If not present, fall back to optimistic merge + reload.
        let saveResp: any = null;
        try {
          saveResp = await response.json();
        } catch (e) {
          // ignore non-JSON
        }

        if (saveResp?.updatedItems && saveResp.updatedItems.length > 0) {
          // Merge server-returned items into local state
          setBoqItems((prev) => {
            const byId = new Map(prev.map((i) => [i.id, i]));
            for (const up of saveResp.updatedItems) {
              const td = typeof up.table_data === "string" ? JSON.parse(up.table_data) : up.table_data;
              const existing = byId.get(up.id) || {};
              byId.set(up.id, { ...existing, ...up, table_data: td });
            }
            return prev.map((p) => {
              const updated = byId.get(p.id);
              return updated ? updated : p;
            });
          });
          setEditedFields({});
          editedFieldsRef.current = {};
        } else {
          // Optimistic merge (UI stays consistent immediately)
          setBoqItems((prev) =>
            prev.map((item) => {
              const keys = Object.keys(editedFields).filter((k) => k.startsWith(`${item.id}-`));
              if (keys.length === 0) return item;

              const tableData =
                typeof item.table_data === "string"
                  ? JSON.parse(item.table_data)
                  : { ...(item.table_data || {}) };
              const step11_items = Array.isArray(tableData.step11_items)
                ? [...tableData.step11_items]
                : [];

              for (const key of keys) {
                const idxStr = key.substring(key.lastIndexOf("-") + 1);
                const idx = parseInt(idxStr, 10);
                const fields = editedFields[key] || {};
                if (step11_items[idx]) {
                  step11_items[idx] = { ...step11_items[idx], ...fields };
                }
              }

              return { ...item, table_data: { ...tableData, step11_items } };
            }),
          );

          // Try to reload authoritative state from server. If reload fails we keep optimistic state.
          try {
            const loadResponse = await apiFetch(
              `/api/boq-items/version/${encodeURIComponent(selectedVersionId)}`,
              { headers: {} },
            );

            if (loadResponse.ok) {
              const data = await loadResponse.json();
              setBoqItems(data.items || []);
              setEditedFields({});
              editedFieldsRef.current = {};
            } else {
              console.warn("[FinalizeBoq] Failed to reload BOM items after save; keeping optimistic local state");
            }
          } catch (loadErr) {
            console.error("[FinalizeBoq] Failed to reload BOM items after save:", loadErr);
          }
        }

        toast({
          title: "Success",
          description: "Draft saved",
        });
      } else {
        const errText = await response.text().catch(() => null);
        throw new Error("Failed to save edits" + (errText ? `: ${errText}` : ""));
      }
    } catch (err) {
      console.error("Failed to save project:", err);
      toast({
        title: "Error",
        description: "Failed to save BOM version",
        variant: "destructive",
      });
    }
  };

  const handleSubmitVersion = async () => {
    if (!selectedVersionId) return;
    try {
      await apiFetch(`/api/boq-versions/${selectedVersionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "submitted" }),
      });

      // Reload versions
      const response = await apiFetch(
        `/api/boq-versions/${encodeURIComponent(selectedProjectId!)}`,
        { headers: {} },
      );
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
      }

      toast({
        title: "Success",
        description: "BOM version submitted and locked",
      });
    } catch (err) {
      console.error("Failed to submit version:", err);
      toast({
        title: "Error",
        description: "Failed to submit version",
        variant: "destructive",
      });
    }
  };

  const handleCreateNewVersion = async (copyFromPrevious: boolean) => {
    if (!selectedProjectId) return;

    try {
      const previousVersion = versions.length > 0 ? versions[0].id : null;

      const response = await apiFetch("/api/boq-versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: selectedProjectId,
          copy_from_version: copyFromPrevious ? previousVersion : null,
        }),
      });

      if (response.ok) {
        const newVersion = await response.json();
        setVersions((prev) => [newVersion, ...prev]);
        setSelectedVersionId(newVersion.id);

        toast({
          title: "Success",
          description: `Created Version ${newVersion.version_number}`,
        });
      }
    } catch (err) {
      console.error("Failed to create version:", err);
      toast({
        title: "Error",
        description: "Failed to create version",
        variant: "destructive",
      });
    }
  };

  const handleDownloadExcel = () => {
    if (!selectedProjectId || boqItems.length === 0) {
      toast({ title: "Info", description: "No BOM items to download", variant: "default" });
      return;
    }

    try {
      // 1. Identify all custom columns
      const allCols: { name: string, isTotal: boolean }[] = [];
      boqItems.forEach(item => {
        (customColumns[item.id] || []).forEach(col => {
          if (!allCols.find(c => c.name === col.name)) allCols.push(col);
        });
      });

      // 2. Prepare Headers
      const headers = [
        "#",
        "Product / Material",
        "Description / Location",
        "Rate / Unit",
        "Total Value (₹)",
        ...allCols.map(c => c.name)
      ];

      // 3. Prepare Rows
      const rows: string[][] = [];
      let grandTotalValue = 0;

      boqItems.forEach((boqItem, boqIdx) => {
        let tableData = boqItem.table_data || {};
        if (typeof tableData === "string") try { tableData = JSON.parse(tableData); } catch { tableData = {}; }

        const step11Items: Step11Item[] = Array.isArray(tableData.step11_items) ? tableData.step11_items : [];
        const productName = tableData.product_name || boqItem.estimator || "—";
        const category = tableData.category || "";

        // Totals
        let totalVal = 0;
        let rateSqft = 0;
        if (tableData.materialLines && tableData.targetRequiredQty !== undefined) {
          const res = computeBoq(tableData.configBasis, tableData.materialLines, tableData.targetRequiredQty);
          totalVal = res.grandTotal;
          rateSqft = tableData.targetRequiredQty > 0 ? totalVal / tableData.targetRequiredQty : 0;
        } else {
          totalVal = step11Items.reduce((s: number, it: any) =>
            s + (it.qty || 0) * ((it.supply_rate || 0) + (it.install_rate || 0)), 0);
          rateSqft = (step11Items[0]?.qty ?? 0) > 0 ? totalVal / (step11Items[0]?.qty || 1) : totalVal;
        }

        const manualDesc = productDescriptions[boqItem.id] ?? (
          tableData.subcategory || step11Items[0]?.description || category || ""
        );

        grandTotalValue += totalVal;

        // Custom column values for this row
        const customVals: string[] = [];
        let runningTotal = totalVal;
        let accumulator = 0;
        allCols.forEach(col => {
          if (col.isTotal) {
            runningTotal += accumulator;
            accumulator = 0;
            customVals.push(runningTotal.toFixed(2));
          } else {
            const val = customColumnValues[boqItem.id]?.[0]?.[col.name] || "0";
            accumulator += parseFloat(val) || 0;
            customVals.push(val);
          }
        });

        rows.push([
          (boqIdx + 1).toString(),
          productName,
          manualDesc,
          rateSqft.toFixed(2),
          totalVal.toFixed(2),
          ...customVals
        ]);
      });

      // 4. Create CSV
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => {
          const escaped = String(cell).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const filename = `${selectedProject?.name || "BOM"}_${selectedVersion ? `V${selectedVersion.version_number}` : "draft"}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: "Success", description: `Downloaded ${filename}` });
    } catch (error) {
      console.error("Excel download failed:", error);
      toast({ title: "Error", description: "Failed to download CSV", variant: "destructive" });
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedProjectId || boqItems.length === 0) {
      toast({ title: "Info", description: "No BOM items to download", variant: "default" });
      return;
    }

    try {
      // 1. Identify all custom columns
      const allCols: { name: string, isTotal: boolean }[] = [];
      boqItems.forEach(item => {
        (customColumns[item.id] || []).forEach(col => {
          if (!allCols.find(c => c.name === col.name)) allCols.push(col);
        });
      });

      // 2. Prepare Headers for PDF
      const headers = [
        "S.No",
        "Product / Material",
        "Description",
        "Rate (₹)",
        "Total (₹)",
        ...allCols.map(c => c.name)
      ];

      // 3. Prepare Body Rows
      const body: any[] = [];
      let grandTotalValue = 0;

      boqItems.forEach((boqItem, boqIdx) => {
        let tableData = boqItem.table_data || {};
        if (typeof tableData === "string") try { tableData = JSON.parse(tableData); } catch { tableData = {}; }

        const step11Items: Step11Item[] = Array.isArray(tableData.step11_items) ? tableData.step11_items : [];
        const productName = tableData.product_name || boqItem.estimator || "—";
        const category = tableData.category || "";

        // Totals
        let totalVal = 0;
        let rateSqft = 0;
        if (tableData.materialLines && tableData.targetRequiredQty !== undefined) {
          const res = computeBoq(tableData.configBasis, tableData.materialLines, tableData.targetRequiredQty);
          totalVal = res.grandTotal;
          rateSqft = tableData.targetRequiredQty > 0 ? totalVal / tableData.targetRequiredQty : 0;
        } else {
          totalVal = step11Items.reduce((s: number, it: any) =>
            s + (it.qty || 0) * ((it.supply_rate || 0) + (it.install_rate || 0)), 0);
          rateSqft = (step11Items[0]?.qty ?? 0) > 0 ? totalVal / (step11Items[0]?.qty || 1) : totalVal;
        }

        const manualDesc = productDescriptions[boqItem.id] ?? (
          tableData.subcategory || step11Items[0]?.description || category || ""
        );

        grandTotalValue += totalVal;

        // Custom column values for this row
        const customVals: string[] = [];
        let runningTotal = totalVal;
        let accumulator = 0;
        allCols.forEach(col => {
          if (col.isTotal) {
            runningTotal += accumulator;
            accumulator = 0;
            customVals.push(runningTotal.toFixed(2));
          } else {
            const val = customColumnValues[boqItem.id]?.[0]?.[col.name] || "0";
            accumulator += parseFloat(val) || 0;
            customVals.push(val);
          }
        });

        body.push([
          (boqIdx + 1).toString(),
          productName,
          manualDesc,
          rateSqft.toFixed(2),
          totalVal.toFixed(2),
          ...customVals
        ]);
      });

      // 4. Logo Fetching
      const logoPath = "/image.png";
      let logoDataUrl: string | null = null;
      try {
        const resp = await fetch(logoPath);
        const blob = await resp.blob();
        const reader = new FileReader();
        logoDataUrl = await new Promise<string | null>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn("Could not load logo for PDF header", e);
      }

      // 5. PDF Generation
      const doc = new jsPDF({ orientation: "landscape" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const headerY = 10;

      if (logoDataUrl) {
        const imgProps: any = doc.getImageProperties(logoDataUrl);
        const imgH = 24;
        const imgW = (imgProps.width / imgProps.height) * imgH;
        doc.addImage(logoDataUrl, "PNG", 10, headerY, imgW, imgH);
      }

      const metaX = pageWidth - 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const projNameStr = selectedProject?.name || "BOM";
      doc.text(projNameStr, metaX, headerY + 6, { align: "right" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Client: ${selectedProject?.client || "-"}`, metaX, headerY + 12, { align: "right" });
      doc.text(`Budget: ${selectedProject?.budget || "-"}`, metaX, headerY + 18, { align: "right" });

      // @ts-ignore - autotable types
      autoTable(doc, {
        head: [headers],
        body: body,
        startY: headerY + 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [64, 64, 64], textColor: [255, 255, 255], fontStyle: "bold" },
        theme: "grid",
      });

      const filename = `${projNameStr}_${selectedVersion ? `V${selectedVersion.version_number}` : "draft"}_BOM.pdf`;
      doc.save(filename);
      toast({ title: "Success", description: `Downloaded ${filename}` });
    } catch (err) {
      console.error("Failed to generate PDF", err);
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedVersion = versions.find((v) => v.id === selectedVersionId);
  const isVersionSubmitted = selectedVersion?.status === "submitted";

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-8">Loading projects...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Finalize BOM</h1>

        {/* Project creation moved to dedicated Create Project page */}

        {/* Select Project Section */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h2 className="text-lg font-semibold">Select Project</h2>
            <div className="flex-1">
              <Label>Projects</Label>
              <Select onValueChange={(v) => setSelectedProjectId(v || null)}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      projects.length === 0 ? "No projects" : "Select project"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem value={p.id} key={p.id}>
                      {p.name} — {p.client || "(No client)"} — {p.location || "(No location)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProject && (
              <div className="text-sm text-gray-600 space-y-1">
                <div>
                  <strong>Budget:</strong> {selectedProject.budget || "—"}
                </div>
                <div>
                  <strong>Status:</strong> {selectedProject.status || "draft"}
                </div>
              </div>
            )}

            {selectedProjectId && (
              <div className="pt-4 space-y-4">
                {/* Version Selector */}
                <div className="space-y-2">
                  <Label>BOM Versions</Label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedVersionId || ""}
                      onValueChange={setSelectedVersionId}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select version" />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map((v) => (
                          <SelectItem value={v.id} key={v.id}>
                            {v.project_name ? `[${v.project_name}] ` : ""}V
                            {v.version_number} (
                            {v.status === "submitted" ? "Locked" : "Draft"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedVersionId && (
                      <Button
                        onClick={async () => {
                          if (!selectedVersionId) return;
                          if (
                            !confirm(
                              "Delete this version and all its BOM items? This cannot be undone.",
                            )
                          )
                            return;
                          try {
                            const resp = await apiFetch(
                              `/api/boq-versions/${encodeURIComponent(selectedVersionId)}`,
                              { method: "DELETE" },
                            );
                            if (resp.ok) {
                              // Reload versions for the project
                              const r2 = await apiFetch(
                                `/api/boq-versions/${encodeURIComponent(selectedProjectId!)}`,
                                { headers: {} },
                              );
                              if (r2.ok) {
                                const data = await r2.json();
                                setVersions(data.versions || []);
                                // auto-select a draft or first version
                                const draftVersion = (data.versions || []).find(
                                  (v: any) => v.status === "draft",
                                );
                                if (draftVersion)
                                  setSelectedVersionId(draftVersion.id);
                                else if ((data.versions || []).length > 0)
                                  setSelectedVersionId(data.versions[0].id);
                                else setSelectedVersionId(null);
                                setBoqItems([]);
                                toast({
                                  title: "Deleted",
                                  description: "Version removed",
                                });
                              }
                            } else {
                              const text = await resp.text();
                              throw new Error(
                                text || "Failed to delete version",
                              );
                            }
                          } catch (e) {
                            console.error("Failed to delete version", e);
                            toast({
                              title: "Error",
                              description: "Failed to delete version",
                              variant: "destructive",
                            });
                          }
                        }}
                        variant="destructive"
                      >
                        Delete Version
                      </Button>
                    )}
                    {versions.length > 0 && (
                      <Button
                        onClick={() => {
                          const lastVersion = versions[0];
                          if (
                            confirm(
                              `Copy items from V${lastVersion.version_number}?`,
                            )
                          ) {
                            handleCreateNewVersion(true);
                          } else {
                            handleCreateNewVersion(false);
                          }
                        }}
                        variant="outline"
                      >
                        + New Version
                      </Button>
                    )}
                    {versions.length === 0 && selectedProjectId && (
                      <Button
                        onClick={() => handleCreateNewVersion(false)}
                        variant="outline"
                      >
                        Create V1
                      </Button>
                    )}
                  </div>
                  {selectedVersion && (
                    <div className="text-sm text-gray-600 space-y-1 bg-blue-50 p-3 rounded">
                      <div>
                        <strong>Project:</strong>{" "}
                        {selectedVersion.project_name || "Unknown"}
                      </div>
                      <div>
                        <strong>Version:</strong> V
                        {selectedVersion.version_number}
                      </div>
                      {selectedVersion.project_client && (
                        <div>
                          <strong>Client:</strong>{" "}
                          {selectedVersion.project_client}
                        </div>
                      )}
                      {selectedVersion.project_location && (
                        <div>
                          <strong>Location:</strong>{" "}
                          {selectedVersion.project_location}
                        </div>
                      )}
                      {isVersionSubmitted && (
                        <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
                          Submitted (Locked)
                        </span>
                      )}
                      {!isVersionSubmitted && (
                        <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                          Draft (Editable)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Add Product and Add Item buttons */}
              </div>
            )}
          </CardContent>
        </Card>
        {/* BOM Items Section — one card+table per product */}
        {selectedProjectId && (
          <div className="space-y-4">
            {/* Header + bulk actions */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">BOM Items</h2>
              {selectedProductIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isVersionSubmitted}
                  onClick={async () => {
                    if (!confirm(`Delete ${selectedProductIds.size} selected product(s)?`)) return;
                    try {
                      await Promise.all(
                        Array.from(selectedProductIds).map(id => apiFetch(`/api/boq-items/${id}`, { method: "DELETE" }))
                      );
                      setBoqItems(prev => prev.filter(i => !selectedProductIds.has(i.id)));
                      setSelectedProductIds(new Set());
                      toast({ title: "Deleted", description: `${selectedProductIds.size} product(s) removed` });
                    } catch {
                      toast({ title: "Error", description: "Failed to delete selected products", variant: "destructive" });
                    }
                  }}
                >
                  🗑 Delete Selected ({selectedProductIds.size})
                </Button>
              )}
            </div>

            {boqItems.length === 0 ? (
              <Card>
                <CardContent className="text-gray-500 text-center py-10">
                  No products found for this version. Go to Create BOM to add products.
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-gray-200 overflow-hidden shadow-sm">
                {!isVersionSubmitted && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50/80 border-b overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <span className="text-[12px] font-black uppercase tracking-widest text-gray-500 mr-2 flex-shrink-0">Unified BOM Actions:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 text-[12px] font-bold uppercase border-purple-300 text-purple-700 hover:bg-purple-100/80 hover:border-purple-400 transition-all shadow-sm"
                      onClick={async () => {
                        const colName = window.prompt("Enter new column name (adds to all products):");
                        if (!colName?.trim()) return;
                        const isPct = window.confirm("Do you want to calculate percentage for this column?");
                        const updates = boqItems.map(item => {
                          const nextCols = [...(customColumns[item.id] || []), {
                            name: colName.trim(),
                            isTotal: false,
                            isPercentage: isPct,
                            percentageValue: 0
                          }];
                          setCustomColumns(prev => ({ ...prev, [item.id]: nextCols }));
                          return saveItemLayout(item.id, nextCols);
                        });
                        await Promise.all(updates);
                        toast({ title: "Global Column Added", description: `"${colName}" added.` });
                      }}
                    >
                      + Add Global Column
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 text-[12px] font-bold uppercase border-blue-300 text-blue-700 hover:bg-blue-100/80 hover:border-blue-400 transition-all shadow-sm"
                      onClick={async () => {
                        const colName = window.prompt("Enter Global Total column name:");
                        if (!colName?.trim()) return;
                        const updates = boqItems.map(item => {
                          const nextCols = [...(customColumns[item.id] || []), { name: colName.trim(), isTotal: true }];
                          setCustomColumns(prev => ({ ...prev, [item.id]: nextCols }));
                          return saveItemLayout(item.id, nextCols);
                        });
                        await Promise.all(updates);
                        toast({ title: "Global Total Added", description: `"${colName}" added.` });
                      }}
                    >
                      + Add Global Total
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 text-[12px] font-bold uppercase border-green-300 text-green-700 hover:bg-green-100/80 hover:border-green-400 transition-all shadow-sm"
                      onClick={async () => {
                        const updates = boqItems.map(item => saveItemLayout(item.id));
                        await Promise.all(updates);
                        toast({ title: "✅ Saved All", description: "Manual descriptions and layouts saved." });
                      }}
                    >
                      💾 Save All Layouts
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 text-[12px] font-bold uppercase border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 transition-all shadow-sm"
                      disabled={selectedProductIds.size === 0}
                      onClick={async () => {
                        if (!confirm(`Delete ${selectedProductIds.size} selected products from this BOM?`)) return;
                        try {
                          const ids = Array.from(selectedProductIds);
                          await Promise.all(ids.map(id => apiFetch(`/api/boq-items/${id}`, { method: "DELETE" })));
                          setBoqItems(prev => prev.filter(item => !selectedProductIds.has(item.id)));
                          setSelectedProductIds(new Set());
                          toast({ title: "Deleted", description: `${ids.length} products removed successfully.` });
                        } catch {
                          toast({ title: "Error", description: "Failed to delete some products", variant: "destructive" });
                        }
                      }}
                    >
                      🗑 Delete Selected
                    </Button>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="border-collapse text-sm min-w-full">
                    <thead>
                      <tr className="bg-gray-100/80 border-b border-gray-200 text-[12px] font-black text-gray-700 uppercase tracking-widest shadow-sm">
                        <th className="border-r px-2 py-4 text-center w-10">
                          <GripVertical size={16} className="mx-auto text-gray-400" />
                        </th>
                        <th className="border-r px-3 py-4 text-left w-12">#</th>
                        <th className="border-r px-4 py-4 text-left min-w-[200px]">Product / Material</th>
                        <th className="border-r px-4 py-4 text-left min-w-[250px]">Description / Location</th>
                        <th className="border-r px-5 py-4 text-right w-36">Rate / Unit</th>
                        <th className="border-r px-5 py-4 text-right w-40 text-green-900 bg-green-50/50">Total Value (₹)</th>
                        <Reorder.Group
                          axis="x"
                          values={allCols}
                          onReorder={handleColumnReorder}
                          as="div"
                          style={{ display: "contents" }}
                        >
                          {allCols.map((col, idx) => (
                            <Reorder.Item
                              key={col.name}
                              value={col}
                              as="th"
                              dragListener={!isVersionSubmitted}
                              className={`border-r px-5 py-4 text-left min-w-[190px] group relative ${col.isTotal ? "text-green-900 bg-green-100/60" : "text-purple-900 bg-purple-100/60"}`}
                            >
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    {!isVersionSubmitted && <GripHorizontal size={12} className="text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0" />}
                                    <span className="truncate font-black text-[13px] tracking-tight">{col.name}</span>
                                  </div>
                                  {!isVersionSubmitted && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={async () => {
                                          if (!confirm(`Clone column "${col.name}" for ALL products?`)) return;
                                          const newColName = `${col.name} (Copy)`;
                                          const updates = boqItems.map(item => {
                                            const itemCols = customColumns[item.id] || [];
                                            const nextCols = [...itemCols, { ...col, name: newColName }];
                                            const itemValues = { ...(customColumnValues[item.id] || {}) };
                                            Object.keys(itemValues).forEach(rowIdxStr => {
                                              const rowIdx = parseInt(rowIdxStr);
                                              const rowVals = { ...(itemValues[rowIdx] || {}) };
                                              if (rowVals[col.name] !== undefined) rowVals[newColName] = rowVals[col.name];
                                              itemValues[rowIdx] = rowVals;
                                            });
                                            setCustomColumns(prev => ({ ...prev, [item.id]: nextCols }));
                                            setCustomColumnValues(prev => ({ ...prev, [item.id]: itemValues }));
                                            return saveItemLayout(item.id, nextCols, itemValues);
                                          });
                                          await Promise.all(updates);
                                          toast({ title: "Column Cloned", description: `Column "${col.name}" cloned for all products.` });
                                        }}
                                        title="Clone Column Globally"
                                        className="text-gray-400 hover:text-blue-600 transition-colors"
                                      >
                                        <Copy size={12} />
                                      </button>
                                      <button
                                        onClick={async () => {
                                          if (!confirm(`Delete column "${col.name}" from ALL products?`)) return;
                                          const updates = boqItems.map(item => {
                                            const nextCols = (customColumns[item.id] || []).filter(c => c.name !== col.name);
                                            const itemValues = { ...(customColumnValues[item.id] || {}) };
                                            Object.keys(itemValues).forEach(rowIdxStr => {
                                              const rowIdx = parseInt(rowIdxStr);
                                              const rowVals = { ...itemValues[rowIdx] };
                                              delete rowVals[col.name];
                                              itemValues[rowIdx] = rowVals;
                                            });
                                            setCustomColumns(prev => ({ ...prev, [item.id]: nextCols }));
                                            setCustomColumnValues(prev => ({ ...prev, [item.id]: itemValues }));
                                            return saveItemLayout(item.id, nextCols, itemValues);
                                          });
                                          await Promise.all(updates);
                                          toast({ title: "Column Deleted", description: `Column "${col.name}" removed from all products.` });
                                        }}
                                        title="Delete Column Globally"
                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {(col as any).isPercentage && !isVersionSubmitted && (
                                  <div className="flex items-center gap-2 mt-2 border-t border-purple-200/60 pt-2 pb-1">
                                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                                      <select
                                        className="bg-transparent text-[9px] font-black text-purple-600 uppercase tracking-tight outline-none cursor-pointer hover:bg-purple-100/50 rounded px-1 -ml-1 transition-colors w-full truncate mb-0.5"
                                        style={{ appearance: 'none' }}
                                        value={(col as any).baseSource || "manual"}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          const newSource = e.target.value;
                                          handleGlobalCalculation(col.name, (col as any).baseValue || 0, (col as any).percentageValue || 0, newSource);
                                        }}
                                      >
                                        <option value="manual">Fixed Value</option>
                                        <option value="Total Value (₹)">Total Value</option>
                                        {allCols.filter(c => c.name !== col.name).map(c => (
                                          <option key={c.name} value={c.name}>{c.name}</option>
                                        ))}
                                      </select>
                                      {((col as any).baseSource || "manual") === "manual" ? (
                                        <input
                                          type="number"
                                          placeholder="Base"
                                          className="w-full h-7 bg-white border border-purple-200 rounded px-2 text-[11px] font-bold text-gray-800 outline-none focus:ring-2 ring-purple-400/50 text-right shadow-sm transition-shadow"
                                          value={(col as any).baseValue || ""}
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={async (e) => {
                                            const newBase = parseFloat(e.target.value) || 0;
                                            const currentPct = (col as any).percentageValue || 0;
                                            handleGlobalCalculation(col.name, newBase, currentPct, "manual");
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-7 bg-purple-50 border border-purple-200 rounded px-2 text-[10px] font-bold text-purple-700 flex items-center justify-end shadow-inner truncate transition-all overflow-hidden whitespace-nowrap">
                                          {(col as any).baseSource === "Total Value (₹)" ? "Total ₹" : (col as any).baseSource}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-center justify-center pt-4">
                                      <span className="text-[12px] text-purple-500 font-black">×</span>
                                    </div>
                                    <div className="flex flex-col gap-1 w-14">
                                      <span className="text-[9px] font-black text-purple-500 uppercase tracking-tight text-center invisible leading-none">%</span>
                                      <div className="flex items-center gap-0.5 mt-0.5">
                                        <input
                                          type="number"
                                          placeholder="%"
                                          className="w-10 h-7 bg-white border border-purple-200 rounded px-1.5 text-[11px] font-bold text-purple-700 outline-none focus:ring-2 ring-purple-400/50 text-right shadow-sm transition-shadow"
                                          value={(col as any).percentageValue || ""}
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={async (e) => {
                                            const newPct = parseFloat(e.target.value) || 0;
                                            const currentBase = (col as any).baseValue || 0;
                                            const currentSource = (col as any).baseSource || "manual";
                                            handleGlobalCalculation(col.name, currentBase, newPct, currentSource);
                                          }}
                                        />
                                        <span className="text-[11px] text-purple-600 font-extrabold">%</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </Reorder.Item>
                          ))}
                        </Reorder.Group>
                      </tr>
                    </thead>
                    <Reorder.Group
                      axis="y"
                      values={boqItems}
                      onReorder={async (newItems) => {
                        setBoqItems(newItems);
                        if (isVersionSubmitted) return;

                        try {
                          const resp = await apiFetch("/api/boq-items/reorder", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ itemIds: newItems.map((i) => i.id) }),
                          });

                          if (resp.ok) {
                            toast({
                              title: "Sequence Saved",
                              description: "BOM item order has been updated.",
                            });
                          } else {
                            throw new Error("Failed to save order");
                          }
                        } catch (e) {
                          console.error("Sort order sync failed:", e);
                          toast({
                            title: "Error",
                            description: "Failed to save row order",
                            variant: "destructive",
                          });
                        }
                      }}
                      as="tbody"
                    >
                      {boqItems.map((boqItem, boqIdx) => {
                        let tableData = boqItem.table_data || {};
                        if (typeof tableData === "string") {
                          try { tableData = JSON.parse(tableData); } catch { tableData = {}; }
                        }

                        const productName = tableData.product_name || boqItem.estimator || "—";
                        const category = tableData.category || "";
                        const step11Items: Step11Item[] = Array.isArray(tableData.step11_items) ? tableData.step11_items : [];
                        const isSelected = selectedProductIds.has(boqItem.id);

                        // Compute totals
                        let total = 0;
                        let rateSqft = 0;
                        if (tableData.materialLines && tableData.targetRequiredQty !== undefined) {
                          const result = computeBoq(tableData.configBasis, tableData.materialLines, tableData.targetRequiredQty);
                          total = result.grandTotal;
                          rateSqft = tableData.targetRequiredQty > 0 ? total / tableData.targetRequiredQty : 0;
                        } else {
                          total = step11Items.reduce((s: number, it: any) =>
                            s + (it.qty || 0) * ((it.supply_rate || 0) + (it.install_rate || 0)), 0);
                          rateSqft = (step11Items[0]?.qty ?? 0) > 0 ? total / (step11Items[0]?.qty || 1) : total;
                        }

                        const manualDesc = productDescriptions[boqItem.id] ?? (
                          tableData.subcategory || step11Items[0]?.description || category || ""
                        );

                        return (
                          <Reorder.Item
                            key={boqItem.id}
                            value={boqItem}
                            as="tr"
                            className={`hover:bg-blue-50/40 cursor-default transition-colors border-b border-gray-100 ${isSelected ? "bg-blue-50/60" : "bg-white"}`}
                          >
                            <td className="border-r px-2 py-3 text-center">
                              <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-blue-400 transition-colors">
                                <GripVertical size={16} className="mx-auto" />
                              </div>
                            </td>
                            <td className="border-r px-3 py-3 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={isVersionSubmitted}
                                  onChange={e => {
                                    setSelectedProductIds(prev => {
                                      const next = new Set(prev);
                                      e.target.checked ? next.add(boqItem.id) : next.delete(boqItem.id);
                                      return next;
                                    });
                                  }}
                                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                                />
                                <span className="text-[10px] text-gray-400 font-bold">{boqIdx + 1}</span>
                              </div>
                            </td>
                            <td className="border-r px-3 py-3">
                              <div className="font-bold text-gray-800 text-sm">{productName}</div>
                              {category && <div className="text-[9px] text-blue-500 font-black uppercase tracking-tighter mt-0.5">{category}</div>}
                            </td>
                            <td className="border-r px-3 py-2">
                              <textarea
                                value={manualDesc}
                                disabled={isVersionSubmitted}
                                onChange={e => setProductDescriptions(prev => ({ ...prev, [boqItem.id]: e.target.value }))}
                                onBlur={() => saveItemLayout(boqItem.id, undefined, undefined, productDescriptions[boqItem.id])}
                                rows={2}
                                className="w-full border-none rounded p-1 text-xs focus:ring-1 ring-blue-300 outline-none bg-transparent resize-y min-h-[40px] leading-tight"
                                placeholder="Manual description..."
                              />
                            </td>
                            <td className="border-r px-4 py-3 text-right font-black text-gray-500">
                              ₹{rateSqft.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="border-r px-4 py-3 text-right font-black text-green-700 bg-green-50/20">
                              ₹{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            {/* Custom columns */}
                            {(() => {
                              let itemTotal = total;
                              let accumulator = 0;
                              return allCols.map((col, idx) => {
                                if (col.isTotal) {
                                  itemTotal += accumulator;
                                  accumulator = 0;
                                  return (
                                    <td key={`${col.name}-${idx}`} className="border-r px-4 py-3 text-right font-black text-green-900 bg-green-100/40">
                                      ₹{itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  );
                                } else {
                                  const val = customColumnValues[boqItem.id]?.[0]?.[col.name] || "";
                                  accumulator += parseFloat(val) || 0;
                                  return (
                                    <td key={`${col.name}-${idx}`} className="border-r px-3 py-2 bg-purple-50/10">
                                      <input
                                        type="number"
                                        disabled={isVersionSubmitted}
                                        value={val}
                                        onChange={e => setCustomColumnValues(prev => ({
                                          ...prev,
                                          [boqItem.id]: {
                                            ...prev[boqItem.id],
                                            0: { ...(prev[boqItem.id]?.[0] || {}), [col.name]: e.target.value }
                                          }
                                        }))}
                                        onBlur={() => saveItemLayout(boqItem.id)}
                                        className="w-full border-transparent hover:border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 ring-purple-400 outline-none bg-transparent text-right font-bold text-purple-700"
                                        placeholder="0.00"
                                      />
                                    </td>
                                  );
                                }
                              });
                            })()}
                          </Reorder.Item>
                        );
                      })}
                    </Reorder.Group>
                  </table>
                </div>
              </Card>
            )}

            {/* Grand total row across all products */}
            {boqItems.length > 0 && (
              <div className="flex justify-end">
                <div className="bg-gray-800 text-white rounded-lg px-6 py-3 flex items-center gap-8 shadow-lg">
                  <span className="text-sm font-semibold uppercase tracking-wider text-gray-300">Grand Total</span>
                  <span className="text-xl font-bold text-green-400">
                    ₹{boqItems.reduce((sum, boqItem) => {
                      let td = boqItem.table_data || {};
                      if (typeof td === 'string') try { td = JSON.parse(td); } catch { td = {}; }
                      if (td.materialLines && td.targetRequiredQty !== undefined) {
                        return sum + computeBoq(td.configBasis, td.materialLines, td.targetRequiredQty).grandTotal;
                      }
                      const items = Array.isArray(td.step11_items) ? td.step11_items : [];
                      return sum + items.reduce((s: number, it: any) =>
                        s + (it.qty || 0) * ((it.supply_rate || 0) + (it.install_rate || 0)), 0);
                    }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {
          selectedProjectId && selectedVersionId && (
            <Card>
              <CardContent className="space-y-3 pt-6">
                {isVersionSubmitted ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800">
                    <strong>This version is locked.</strong> Submit a new version
                    to make edits.
                  </div>
                ) : null}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    onClick={handleSaveProject}
                    variant="outline"
                    disabled={isVersionSubmitted || Object.keys(editedFields).length === 0}
                  >
                    Save Draft
                  </Button>
                  <Button
                    onClick={handleSubmitVersion}
                    variant="default"
                    disabled={isVersionSubmitted || boqItems.length === 0}
                  >
                    Submit & Lock Version
                  </Button>
                  <Button
                    onClick={handleDownloadExcel}
                    variant="outline"
                    disabled={boqItems.length === 0}
                  >
                    Download as Excel
                  </Button>
                  <Button
                    onClick={handleDownloadPdf}
                    variant="outline"
                    disabled={boqItems.length === 0}
                  >
                    Download as PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        }
      </div >
    </Layout >
  );
}
