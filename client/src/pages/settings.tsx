import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Save, Eye, EyeOff, Upload, X, Download, Database, Clock, AlertTriangle, Map, MessageSquare, FileSignature, Route } from "lucide-react";
import { InvoicePreview } from "@/components/InvoicePreview";
import SoundSettings from "@/components/SoundSettings";
import { FileStorageManager } from "@/components/file-storage-manager";
import { VehicleManagement } from "@/components/vehicle-management";

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
  companyStreetAddress: string;
  companyCity: string;
  companyState: string;
  companyZipCode: string;
  companyCountry: string;
  companyWebsite: string;
  logo: string;
  logoSize: string;
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

type LeadSettings = {
  autoFollowUpEnabled: boolean;
  followUpInterval1: number;
  followUpInterval2: number;
  followUpInterval3: number;
  followUpInterval4: number;
  followUpType1: 'sms' | 'email' | 'call';
  followUpType2: 'sms' | 'email' | 'call';
  followUpType3: 'sms' | 'email' | 'call';
  followUpType4: 'sms' | 'email' | 'call';
  smsTemplate: string;
  emailTemplate: string;
  emailSubject: string;
  callReminder: string;
};

type CalendarSettings = {
  schedulingBufferMinutes: number;
  preventOverlapping: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string[];
  defaultJobDuration: number;
};

type InvoiceSettings = {
  selectedTemplate: string;
  logoPosition: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  showSquareFeet: boolean;
  squareFeetLabel: string;
  templateCustomizations: Record<string, any>;
  taxRate: number;
  defaultCurrency: string;
  invoiceTerms: string;
  invoiceFooter: string;
};

type DashboardSettings = {
  // Widget visibility
  showStatsCards: boolean;
  showRevenueChart: boolean;
  showRecentActivity: boolean;
  showRecentInvoices: boolean;
  showNotifications: boolean;
  showQuickActions: boolean;
  showProjectsOverview: boolean;
  showWeatherWidget: boolean;
  showTasksWidget: boolean;
  showCalendarWidget: boolean;
  showMessagesWidget: boolean;
  showTeamOverview: boolean;
  
  // Layout and appearance
  widgetOrder: string[];
  layoutType: 'grid' | 'list' | 'compact';
  gridColumns: number;
  widgetSize: 'small' | 'medium' | 'large';
  colorTheme: 'default' | 'dark' | 'blue' | 'green' | 'purple';
  animationsEnabled: boolean;
  
  // Widget-specific settings
  statsCardsCount: number;
  recentItemsCount: number;
  refreshInterval: number;
  showWelcomeMessage: boolean;
  compactMode: boolean;
};

type WeatherSettings = {
  defaultZipCode: string;
  enabled: boolean;
  apiKey: string;
};

type DispatchRoutingSettings = {
  defaultStartLocation: string;
  routeOptimization: 'time' | 'distance' | 'traffic';
  avoidTolls: boolean;
  avoidHighways: boolean;
  trafficAware: boolean;
  bufferMinutes: number;
  maxJobsPerRoute: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  lunchBreakStart: string;
  lunchBreakEnd: string;
  autoDispatch: boolean;
  vehicleTabsCount: number;
  maxJobsPerVehicle: string | number;
  showMultiMapView: boolean;
  jobSyncMode: 'automatic' | 'manual' | 'hybrid';
  autoSyncByAssignment: boolean;
  syncOnlyActiveJobs: boolean;
  syncTimeWindow: number; // hours ahead to sync jobs
  notificationSettings: {
    routeUpdates: boolean;
    jobStatusChanges: boolean;
    trafficAlerts: boolean;
  };
};

type BackupSettings = {
  id: number;
  organizationId: number;
  isEnabled: boolean;
  backupFrequency: string;
  backupTime: string;
  retentionDays: number;
  includeCustomers: boolean;
  includeProjects: boolean;
  includeInvoices: boolean;
  includeExpenses: boolean;
  includeFiles: boolean;
  includeImages: boolean;
  includeUsers: boolean;
  includeSettings: boolean;
  includeMessages: boolean;
  storageLocation: string;
  awsS3Bucket?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsRegion: string;
  emailOnSuccess: boolean;
  emailOnFailure: boolean;
  notificationEmails: string[];
  lastBackupAt?: string;
  nextBackupAt?: string;
  createdAt: string;
  updatedAt: string;
};

type BackupJob = {
  id: number;
  organizationId: number;
  status: string;
  type: string;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  recordCount?: number;
  includedTables?: string[];
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  errorMessage?: string;
  retryCount: number;
  createdBy?: number;
  createdAt: string;
};

export default function Settings() {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  // Admin dashboard management state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserDashboard, setSelectedUserDashboard] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

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

  const { data: leadSettings, isLoading: leadLoading } = useQuery<LeadSettings>({
    queryKey: ["/api/lead-settings"],
  });

  const { data: ocrSettings, isLoading: ocrLoading } = useQuery<OcrSettings>({
    queryKey: ["/api/settings/ocr"],
  });

  const { data: calendarSettings, isLoading: calendarLoading } = useQuery<CalendarSettings>({
    queryKey: ["/api/settings/calendar"],
  });

  const { data: invoiceSettings, isLoading: invoiceLoading } = useQuery<InvoiceSettings>({
    queryKey: ["/api/settings/invoice"],
  });

  const { data: dashboardSettings, isLoading: dashboardLoading } = useQuery<DashboardSettings>({
    queryKey: ["/api/dashboard/user-settings"],
  });

  const { data: weatherSettings, isLoading: weatherLoading } = useQuery<WeatherSettings>({
    queryKey: ["/api/settings/weather"],
  });

  const { data: backupSettings, isLoading: backupLoading } = useQuery<BackupSettings>({
    queryKey: ["/api/backup/settings"],
  });

  const { data: backupJobs, isLoading: backupJobsLoading } = useQuery<BackupJob[]>({
    queryKey: ["/api/backup/jobs"],
  });

  // Integration settings query
  const { data: integrationSettings, isLoading: integrationLoading } = useQuery({
    queryKey: ["/api/settings/integrations"],
  });

  // Dispatch routing settings query
  const { data: dispatchSettings, isLoading: dispatchLoading } = useQuery<DispatchRoutingSettings>({
    queryKey: ["/api/settings/dispatch-routing"],
  });

  // Get organization users for admin dashboard management
  const { data: organizationUsers } = useQuery({
    queryKey: ["/api/users"],
    enabled: user?.role === 'admin',
  });

  // Get selected user's dashboard settings
  const { data: selectedUserDashboardData } = useQuery({
    queryKey: ["/api/settings/dashboard", selectedUserId],
    enabled: !!selectedUserId && user?.role === 'admin',
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
        description: "Twilio settings saved successfully. SMS functionality is now configured.",
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

  const twilioTestMutation = useMutation({
    mutationFn: (data: { twilioAccountSid: string; twilioAuthToken: string; twilioPhoneNumber: string }) =>
      apiRequest("POST", "/api/settings/twilio/test", data),
    onSuccess: (response) => {
      toast({
        title: "Connection Successful",
        description: `Connected to ${response.accountName}. Phone number ${response.phoneNumber} verified.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Twilio",
        variant: "destructive",
      });
    },
  });

  const leadSettingsMutation = useMutation({
    mutationFn: (data: Partial<LeadSettings>) =>
      apiRequest("PUT", "/api/lead-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lead-settings"] });
      toast({
        title: "Success",
        description: "Lead settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save lead settings",
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

  const invoiceMutation = useMutation({
    mutationFn: (data: Partial<InvoiceSettings>) =>
      apiRequest("PUT", "/api/settings/invoice", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/invoice"] });
      toast({
        title: "Success",
        description: "Invoice settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save invoice settings",
        variant: "destructive",
      });
    },
  });

  const dashboardMutation = useMutation({
    mutationFn: (data: Partial<DashboardSettings>) =>
      apiRequest("PUT", "/api/settings/dashboard", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/dashboard"] });
      toast({
        title: "Success",
        description: "Dashboard settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save dashboard settings",
        variant: "destructive",
      });
    },
  });

  // Dashboard Profile mutation
  const applyProfileMutation = useMutation({
    mutationFn: (data: { profileType: string }) =>
      apiRequest("POST", "/api/dashboard/apply-profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/user-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/dashboard"] });
      toast({
        title: "Success",
        description: "Dashboard profile applied successfully",
      });
      // Reload the page to show updated dashboard
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply dashboard profile",
        variant: "destructive",
      });
    },
  });

  // Admin mutation for updating user-specific dashboard settings
  const userDashboardMutation = useMutation({
    mutationFn: (data: { userId: number; settings: Partial<DashboardSettings> }) =>
      apiRequest("PUT", `/api/users/${data.userId}/dashboard-settings`, data.settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/dashboard", selectedUserId] });
      toast({
        title: "Success",
        description: "User dashboard settings updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user dashboard settings",
        variant: "destructive",
      });
    },
  });

  // Admin handlers for dashboard management
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedUserDashboard(null);
  };

  const handleSaveUserDashboard = () => {
    if (selectedUserId && selectedUserDashboard) {
      userDashboardMutation.mutate({
        userId: parseInt(selectedUserId),
        settings: selectedUserDashboard
      });
    }
  };

  // Load selected user's dashboard settings when user changes
  React.useEffect(() => {
    if (selectedUserDashboardData) {
      setSelectedUserDashboard(selectedUserDashboardData);
    }
  }, [selectedUserDashboardData]);

  const weatherMutation = useMutation({
    mutationFn: (data: Partial<WeatherSettings>) =>
      apiRequest("PUT", "/api/settings/weather", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/weather"] });
      toast({
        title: "Success",
        description: "Weather settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save weather settings",
        variant: "destructive",
      });
    },
  });

  const backupSettingsMutation = useMutation({
    mutationFn: (data: Partial<BackupSettings>) =>
      apiRequest("PUT", "/api/backup/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backup/settings"] });
      toast({
        title: "Success",
        description: "Backup settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save backup settings",
        variant: "destructive",
      });
    },
  });

  const createBackupMutation = useMutation({
    mutationFn: (options: any) =>
      apiRequest("POST", "/api/backup/create", options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backup/jobs"] });
      toast({
        title: "Backup Started",
        description: "Backup process has been initiated. Check the jobs list for progress.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create backup",
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



  // Handle resetting user dashboard to defaults
  const handleResetUserDashboard = () => {
    const defaultDashboard = {
      showStatsCards: true,
      showRevenueChart: true,
      showRecentActivity: true,
      showRecentInvoices: true,
      showNotifications: true,
      showQuickActions: true,
      showProjectsOverview: false,
      showWeatherWidget: false,
      showTasksWidget: false,
      showCalendarWidget: false,
      showMessagesWidget: false,
      showTeamOverview: false,
    };
    setSelectedUserDashboard(defaultDashboard);
  };

  const reviewMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/reviews/settings', data),
    onSuccess: () => {
      toast({
        title: "Success", 
        description: "Review settings saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save review settings",
        variant: "destructive",
      });
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: (data: Partial<DispatchRoutingSettings>) =>
      apiRequest("PUT", "/api/settings/dispatch-routing", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/dispatch-routing"] });
      toast({
        title: "Success",
        description: "Dispatch routing settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save dispatch routing settings",
        variant: "destructive",
      });
    },
  });

  const integrationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/settings/integrations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/integrations"] });
      toast({
        title: "Success",
        description: "Integration settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save integration settings",
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
      companyStreetAddress: formData.get('companyStreetAddress') as string,
      companyCity: formData.get('companyCity') as string,
      companyState: formData.get('companyState') as string,
      companyZipCode: formData.get('companyZipCode') as string,
      companyCountry: formData.get('companyCountry') as string,
      companyWebsite: formData.get('companyWebsite') as string,
      logoSize: formData.get('logoSize') as string,
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

  const handleTwilioTest = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const data = {
      twilioAccountSid: formData.get('twilioAccountSid') as string,
      twilioAuthToken: formData.get('twilioAuthToken') as string,
      twilioPhoneNumber: formData.get('twilioPhoneNumber') as string,
    };
    
    if (!data.twilioAccountSid || !data.twilioAuthToken || !data.twilioPhoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please fill in Account SID, Auth Token, and Phone Number before testing.",
        variant: "destructive",
      });
      return;
    }
    
    twilioTestMutation.mutate(data);
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

  const handleInvoiceSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Partial<InvoiceSettings> = {
      selectedTemplate: formData.get('selectedTemplate') as string,
      logoPosition: formData.get('logoPosition') as 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right',
      showSquareFeet: formData.get('showSquareFeet') === 'on',
      squareFeetLabel: formData.get('squareFeetLabel') as string,
      taxRate: parseFloat(formData.get('taxRate') as string) || 0,
      defaultCurrency: formData.get('defaultCurrency') as string,
      invoiceTerms: formData.get('invoiceTerms') as string,
      invoiceFooter: formData.get('invoiceFooter') as string,
    };
    invoiceMutation.mutate(data);
  };

  const handleReviewSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      reviewRequestsEnabled: formData.get('reviewRequestsEnabled') === 'on',
      businessName: formData.get('businessName') as string,
      locationName: formData.get('locationName') as string,
      locationId: formData.get('googleLocationId') as string,
      placeId: formData.get('placeId') as string,
      reviewUrl: formData.get('reviewUrl') as string,
      smsTemplate: formData.get('smsTemplate') as string,
    };
    reviewMutation.mutate(data);
  };

  const handleDispatchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Partial<DispatchRoutingSettings> = {
      defaultStartLocation: formData.get('defaultStartLocation') as string,
      routeOptimization: formData.get('routeOptimization') as 'time' | 'distance' | 'traffic',
      avoidTolls: formData.get('avoidTolls') === 'on',
      avoidHighways: formData.get('avoidHighways') === 'on',
      trafficAware: formData.get('trafficAware') === 'on',
      bufferMinutes: parseInt(formData.get('bufferMinutes') as string) || 15,
      maxJobsPerRoute: parseInt(formData.get('maxJobsPerRoute') as string) || 10,
      workingHoursStart: formData.get('workingHoursStart') as string,
      workingHoursEnd: formData.get('workingHoursEnd') as string,
      lunchBreakStart: formData.get('lunchBreakStart') as string,
      lunchBreakEnd: formData.get('lunchBreakEnd') as string,
      autoDispatch: formData.get('autoDispatch') === 'on',
      vehicleTabsCount: parseInt(formData.get('vehicleTabsCount') as string) || 1,
      maxJobsPerVehicle: formData.get('maxJobsPerVehicle') as string || 'unlimited',
      showMultiMapView: formData.get('showMultiMapView') === 'on',
      jobSyncMode: formData.get('jobSyncMode') as 'automatic' | 'manual' | 'hybrid' || 'manual',
      autoSyncByAssignment: formData.get('autoSyncByAssignment') === 'on',
      syncOnlyActiveJobs: formData.get('syncOnlyActiveJobs') === 'on',
      syncTimeWindow: parseInt(formData.get('syncTimeWindow') as string) || 24,
      notificationSettings: {
        routeUpdates: formData.get('routeUpdates') === 'on',
        jobStatusChanges: formData.get('jobStatusChanges') === 'on',
        trafficAlerts: formData.get('trafficAlerts') === 'on',
      }
    };
    dispatchMutation.mutate(data);
  };

  if (paymentLoading || companyLoading || emailLoading || twilioLoading || leadLoading || ocrLoading || calendarLoading || invoiceLoading || dispatchLoading) {
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
        <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1 bg-muted p-1">
          <TabsTrigger value="payment" className="flex-shrink-0">Payment</TabsTrigger>
          <TabsTrigger value="company" className="flex-shrink-0">Company</TabsTrigger>
          <TabsTrigger value="email" className="flex-shrink-0">Email</TabsTrigger>
          <TabsTrigger value="sms" className="flex-shrink-0">SMS</TabsTrigger>
          <TabsTrigger value="leads" className="flex-shrink-0">Leads</TabsTrigger>
          <TabsTrigger value="calendar" className="flex-shrink-0">Calendar</TabsTrigger>
          <TabsTrigger value="ocr" className="flex-shrink-0">OCR</TabsTrigger>
          <TabsTrigger value="reviews" className="flex-shrink-0">Reviews</TabsTrigger>
          <TabsTrigger value="invoices" className="flex-shrink-0">Templates</TabsTrigger>
          <TabsTrigger value="dashboard" className="flex-shrink-0">Dashboard</TabsTrigger>
          <TabsTrigger value="weather" className="flex-shrink-0">Weather</TabsTrigger>
          <TabsTrigger value="backup" className="flex-shrink-0">Backup</TabsTrigger>
          <TabsTrigger value="sounds" className="flex-shrink-0">Sounds</TabsTrigger>
          <TabsTrigger value="storage" className="flex-shrink-0">File Storage</TabsTrigger>
          <TabsTrigger value="vehicles" className="flex-shrink-0">Vehicles</TabsTrigger>
          <TabsTrigger value="dispatch" className="flex-shrink-0">Dispatch Routing</TabsTrigger>
          <TabsTrigger value="integrations" className="flex-shrink-0">Integrations</TabsTrigger>
          <TabsTrigger value="navigation" className="flex-shrink-0">Navigation</TabsTrigger>
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

                <div className="space-y-4">
                  <Label>Company Address (for Invoices)</Label>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="companyStreetAddress">Street Address</Label>
                      <Input
                        id="companyStreetAddress"
                        name="companyStreetAddress"
                        placeholder="123 Main Street"
                        defaultValue={companySettings?.companyStreetAddress}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="companyCity">City</Label>
                        <Input
                          id="companyCity"
                          name="companyCity"
                          placeholder="Dallas"
                          defaultValue={companySettings?.companyCity}
                        />
                      </div>
                      <div>
                        <Label htmlFor="companyState">State</Label>
                        <Input
                          id="companyState"
                          name="companyState"
                          placeholder="TX"
                          defaultValue={companySettings?.companyState}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="companyZipCode">ZIP Code</Label>
                        <Input
                          id="companyZipCode"
                          name="companyZipCode"
                          placeholder="75201"
                          defaultValue={companySettings?.companyZipCode}
                        />
                      </div>
                      <div>
                        <Label htmlFor="companyCountry">Country</Label>
                        <Input
                          id="companyCountry"
                          name="companyCountry"
                          placeholder="United States"
                          defaultValue={companySettings?.companyCountry || "United States"}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="companyAddress">Full Address (Legacy)</Label>
                    <Textarea
                      id="companyAddress"
                      name="companyAddress"
                      placeholder="Complete address for backward compatibility"
                      defaultValue={companySettings?.companyAddress}
                      className="text-sm text-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This field is maintained for backward compatibility. The structured fields above will be used for new invoices.
                    </p>
                  </div>
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

                <div>
                  <Label htmlFor="logoSize">Logo Size</Label>
                  <Select name="logoSize" defaultValue={companySettings?.logoSize || "medium"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select logo size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small (48x48)</SelectItem>
                      <SelectItem value="medium">Medium (64x64)</SelectItem>
                      <SelectItem value="large">Large (96x96)</SelectItem>
                      <SelectItem value="xlarge">Extra Large (128x128)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Controls how large the logo appears on invoices and documents
                  </p>
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      name="twilioEnabled"
                      id="twilioEnabled"
                      defaultChecked={twilioSettings?.twilioEnabled}
                    />
                    <Label htmlFor="twilioEnabled">Enable Twilio SMS</Label>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      twilioSettings?.twilioEnabled && 
                      twilioSettings?.twilioAccountSid && 
                      twilioSettings?.twilioAuthToken && 
                      twilioSettings?.twilioPhoneNumber 
                        ? 'bg-green-500' 
                        : 'bg-gray-300'
                    }`} />
                    <span className="text-sm text-muted-foreground">
                      {twilioSettings?.twilioEnabled && 
                       twilioSettings?.twilioAccountSid && 
                       twilioSettings?.twilioAuthToken && 
                       twilioSettings?.twilioPhoneNumber 
                        ? 'Configured' 
                        : 'Not Configured'}
                    </span>
                  </div>
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

                <div className="flex justify-between items-center">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleTwilioTest}
                    disabled={twilioTestMutation.isPending}
                  >
                    {twilioTestMutation.isPending ? "Testing..." : "Test Connection"}
                  </Button>
                  
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

        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Lead Settings</CardTitle>
              <CardDescription>
                Configure automated follow-up settings for leads management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                leadSettingsMutation.mutate({
                  autoFollowUpEnabled: formData.get('autoFollowUpEnabled') === 'on',
                  followUpInterval1: Number(formData.get('followUpInterval1')),
                  followUpInterval2: Number(formData.get('followUpInterval2')),
                  followUpInterval3: Number(formData.get('followUpInterval3')),
                  followUpInterval4: Number(formData.get('followUpInterval4')),
                  followUpType1: formData.get('followUpType1') as 'sms' | 'email' | 'call',
                  followUpType2: formData.get('followUpType2') as 'sms' | 'email' | 'call',
                  followUpType3: formData.get('followUpType3') as 'sms' | 'email' | 'call',
                  followUpType4: formData.get('followUpType4') as 'sms' | 'email' | 'call',
                  smsTemplate: formData.get('smsTemplate') as string,
                  emailTemplate: formData.get('emailTemplate') as string,
                  emailSubject: formData.get('emailSubject') as string,
                  callReminder: formData.get('callReminder') as string,
                });
              }} className="space-y-6">
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Enable Automated Follow-ups</h3>
                    <p className="text-sm text-muted-foreground">
                      Automatically send follow-up messages to leads at custom intervals
                    </p>
                  </div>
                  <Switch
                    name="autoFollowUpEnabled"
                    defaultChecked={leadSettings?.autoFollowUpEnabled || false}
                  />
                </div>

                <Separator />

                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Follow-up Schedule</h3>
                  
                  {[1, 2, 3, 4].map((num) => (
                    <div key={num} className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                      <div>
                        <Label htmlFor={`followUpInterval${num}`}>Follow-up #{num} - Days After</Label>
                        <Input
                          id={`followUpInterval${num}`}
                          name={`followUpInterval${num}`}
                          type="number"
                          min="1"
                          max="365"
                          placeholder="7"
                          defaultValue={leadSettings?.[`followUpInterval${num}` as keyof LeadSettings] || (num === 1 ? 1 : num === 2 ? 3 : num === 3 ? 7 : 14)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`followUpType${num}`}>Type</Label>
                        <Select name={`followUpType${num}`} defaultValue={leadSettings?.[`followUpType${num}` as keyof LeadSettings] || 'sms'}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="call">Call Reminder</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <p className="text-sm text-muted-foreground">
                          {num === 1 && "Initial follow-up"}
                          {num === 2 && "Second attempt"}
                          {num === 3 && "Third attempt"}
                          {num === 4 && "Final attempt"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Message Templates</h3>
                  
                  <div>
                    <Label htmlFor="smsTemplate">SMS Template</Label>
                    <Textarea
                      id="smsTemplate"
                      name="smsTemplate"
                      placeholder="Hi {name}, we wanted to follow up on your recent inquiry about our services. Are you still interested in learning more?"
                      defaultValue={leadSettings?.smsTemplate}
                      className="min-h-[80px]"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Use {`{name}`} for customer name, {`{service}`} for service type
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="emailSubject">Email Subject</Label>
                    <Input
                      id="emailSubject"
                      name="emailSubject"
                      placeholder="Following up on your service inquiry"
                      defaultValue={leadSettings?.emailSubject}
                    />
                  </div>

                  <div>
                    <Label htmlFor="emailTemplate">Email Template</Label>
                    <Textarea
                      id="emailTemplate"
                      name="emailTemplate"
                      placeholder="Dear {name},\n\nWe wanted to follow up on your recent inquiry about our {service} services. We're here to answer any questions you might have and provide you with a personalized quote.\n\nBest regards,\nYour Service Team"
                      defaultValue={leadSettings?.emailTemplate}
                      className="min-h-[120px]"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Use {`{name}`} for customer name, {`{service}`} for service type
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="callReminder">Call Reminder Notes</Label>
                    <Textarea
                      id="callReminder"
                      name="callReminder"
                      placeholder="Remind to call {name} about {service} inquiry. Review previous conversations and prepare personalized quote."
                      defaultValue={leadSettings?.callReminder}
                      className="min-h-[80px]"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Template for call reminder tasks. Use {`{name}`} for customer name, {`{service}`} for service type
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={leadSettingsMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {leadSettingsMutation.isPending ? "Saving..." : "Save Lead Settings"}
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
                    <h3 className="text-lg font-medium">Enable OCR Recognition</h3>
                    <p className="text-sm text-muted-foreground">
                      Enable optical character recognition for automatic receipt scanning and data extraction
                    </p>
                  </div>
                  <Switch
                    name="ocrEnabled"
                    defaultChecked={ocrSettings?.ocrEnabled || false}
                  />
                </div>

                {ocrSettings?.ocrEnabled !== false && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>OCR is enabled.</strong> Configure your preferred provider below to start processing receipts and documents automatically.
                    </p>
                  </div>
                )}

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
              <form onSubmit={handleReviewSubmit} className="space-y-6">
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
                    name="smsTemplate"
                    className="w-full min-h-[100px] p-3 border rounded-md"
                    placeholder="Hi {customerName}! Thanks for choosing {businessName}. We'd love a 5-star review if you're happy with our work: {reviewUrl}"
                    defaultValue="Hi {customerName}! Thanks for choosing {businessName}. We'd love a 5-star review if you're happy with our work: {reviewUrl}"
                  />
                  <p className="text-sm text-muted-foreground">
                    Available variables: &#123;customerName&#125;, &#123;businessName&#125;, &#123;reviewUrl&#125;, &#123;projectName&#125;
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={reviewMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {reviewMutation.isPending ? "Saving..." : "Save Review Settings"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Templates</CardTitle>
              <CardDescription>
                Customize your invoice appearance with professional templates and add custom fields
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvoiceSubmit} className="space-y-6">
                {/* Template Selection */}
                <div className="space-y-4">
                  <Label htmlFor="selectedTemplate">Choose Invoice Template</Label>
                  <Select name="selectedTemplate" defaultValue={invoiceSettings?.selectedTemplate || "classic"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Classic Professional</SelectItem>
                      <SelectItem value="modern">Modern Minimal</SelectItem>
                      <SelectItem value="corporate">Corporate Blue</SelectItem>
                      <SelectItem value="elegant">Elegant Gray</SelectItem>
                      <SelectItem value="creative">Creative Colorful</SelectItem>
                      <SelectItem value="simple">Simple Clean</SelectItem>
                      <SelectItem value="bold">Bold Statement</SelectItem>
                      <SelectItem value="luxury">Luxury Gold</SelectItem>
                      <SelectItem value="tech">Tech Gradient</SelectItem>
                      <SelectItem value="vintage">Vintage Style</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Logo Position */}
                <div className="space-y-4">
                  <Label htmlFor="logoPosition">Logo Position</Label>
                  <Select name="logoPosition" defaultValue={invoiceSettings?.logoPosition || "top-left"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select logo position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="top-center">Top Center</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-center">Bottom Center</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Square Feet Field */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      name="showSquareFeet"
                      id="showSquareFeet"
                      defaultChecked={invoiceSettings?.showSquareFeet || false}
                    />
                    <Label htmlFor="showSquareFeet">Include Square Feet Field</Label>
                  </div>
                  
                  <div>
                    <Label htmlFor="squareFeetLabel">Square Feet Field Label</Label>
                    <Input
                      id="squareFeetLabel"
                      name="squareFeetLabel"
                      placeholder="Square Feet"
                      defaultValue={invoiceSettings?.squareFeetLabel || "Square Feet"}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Customize the label for the square footage field on invoices
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Invoice Footer Settings */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Invoice Footer Settings</Label>
                  <p className="text-sm text-muted-foreground">
                    Configure default values that appear on all invoices
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                      <Input
                        id="taxRate"
                        name="taxRate"
                        type="number"
                        step="0.01"
                        placeholder="8.25"
                        defaultValue={invoiceSettings?.taxRate}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Applied to all invoices unless overridden
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="defaultCurrency">Default Currency</Label>
                      <Select name="defaultCurrency" defaultValue={invoiceSettings?.defaultCurrency || "USD"}>
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
                      <p className="text-xs text-muted-foreground mt-1">
                        Currency symbol used on invoices
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="invoiceTerms">Invoice Terms</Label>
                    <Textarea
                      id="invoiceTerms"
                      name="invoiceTerms"
                      placeholder="Payment is due within 30 days of invoice date. Late payments may incur additional fees."
                      defaultValue={invoiceSettings?.invoiceTerms}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Payment terms and conditions that appear on invoices
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="invoiceFooter">Invoice Footer Message</Label>
                    <Textarea
                      id="invoiceFooter"
                      name="invoiceFooter"
                      placeholder="Thank you for your business! We appreciate your trust in our services."
                      defaultValue={invoiceSettings?.invoiceFooter}
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Custom message that appears at the bottom of invoices
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Template Previews */}
                <div className="space-y-4">
                  <Label>Template Previews</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { id: 'classic', name: 'Classic Professional', color: '#1f2937' },
                      { id: 'modern', name: 'Modern Minimal', color: '#6b7280' },
                      { id: 'corporate', name: 'Corporate Blue', color: '#2563eb' },
                      { id: 'elegant', name: 'Elegant Gray', color: '#374151' },
                      { id: 'creative', name: 'Creative Colorful', color: '#7c3aed' },
                      { id: 'simple', name: 'Simple Clean', color: '#059669' },
                      { id: 'bold', name: 'Bold Statement', color: '#dc2626' },
                      { id: 'luxury', name: 'Luxury Gold', color: '#d97706' },
                      { id: 'tech', name: 'Tech Gradient', color: '#0891b2' },
                      { id: 'vintage', name: 'Vintage Style', color: '#92400e' }
                    ].map((template) => (
                      <div key={template.id} className="border rounded-lg p-4 hover:border-primary transition-colors">
                        <div 
                          className="w-full h-20 rounded mb-3 flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: template.color }}
                        >
                          LOGO
                        </div>
                        <p className="text-sm font-medium text-center mb-3">{template.name}</p>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full">
                              <Eye className="h-4 w-4 mr-2" />
                              Preview Invoice
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{template.name} - Invoice Preview</DialogTitle>
                            </DialogHeader>
                            <div className="mt-4">
                              <InvoicePreview 
                                template={template.id}
                                logoPosition={invoiceSettings?.logoPosition || 'top-left'}
                                showSquareFeet={invoiceSettings?.showSquareFeet || false}
                                squareFeetLabel={invoiceSettings?.squareFeetLabel || 'Square Feet'}
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={invoiceMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {invoiceMutation.isPending ? "Saving..." : "Save Invoice Settings"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Customization</CardTitle>
              <CardDescription>
                Choose which widgets and sections to display on your dashboard home page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {dashboardLoading ? (
                <div>Loading dashboard settings...</div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target as HTMLFormElement);
                    const settings = {
                      // Widget visibility
                      showStatsCards: formData.get("showStatsCards") === "on",
                      showRevenueChart: formData.get("showRevenueChart") === "on",
                      showRecentActivity: formData.get("showRecentActivity") === "on",
                      showRecentInvoices: formData.get("showRecentInvoices") === "on",
                      showNotifications: formData.get("showNotifications") === "on",
                      showQuickActions: formData.get("showQuickActions") === "on",
                      showProjectsOverview: formData.get("showProjectsOverview") === "on",
                      showWeatherWidget: formData.get("showWeatherWidget") === "on",
                      showTasksWidget: formData.get("showTasksWidget") === "on",
                      showCalendarWidget: formData.get("showCalendarWidget") === "on",
                      showMessagesWidget: formData.get("showMessagesWidget") === "on",
                      showTeamOverview: formData.get("showTeamOverview") === "on",
                      
                      // Layout and appearance
                      layoutType: formData.get("layoutType") as string || "grid",
                      gridColumns: parseInt(formData.get("gridColumns") as string || "3"),
                      widgetSize: formData.get("widgetSize") as string || "medium",
                      colorTheme: formData.get("colorTheme") as string || "default",
                      animationsEnabled: formData.get("animationsEnabled") === "on",
                      
                      // Widget-specific settings
                      statsCardsCount: parseInt(formData.get("statsCardsCount") as string || "4"),
                      recentItemsCount: parseInt(formData.get("recentItemsCount") as string || "5"),
                      refreshInterval: parseInt(formData.get("refreshInterval") as string || "30"),
                      showWelcomeMessage: formData.get("showWelcomeMessage") === "on",
                      compactMode: formData.get("compactMode") === "on",
                      
                      widgetOrder: dashboardSettings?.widgetOrder || ['stats', 'revenue', 'activity', 'invoices']
                    };
                    dashboardMutation.mutate(settings);
                  }}
                  className="space-y-8"
                >
                  <div className="grid gap-8">
                    {/* Admin Dashboard Control Section */}
                    {user?.role === 'admin' && (
                      <div className="bg-blue-50 dark:bg-blue-950 p-6 rounded-lg border border-blue-200 dark:border-blue-800 space-y-4">
                        <div className="flex items-center gap-2">
                          <Settings className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">Admin Dashboard Control</h3>
                        </div>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          As an admin, you can control which dashboard widgets each team member can see and customize.
                        </p>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="userSelect" className="text-blue-900 dark:text-blue-100">
                              Select Team Member
                            </Label>
                            <Select 
                              value={selectedUserId || ''} 
                              onValueChange={setSelectedUserId}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Choose a team member to manage their dashboard..." />
                              </SelectTrigger>
                              <SelectContent>
                                {organizationUsers?.map((orgUser: any) => (
                                  <SelectItem key={orgUser.id} value={orgUser.id.toString()}>
                                    {orgUser.firstName} {orgUser.lastName} ({orgUser.email}) - {orgUser.role}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                              Select a team member to customize their dashboard widget permissions
                            </p>
                          </div>

                          {selectedUserId && (
                            <div className="bg-white dark:bg-gray-900 p-4 rounded border">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium">
                                  Dashboard Permissions for {organizationUsers?.find((u: any) => u.id.toString() === selectedUserId)?.firstName} {organizationUsers?.find((u: any) => u.id.toString() === selectedUserId)?.lastName}
                                </h4>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleResetUserDashboard}
                                  disabled={dashboardUpdateMutation.isPending}
                                >
                                  Reset to Default
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                {[
                                  { key: 'showStatsCards', label: 'Stats Cards' },
                                  { key: 'showRevenueChart', label: 'Revenue Chart' },
                                  { key: 'showRecentActivity', label: 'Recent Activity' },
                                  { key: 'showRecentInvoices', label: 'Recent Invoices' },
                                  { key: 'showNotifications', label: 'Notifications' },
                                  { key: 'showQuickActions', label: 'Quick Actions' },
                                  { key: 'showProjectsOverview', label: 'Projects Overview' },
                                  { key: 'showWeatherWidget', label: 'Weather Widget' },
                                  { key: 'showTasksWidget', label: 'My Tasks' },
                                  { key: 'showCalendarWidget', label: 'Calendar Widget' },
                                  { key: 'showMessagesWidget', label: 'Team Messages' },
                                  { key: 'showTeamOverview', label: 'Team Overview' }
                                ].map((widget) => (
                                  <div key={widget.key} className="flex items-center justify-between">
                                    <Label htmlFor={`admin_${widget.key}`} className="text-xs">
                                      {widget.label}
                                    </Label>
                                    <Switch
                                      id={`admin_${widget.key}`}
                                      checked={selectedUserDashboard?.[widget.key] ?? true}
                                      onCheckedChange={(checked) => 
                                        setSelectedUserDashboard((prev: any) => ({
                                          ...prev,
                                          [widget.key]: checked
                                        }))
                                      }
                                    />
                                  </div>
                                ))}
                              </div>
                              
                              <div className="mt-4 flex gap-2">
                                <Button
                                  type="button"
                                  onClick={handleSaveUserDashboard}
                                  disabled={userDashboardMutation.isPending}
                                  size="sm"
                                >
                                  {userDashboardMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setSelectedUserId(null)}
                                  size="sm"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded">
                          <p className="text-xs text-amber-800 dark:text-amber-200">
                            <strong>Note:</strong> Changes you make here will override the user's personal dashboard settings. 
                            Users will see a notice that their dashboard is managed by an administrator.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Dashboard Profile Section */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium">Dashboard Profile</h3>
                        <p className="text-sm text-muted-foreground">
                          Choose a pre-configured dashboard layout for your role.
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2 p-3 border rounded-lg">
                            <input
                              type="radio"
                              id="profile-user"
                              name="dashboardProfile"
                              value="user"
                              className="text-blue-600"
                              defaultChecked={(dashboardSettings as any)?.profileType === 'user' || !(dashboardSettings as any)?.profileType}
                            />
                            <label htmlFor="profile-user" className="cursor-pointer flex-1">
                              <div className="font-medium">User Dashboard</div>
                              <div className="text-xs text-muted-foreground">Basic widgets for field workers</div>
                            </label>
                          </div>
                          
                          <div className="flex items-center space-x-2 p-3 border rounded-lg">
                            <input
                              type="radio"
                              id="profile-manager"
                              name="dashboardProfile"
                              value="manager"
                              className="text-blue-600"
                              defaultChecked={(dashboardSettings as any)?.profileType === 'manager'}
                            />
                            <label htmlFor="profile-manager" className="cursor-pointer flex-1">
                              <div className="font-medium">Manager Dashboard</div>
                              <div className="text-xs text-muted-foreground">Enhanced view for supervisors</div>
                            </label>
                          </div>
                          
                          <div className="flex items-center space-x-2 p-3 border rounded-lg">
                            <input
                              type="radio"
                              id="profile-admin"
                              name="dashboardProfile"
                              value="admin"
                              className="text-blue-600"
                              defaultChecked={(dashboardSettings as any)?.profileType === 'admin'}
                            />
                            <label htmlFor="profile-admin" className="cursor-pointer flex-1">
                              <div className="font-medium">Admin Dashboard</div>
                              <div className="text-xs text-muted-foreground">Complete overview for administrators</div>
                            </label>
                          </div>
                          
                          <div className="flex items-center space-x-2 p-3 border rounded-lg">
                            <input
                              type="radio"
                              id="profile-hr"
                              name="dashboardProfile"
                              value="hr"
                              className="text-blue-600"
                              defaultChecked={(dashboardSettings as any)?.profileType === 'hr'}
                            />
                            <label htmlFor="profile-hr" className="cursor-pointer flex-1">
                              <div className="font-medium">HR Dashboard</div>
                              <div className="text-xs text-muted-foreground">People-focused HR tools</div>
                            </label>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const selectedProfile = document.querySelector('input[name="dashboardProfile"]:checked') as HTMLInputElement;
                              if (selectedProfile) {
                                const profileType = selectedProfile.value;
                                applyProfileMutation.mutate({ profileType });
                              }
                            }}
                            disabled={applyProfileMutation.isPending}
                          >
                            {applyProfileMutation.isPending ? 'Applying...' : 'Apply Profile'}
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            This will override your current widget settings
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Widget Visibility Section */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium">Dashboard Widgets</h3>
                        <p className="text-sm text-muted-foreground">
                          Choose which widgets appear on your dashboard and customize their behavior.
                        </p>
                      </div>
                      
                      <div className="grid gap-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="showStatsCards">Stats Cards</Label>
                            <p className="text-sm text-muted-foreground">
                              Revenue, invoices, and performance metrics
                            </p>
                          </div>
                          <Switch
                            id="showStatsCards"
                            name="showStatsCards"
                            defaultChecked={dashboardSettings?.showStatsCards ?? true}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="showRevenueChart">Revenue Chart</Label>
                            <p className="text-sm text-muted-foreground">
                              Monthly revenue and growth trends
                            </p>
                          </div>
                          <Switch
                            id="showRevenueChart"
                            name="showRevenueChart"
                            defaultChecked={dashboardSettings?.showRevenueChart ?? true}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="showRecentActivity">Recent Activity</Label>
                            <p className="text-sm text-muted-foreground">
                              Latest projects and system activity
                            </p>
                          </div>
                          <Switch
                            id="showRecentActivity"
                            name="showRecentActivity"
                            defaultChecked={dashboardSettings?.showRecentActivity ?? true}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="showRecentInvoices">Recent Invoices</Label>
                            <p className="text-sm text-muted-foreground">
                              Latest invoices and payment status
                            </p>
                          </div>
                          <Switch
                            id="showRecentInvoices"
                            name="showRecentInvoices"
                            defaultChecked={dashboardSettings?.showRecentInvoices ?? true}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="showNotifications">Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                              Alert badge on notification bell
                            </p>
                          </div>
                          <Switch
                            id="showNotifications"
                            name="showNotifications"
                            defaultChecked={dashboardSettings?.showNotifications ?? true}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="showQuickActions">Quick Actions</Label>
                            <p className="text-sm text-muted-foreground">
                              "New Invoice" button and other quick actions
                            </p>
                          </div>
                          <Switch
                            id="showQuickActions"
                            name="showQuickActions"
                            defaultChecked={dashboardSettings?.showQuickActions ?? true}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="showProjectsOverview">Projects Overview</Label>
                            <p className="text-sm text-muted-foreground">
                              Active projects status and progress tracking
                            </p>
                          </div>
                          <Switch
                            id="showProjectsOverview"
                            name="showProjectsOverview"
                            defaultChecked={dashboardSettings?.showProjectsOverview ?? false}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="showWeatherWidget">Weather Widget</Label>
                            <p className="text-sm text-muted-foreground">
                              Current weather conditions and forecast
                            </p>
                          </div>
                          <Switch
                            id="showWeatherWidget"
                            name="showWeatherWidget"
                            defaultChecked={dashboardSettings?.showWeatherWidget ?? false}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="showTasksWidget">My Tasks</Label>
                            <p className="text-sm text-muted-foreground">
                              Assigned tasks and deadlines overview
                            </p>
                          </div>
                          <Switch
                            id="showTasksWidget"
                            name="showTasksWidget"
                            defaultChecked={dashboardSettings?.showTasksWidget ?? false}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="showCalendarWidget">Calendar Widget</Label>
                            <p className="text-sm text-muted-foreground">
                              Upcoming appointments and schedule preview
                            </p>
                          </div>
                          <Switch
                            id="showCalendarWidget"
                            name="showCalendarWidget"
                            defaultChecked={dashboardSettings?.showCalendarWidget ?? false}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="showMessagesWidget">Team Messages</Label>
                            <p className="text-sm text-muted-foreground">
                              Recent team communications and alerts
                            </p>
                          </div>
                          <Switch
                            id="showMessagesWidget"
                            name="showMessagesWidget"
                            defaultChecked={dashboardSettings?.showMessagesWidget ?? false}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="showTeamOverview">Team Overview</Label>
                            <p className="text-sm text-muted-foreground">
                              Team status, time tracking, and productivity metrics
                            </p>
                          </div>
                          <Switch
                            id="showTeamOverview"
                            name="showTeamOverview"
                            defaultChecked={dashboardSettings?.showTeamOverview ?? false}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Layout Customization Section */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium">Layout & Appearance</h3>
                        <p className="text-sm text-muted-foreground">
                          Customize how your dashboard looks and feels.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="layoutType">Layout Type</Label>
                          <Select name="layoutType" defaultValue={dashboardSettings?.layoutType || "grid"}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="grid">Grid Layout</SelectItem>
                              <SelectItem value="list">List Layout</SelectItem>
                              <SelectItem value="compact">Compact Layout</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            How widgets are arranged on your dashboard
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="gridColumns">Grid Columns</Label>
                          <Select name="gridColumns" defaultValue={dashboardSettings?.gridColumns?.toString() || "3"}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2">2 Columns</SelectItem>
                              <SelectItem value="3">3 Columns</SelectItem>
                              <SelectItem value="4">4 Columns</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Number of columns in grid layout
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="widgetSize">Widget Size</Label>
                          <Select name="widgetSize" defaultValue={dashboardSettings?.widgetSize || "medium"}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Small</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="large">Large</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Default size for dashboard widgets
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="colorTheme">Color Theme</Label>
                          <Select name="colorTheme" defaultValue={dashboardSettings?.colorTheme || "default"}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Default</SelectItem>
                              <SelectItem value="dark">Dark Mode</SelectItem>
                              <SelectItem value="blue">Blue Theme</SelectItem>
                              <SelectItem value="green">Green Theme</SelectItem>
                              <SelectItem value="purple">Purple Theme</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Color scheme for dashboard widgets
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="animationsEnabled">Smooth Animations</Label>
                          <p className="text-sm text-muted-foreground">
                            Enable smooth transitions and animations
                          </p>
                        </div>
                        <Switch
                          id="animationsEnabled"
                          name="animationsEnabled"
                          defaultChecked={dashboardSettings?.animationsEnabled ?? true}
                        />
                      </div>
                    </div>

                    {/* Widget Behavior Section */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium">Widget Behavior</h3>
                        <p className="text-sm text-muted-foreground">
                          Fine-tune how widgets behave and update.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="statsCardsCount">Stats Cards Count</Label>
                          <Select name="statsCardsCount" defaultValue={dashboardSettings?.statsCardsCount?.toString() || "4"}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3">3 Cards</SelectItem>
                              <SelectItem value="4">4 Cards</SelectItem>
                              <SelectItem value="5">5 Cards</SelectItem>
                              <SelectItem value="6">6 Cards</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Number of stats cards to display
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="recentItemsCount">Recent Items Count</Label>
                          <Select name="recentItemsCount" defaultValue={dashboardSettings?.recentItemsCount?.toString() || "5"}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3">3 Items</SelectItem>
                              <SelectItem value="5">5 Items</SelectItem>
                              <SelectItem value="10">10 Items</SelectItem>
                              <SelectItem value="15">15 Items</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Number of recent items to show in lists
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="refreshInterval">Auto-Refresh (seconds)</Label>
                          <Select name="refreshInterval" defaultValue={dashboardSettings?.refreshInterval?.toString() || "30"}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15">15 seconds</SelectItem>
                              <SelectItem value="30">30 seconds</SelectItem>
                              <SelectItem value="60">1 minute</SelectItem>
                              <SelectItem value="300">5 minutes</SelectItem>
                              <SelectItem value="0">Disabled</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            How often data refreshes automatically
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="showWelcomeMessage">Welcome Message</Label>
                          <p className="text-sm text-muted-foreground">
                            Show personalized welcome message at the top
                          </p>
                        </div>
                        <Switch
                          id="showWelcomeMessage"
                          name="showWelcomeMessage"
                          defaultChecked={dashboardSettings?.showWelcomeMessage ?? true}
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="compactMode">Compact Mode</Label>
                          <p className="text-sm text-muted-foreground">
                            Reduce padding and spacing for more content
                          </p>
                        </div>
                        <Switch
                          id="compactMode"
                          name="compactMode"
                          defaultChecked={dashboardSettings?.compactMode ?? false}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Navigation Order Reset Section */}
                  <div className="space-y-4 border-t pt-6">
                    <div>
                      <h3 className="text-lg font-medium">Navigation Sidebar</h3>
                      <p className="text-sm text-muted-foreground">
                        Manage your sidebar navigation tab order.
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base">Reset Sidebar Tabs to Default Order</Label>
                        <p className="text-sm text-muted-foreground">
                          Restore the navigation tabs to their original default order. This will undo any custom reordering.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await apiRequest("DELETE", "/api/navigation-order");
                            queryClient.invalidateQueries({ queryKey: ["/api/navigation-order"] });
                            toast({
                              title: "Success",
                              description: "Navigation order reset to default successfully",
                            });
                          } catch (error: any) {
                            toast({
                              title: "Error",
                              description: error.message || "Failed to reset navigation order",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Reset to Default
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={dashboardMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {dashboardMutation.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weather">
          <Card>
            <CardHeader>
              <CardTitle>Weather Settings</CardTitle>
              <CardDescription>
                Configure weather functionality and default location settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {weatherLoading ? (
                <div>Loading weather settings...</div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target as HTMLFormElement);
                    const settings = {
                      enabled: formData.get("enabled") === "on",
                      defaultZipCode: formData.get("defaultZipCode") as string,
                      apiKey: formData.get("apiKey") as string,
                    };
                    weatherMutation.mutate(settings);
                  }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="enabled">Enable Weather</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable weather functionality across the application
                        </p>
                      </div>
                      <Switch
                        id="enabled"
                        name="enabled"
                        defaultChecked={weatherSettings?.enabled ?? true}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="defaultZipCode">Default Zip Code</Label>
                      <Input
                        id="defaultZipCode"
                        name="defaultZipCode"
                        placeholder="Enter default zip code (e.g., 75006)"
                        defaultValue={weatherSettings?.defaultZipCode || ""}
                        className="max-w-xs"
                      />
                      <p className="text-sm text-muted-foreground">
                        This zip code will be used as the default location for weather displays when no specific location is provided.
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="apiKey">Weather API Key</Label>
                      <div className="relative max-w-md">
                        <Input
                          id="apiKey"
                          name="apiKey"
                          type={showSecrets.weatherApiKey ? "text" : "password"}
                          placeholder="Enter your weather API key"
                          defaultValue={weatherSettings?.apiKey || ""}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2"
                          onClick={() => toggleSecretVisibility('weatherApiKey')}
                        >
                          {showSecrets.weatherApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        API key for weather data service (e.g., WeatherAPI.com or OpenWeatherMap).
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={weatherMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {weatherMutation.isPending ? "Saving..." : "Save Weather Settings"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Backup & Recovery Settings
              </CardTitle>
              <CardDescription>
                Configure automated backups and manage data recovery options
              </CardDescription>
            </CardHeader>
            <CardContent>
              {backupLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Backup Settings Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target as HTMLFormElement);
                      const settings = {
                        isEnabled: formData.get("isEnabled") === "on",
                        backupFrequency: formData.get("backupFrequency") as string,
                        backupTime: formData.get("backupTime") as string,
                        retentionDays: parseInt(formData.get("retentionDays") as string),
                        includeCustomers: formData.get("includeCustomers") === "on",
                        includeProjects: formData.get("includeProjects") === "on",
                        includeInvoices: formData.get("includeInvoices") === "on",
                        includeExpenses: formData.get("includeExpenses") === "on",
                        includeFiles: formData.get("includeFiles") === "on",
                        includeImages: formData.get("includeImages") === "on",
                        includeUsers: formData.get("includeUsers") === "on",
                        includeSettings: formData.get("includeSettings") === "on",
                        includeMessages: formData.get("includeMessages") === "on",
                        storageLocation: formData.get("storageLocation") as string,
                        awsS3Bucket: formData.get("awsS3Bucket") as string,
                        awsAccessKey: formData.get("awsAccessKey") as string,
                        awsSecretKey: formData.get("awsSecretKey") as string,
                        awsRegion: formData.get("awsRegion") as string,
                        emailOnSuccess: formData.get("emailOnSuccess") === "on",
                        emailOnFailure: formData.get("emailOnFailure") === "on",
                        notificationEmails: (formData.get("notificationEmails") as string).split(',').map(e => e.trim()).filter(e => e)
                      };
                      backupSettingsMutation.mutate(settings);
                    }}
                    className="space-y-6"
                  >
                    {/* Basic Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Basic Settings</h3>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="isEnabled">Enable Automated Backups</Label>
                          <p className="text-sm text-muted-foreground">
                            Automatically create backups based on the schedule below
                          </p>
                        </div>
                        <Switch
                          id="isEnabled"
                          name="isEnabled"
                          defaultChecked={backupSettings?.isEnabled ?? true}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="backupFrequency">Backup Frequency</Label>
                          <Select name="backupFrequency" defaultValue={backupSettings?.backupFrequency || "weekly"}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="backupTime">Backup Time</Label>
                          <Input
                            id="backupTime"
                            name="backupTime"
                            type="time"
                            defaultValue={backupSettings?.backupTime || "02:00"}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="retentionDays">Retention (Days)</Label>
                          <Input
                            id="retentionDays"
                            name="retentionDays"
                            type="number"
                            min="1"
                            max="365"
                            defaultValue={backupSettings?.retentionDays || 30}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Data Selection */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Data to Include</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="includeCustomers"
                            name="includeCustomers"
                            defaultChecked={backupSettings?.includeCustomers ?? true}
                          />
                          <Label htmlFor="includeCustomers">Customers</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="includeProjects"
                            name="includeProjects"
                            defaultChecked={backupSettings?.includeProjects ?? true}
                          />
                          <Label htmlFor="includeProjects">Projects</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="includeInvoices"
                            name="includeInvoices"
                            defaultChecked={backupSettings?.includeInvoices ?? true}
                          />
                          <Label htmlFor="includeInvoices">Invoices</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="includeExpenses"
                            name="includeExpenses"
                            defaultChecked={backupSettings?.includeExpenses ?? true}
                          />
                          <Label htmlFor="includeExpenses">Expenses</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="includeUsers"
                            name="includeUsers"
                            defaultChecked={backupSettings?.includeUsers ?? true}
                          />
                          <Label htmlFor="includeUsers">Users</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="includeSettings"
                            name="includeSettings"
                            defaultChecked={backupSettings?.includeSettings ?? true}
                          />
                          <Label htmlFor="includeSettings">Settings</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="includeFiles"
                            name="includeFiles"
                            defaultChecked={backupSettings?.includeFiles ?? false}
                          />
                          <Label htmlFor="includeFiles">Files</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="includeImages"
                            name="includeImages"
                            defaultChecked={backupSettings?.includeImages ?? false}
                          />
                          <Label htmlFor="includeImages">Images</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="includeMessages"
                            name="includeMessages"
                            defaultChecked={backupSettings?.includeMessages ?? false}
                          />
                          <Label htmlFor="includeMessages">Messages</Label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Storage Location */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Storage Configuration</h3>
                      
                      <div>
                        <Label htmlFor="storageLocation">Storage Location</Label>
                        <Select name="storageLocation" defaultValue={backupSettings?.storageLocation || "local"}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select storage location" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="local">Local Storage</SelectItem>
                            <SelectItem value="aws_s3">AWS S3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* AWS S3 Settings - shown conditionally based on storage location */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="awsS3Bucket">S3 Bucket Name</Label>
                          <Input
                            id="awsS3Bucket"
                            name="awsS3Bucket"
                            placeholder="my-backup-bucket"
                            defaultValue={backupSettings?.awsS3Bucket || ""}
                          />
                        </div>
                        <div>
                          <Label htmlFor="awsRegion">AWS Region</Label>
                          <Input
                            id="awsRegion"
                            name="awsRegion"
                            placeholder="us-east-1"
                            defaultValue={backupSettings?.awsRegion || "us-east-1"}
                          />
                        </div>
                        <div>
                          <Label htmlFor="awsAccessKey">AWS Access Key</Label>
                          <div className="relative">
                            <Input
                              id="awsAccessKey"
                              name="awsAccessKey"
                              type={showSecrets.awsAccessKey ? "text" : "password"}
                              placeholder="AKIAIOSFODNN7EXAMPLE"
                              defaultValue={backupSettings?.awsAccessKey || ""}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 -translate-y-1/2"
                              onClick={() => toggleSecretVisibility('awsAccessKey')}
                            >
                              {showSecrets.awsAccessKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="awsSecretKey">AWS Secret Key</Label>
                          <div className="relative">
                            <Input
                              id="awsSecretKey"
                              name="awsSecretKey"
                              type={showSecrets.awsSecretKey ? "text" : "password"}
                              placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                              defaultValue={backupSettings?.awsSecretKey || ""}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 -translate-y-1/2"
                              onClick={() => toggleSecretVisibility('awsSecretKey')}
                            >
                              {showSecrets.awsSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Notification Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Notifications</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="emailOnSuccess"
                            name="emailOnSuccess"
                            defaultChecked={backupSettings?.emailOnSuccess ?? false}
                          />
                          <Label htmlFor="emailOnSuccess">Email on Backup Success</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="emailOnFailure"
                            name="emailOnFailure"
                            defaultChecked={backupSettings?.emailOnFailure ?? true}
                          />
                          <Label htmlFor="emailOnFailure">Email on Backup Failure</Label>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="notificationEmails">Notification Email Addresses</Label>
                        <Input
                          id="notificationEmails"
                          name="notificationEmails"
                          placeholder="admin@company.com, backup@company.com"
                          defaultValue={backupSettings?.notificationEmails?.join(', ') || ""}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Enter email addresses separated by commas
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={backupSettingsMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {backupSettingsMutation.isPending ? "Saving..." : "Save Backup Settings"}
                      </Button>
                    </div>
                  </form>

                  <Separator />

                  {/* Manual Backup and Job History */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium">Manual Backup</h3>
                        <p className="text-sm text-muted-foreground">
                          Create an immediate backup of your data
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          createBackupMutation.mutate({
                            type: 'manual',
                            includeFiles: true,
                            includeImages: true
                          });
                        }}
                        disabled={createBackupMutation.isPending}
                      >
                        <Database className="w-4 h-4 mr-2" />
                        {createBackupMutation.isPending ? "Creating..." : "Create Backup Now"}
                      </Button>
                    </div>

                    {/* Backup Job History */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Recent Backup Jobs</h3>
                      
                      {backupJobsLoading ? (
                        <div className="flex items-center justify-center h-32">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      ) : (
                        <div className="border rounded-lg">
                          <div className="max-h-96 overflow-y-auto">
                            {backupJobs && backupJobs.length > 0 ? (
                              <div className="divide-y">
                                {backupJobs.map((job) => (
                                  <div key={job.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className={`w-2 h-2 rounded-full ${
                                        job.status === 'completed' ? 'bg-green-500' :
                                        job.status === 'failed' ? 'bg-red-500' :
                                        job.status === 'running' ? 'bg-blue-500 animate-pulse' :
                                        'bg-gray-400'
                                      }`} />
                                      <div>
                                        <div className="flex items-center space-x-2">
                                          <span className="font-medium">{job.type} Backup</span>
                                          <span className={`px-2 py-1 text-xs rounded-full ${
                                            job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            job.status === 'failed' ? 'bg-red-100 text-red-800' :
                                            job.status === 'running' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {job.status}
                                          </span>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                          {job.startedAt && (
                                            <span className="flex items-center space-x-1">
                                              <Clock className="w-3 h-3" />
                                              <span>{new Date(job.startedAt).toLocaleString()}</span>
                                              {job.duration && <span>({job.duration}s)</span>}
                                            </span>
                                          )}
                                          {job.recordCount && (
                                            <span className="text-xs">
                                              {job.recordCount} records • {job.fileSize ? `${(job.fileSize / 1024 / 1024).toFixed(1)} MB` : 'Size unknown'}
                                            </span>
                                          )}
                                        </div>
                                        {job.errorMessage && (
                                          <div className="flex items-center space-x-1 text-sm text-red-600 mt-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            <span>{job.errorMessage}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {job.status === 'completed' && job.filePath && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          window.open(`/api/backup/download/${job.id}`, '_blank');
                                        }}
                                      >
                                        <Download className="w-4 h-4 mr-1" />
                                        Download
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-8 text-center text-muted-foreground">
                                <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>No backup jobs found</p>
                                <p className="text-sm">Create your first backup using the button above</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sounds">
          <SoundSettings />
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Integration Settings
              </CardTitle>
              <CardDescription>
                Configure third-party service integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {integrationLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const data = Object.fromEntries(formData.entries());
                    integrationMutation.mutate(data);
                  }}
                  className="space-y-6"
                >
                  {/* Google Maps Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium flex items-center gap-2">
                          <Map className="h-4 w-4" />
                          Google Maps API
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Configure Google Maps API for GPS tracking and address geocoding
                        </p>
                      </div>
                      <Switch
                        name="googleMapsEnabled"
                        defaultChecked={integrationSettings?.googleMapsEnabled || false}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="googleMapsApiKey">Google Maps API Key</Label>
                      <div className="relative">
                        <Input
                          id="googleMapsApiKey"
                          name="googleMapsApiKey"
                          type={showSecrets.googleMapsApiKey ? "text" : "password"}
                          placeholder="Enter Google Maps API Key"
                          defaultValue={integrationSettings?.googleMapsApiKey || ""}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowSecrets(prev => ({ ...prev, googleMapsApiKey: !prev.googleMapsApiKey }))}
                        >
                          {showSecrets.googleMapsApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Required for GPS address reverse geocoding. Get your API key from Google Cloud Console.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Twilio SMS Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Twilio SMS
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Configure Twilio for SMS messaging and notifications
                        </p>
                      </div>
                      <Switch
                        name="twilioEnabled"
                        defaultChecked={integrationSettings?.twilioEnabled || false}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="twilioAccountSid">Account SID</Label>
                        <div className="relative">
                          <Input
                            id="twilioAccountSid"
                            name="twilioAccountSid"
                            type={showSecrets.twilioAccountSid ? "text" : "password"}
                            placeholder="Enter Twilio Account SID"
                            defaultValue={integrationSettings?.twilioAccountSid || ""}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowSecrets(prev => ({ ...prev, twilioAccountSid: !prev.twilioAccountSid }))}
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
                            placeholder="Enter Twilio Auth Token"
                            defaultValue={integrationSettings?.twilioAuthToken || ""}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowSecrets(prev => ({ ...prev, twilioAuthToken: !prev.twilioAuthToken }))}
                          >
                            {showSecrets.twilioAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="twilioPhoneNumber">Phone Number</Label>
                      <Input
                        id="twilioPhoneNumber"
                        name="twilioPhoneNumber"
                        placeholder="+1234567890"
                        defaultValue={integrationSettings?.twilioPhoneNumber || ""}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* DocuSign Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium flex items-center gap-2">
                          <FileSignature className="h-4 w-4" />
                          DocuSign
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Configure DocuSign for electronic signatures
                        </p>
                      </div>
                      <Switch
                        name="docusignEnabled"
                        defaultChecked={integrationSettings?.docusignEnabled || false}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="docusignClientId">Client ID</Label>
                        <div className="relative">
                          <Input
                            id="docusignClientId"
                            name="docusignClientId"
                            type={showSecrets.docusignClientId ? "text" : "password"}
                            placeholder="Enter DocuSign Client ID"
                            defaultValue={integrationSettings?.docusignClientId || ""}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowSecrets(prev => ({ ...prev, docusignClientId: !prev.docusignClientId }))}
                          >
                            {showSecrets.docusignClientId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="docusignClientSecret">Client Secret</Label>
                        <div className="relative">
                          <Input
                            id="docusignClientSecret"
                            name="docusignClientSecret"
                            type={showSecrets.docusignClientSecret ? "text" : "password"}
                            placeholder="Enter DocuSign Client Secret"
                            defaultValue={integrationSettings?.docusignClientSecret || ""}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowSecrets(prev => ({ ...prev, docusignClientSecret: !prev.docusignClientSecret }))}
                          >
                            {showSecrets.docusignClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={integrationMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {integrationMutation.isPending ? "Saving..." : "Save Integration Settings"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicles">
          <VehicleManagement />
        </TabsContent>

        <TabsContent value="dispatch">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Dispatch Routing Settings
              </CardTitle>
              <CardDescription>
                Configure route optimization, working hours, and dispatch preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dispatchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <form onSubmit={handleDispatchSubmit} className="space-y-6">
                  {/* Route Optimization Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Route Optimization</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="defaultStartLocation">Default Start Location</Label>
                        <Input
                          id="defaultStartLocation"
                          name="defaultStartLocation"
                          placeholder="e.g., Company Office, 123 Main St"
                          defaultValue={dispatchSettings?.defaultStartLocation || ""}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Starting location for all routes (can be overridden per route)
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="routeOptimization">Route Optimization Priority</Label>
                        <Select name="routeOptimization" defaultValue={dispatchSettings?.routeOptimization || "time"}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select optimization priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="time">Shortest Time</SelectItem>
                            <SelectItem value="distance">Shortest Distance</SelectItem>
                            <SelectItem value="traffic">Traffic-Aware</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          name="avoidTolls"
                          defaultChecked={dispatchSettings?.avoidTolls || false}
                        />
                        <Label>Avoid Tolls</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          name="avoidHighways"
                          defaultChecked={dispatchSettings?.avoidHighways || false}
                        />
                        <Label>Avoid Highways</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          name="trafficAware"
                          defaultChecked={dispatchSettings?.trafficAware !== false}
                        />
                        <Label>Traffic-Aware Routing</Label>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Job Management Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Job Management</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bufferMinutes">Buffer Time (minutes)</Label>
                        <Input
                          id="bufferMinutes"
                          name="bufferMinutes"
                          type="number"
                          min="0"
                          max="120"
                          placeholder="15"
                          defaultValue={dispatchSettings?.bufferMinutes || 15}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Extra time added between jobs for travel and setup
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="maxJobsPerRoute">Max Jobs per Route</Label>
                        <Input
                          id="maxJobsPerRoute"
                          name="maxJobsPerRoute"
                          type="number"
                          min="1"
                          max="50"
                          placeholder="10"
                          defaultValue={dispatchSettings?.maxJobsPerRoute || 10}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Maximum number of jobs to assign to a single route
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="vehicleTabsCount">Scheduled Jobs Vehicle Tabs</Label>
                        <Select name="vehicleTabsCount" defaultValue={String(dispatchSettings?.vehicleTabsCount || 1)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select number of vehicle tabs" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 Vehicle Tab</SelectItem>
                            <SelectItem value="2">2 Vehicle Tabs</SelectItem>
                            <SelectItem value="3">3 Vehicle Tabs</SelectItem>
                            <SelectItem value="4">4 Vehicle Tabs</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground mt-1">
                          Number of vehicle tabs to display in the dispatch routing interface for tracking scheduled jobs by vehicle
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="maxJobsPerVehicle">Max Jobs per Vehicle</Label>
                        <Select name="maxJobsPerVehicle" defaultValue={String(dispatchSettings?.maxJobsPerVehicle || 'unlimited')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select max jobs limit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 Job</SelectItem>
                            <SelectItem value="2">2 Jobs</SelectItem>
                            <SelectItem value="3">3 Jobs</SelectItem>
                            <SelectItem value="4">4 Jobs</SelectItem>
                            <SelectItem value="5">5 Jobs</SelectItem>
                            <SelectItem value="6">6 Jobs</SelectItem>
                            <SelectItem value="7">7 Jobs</SelectItem>
                            <SelectItem value="8">8 Jobs</SelectItem>
                            <SelectItem value="9">9 Jobs</SelectItem>
                            <SelectItem value="10">10 Jobs</SelectItem>
                            <SelectItem value="unlimited">Unlimited</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground mt-1">
                          Maximum number of jobs that can be assigned to each vehicle tab
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          name="autoDispatch"
                          defaultChecked={dispatchSettings?.autoDispatch || false}
                        />
                        <div>
                          <Label>Auto-Dispatch New Jobs</Label>
                          <p className="text-sm text-muted-foreground">
                            Automatically assign new jobs to optimal routes
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          name="showMultiMapView"
                          defaultChecked={dispatchSettings?.showMultiMapView || false}
                        />
                        <div>
                          <Label>Show Multi-Map View</Label>
                          <p className="text-sm text-muted-foreground">
                            Display multiple map views for better route visualization and planning
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Job Synchronization Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Job Synchronization</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure how jobs are automatically synchronized to scheduled jobs based on employee assignments
                    </p>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="jobSyncMode">Sync Mode</Label>
                        <Select name="jobSyncMode" defaultValue={dispatchSettings?.jobSyncMode || 'manual'}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select synchronization mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual - Jobs must be manually scheduled</SelectItem>
                            <SelectItem value="automatic">Automatic - Jobs sync based on employee assignments</SelectItem>
                            <SelectItem value="hybrid">Hybrid - Automatic sync with manual override</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground mt-1">
                          Choose how jobs are synchronized to the dispatch routing system
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          name="autoSyncByAssignment"
                          defaultChecked={dispatchSettings?.autoSyncByAssignment || false}
                        />
                        <div>
                          <Label>Auto-Sync by Employee Assignment</Label>
                          <p className="text-sm text-muted-foreground">
                            Automatically sync jobs when employees are assigned to them
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          name="syncOnlyActiveJobs"
                          defaultChecked={dispatchSettings?.syncOnlyActiveJobs || true}
                        />
                        <div>
                          <Label>Sync Only Active Jobs</Label>
                          <p className="text-sm text-muted-foreground">
                            Only synchronize jobs with 'active' status to dispatch routing
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="syncTimeWindow">Sync Time Window (hours)</Label>
                        <Input
                          id="syncTimeWindow"
                          name="syncTimeWindow"
                          type="number"
                          min="1"
                          max="168"
                          placeholder="24"
                          defaultValue={dispatchSettings?.syncTimeWindow || 24}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          How many hours ahead to sync jobs (1-168 hours)
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Working Hours Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Working Hours</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="workingHoursStart">Working Hours Start</Label>
                        <Input
                          id="workingHoursStart"
                          name="workingHoursStart"
                          type="time"
                          defaultValue={dispatchSettings?.workingHoursStart || "08:00"}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="workingHoursEnd">Working Hours End</Label>
                        <Input
                          id="workingHoursEnd"
                          name="workingHoursEnd"
                          type="time"
                          defaultValue={dispatchSettings?.workingHoursEnd || "17:00"}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="lunchBreakStart">Lunch Break Start</Label>
                        <Input
                          id="lunchBreakStart"
                          name="lunchBreakStart"
                          type="time"
                          defaultValue={dispatchSettings?.lunchBreakStart || "12:00"}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="lunchBreakEnd">Lunch Break End</Label>
                        <Input
                          id="lunchBreakEnd"
                          name="lunchBreakEnd"
                          type="time"
                          defaultValue={dispatchSettings?.lunchBreakEnd || "13:00"}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Notification Settings Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Notification Settings</h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          name="routeUpdates"
                          defaultChecked={dispatchSettings?.notificationSettings?.routeUpdates !== false}
                        />
                        <div>
                          <Label>Route Updates</Label>
                          <p className="text-sm text-muted-foreground">
                            Notify team when routes are optimized or updated
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          name="jobStatusChanges"
                          defaultChecked={dispatchSettings?.notificationSettings?.jobStatusChanges !== false}
                        />
                        <div>
                          <Label>Job Status Changes</Label>
                          <p className="text-sm text-muted-foreground">
                            Notify dispatchers when job status changes
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          name="trafficAlerts"
                          defaultChecked={dispatchSettings?.notificationSettings?.trafficAlerts !== false}
                        />
                        <div>
                          <Label>Traffic Alerts</Label>
                          <p className="text-sm text-muted-foreground">
                            Send alerts for significant traffic delays
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={dispatchMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {dispatchMutation.isPending ? "Saving..." : "Save Dispatch Settings"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage">
          <FileStorageManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}