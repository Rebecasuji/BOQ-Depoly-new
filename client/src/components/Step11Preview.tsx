import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import apiFetch, { getJSON } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { getEstimatorTypeFromProduct } from "@/lib/estimatorUtils";

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

type Step11PreviewProps = {
  product: Product;
  onClose: () => void;
  onAddToBoq: (selectedItems: Step11Item[]) => void;
  open: boolean;
};

export default function Step11Preview({
  product,
  onClose,
  onAddToBoq,
  open,
}: Step11PreviewProps) {
  const [step11Items, setStep11Items] = useState<Step11Item[]>([]);
  const [configurations, setConfigurations] = useState<any[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  // Load Step 11 snapshot for this product
  useEffect(() => {
    const loadStep11Data = async () => {
      try {
        setLoading(true);

        // Fetch product configuration using the getJSON utility
        const data = await getJSON(
          `/api/step11-products/${encodeURIComponent(product.id)}`
        );

        console.log("Step 11 Config Data:", data);

        if (data.configurations && data.configurations.length > 0) {
          setConfigurations(data.configurations);
          // Auto-select the first (most recent) configuration
          const firstConfig = data.configurations[0];
          setSelectedConfig(firstConfig);

          // Use items directly from the configuration
          const items = firstConfig.items || [];

          // Convert configuration items to Step11Item format
          const step11ItemsFromConfig = items.map((item: any, index: number) => ({
            id: `${firstConfig.product.id}_${index}`,
            bill_no: `TEMPLATE_${product.id}_${firstConfig.product.config_name || 'default'}_${index}`,
            estimator: getEstimatorTypeFromProduct(product) || "generic",
            group_id: product.id,
            title: item.material_name || item.name || `Material ${index + 1}`,
            description: item.description || `${product.name} - ${item.material_name || item.name || `Material ${index + 1}`}`,
            unit: item.unit || "pcs",
            qty: Number(item.qty || item.quantity || 1),
            supply_rate: Number(item.supply_rate || item.rate || 0),
            install_rate: Number(item.install_rate || 0),
            config_id: firstConfig.product.id,
            material_id: item.material_id,
          }));

          setStep11Items(step11ItemsFromConfig);
        } else {
          setConfigurations([]);
          setStep11Items([]);

          // Show helpful message with action
          toast({
            title: "Configuration Required",
            description: `No saved configuration found for ${product.name}. You need to create one in Manage Product first.`,
            action: {
              label: "Go to Manage Product",
              onClick: () => {
                // Navigate to Manage Product page
                window.location.href = "/admin/manage-product";
              }
            }
          });
        }
      } catch (error: any) {
        console.error("Failed to load product snapshot:", error);
        setConfigurations([]);
        setStep11Items([]);

        if (error.message?.includes("HTTP 404")) {
          toast({
            title: "Info",
            description: `No saved configuration found for ${product.name}. Please configure it in Manage Product first.`,
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to load product configuration",
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    if (open && product?.id) {
      loadStep11Data();
    }
  }, [product, toast, open]);

  // Handle configuration selection
  const handleConfigChange = (config: any) => {
    setSelectedConfig(config);

    const items = config.items || [];

    // Convert configuration items to Step11Item format
    const step11ItemsFromConfig = items.map((item: any, index: number) => ({
      id: `${config.product.id}_${index}`,
      bill_no: `TEMPLATE_${product.id}_${config.product.config_name || 'default'}_${index}`,
      estimator: getEstimatorTypeFromProduct(product) || "generic",
      group_id: product.id,
      title: item.material_name || item.name || `Material ${index + 1}`,
      description: item.description || `${product.name} - ${item.material_name || item.name || `Material ${index + 1}`}`,
      unit: item.unit || "pcs",
      qty: Number(item.qty || item.quantity || 1),
      supply_rate: Number(item.supply_rate || item.rate || 0),
      install_rate: Number(item.install_rate || 0),
      config_id: config.product.id,
      material_id: item.material_id,
    }));

    setStep11Items(step11ItemsFromConfig);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.name} - Step 11 Configuration</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {product.category && product.subcategory && (
            <p className="text-sm text-gray-500">
              {product.category} → {product.subcategory}
            </p>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading Step 11 data...
            </div>
          ) : step11Items.length === 0 ? (
            <div className="text-center py-8 text-gray-500 space-y-4">
              <div className="text-lg font-medium">No Configuration Found</div>
              <div className="text-sm">
                No saved configuration exists for <strong>{product.name}</strong>.
              </div>
              <div className="text-sm text-gray-600">
                You need to create a product configuration in Manage Product first before you can add it to a BOQ.
              </div>
              <Button
                onClick={() => window.location.href = "/admin/manage-product"}
                variant="outline"
                className="mt-4"
              >
                Go to Manage Product
              </Button>
            </div>
          ) : (
            <>
              {/* Configuration Selector */}
              {configurations.length > 1 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Select Configuration</Label>
                  <Select
                    value={selectedConfig?.product.id || ""}
                    onValueChange={(value) => {
                      const config = configurations.find(c => c.product.id === value);
                      if (config) handleConfigChange(config);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a configuration" />
                    </SelectTrigger>
                    <SelectContent>
                      {configurations.map((config) => (
                        <SelectItem key={config.product.id} value={config.product.id}>
                          {config.product.config_name || 'Unnamed Configuration'}
                          (Created: {new Date(config.product.created_at).toLocaleDateString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Consolidated Item Display */}
              <div className="space-y-4">
                <div className="font-black text-[13px] uppercase tracking-widest mb-2 border-b-2 border-black pb-1">
                  Product Configuration Preview
                </div>

                <div className="border-2 border-black rounded-sm overflow-hidden shadow-md">
                  <table className="w-full border-collapse">
                    <thead className="bg-white border-b border-black">
                      <tr className="text-[10px] font-black uppercase tracking-wider">
                        <th className="border-r border-black p-2 text-center w-[40px]">S.No</th>
                        <th className="border-r border-black p-2 text-left">Item</th>
                        <th className="border-r border-black p-2 text-center w-[100px]">Location</th>
                        <th className="border-r border-black p-2 text-left">Description</th>
                        <th className="border-r border-black p-2 text-center w-[60px]">Unit</th>
                        <th className="border-r border-black p-2 text-center w-[60px]">Qty</th>
                        <th className="border-r border-black p-2 text-right w-[100px]">Supply Rate</th>
                        <th className="border-r border-black p-2 text-right w-[100px]">Install Rate</th>
                        <th className="p-2 text-right w-[110px]">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      <tr className="text-[11px] hover:bg-muted/5 transition-colors">
                        <td className="border-r border-black p-3 text-center font-bold">1</td>
                        <td className="border-r border-black p-3 font-black uppercase text-xs">
                          {product.name}
                        </td>
                        <td className="border-r border-black p-3 text-center italic">Main Area</td>
                        <td className="border-r border-black p-3 text-[10px] text-muted-foreground leading-tight">
                          Consolidated configuration for {product.name}
                        </td>
                        <td className="border-r border-black p-3 text-center font-bold">set</td>
                        <td className="border-r border-black p-3 text-center font-black">1</td>
                        <td className="border-r border-black p-3 text-right font-bold">
                          ₹{step11Items.reduce((sum, item) => sum + (item.supply_rate || 0), 0).toLocaleString()}
                        </td>
                        <td className="border-r border-black p-3 text-right font-bold">
                          ₹{step11Items.reduce((sum, item) => sum + (item.install_rate || 0), 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-black text-primary">
                          ₹{step11Items.reduce((sum, item) => sum + ((item.supply_rate || 0) + (item.install_rate || 0)), 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-black/5 border-t border-black">
                      <tr className="font-black text-[12px]">
                        <td colSpan={8} className="p-3 text-right uppercase">Grand Total Amount (INR)</td>
                        <td className="p-3 text-right text-primary text-sm font-black">
                          ₹{step11Items.reduce((sum, item) => sum + ((item.supply_rate || 0) + (item.install_rate || 0)), 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <p className="text-[10px] text-gray-500 italic mt-2">
                  * This is a consolidated view of {step11Items.length} materials.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-black/10">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 font-bold uppercase tracking-wider py-6"
                  disabled={isAdding}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Create single consolidated item to send to BOQ
                    const totalSupply = step11Items.reduce((sum, item) => sum + (item.supply_rate || 0), 0);
                    const totalInstall = step11Items.reduce((sum, item) => sum + (item.install_rate || 0), 0);

                    const consolidatedItem: Step11Item = {
                      id: `CONSOLIDATED_${product.id}_${selectedConfig?.product.id || 'default'}`,
                      bill_no: `PRODUCT_${product.id}`,
                      estimator: getEstimatorTypeFromProduct(product) || "generic",
                      group_id: product.id,
                      title: product.name,
                      description: `Consolidated configuration for ${product.name}`,
                      unit: "set",
                      qty: 1,
                      supply_rate: totalSupply,
                      install_rate: totalInstall,
                      config_id: selectedConfig?.product.id,
                      // We still keep the original items in table_data hidden from main view if needed
                      step11_items: step11Items,
                    };

                    onAddToBoq([consolidatedItem]);
                  }}
                  disabled={step11Items.length === 0 || isAdding}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider py-6 shadow-lg transition-all hover:scale-[1.02]"
                >
                  {isAdding
                    ? "Adding..."
                    : "Add to BOQ"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
