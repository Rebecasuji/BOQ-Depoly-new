import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import apiFetch from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type MaterialTemplate = {
  id: string;
  name: string;
  code: string;
  category?: string;
  subcategory?: string;
  vendor_category?: string;
  tax_code_type?: string;
  tax_code_value?: string;
  created_at: string;
  updated_at: string;
};

type MaterialPickerProps = {
  onSelectTemplate: (template: MaterialTemplate) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function MaterialPicker({
  onSelectTemplate,
  open,
  onOpenChange,
}: MaterialPickerProps) {
  const [templates, setTemplates] = useState<MaterialTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<MaterialTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load all material templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await apiFetch("/api/material-templates", {
          headers: {},
        });
        if (response.ok) {
          const data = await response.json();
          const templateList = data.templates || [];
          setTemplates(templateList);
          setFilteredTemplates(templateList);
        } else {
          toast({
            title: "Error",
            description: "Failed to load material templates",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Failed to load material templates:", err);
        toast({
          title: "Error",
          description: "Failed to load material templates",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      loadTemplates();
    }
  }, [open, toast]);

  // Filter templates based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTemplates(templates);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = templates.filter((template) => {
      const name = template.name?.toLowerCase() || "";
      const code = template.code?.toLowerCase() || "";
      const category = template.category?.toLowerCase() || "";
      const subcategory = template.subcategory?.toLowerCase() || "";
      const vendorCategory = template.vendor_category?.toLowerCase() || "";

      return (
        name.includes(query) ||
        code.includes(query) ||
        category.includes(query) ||
        subcategory.includes(query) ||
        vendorCategory.includes(query)
      );
    });

    setFilteredTemplates(filtered);
  }, [searchQuery, templates]);

  const handleTemplateSelect = (template: MaterialTemplate) => {
    onSelectTemplate(template);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Material Template</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose a material template to add to your BOQ
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="template-search">Search Material Templates</Label>
            <Input
              id="template-search"
              placeholder="Search by template name, code, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-2"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">Loading material templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {templates.length === 0
                ? "No material templates available"
                : "No material templates match your search"}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredTemplates.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  onClick={() => handleTemplateSelect(template)}
                  className="w-full justify-start h-auto py-3 px-4"
                >
                  <div className="text-left space-y-1">
                    <div className="font-semibold">{template.name}</div>
                    <div className="text-xs text-gray-500">
                      Code: {template.code}
                      {template.category && ` • ${template.category}`}
                      {template.subcategory && ` → ${template.subcategory}`}
                    </div>
                    {template.vendor_category && (
                      <div className="text-xs text-gray-600">
                        Vendor: {template.vendor_category}
                      </div>
                    )}
                    {(template.tax_code_type || template.tax_code_value) && (
                      <div className="text-xs text-gray-600">
                        Tax: {template.tax_code_type} {template.tax_code_value}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}

          {filteredTemplates.length > 0 && (
            <div className="text-xs text-gray-500 text-center">
              Showing {filteredTemplates.length} of {templates.length} material templates
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}