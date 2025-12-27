import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building2, User, ChevronRight, CheckCircle2 } from "lucide-react";
import { useData } from "@/lib/store";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { login } = useData();
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<"client" | "supplier">("client");
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    gst: "",
    address: "",
    description: ""
  });

  const handleNext = () => setStep(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate Signup & Login
    login({
      id: Math.random().toString(),
      name: formData.name,
      email: formData.email,
      role: userType === 'client' ? 'user' : 'supplier'
    });
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <Card className="border-2 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-heading">Create Account</CardTitle>
            <CardDescription>Join BuildEstimate Pro today</CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <Label className="text-lg">I am a...</Label>
                  <RadioGroup value={userType} onValueChange={(v: any) => setUserType(v)} className="grid grid-cols-2 gap-4">
                    <div>
                      <RadioGroupItem value="client" id="client" className="peer sr-only" />
                      <Label
                        htmlFor="client"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-32 justify-center gap-2 transition-all"
                      >
                        <User className="h-8 w-8" />
                        Client / User
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="supplier" id="supplier" className="peer sr-only" />
                      <Label
                        htmlFor="supplier"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-32 justify-center gap-2 transition-all"
                      >
                        <Building2 className="h-8 w-8" />
                        Supplier
                      </Label>
                    </div>
                  </RadioGroup>

                  <Button onClick={handleNext} className="w-full h-12 text-lg">
                    Continue <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>

                    {userType === 'supplier' && (
                      <>
                        <div className="space-y-2">
                          <Label>Company / Shop Name</Label>
                          <Input required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>GST Number</Label>
                          <Input value={formData.gst} onChange={e => setFormData({...formData, gst: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Shop Address</Label>
                          <Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                        </div>
                      </>
                    )}

                    <Button type="submit" className="w-full h-12 text-lg mt-6">
                      <CheckCircle2 className="mr-2 h-5 w-5" /> Complete Signup
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
          <CardFooter className="justify-center border-t pt-6">
             <div className="text-center text-sm">
              Already have an account?{" "}
              <Link href="/" className="text-primary hover:underline font-medium">
                Log in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
