import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";

// Form Schema
const materialFormSchema = z.object({
  materialName: z.string().min(2, { message: "Name is required" }),
  sku: z.string().min(2, { message: "SKU is required" }),
  rate: z.coerce.number().min(0),
  brand: z.string().min(1, { message: "Brand is required" }),
  model: z.string().optional(),
  unit: z.string().min(1, { message: "Unit is required" }),
  category: z.string().min(1, { message: "Category is required" }),
  subCategory: z.string().optional(),
  supplier: z.string().min(1, { message: "Supplier is required" }),
  shop: z.string().optional(),
  technicalSpec: z.string().optional(),
  dimensions: z.string().optional(),
  finishType: z.string().optional(),
  metalType: z.string().optional(),
});

export default function MaterialsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [generatedItemCode, setGeneratedItemCode] = useState("");
  
  // Only allow purchase team, admin, software team
  const canEdit = ["purchase_team", "admin", "software_team"].includes(user?.role || "");

  const form = useForm<z.infer<typeof materialFormSchema>>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      materialName: "",
      sku: "",
      rate: 0,
      brand: "",
      model: "",
      unit: "",
      category: "",
      subCategory: "",
      supplier: "",
      shop: "",
      technicalSpec: "",
      dimensions: "",
      finishType: "",
      metalType: "",
    },
  });

  const materialName = form.watch("materialName");
  
  // Auto-generate Item Code based on name
  useEffect(() => {
    if (materialName && materialName.length > 2) {
      const code = materialName.substring(0, 3).toUpperCase() + "-" + Math.floor(Math.random() * 10000);
      setGeneratedItemCode(code);
    } else {
      setGeneratedItemCode("");
    }
  }, [materialName]);

  function onSubmit(values: z.infer<typeof materialFormSchema>) {
    // Check for "irrelevant" material (Mock logic as requested)
    const irrelevantKeywords = ["toy", "game", "food", "candy"];
    const isIrrelevant = irrelevantKeywords.some(keyword => 
      values.materialName.toLowerCase().includes(keyword)
    );

    if (isIrrelevant) {
      toast({
        variant: "destructive",
        title: "Security Alert Triggered",
        description: "Irrelevant material detected. Admin and Software team have been notified.",
      });
      return;
    }

    toast({
      title: "Material Added Successfully",
      description: `${values.materialName} has been added to inventory with code ${generatedItemCode}.`,
    });
    
    // Reset form
    form.reset();
  }

  if (!canEdit) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <h2 className="text-2xl font-bold text-muted-foreground">Access Restricted</h2>
        <p className="mt-2 text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-heading">Material Management</h1>
        <p className="text-muted-foreground">Add new construction materials and update inventory.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: The Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Material</CardTitle>
              <CardDescription>
                All fields marked with * are required. Item code is auto-generated.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  {/* Basic Info Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">Basic Details</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="materialName"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Material Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Red Brick Standard" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Item Code (Auto)
                        </label>
                        <div className="h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground font-mono">
                          {generatedItemCode || "Waiting for name..."}
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SKU / Code *</FormLabel>
                            <FormControl>
                              <Input placeholder="SKU-12345" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rate (₹)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="brand"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Brand Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Brand X" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="unit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="sqft">Sq. Ft.</SelectItem>
                                <SelectItem value="nos">Nos</SelectItem>
                                <SelectItem value="kg">Kg</SelectItem>
                                <SelectItem value="ton">Ton</SelectItem>
                                <SelectItem value="bundle">Bundle</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Categorization Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2 pt-2">Categorization</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="bricks">Bricks & Blocks</SelectItem>
                                <SelectItem value="cement">Cement</SelectItem>
                                <SelectItem value="steel">Steel</SelectItem>
                                <SelectItem value="flooring">Flooring</SelectItem>
                                <SelectItem value="electrical">Electrical</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="subCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sub Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Sub Category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="flyash">Fly Ash</SelectItem>
                                <SelectItem value="red">Red Clay</SelectItem>
                                <SelectItem value="aac">AAC Block</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="supplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supplier *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Supplier" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="sup1">BuildCo Supplies</SelectItem>
                                <SelectItem value="sup2">MegaMaterials</SelectItem>
                                <SelectItem value="sup3">Local Trade</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {user?.role === 'purchase_team' && (
                        <FormField
                          control={form.control}
                          name="shop"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select Shop (Purchase Only)</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Shop" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="shop1">Downtown Outlet</SelectItem>
                                  <SelectItem value="shop2">Warehouse A</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>

                  {/* Tech Specs */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2 pt-2">Technical Specifications</h3>
                    
                    <FormField
                      control={form.control}
                      name="technicalSpec"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description / Specs</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Detailed technical specifications..." className="resize-y" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="dimensions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dimensions</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 9x4x3" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="finishType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Finish Type</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Powder Coated" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="metalType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Material Type</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Aluminium" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11 text-base font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90">
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Add Material to Inventory
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Image & Helper */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Image</CardTitle>
              <CardDescription>Upload a clear image of the product.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center p-10 text-center hover:bg-muted/50 transition-colors cursor-pointer group">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium">Click to upload image</p>
                <p className="text-xs text-muted-foreground mt-1">SVG, PNG, JPG or GIF (max. 800x400px)</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
            <CardHeader>
              <CardTitle className="text-blue-800 dark:text-blue-100 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Image Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-700 dark:text-blue-200">
              <ul className="list-disc pl-4 space-y-1">
                <li>Use white background</li>
                <li>Ensure good lighting</li>
                <li>Show product from multiple angles if possible</li>
                <li>Do not include watermarks</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
