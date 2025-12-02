import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, Users, CreditCard, Wrench, Palette, UserPlus, 
  Check, ChevronRight, ChevronLeft, Sparkles, SkipForward,
  Upload, Loader2, PartyPopper, X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingProgress {
  id: number;
  organizationId: number;
  companyProfileComplete: boolean;
  teamMembersComplete: boolean;
  stripeConnectComplete: boolean;
  servicesComplete: boolean;
  brandingComplete: boolean;
  firstCustomerComplete: boolean;
  isComplete: boolean;
  currentStep: number;
  completedSteps: number;
  totalSteps: number;
  percentComplete: number;
  organization?: any;
}

interface StepConfig {
  id: string;
  title: string;
  description: string;
  icon: any;
  isOptional: boolean;
}

const steps: StepConfig[] = [
  { id: "companyProfile", title: "Company Profile", description: "Set up your business information", icon: Building2, isOptional: false },
  { id: "teamMembers", title: "Team Members", description: "Invite your employees", icon: Users, isOptional: true },
  { id: "stripeConnect", title: "Payment Setup", description: "Connect Stripe to receive payments", icon: CreditCard, isOptional: true },
  { id: "services", title: "Services", description: "Define your service offerings", icon: Wrench, isOptional: true },
  { id: "branding", title: "Branding", description: "Customize your look", icon: Palette, isOptional: true },
  { id: "firstCustomer", title: "First Customer", description: "Add your first customer", icon: UserPlus, isOptional: true },
];

function Confetti() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number; color: string }>>([]);
  
  useEffect(() => {
    const colors = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'];
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-3 h-3 rounded-full animate-confetti"
          style={{
            left: `${p.x}%`,
            top: '-10px',
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

function CompanyProfileStep({ onComplete, progress }: { onComplete: () => void; progress: OnboardingProgress }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: progress.organization?.name || "",
    address: progress.organization?.address || "",
    phone: progress.organization?.phone || "",
    email: progress.organization?.email || "",
    website: progress.organization?.website || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("/api/organization/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
      toast({ title: "Profile updated!", description: "Your company profile has been saved." });
      onComplete();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Business Name *</Label>
          <Input
            id="name"
            data-testid="input-company-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Acme Field Services"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="address">Business Address</Label>
          <Textarea
            id="address"
            data-testid="input-company-address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="123 Main St, City, State ZIP"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              data-testid="input-company-phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Business Email</Label>
            <Input
              id="email"
              data-testid="input-company-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="info@yourcompany.com"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="website">Website (optional)</Label>
          <Input
            id="website"
            data-testid="input-company-website"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://www.yourcompany.com"
          />
        </div>
      </div>
      <Button
        data-testid="button-save-company-profile"
        onClick={() => mutation.mutate(formData)}
        disabled={mutation.isPending || !formData.name}
        className="w-full"
      >
        {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
        Save & Continue
      </Button>
    </div>
  );
}

function TeamMembersStep({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [invites, setInvites] = useState([{ email: "", role: "user" }]);

  const mutation = useMutation({
    mutationFn: async (data: typeof invites) => {
      const validInvites = data.filter(i => i.email.trim());
      if (validInvites.length === 0) {
        return { skipped: true };
      }
      return apiRequest("/api/users/invite-bulk", {
        method: "POST",
        body: JSON.stringify({ invites: validInvites }),
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
      if (data?.skipped) {
        toast({ title: "Step skipped", description: "You can add team members later in Settings." });
      } else {
        toast({ title: "Invites sent!", description: "Your team members will receive invitation emails." });
      }
      onComplete();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addInvite = () => {
    setInvites([...invites, { email: "", role: "user" }]);
  };

  const removeInvite = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">Invite your team members to collaborate on projects and manage field operations.</p>
      
      <div className="space-y-3">
        {invites.map((invite, index) => (
          <div key={index} className="flex gap-2 items-center">
            <Input
              data-testid={`input-invite-email-${index}`}
              type="email"
              placeholder="colleague@company.com"
              value={invite.email}
              onChange={(e) => {
                const newInvites = [...invites];
                newInvites[index].email = e.target.value;
                setInvites(newInvites);
              }}
              className="flex-1"
            />
            <select
              data-testid={`select-invite-role-${index}`}
              className="px-3 py-2 border rounded-md bg-background"
              value={invite.role}
              onChange={(e) => {
                const newInvites = [...invites];
                newInvites[index].role = e.target.value;
                setInvites(newInvites);
              }}
            >
              <option value="user">Technician</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            {invites.length > 1 && (
              <Button
                data-testid={`button-remove-invite-${index}`}
                variant="ghost"
                size="icon"
                onClick={() => removeInvite(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button data-testid="button-add-invite" variant="outline" onClick={addInvite} className="w-full">
        <UserPlus className="w-4 h-4 mr-2" /> Add Another Team Member
      </Button>

      <Button
        data-testid="button-send-invites"
        onClick={() => mutation.mutate(invites)}
        disabled={mutation.isPending}
        className="w-full"
      >
        {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
        {invites.some(i => i.email.trim()) ? "Send Invites & Continue" : "Skip for Now"}
      </Button>
    </div>
  );
}

function StripeConnectStep({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stripeStatus, isLoading } = useQuery({
    queryKey: ["/api/stripe-connect/status"],
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/stripe-connect/create-account", { method: "POST" });
    },
    onSuccess: (data: any) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const skipMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/onboarding/step/stripeConnect", {
        method: "POST",
        body: JSON.stringify({ completed: false, skipped: true }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
      toast({ title: "Step skipped", description: "You can set up payments later in Settings." });
      onComplete();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConnected = stripeStatus?.chargesEnabled;

  if (isConnected) {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Stripe Connected!</h3>
          <p className="text-muted-foreground">Your account is ready to accept payments.</p>
        </div>
        <Button data-testid="button-stripe-continue" onClick={onComplete} className="w-full">
          <Check className="w-4 h-4 mr-2" /> Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 rounded-lg p-6 text-center">
        <CreditCard className="w-12 h-12 mx-auto text-primary mb-4" />
        <h3 className="font-semibold mb-2">Accept Payments with Stripe</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your Stripe account to accept credit card payments from customers directly through invoices and quotes.
        </p>
        <ul className="text-sm text-left space-y-2 max-w-xs mx-auto mb-6">
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Accept credit/debit cards</li>
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Get paid faster</li>
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Automatic payment tracking</li>
        </ul>
      </div>

      <Button
        data-testid="button-connect-stripe"
        onClick={() => connectMutation.mutate()}
        disabled={connectMutation.isPending}
        className="w-full"
      >
        {connectMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
        Connect with Stripe
      </Button>

      <Button
        data-testid="button-skip-stripe"
        variant="ghost"
        onClick={() => skipMutation.mutate()}
        disabled={skipMutation.isPending}
        className="w-full"
      >
        <SkipForward className="w-4 h-4 mr-2" /> Skip for Now
      </Button>
    </div>
  );
}

function ServicesStep({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [services, setServices] = useState([
    { name: "", description: "", price: "" },
  ]);

  const mutation = useMutation({
    mutationFn: async (data: typeof services) => {
      const validServices = data.filter(s => s.name.trim());
      if (validServices.length === 0) {
        return { skipped: true };
      }
      return apiRequest("/api/services/bulk-create", {
        method: "POST",
        body: JSON.stringify({ services: validServices.map(s => ({
          name: s.name,
          description: s.description,
          basePrice: parseFloat(s.price) || 0,
        })) }),
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      if (data?.skipped) {
        toast({ title: "Step skipped", description: "You can add services later in Settings." });
      } else {
        toast({ title: "Services added!", description: "Your services have been saved." });
      }
      onComplete();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addService = () => {
    setServices([...services, { name: "", description: "", price: "" }]);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">Add the services your business offers. You can always add more later.</p>

      <div className="space-y-4">
        {services.map((service, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-3">
              <div className="flex gap-2 items-start">
                <div className="flex-1 space-y-3">
                  <Input
                    data-testid={`input-service-name-${index}`}
                    placeholder="Service name (e.g., House Cleaning)"
                    value={service.name}
                    onChange={(e) => {
                      const newServices = [...services];
                      newServices[index].name = e.target.value;
                      setServices(newServices);
                    }}
                  />
                  <div className="flex gap-2">
                    <Input
                      data-testid={`input-service-price-${index}`}
                      placeholder="Price"
                      type="number"
                      value={service.price}
                      onChange={(e) => {
                        const newServices = [...services];
                        newServices[index].price = e.target.value;
                        setServices(newServices);
                      }}
                      className="w-32"
                    />
                    <Input
                      data-testid={`input-service-description-${index}`}
                      placeholder="Brief description (optional)"
                      value={service.description}
                      onChange={(e) => {
                        const newServices = [...services];
                        newServices[index].description = e.target.value;
                        setServices(newServices);
                      }}
                      className="flex-1"
                    />
                  </div>
                </div>
                {services.length > 1 && (
                  <Button
                    data-testid={`button-remove-service-${index}`}
                    variant="ghost"
                    size="icon"
                    onClick={() => removeService(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button data-testid="button-add-service" variant="outline" onClick={addService} className="w-full">
        <Wrench className="w-4 h-4 mr-2" /> Add Another Service
      </Button>

      <Button
        data-testid="button-save-services"
        onClick={() => mutation.mutate(services)}
        disabled={mutation.isPending}
        className="w-full"
      >
        {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
        {services.some(s => s.name.trim()) ? "Save Services & Continue" : "Skip for Now"}
      </Button>
    </div>
  );
}

function BrandingStep({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!logoFile) {
        return { skipped: true };
      }
      const formData = new FormData();
      formData.append("logo", logoFile);
      const response = await fetch("/api/organization/logo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to upload logo");
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
      if (data?.skipped) {
        toast({ title: "Step skipped", description: "You can customize branding later in Settings." });
      } else {
        toast({ title: "Logo uploaded!", description: "Your branding has been updated." });
      }
      onComplete();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">Upload your company logo to brand your invoices and customer communications.</p>

      <div className="border-2 border-dashed rounded-lg p-8 text-center">
        {logoPreview ? (
          <div className="space-y-4">
            <img src={logoPreview} alt="Logo preview" className="max-h-32 mx-auto" />
            <Button
              data-testid="button-change-logo"
              variant="outline"
              onClick={() => { setLogoFile(null); setLogoPreview(null); }}
            >
              Change Logo
            </Button>
          </div>
        ) : (
          <label className="cursor-pointer block">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">Click to upload your logo</p>
            <p className="text-sm text-muted-foreground">PNG, JPG up to 5MB</p>
            <input
              data-testid="input-logo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        )}
      </div>

      <Button
        data-testid="button-save-branding"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="w-full"
      >
        {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
        {logoFile ? "Upload Logo & Continue" : "Skip for Now"}
      </Button>
    </div>
  );
}

function FirstCustomerStep({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!data.name.trim()) {
        return { skipped: true };
      }
      return apiRequest("/api/customers", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      if (data?.skipped) {
        toast({ title: "Step skipped", description: "You can add customers anytime from the Customers page." });
      } else {
        toast({ title: "Customer added!", description: "Your first customer has been created." });
      }
      onComplete();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">Add your first customer to get started with creating quotes and invoices.</p>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="customerName">Customer Name</Label>
          <Input
            id="customerName"
            data-testid="input-customer-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="John Smith"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="customerEmail">Email</Label>
            <Input
              id="customerEmail"
              data-testid="input-customer-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="customer@email.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customerPhone">Phone</Label>
            <Input
              id="customerPhone"
              data-testid="input-customer-phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="customerAddress">Address</Label>
          <Textarea
            id="customerAddress"
            data-testid="input-customer-address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="123 Customer St, City, State ZIP"
            rows={2}
          />
        </div>
      </div>

      <Button
        data-testid="button-save-customer"
        onClick={() => mutation.mutate(formData)}
        disabled={mutation.isPending}
        className="w-full"
      >
        {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
        {formData.name.trim() ? "Add Customer & Finish" : "Skip & Finish Setup"}
      </Button>
    </div>
  );
}

function CompletionScreen() {
  const [, navigate] = useLocation();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {showConfetti && <Confetti />}
      <Card className="max-w-lg w-full mx-4 text-center">
        <CardHeader>
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
            <PartyPopper className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">You're All Set! 🎉</CardTitle>
          <CardDescription className="text-base">
            Congratulations! Your Pro Field Manager account is ready to go.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            You can always customize your settings later. Now let's get to work!
          </p>
          <div className="flex flex-col gap-3">
            <Button data-testid="button-go-to-dashboard" onClick={() => navigate("/dashboard")} className="w-full">
              <Sparkles className="w-4 h-4 mr-2" /> Go to Dashboard
            </Button>
            <Button data-testid="button-go-to-settings" variant="outline" onClick={() => navigate("/settings")}>
              Customize More Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);

  const { data: progress, isLoading } = useQuery<OnboardingProgress>({
    queryKey: ["/api/onboarding/progress"],
    enabled: !!user,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/onboarding/complete", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
    },
  });

  const stepMutation = useMutation({
    mutationFn: async ({ stepName, completed }: { stepName: string; completed: boolean }) => {
      return apiRequest(`/api/onboarding/step/${stepName}`, {
        method: "POST",
        body: JSON.stringify({ completed }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
    },
  });

  useEffect(() => {
    if (progress && !progress.isComplete) {
      setCurrentStep(Math.max(0, (progress.currentStep || 1) - 1));
    }
  }, [progress]);

  if (!user) {
    navigate("/login");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (progress?.isComplete) {
    return <CompletionScreen />;
  }

  const handleStepComplete = (stepIndex: number) => {
    const step = steps[stepIndex];
    stepMutation.mutate({ stepName: step.id, completed: true });
    
    if (stepIndex < steps.length - 1) {
      setCurrentStep(stepIndex + 1);
    } else {
      completeMutation.mutate();
    }
  };

  const handleSkipAll = () => {
    completeMutation.mutate();
    toast({ 
      title: "Onboarding skipped", 
      description: "You can complete setup anytime from Settings." 
    });
  };

  const stepComponents = [
    <CompanyProfileStep key="company" onComplete={() => handleStepComplete(0)} progress={progress!} />,
    <TeamMembersStep key="team" onComplete={() => handleStepComplete(1)} />,
    <StripeConnectStep key="stripe" onComplete={() => handleStepComplete(2)} />,
    <ServicesStep key="services" onComplete={() => handleStepComplete(3)} />,
    <BrandingStep key="branding" onComplete={() => handleStepComplete(4)} />,
    <FirstCustomerStep key="customer" onComplete={() => handleStepComplete(5)} />,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to Pro Field Manager</h1>
          <p className="text-muted-foreground">Let's get your account set up in just a few steps</p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Setup Progress</span>
            <span className="text-sm text-muted-foreground">{progress?.percentComplete || 0}% Complete</span>
          </div>
          <Progress value={progress?.percentComplete || 0} className="h-2" />
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {steps.map((step, index) => {
            const isCompleted = progress?.[`${step.id}Complete` as keyof OnboardingProgress];
            const isCurrent = index === currentStep;
            const Icon = step.icon;
            
            return (
              <button
                key={step.id}
                data-testid={`step-button-${step.id}`}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors",
                  isCurrent && "bg-primary text-primary-foreground",
                  !isCurrent && isCompleted && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                  !isCurrent && !isCompleted && "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </button>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = steps[currentStep].icon;
                return <Icon className="w-6 h-6 text-primary" />;
              })()}
              <div>
                <CardTitle>{steps[currentStep].title}</CardTitle>
                <CardDescription>{steps[currentStep].description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {stepComponents[currentStep]}
          </CardContent>
        </Card>

        <div className="flex justify-between items-center mt-6">
          <Button
            data-testid="button-previous-step"
            variant="ghost"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Previous
          </Button>
          
          <Button
            data-testid="button-skip-onboarding"
            variant="link"
            onClick={handleSkipAll}
            className="text-muted-foreground"
          >
            Skip Setup
          </Button>

          <Button
            data-testid="button-next-step"
            variant="ghost"
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
          >
            Next <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
