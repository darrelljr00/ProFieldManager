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
import { Save, Eye, EyeOff, Upload, X } from "lucide-react";

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
  logo: string;
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

type OcrSettings = {
  ocrEnabled: boolean;
  ocrProvider: string;
  googleVisionApiKey: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  azureSubscriptionKey: string;
  azureEndpoint: string;
};

type TwilioSettings = {
  twilioEnabled: boolean;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  webhookUrl: string;
};

type CalendarSettings = {
  schedulingBufferMinutes: number;
  preventOverlapping: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string[];
  defaultJobDuration: number;
};

export default function Settings() {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
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

  const { data: twilioSettings, isLoading: twilioLoading } = useQuery<TwilioSettings>({
    queryKey: ["/api/settings/twilio"],
  });

  const { data: ocrSettings, isLoading: ocrLoading } = useQuery<OcrSettings>({
    queryKey: ["/api/settings/ocr"],
  });

  const { data: calendarSettings, isLoading: calendarLoading } = useQuery<CalendarSettings>({
    queryKey: ["/api/settings/calendar"],
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

  const twilioMutation = useMutation({
    mutationFn: (data: Partial<TwilioSettings>) =>
      apiRequest("PUT", "/api/settings/twilio", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/twilio"] });
      toast({
        title: "Success",
        description: "Twilio settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save Twilio settings",
        variant: "destructive",
      });
    },
  });

  const ocrMutation = useMutation({
    mutationFn: (data: Partial<OcrSettings>) =>
      apiRequest("PUT", "/api/settings/ocr", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/ocr"] });
      toast({
        title: "Success",
        description: "OCR settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save OCR settings",
        variant: "destructive",
      });
    },
  });

  const calendarMutation = useMutation({
    mutationFn: (data: Partial<CalendarSettings>) =>
      apiRequest("PUT", "/api/settings/calendar", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/calendar"] });
      toast({
        title: "Success",
        description: "Calendar settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save calendar settings",
        variant: "destructive",
      });
    },
  });

  const logoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      const response = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/company"] });
      setLogoFile(null);
      setLogoPreview(null);
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = () => {
    if (logoFile) {
      logoUploadMutation.mutate(logoFile);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
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

  const handleTwilioSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Partial<TwilioSettings> = {
      twilioEnabled: formData.get('twilioEnabled') === 'on',
      twilioAccountSid: formData.get('twilioAccountSid') as string,
      twilioAuthToken: formData.get('twilioAuthToken') as string,
      twilioPhoneNumber: formData.get('twilioPhoneNumber') as string,
      webhookUrl: formData.get('webhookUrl') as string,
    };
    twilioMutation.mutate(data);
  };

  const handleOcrSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Partial<OcrSettings> = {
      ocrEnabled: formData.get('ocrEnabled') === 'on',
      ocrProvider: formData.get('ocrProvider') as string,
      googleVisionApiKey: formData.get('googleVisionApiKey') as string,
      awsAccessKeyId: formData.get('awsAccessKeyId') as string,
      awsSecretAccessKey: formData.get('awsSecretAccessKey') as string,
      awsRegion: formData.get('awsRegion') as string,
      azureSubscriptionKey: formData.get('azureSubscriptionKey') as string,
      azureEndpoint: formData.get('azureEndpoint') as string,
    };
    ocrMutation.mutate(data);
  };

  const handleCalendarSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const workingDays = [];
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
      if (formData.get(day) === 'on') {
        workingDays.push(day);
      }
    });
    
    const data: Partial<CalendarSettings> = {
      schedulingBufferMinutes: parseInt(formData.get('schedulingBufferMinutes') as string) || 15,
      preventOverlapping: formData.get('preventOverlapping') === 'on',
      workingHoursStart: formData.get('workingHoursStart') as string,
      workingHoursEnd: formData.get('workingHoursEnd') as string,
      workingDays,
      defaultJobDuration: parseInt(formData.get('defaultJobDuration') as string) || 60,
    };
    calendarMutation.mutate(data);
  };

  if (paymentLoading || companyLoading || emailLoading || twilioLoading || ocrLoading || calendarLoading) {
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="payment">Payment Processing</TabsTrigger>
          <TabsTrigger value="company">Company Info</TabsTrigger>
          <TabsTrigger value="email">Email Settings</TabsTrigger>
          <TabsTrigger value="sms">SMS Settings</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="ocr">OCR Settings</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
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
                  <Label>Company Logo</Label>
                  <div className="space-y-4">
                    {/* Current Logo Display */}
                    {companySettings?.logo && !logoPreview && (
                      <div className="flex items-center space-x-4">
                        <img
                          src={companySettings.logo.startsWith('/uploads') ? companySettings.logo : `/uploads/${companySettings.logo}`}
                          alt="Current logo"
                          className="h-16 w-16 object-contain border rounded"
                        />
                        <span className="text-sm text-muted-foreground">Current logo</span>
                      </div>
                    )}
                    
                    {/* Logo Preview */}
                    {logoPreview && (
                      <div className="flex items-center space-x-4">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="h-16 w-16 object-contain border rounded"
                        />
                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            onClick={handleLogoUpload}
                            disabled={logoUploadMutation.isPending}
                            size="sm"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {logoUploadMutation.isPending ? "Uploading..." : "Upload"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={removeLogo}
                            size="sm"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* File Input */}
                    <div>
                      <Input
                        id="logoFile"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Supported formats: JPG, PNG, GIF, SVG. Max size: 5MB
                      </p>
                    </div>
                  </div>
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

        <TabsContent value="sms">
          <Card>
            <CardHeader>
              <CardTitle>SMS Settings</CardTitle>
              <CardDescription>
                Configure Twilio for SMS messaging functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTwilioSubmit} className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    name="twilioEnabled"
                    id="twilioEnabled"
                    defaultChecked={twilioSettings?.twilioEnabled}
                  />
                  <Label htmlFor="twilioEnabled">Enable Twilio SMS</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="twilioAccountSid">Account SID</Label>
                    <div className="relative">
                      <Input
                        id="twilioAccountSid"
                        name="twilioAccountSid"
                        type={showSecrets.twilioAccountSid ? "text" : "password"}
                        placeholder="AC123456789abcdef123456789abcdef12"
                        defaultValue={twilioSettings?.twilioAccountSid}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        onClick={() => toggleSecretVisibility('twilioAccountSid')}
                      >
                        {showSecrets.twilioAccountSid ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="twilioAuthToken">Auth Token</Label>
                    <div className="relative">
                      <Input
                        id="twilioAuthToken"
                        name="twilioAuthToken"
                        type={showSecrets.twilioAuthToken ? "text" : "password"}
                        placeholder="your_auth_token_here"
                        defaultValue={twilioSettings?.twilioAuthToken}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        onClick={() => toggleSecretVisibility('twilioAuthToken')}
                      >
                        {showSecrets.twilioAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="twilioPhoneNumber">Twilio Phone Number</Label>
                    <Input
                      id="twilioPhoneNumber"
                      name="twilioPhoneNumber"
                      placeholder="+15551234567"
                      defaultValue={twilioSettings?.twilioPhoneNumber}
                    />
                  </div>
                  <div>
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      name="webhookUrl"
                      placeholder="https://yourapp.com/api/messages/webhook"
                      defaultValue={twilioSettings?.webhookUrl}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Setup Instructions:</h4>
                  <ol className="text-sm text-blue-800 space-y-1">
                    <li>1. Create a Twilio account at <code>twilio.com</code></li>
                    <li>2. Find your Account SID and Auth Token in the Console Dashboard</li>
                    <li>3. Purchase a phone number from Twilio</li>
                    <li>4. Configure your webhook URL in Twilio Console → Phone Numbers → Manage → Active Numbers</li>
                    <li>5. Set webhook URL to: <code>/api/messages/webhook</code></li>
                  </ol>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={twilioMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {twilioMutation.isPending ? "Saving..." : "Save SMS Settings"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Calendar & Scheduling Settings</CardTitle>
              <CardDescription>
                Configure scheduling buffers, working hours, and calendar preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCalendarSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="schedulingBufferMinutes">Scheduling Buffer (minutes)</Label>
                    <Input
                      id="schedulingBufferMinutes"
                      name="schedulingBufferMinutes"
                      type="number"
                      min="0"
                      max="1440"
                      placeholder="15"
                      defaultValue={calendarSettings?.schedulingBufferMinutes || 15}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Minimum time gap between scheduled jobs to prevent conflicts
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="defaultJobDuration">Default Job Duration (minutes)</Label>
                    <Input
                      id="defaultJobDuration"
                      name="defaultJobDuration"
                      type="number"
                      min="15"
                      max="480"
                      placeholder="60"
                      defaultValue={calendarSettings?.defaultJobDuration || 60}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Default duration for new scheduled jobs
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    name="preventOverlapping"
                    id="preventOverlapping"
                    defaultChecked={calendarSettings?.preventOverlapping}
                  />
                  <Label htmlFor="preventOverlapping">Prevent Overlapping Appointments</Label>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Working Hours</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="workingHoursStart">Start Time</Label>
                      <Input
                        id="workingHoursStart"
                        name="workingHoursStart"
                        type="time"
                        defaultValue={calendarSettings?.workingHoursStart || "09:00"}
                      />
                    </div>
                    <div>
                      <Label htmlFor="workingHoursEnd">End Time</Label>
                      <Input
                        id="workingHoursEnd"
                        name="workingHoursEnd"
                        type="time"
                        defaultValue={calendarSettings?.workingHoursEnd || "17:00"}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Working Days</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Switch
                          name={day}
                          id={day}
                          defaultChecked={calendarSettings?.workingDays?.includes(day) ?? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day)}
                        />
                        <Label htmlFor={day} className="capitalize">{day}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={calendarMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {calendarMutation.isPending ? "Saving..." : "Save Calendar Settings"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ocr">
          <Card>
            <CardHeader>
              <CardTitle>OCR Settings</CardTitle>
              <CardDescription>
                Configure OCR providers for receipt scanning in expense tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOcrSubmit} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Enable OCR</h3>
                    <p className="text-sm text-muted-foreground">
                      Enable optical character recognition for receipt scanning
                    </p>
                  </div>
                  <Switch
                    name="ocrEnabled"
                    defaultChecked={ocrSettings?.ocrEnabled}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ocrProvider">OCR Provider</Label>
                    <Select name="ocrProvider" defaultValue={ocrSettings?.ocrProvider || "google"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select OCR provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google">Google Vision API</SelectItem>
                        <SelectItem value="aws">AWS Textract</SelectItem>
                        <SelectItem value="azure">Azure Computer Vision</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Google Vision API Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Google Vision API</h3>
                  <div>
                    <Label htmlFor="googleVisionApiKey">API Key</Label>
                    <div className="relative">
                      <Input
                        id="googleVisionApiKey"
                        name="googleVisionApiKey"
                        type={showSecrets.googleVisionApiKey ? "text" : "password"}
                        placeholder="Enter Google Vision API Key"
                        defaultValue={ocrSettings?.googleVisionApiKey}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowSecrets(prev => ({ ...prev, googleVisionApiKey: !prev.googleVisionApiKey }))}
                      >
                        {showSecrets.googleVisionApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* AWS Textract Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">AWS Textract</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="awsAccessKeyId">Access Key ID</Label>
                      <div className="relative">
                        <Input
                          id="awsAccessKeyId"
                          name="awsAccessKeyId"
                          type={showSecrets.awsAccessKeyId ? "text" : "password"}
                          placeholder="AKIA..."
                          defaultValue={ocrSettings?.awsAccessKeyId}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowSecrets(prev => ({ ...prev, awsAccessKeyId: !prev.awsAccessKeyId }))}
                        >
                          {showSecrets.awsAccessKeyId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="awsSecretAccessKey">Secret Access Key</Label>
                      <div className="relative">
                        <Input
                          id="awsSecretAccessKey"
                          name="awsSecretAccessKey"
                          type={showSecrets.awsSecretAccessKey ? "text" : "password"}
                          placeholder="Enter secret key"
                          defaultValue={ocrSettings?.awsSecretAccessKey}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowSecrets(prev => ({ ...prev, awsSecretAccessKey: !prev.awsSecretAccessKey }))}
                        >
                          {showSecrets.awsSecretAccessKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="awsRegion">AWS Region</Label>
                    <Input
                      id="awsRegion"
                      name="awsRegion"
                      placeholder="us-east-1"
                      defaultValue={ocrSettings?.awsRegion}
                    />
                  </div>
                </div>

                <Separator />

                {/* Azure Computer Vision Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Azure Computer Vision</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="azureSubscriptionKey">Subscription Key</Label>
                      <div className="relative">
                        <Input
                          id="azureSubscriptionKey"
                          name="azureSubscriptionKey"
                          type={showSecrets.azureSubscriptionKey ? "text" : "password"}
                          placeholder="Enter subscription key"
                          defaultValue={ocrSettings?.azureSubscriptionKey}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowSecrets(prev => ({ ...prev, azureSubscriptionKey: !prev.azureSubscriptionKey }))}
                        >
                          {showSecrets.azureSubscriptionKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="azureEndpoint">Endpoint</Label>
                      <Input
                        id="azureEndpoint"
                        name="azureEndpoint"
                        placeholder="https://region.api.cognitive.microsoft.com/"
                        defaultValue={ocrSettings?.azureEndpoint}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={ocrMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {ocrMutation.isPending ? "Saving..." : "Save OCR Settings"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Google My Business Reviews</CardTitle>
              <CardDescription>
                Configure Google My Business integration for automated review requests via SMS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Auto Review Requests</h3>
                    <p className="text-sm text-muted-foreground">
                      Automatically send SMS review requests when projects are completed
                    </p>
                  </div>
                  <Switch
                    name="reviewRequestsEnabled"
                    defaultChecked={false}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      name="businessName"
                      placeholder="Your Business Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="locationName">Location Name</Label>
                    <Input
                      id="locationName"
                      name="locationName"
                      placeholder="Main Office"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="googleLocationId">Google Location ID</Label>
                    <Input
                      id="googleLocationId"
                      name="googleLocationId"
                      placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
                    />
                  </div>
                  <div>
                    <Label htmlFor="placeId">Google Place ID</Label>
                    <Input
                      id="placeId"
                      name="placeId"
                      placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="reviewUrl">Google Review URL</Label>
                  <Input
                    id="reviewUrl"
                    name="reviewUrl"
                    placeholder="https://g.page/your-business/review"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    The direct link customers will use to leave reviews
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>SMS Review Request Template</Label>
                  <textarea
                    className="w-full min-h-[100px] p-3 border rounded-md"
                    placeholder="Hi {customerName}! Thanks for choosing {businessName}. We'd love a 5-star review if you're happy with our work: {reviewUrl}"
                    defaultValue="Hi {customerName}! Thanks for choosing {businessName}. We'd love a 5-star review if you're happy with our work: {reviewUrl}"
                  />
                  <p className="text-sm text-muted-foreground">
                    Available variables: &#123;customerName&#125;, &#123;businessName&#125;, &#123;reviewUrl&#125;, &#123;projectName&#125;
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    Save Review Settings
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