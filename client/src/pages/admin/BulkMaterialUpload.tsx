import React, { useState } from "react";
import { postJSON } from "@/lib/api";
import { Layout } from "@/components/layout/Layout";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Loader2,
  Upload,
  Trash2,
  Eye,
  Copy,
  FileText,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

const canonicalHeaders = [
  "name",
  "code",
  "unit",
  "rate",
  "category",
  "subcategory",
  "shop_name",
  "vendor_category",
  "tax_code_type",
  "tax_code_value",
  "technicalspecification",
];

const headerLine = canonicalHeaders.join("\t");

const headerLabels: Record<string, string> = {
  technicalspecification: "Technical Specification",
  shop_name: "Shop Name",
  vendor_category: "Vendor Category",
  tax_code_type: "Tax Code Type",
  tax_code_value: "Tax Code Value",
};

function generateCodeFromName(name: string) {
  if (!name) return "";
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/-+/g, "-")        // Remove multiple consecutive hyphens
    .replace(/^-|-$/g, "")      // Trim hyphens from ends
    .slice(0, 50);              // Truncate to 50 chars
}

export default function BulkMaterialUpload() {
  const [tableRows, setTableRows] = useState<Record<string, string>[]>(
    Array(10).fill(null).map(() => ({
      name: "", code: "", unit: "", rate: "",
      category: "", subcategory: "", shop_name: "", vendor_category: "",
      tax_code_type: "", tax_code_value: "", technicalspecification: ""
    }))
  );
  const [preview, setPreview] = useState<{
    headers: string[];
    rows: Record<string, any>[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const updateCell = (rowIndex: number, column: string, value: string) => {
    setTableRows((prev) => {
      const next = [...prev];
      const currentRow = { ...next[rowIndex] };
      currentRow[column] = value;

      // Auto-generate code if name changes (now strictly mapped)
      if (column === "name") {
        currentRow["code"] = generateCodeFromName(value);
      }

      next[rowIndex] = currentRow;
      return next;
    });
  };

  const addRows = (count: number = 5) => {
    setTableRows((prev) => [
      ...prev,
      ...Array(count).fill(null).map(() => ({
        name: "", code: "", unit: "", rate: "",
        category: "", subcategory: "", shop_name: "", vendor_category: "",
        tax_code_type: "", tax_code_value: "", technicalspecification: ""
      }))
    ]);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // If the event target is an input, we might want to start pasting from that specific cell
    // but for simplicity and to match the "bulk" nature, we'll start from the first row that is currently empty or the very first row.
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData || !pasteData.includes('\t')) return; // Probably not Excel data

    e.preventDefault();
    const lines = pasteData.split(/\r?\n/).filter(line => line.trim() !== "");

    setTableRows((prev) => {
      const next = [...prev];
      lines.forEach((line, lineIdx) => {
        const cols = line.split('\t');
        if (lineIdx >= next.length) {
          next.push({
            name: "", code: "", unit: "", rate: "",
            category: "", subcategory: "", shop_name: "", vendor_category: "",
            tax_code_type: "", tax_code_value: ""
          });
        }

        const rowData = { ...next[lineIdx] };
        canonicalHeaders.forEach((header, colIdx) => {
          if (cols[colIdx] !== undefined) {
            rowData[header] = cols[colIdx].trim();
          }
        });

        // Auto-generate code if it's missing from the pasted data
        if (rowData.name && !rowData.code) {
          rowData.code = generateCodeFromName(rowData.name);
        }

        next[lineIdx] = rowData;
      });
      return next;
    });

    toast({
      title: "Data Pasted",
      description: `Imported ${lines.length} rows. Auto-generated missing codes.`,
    });
  };

  const handlePreview = () => {
    // Filter out rows that are completely empty
    const activeRows = tableRows.filter(row =>
      Object.values(row).some(val => val.trim() !== "")
    );

    if (activeRows.length === 0) {
      toast({
        title: "No Data",
        description: "Please enter some material data first.",
        variant: "destructive",
      });
      return;
    }

    // Validate name column
    const invalid = activeRows.filter((r) => !r.name?.trim());
    if (invalid.length > 0) {
      toast({
        title: "Validation Error",
        description: "Some rows are missing 'Name'. This field is required.",
        variant: "destructive",
      });
      return;
    }

    setPreview({ headers: canonicalHeaders, rows: activeRows });
    toast({
      title: "Preview Generated",
      description: `Parsed ${activeRows.length} active rows.`,
    });
  };

  const handleUpload = async () => {
    if (!preview || preview.rows.length === 0) {
      toast({
        title: "No Preview",
        description: "Please preview your data before uploading.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await postJSON("/bulk-materials", {
        rows: preview.rows,
      });
      setResult(res);
      toast({
        title: "Upload Successful",
        description: `Successfully uploaded ${preview.rows.length} materials.`,
      });
      // Clear after success
      setPreview(null);
      setTableRows(Array(10).fill(null).map(() => ({
        name: "", code: "", unit: "", rate: "",
        category: "", subcategory: "", vendor_category: "",
        tax_code_type: "", tax_code_value: "", technicalspecification: ""
      })));
    } catch (err: any) {
      toast({
        title: "Upload Failed",
        description: err?.message || "Something went wrong during upload.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyTemplate = () => {
    navigator.clipboard.writeText(headerLine);
    toast({
      title: "Template Copied",
      description: "Header template (TSV) copied to clipboard.",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Bulk Material Upload</h2>
            <p className="text-muted-foreground">
              Add multiple materials by typing below or pasting directly from Excel.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-100 p-3 rounded-md text-xs text-blue-800 max-w-xs">
            <p className="flex items-center gap-1 font-semibold mb-1">
              <AlertCircle className="h-3 w-3" />
              Pro Tip
            </p>
            Copy cells from Excel and paste anywhere in the table grid!
          </div>
        </div>

        <Card className="border-none shadow-md overflow-hidden bg-slate-50/30">
          <CardHeader className="bg-white border-b py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-primary" />
                Material Entry Grid
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyTemplate}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copy Headers
                </Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  setTableRows(Array(10).fill(null).map(() => ({
                    name: "", code: "", unit: "", rate: "",
                    category: "", subcategory: "", vendor_category: "",
                    tax_code_type: "", tax_code_value: "", technicalspecification: ""
                  })));
                  setPreview(null);
                  setResult(null);
                }} className="text-destructive hover:bg-destructive/5 h-8">
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Reset Grid
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[600px] border-b" onPaste={handlePaste}>
              <Table className="border-collapse">
                <TableHeader className="sticky top-0 bg-slate-100 z-10 shadow-sm border-b">
                  <TableRow>
                    <TableHead className="w-10 text-center font-bold text-slate-600 border-r">#</TableHead>
                    {canonicalHeaders.map((h) => (
                      <TableHead key={h} className="min-w-[150px] font-bold text-slate-600 border-r">
                        <div className="flex items-center gap-1">
                          {headerLabels[h] || (h.charAt(0).toUpperCase() + h.slice(1).replace(/_/g, " "))}
                          {h === "code" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertCircle className="h-3 w-3 text-slate-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Strictly auto-generated from Name (non-editable)</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                  {tableRows.map((row, rowIndex) => (
                    <TableRow key={rowIndex} className="group hover:bg-slate-50 transition-colors">
                      <TableCell className="text-center font-mono text-xs text-slate-400 border-r bg-slate-50/50">
                        {rowIndex + 1}
                      </TableCell>
                      {canonicalHeaders.map((header) => (
                        <TableCell key={header} className="p-0 border-r">
                          <input
                            type="text"
                            value={row[header]}
                            readOnly={header === "code"}
                            tabIndex={header === "code" ? -1 : 0}
                            onChange={(e) => updateCell(rowIndex, header, e.target.value)}
                            className={cn(
                              "w-full h-10 px-3 border-none focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm bg-transparent",
                              header === "code" && "bg-slate-50/50 text-slate-500 cursor-not-allowed font-mono text-xs"
                            )}
                            placeholder={header === 'name' ? 'Required...' : ''}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="bg-white border-t p-4 flex justify-between items-center">
            <Button variant="ghost" size="sm" onClick={() => addRows(5)} className="text-slate-600 h-9">
              + Add 5 More Rows
            </Button>
            <Button onClick={handlePreview} className="min-w-[150px] shadow-sm">
              <Eye className="mr-2 h-4 w-4" />
              Preview & Validate
            </Button>
          </CardFooter>
        </Card>

        {preview && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 border-primary/20 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-primary/5 py-4">
              <div>
                <CardTitle className="text-lg text-primary flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Ready to Upload
                </CardTitle>
                <CardDescription className="text-primary/70">
                  Verified {preview.rows.length} valid material rows.
                </CardDescription>
              </div>
              <Button onClick={handleUpload} disabled={loading} size="lg" className="bg-primary hover:bg-primary/90 px-8">
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                )}
                {loading ? "Uploading..." : "Confirm Bulk Import"}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[300px]">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      {preview.headers.map((h) => (
                        <TableHead key={h} className="text-xs uppercase tracking-wider text-slate-500">
                          {h.charAt(0).toUpperCase() + h.slice(1).replace(/_/g, " ")}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/30">
                        {preview.headers.map((h) => (
                          <TableCell key={h} className="text-sm py-2">
                            {row[h] || <span className="text-slate-300 italic">empty</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="py-3 border-b border-green-100">
              <CardTitle className="flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Upload Results
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <pre className="text-[10px] bg-white border rounded p-3 text-green-800 font-mono overflow-auto max-h-[150px]">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
