import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Eye, EyeOff } from "lucide-react";

type PaymentSettings = {
  stripeEnabled: boolean;
  stripePublicKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  squareEnabled: boolean;
  squareApplicationId: string;
  squareAccessToken: string;
  squareWebhookSecret: string;
  squareEnvironment: string;
};

type CompanySettings = {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyWebsite: string;
  companyLogo: string;
  taxRate: number;
  defaultCurrency: string;
  invoiceTerms: string;
  invoiceFooter: string;
};

type EmailSettings = {
  emailEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
  fromEmail: string;
  fromName: string;
};

export default function Settings() {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: paymentSettings, isLoading: paymentLoading } = useQuery<PaymentSettings>({
    queryKey: ["/api/settings/payment"],
  });

  const { data: companySettings, isLoading: companyLoading } = useQuery<CompanySettings>({
    queryKey: ["/api/settings/company"],
  });

  const { data: emailSettings, isLoading: emailLoading } = useQuery<EmailSettings>({
    queryKey: ["/api/settings/email"],
  });

  const paymentMutation = useMutation({
    mutationFn: (data: Partial<PaymentSettings>) => 
      apiRequest("PUT", "/api/settings/payment", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/payment"] });
      toast({
        title: "Success",
        description: "Payment settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save payment settings",
        variant: "destructive",
      });
    },
  });

  const companyMutation = useMutation({
    mutationFn: (data: Partial<CompanySettings>) =>
      apiRequest("PUT", "/api/settings/company", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/company"] });
      toast({
        title: "Success",
        description: "Company settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save company settings",
        variant: "destructive",
      });
    },
  });

  const emailMutation = useMutation({
    mutationFn: (data: Partial<EmailSettings>) =>
      apiRequest("PUT", "/api/settings/email", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/email"] });
      toast({
        title: "Success",
        description: "Email settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save email settings",
        variant: "destructive",
      });
    },
  });

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handlePaymentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Partial<PaymentSettings> = {
      stripeEnabled: formData.get('stripeEnabled') === 'on',
      stripePublicKey: formData.get('stripePublicKey') as string,
      stripeSecretKey: formData.get('stripeSecretKey') as string,
      stripeWebhookSecret: formData.get('stripeWebhookSecret') as string,
      squareEnabled: formData.get('squareEnabled') === 'on',
      squareApplicationId: formData.get('squareApplicationId') as string,
      squareAccessToken: formData.get('squareAccessToken') as string,
      squareWebhookSecret: formData.get('squareWebhookSecret') as string,
      squareEnvironment: formData.get('squareEnvironment') as string,
    };
    paymentMutation.mutate(data);
  };

  const handleCompanySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Partial<CompanySettings> = {
      companyName: formData.get('companyName') as string,
      companyEmail: formData.get('companyEmail') as string,
      companyPhone: formData.get('companyPhone') as string,
      companyAddress: formData.get('companyAddress') as string,
      companyWebsite: formData.get('companyWebsite') as string,
      companyLogo: formData.get('companyLogo') as string,
      taxRate: parseFloat(formData.get('taxRate') as string) || 0,
      defaultCurrency: formData.get('defaultCurrency') as string,
      invoiceTerms: formData.get('invoiceTerms') as string,
      invoiceFooter: formData.get('invoiceFooter') as string,
    };
    companyMutation.mutate(data);
  };

  const handleEmailSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Partial<EmailSettings> = {
      emailEnabled: formData.get('emailEnabled') === 'on',
      smtpHost: formData.get('smtpHost') as string,
      smtpPort: parseInt(formData.get('smtpPort') as string) || 587,
      smtpUser: formData.get('smtpUser') as string,
      smtpPassword: formData.get('smtpPassword') as string,
      smtpSecure: formData.get('smtpSecure') === 'on',
      fromEmail: formData.get('fromEmail') as string,
      fromName: formData.get('fromName') as string,
    };
    emailMutation.mutate(data);
  };

  if (paymentLoading || companyLoading || emailLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your application settings and integrations</p>
      </div>

      <Tabs defaultValue="payment" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payment">Payment Processing</TabsTrigger>
          <TabsTrigger value="company">Company Info</TabsTrigger>
          <TabsTrigger value="email">Email Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Processing Settings</CardTitle>
              <CardDescription>
                Configure Stripe, Square, and other payment processors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePaymentSubmit} className="space-y-6">
                {/* Stripe Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Stripe</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure Stripe payment processing
                      </p>
                    </div>
                    <Switch
                      name="stripeEnabled"
                      defaultChecked={paymentSettings?.stripeEnabled}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stripePublicKey">Publishable Key</Label>
                      <Input
                        id="stripePublicKey"
                        name="stripePublicKey"
                        placeholder="pk_test_..."
                        defaultValue={paymentSettings?.stripePublicKey}
                      />
                    </div>
                    <div>
                      <Label htmlFor="stripeSecretKey">Secret Key</Label>
                      <div className="relative">
                        <Input
                          id="stripeSecretKey"
                          name="stripeSecretKey"
                          type={showSecrets.stripeSecret ? "text" : "password"}
                          placeholder="sk_test_..."
                          defaultValue={paymentSettings?.stripeSecretKey}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2"
                          onClick={() => toggleSecretVisibility('stripeSecret')}
                        >
                          {showSecrets.stripeSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="stripeWebhookSecret">Webhook Secret</Label>
                    <div className="relative">
                      <Input
                        id="stripeWebhookSecret"
                        name="stripeWebhookSecret"
                        type={showSecrets.stripeWebhook ? "text" : "password"}
                        placeholder="whsec_..."
                        defaultValue={paymentSettings?.stripeWebhookSecret}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        onClick={() => toggleSecretVisibility('stripeWebhook')}
                      >
                        {showSecrets.stripeWebhook ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Square Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Square</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure Square payment processing
                      </p>
                    </div>
                    <Switch
                      name="squareEnabled"
                      defaultChecked={paymentSettings?.squareEnabled}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="squareApplicationId">Application ID</Label>
                      <Input
                        id="squareApplicationId"
                        name="squareApplicationId"
                        placeholder="sq0idp-..."
                        defaultValue={paymentSettings?.squareApplicationId}
                      />
                    </div>
                    <div>
                      <Label htmlFor="squareEnvironment">Environment</Label>
                      <Select name="squareEnvironment" defaultValue={paymentSettings?.squareEnvironment || "sandbox"}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sandbox">Sandbox</SelectItem>
                          <SelectItem value="production">Production</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="squareAccessToken">Access Token</Label>
                      <div className="relative">
                        <Input
                          id="squareAccessToken"
                          name="squareAccessToken"
                          type={showSecrets.squareToken ? "text" : "password"}
                          placeholder="EAAAl..."
                          defaultValue={paymentSettings?.squareAccessToken}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2"
                          onClick={() => toggleSecretVisibility('squareToken')}
                        >
                          {showSecrets.squareToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="squareWebhookSecret">Webhook Secret</Label>
                      <div className="relative">
                        <Input
                          id="squareWebhookSecret"
                          name="squareWebhookSecret"
                          type={showSecrets.squareWebhook ? "text" : "password"}
                          placeholder="webhook_secret_..."
                          defaultValue={paymentSettings?.squareWebhookSecret}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2"
                          onClick={() => toggleSecretVisibility('squareWebhook')}
                        >
                          {showSecrets.squareWebhook ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={paymentMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {paymentMutation.isPending ? "Saving..." : "Save Payment Settings"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Configure your company details for invoices and branding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCompanySubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      placeholder="Your Company Name"
                      defaultValue={companySettings?.companyName}
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyEmail">Company Email</Label>
                    <Input
                      id="companyEmail"
                      name="companyEmail"
                      type="email"
                      placeholder="contact@company.com"
                      defaultValue={companySettings?.companyEmail}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyPhone">Phone Number</Label>
                    <Input
                      id="companyPhone"
                      name="companyPhone"
                      placeholder="+1 (555) 123-4567"
                      defaultValue={companySettings?.companyPhone}
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyWebsite">Website</Label>
                    <Input
                      id="companyWebsite"
                      name="companyWebsite"
                      placeholder="https://company.com"
                      defaultValue={companySettings?.companyWebsite}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="companyAddress">Address</Label>
                  <Textarea
                    id="companyAddress"
                    name="companyAddress"
                    placeholder="123 Main St, City, State 12345"
                    defaultValue={companySettings?.companyAddress}
                  />
                </div>

                <div>
                  <Label htmlFor="companyLogo">Logo URL</Label>
                  <Input
                    id="companyLogo"
                    name="companyLogo"
                    placeholder="https://company.com/logo.png"
                    defaultValue={companySettings?.companyLogo}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                    <Input
                      id="taxRate"
                      name="taxRate"
                      type="number"
                      step="0.01"
                      placeholder="8.25"
                      defaultValue={companySettings?.taxRate}
                    />
                  </div>
                  <div>
                    <Label htmlFor="defaultCurrency">Default Currency</Label>
                    <Select name="defaultCurrency" defaultValue={companySettings?.defaultCurrency || "USD"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                        <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="invoiceTerms">Invoice Terms</Label>
                  <Textarea
                    id="invoiceTerms"
                    name="invoiceTerms"
                    placeholder="Payment is due within 30 days of invoice date..."
                    defaultValue={companySettings?.invoiceTerms}
                  />
                </div>

                <div>
                  <Label htmlFor="invoiceFooter">Invoice Footer</Label>
                  <Textarea
                    id="invoiceFooter"
                    name="invoiceFooter"
                    placeholder="Thank you for your business!"
                    defaultValue={companySettings?.invoiceFooter}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={companyMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {companyMutation.isPending ? "Saving..." : "Save Company Settings"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Email Settings</CardTitle>
              <CardDescription>
                Configure SMTP settings for sending invoices and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Email Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Enable email sending for invoices and quotes
                    </p>
                  </div>
                  <Switch
                    name="emailEnabled"
                    defaultChecked={emailSettings?.emailEnabled}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      name="smtpHost"
                      placeholder="smtp.gmail.com"
                      defaultValue={emailSettings?.smtpHost}
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      name="smtpPort"
                      type="number"
                      placeholder="587"
                      defaultValue={emailSettings?.smtpPort}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input
                      id="smtpUser"
                      name="smtpUser"
                      placeholder="your-email@gmail.com"
                      defaultValue={emailSettings?.smtpUser}
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <div className="relative">
                      <Input
                        id="smtpPassword"
                        name="smtpPassword"
                        type={showSecrets.smtpPassword ? "text" : "password"}
                        placeholder="your-app-password"
                        defaultValue={emailSettings?.smtpPassword}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        onClick={() => toggleSecretVisibility('smtpPassword')}
                      >
                        {showSecrets.smtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    name="smtpSecure"
                    defaultChecked={emailSettings?.smtpSecure}
                  />
                  <Label htmlFor="smtpSecure">Use TLS/SSL</Label>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fromEmail">From Email</Label>
                    <Input
                      id="fromEmail"
                      name="fromEmail"
                      type="email"
                      placeholder="noreply@company.com"
                      defaultValue={emailSettings?.fromEmail}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromName">From Name</Label>
                    <Input
                      id="fromName"
                      name="fromName"
                      placeholder="Your Company"
                      defaultValue={emailSettings?.fromName}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={emailMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {emailMutation.isPending ? "Saving..." : "Save Email Settings"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}