import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Building2, Users, CreditCard, Wrench, Palette, UserPlus, 
  Check, X, Clock, Mail, RefreshCw, Loader2, AlertCircle,
  Settings, BarChart3, Save
} from "lucide-react";
import { format } from "date-fns";

interface OnboardingStatus {
  organizationId: number;
  organizationName: string | null;
  organizationSlug: string | null;
  isComplete: boolean;
  completedSteps: number;
  totalSteps: number;
  currentStep: number;
  companyProfileComplete: boolean;
  teamMembersComplete: boolean;
  stripeConnectComplete: boolean;
  servicesComplete: boolean;
  brandingComplete: boolean;
  firstCustomerComplete: boolean;
  startedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
  welcomeEmailSentAt: string | null;
  reminderEmailSentAt: string | null;
}

interface OnboardingSettings {
  welcomeEmailEnabled: boolean;
  reminderEmailEnabled: boolean;
  reminderDelayHours: number;
  welcomeEmailSubject: string;
  welcomeEmailBody: string;
  reminderEmailSubject: string;
  reminderEmailBody: string;
  companyProfileStepEnabled: boolean;
  teamMembersStepEnabled: boolean;
  stripeConnectStepEnabled: boolean;
  servicesStepEnabled: boolean;
  brandingStepEnabled: boolean;
  firstCustomerStepEnabled: boolean;
}

const defaultSettings: OnboardingSettings = {
  welcomeEmailEnabled: true,
  reminderEmailEnabled: true,
  reminderDelayHours: 24,
  welcomeEmailSubject: "Welcome to Pro Field Manager! Let's Get Started",
  welcomeEmailBody: `Hi {{ownerName}},

Welcome to Pro Field Manager! We're excited to have {{organizationName}} on board.

Complete your account setup to unlock all features:
{{onboardingLink}}

Need help? Reply to this email or contact our support team.

Best regards,
The Pro Field Manager Team`,
  reminderEmailSubject: "Don't forget to complete your Pro Field Manager setup",
  reminderEmailBody: `Hi {{ownerName}},

We noticed you haven't completed setting up your Pro Field Manager account yet. 

You're {{percentComplete}}% done! Continue where you left off:
{{onboardingLink}}

Need assistance? We're here to help.

Best regards,
The Pro Field Manager Team`,
  companyProfileStepEnabled: true,
  teamMembersStepEnabled: true,
  stripeConnectStepEnabled: true,
  servicesStepEnabled: true,
  brandingStepEnabled: true,
  firstCustomerStepEnabled: true,
};

function StepBadge({ complete, label }: { complete: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
        complete 
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
      }`}
    >
      {complete ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </div>
  );
}

function MonitorTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allOnboarding, isLoading, error } = useQuery<OnboardingStatus[]>({
    queryKey: ["/api/admin/onboarding/all"],
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (orgId: number) => {
      return apiRequest(`/api/admin/onboarding/${orgId}/send-reminder`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/onboarding/all"] });
      toast({ title: "Reminder Sent", description: "Onboarding reminder email has been sent." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <p className="text-muted-foreground">Failed to load onboarding data</p>
        </CardContent>
      </Card>
    );
  }

  const incomplete = allOnboarding?.filter(o => !o.isComplete) || [];
  const completed = allOnboarding?.filter(o => o.isComplete) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Overview</CardTitle>
          <CardDescription>Track organization setup progress across all clients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-primary">{allOnboarding?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Total Organizations</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{completed.length}</div>
              <div className="text-sm text-muted-foreground">Completed Onboarding</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">{incomplete.length}</div>
              <div className="text-sm text-muted-foreground">Pending Onboarding</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {incomplete.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              Pending Onboarding ({incomplete.length})
            </CardTitle>
            <CardDescription>Organizations that haven't completed setup</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {incomplete.map((org) => {
                const percentComplete = Math.round((org.completedSteps / org.totalSteps) * 100);
                return (
                  <div
                    key={org.organizationId}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{org.organizationName || `Organization #${org.organizationId}`}</h4>
                        <p className="text-sm text-muted-foreground">
                          {org.organizationSlug && `@${org.organizationSlug}`}
                          {org.startedAt && ` · Started ${format(new Date(org.startedAt), 'MMM d, yyyy')}`}
                        </p>
                      </div>
                      <Badge variant={percentComplete > 50 ? "default" : "secondary"}>
                        {percentComplete}% Complete
                      </Badge>
                    </div>

                    <Progress value={percentComplete} className="h-2" />

                    <div className="flex flex-wrap gap-2">
                      <StepBadge complete={org.companyProfileComplete} label="Profile" />
                      <StepBadge complete={org.teamMembersComplete} label="Team" />
                      <StepBadge complete={org.stripeConnectComplete} label="Stripe" />
                      <StepBadge complete={org.servicesComplete} label="Services" />
                      <StepBadge complete={org.brandingComplete} label="Branding" />
                      <StepBadge complete={org.firstCustomerComplete} label="Customer" />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        {org.reminderEmailSentAt ? (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            Reminder sent {format(new Date(org.reminderEmailSentAt), 'MMM d')}
                          </span>
                        ) : org.welcomeEmailSentAt ? (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            Welcome sent {format(new Date(org.welcomeEmailSentAt), 'MMM d')}
                          </span>
                        ) : (
                          <span>No emails sent</span>
                        )}
                      </div>
                      <Button
                        data-testid={`button-send-reminder-${org.organizationId}`}
                        size="sm"
                        variant="outline"
                        onClick={() => sendReminderMutation.mutate(org.organizationId)}
                        disabled={sendReminderMutation.isPending}
                      >
                        {sendReminderMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4 mr-1" />
                        )}
                        Send Reminder
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              Completed Onboarding ({completed.length})
            </CardTitle>
            <CardDescription>Organizations that have finished setup</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completed.map((org) => (
                <div
                  key={org.organizationId}
                  className="flex items-center justify-between border rounded-lg p-4"
                >
                  <div>
                    <h4 className="font-semibold">{org.organizationName || `Organization #${org.organizationId}`}</h4>
                    <p className="text-sm text-muted-foreground">
                      {org.organizationSlug && `@${org.organizationSlug}`}
                      {org.completedAt && ` · Completed ${format(new Date(org.completedAt), 'MMM d, yyyy')}`}
                    </p>
                  </div>
                  <Badge variant="default" className="bg-green-500">
                    <Check className="w-3 h-3 mr-1" /> Complete
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(!allOnboarding || allOnboarding.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No organizations found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<OnboardingSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: fetchedSettings, isLoading } = useQuery<OnboardingSettings>({
    queryKey: ["/api/admin/onboarding/settings"],
  });

  useEffect(() => {
    if (fetchedSettings) {
      setSettings({
        welcomeEmailEnabled: fetchedSettings.welcomeEmailEnabled ?? defaultSettings.welcomeEmailEnabled,
        reminderEmailEnabled: fetchedSettings.reminderEmailEnabled ?? defaultSettings.reminderEmailEnabled,
        reminderDelayHours: fetchedSettings.reminderDelayHours ?? defaultSettings.reminderDelayHours,
        welcomeEmailSubject: fetchedSettings.welcomeEmailSubject ?? defaultSettings.welcomeEmailSubject,
        welcomeEmailBody: fetchedSettings.welcomeEmailBody ?? defaultSettings.welcomeEmailBody,
        reminderEmailSubject: fetchedSettings.reminderEmailSubject ?? defaultSettings.reminderEmailSubject,
        reminderEmailBody: fetchedSettings.reminderEmailBody ?? defaultSettings.reminderEmailBody,
        companyProfileStepEnabled: fetchedSettings.companyProfileStepEnabled ?? defaultSettings.companyProfileStepEnabled,
        teamMembersStepEnabled: fetchedSettings.teamMembersStepEnabled ?? defaultSettings.teamMembersStepEnabled,
        stripeConnectStepEnabled: fetchedSettings.stripeConnectStepEnabled ?? defaultSettings.stripeConnectStepEnabled,
        servicesStepEnabled: fetchedSettings.servicesStepEnabled ?? defaultSettings.servicesStepEnabled,
        brandingStepEnabled: fetchedSettings.brandingStepEnabled ?? defaultSettings.brandingStepEnabled,
        firstCustomerStepEnabled: fetchedSettings.firstCustomerStepEnabled ?? defaultSettings.firstCustomerStepEnabled,
      });
      setHasChanges(false);
    }
  }, [fetchedSettings]);

  const updateSetting = <K extends keyof OnboardingSettings>(key: K, value: OnboardingSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/admin/onboarding/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/onboarding/settings"] });
      toast({ title: "Settings Saved", description: "Onboarding settings have been updated." });
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Settings
          </CardTitle>
          <CardDescription>Configure automatic onboarding emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base font-medium">Welcome Email</Label>
              <p className="text-sm text-muted-foreground">Send welcome email when organization signs up</p>
            </div>
            <Switch
              checked={settings.welcomeEmailEnabled}
              onCheckedChange={(checked) => updateSetting("welcomeEmailEnabled", checked)}
              data-testid="switch-welcome-email"
            />
          </div>

          {settings.welcomeEmailEnabled && (
            <div className="space-y-4 pl-4 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input
                  value={settings.welcomeEmailSubject}
                  onChange={(e) => updateSetting("welcomeEmailSubject", e.target.value)}
                  placeholder="Welcome email subject"
                  data-testid="input-welcome-subject"
                />
              </div>
              <div className="space-y-2">
                <Label>Email Body</Label>
                <Textarea
                  value={settings.welcomeEmailBody}
                  onChange={(e) => updateSetting("welcomeEmailBody", e.target.value)}
                  placeholder="Welcome email content"
                  rows={8}
                  className="font-mono text-sm"
                  data-testid="textarea-welcome-body"
                />
                <p className="text-xs text-muted-foreground">
                  Variables: {"{{ownerName}}"}, {"{{organizationName}}"}, {"{{onboardingLink}}"}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base font-medium">Reminder Email</Label>
              <p className="text-sm text-muted-foreground">Automatically remind organizations to complete setup</p>
            </div>
            <Switch
              checked={settings.reminderEmailEnabled}
              onCheckedChange={(checked) => updateSetting("reminderEmailEnabled", checked)}
              data-testid="switch-reminder-email"
            />
          </div>

          {settings.reminderEmailEnabled && (
            <div className="space-y-4 pl-4 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label>Send Reminder After (hours)</Label>
                <Input
                  type="number"
                  min={1}
                  max={168}
                  value={settings.reminderDelayHours}
                  onChange={(e) => updateSetting("reminderDelayHours", parseInt(e.target.value) || 24)}
                  data-testid="input-reminder-delay"
                />
              </div>
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input
                  value={settings.reminderEmailSubject}
                  onChange={(e) => updateSetting("reminderEmailSubject", e.target.value)}
                  placeholder="Reminder email subject"
                  data-testid="input-reminder-subject"
                />
              </div>
              <div className="space-y-2">
                <Label>Email Body</Label>
                <Textarea
                  value={settings.reminderEmailBody}
                  onChange={(e) => updateSetting("reminderEmailBody", e.target.value)}
                  placeholder="Reminder email content"
                  rows={8}
                  className="font-mono text-sm"
                  data-testid="textarea-reminder-body"
                />
                <p className="text-xs text-muted-foreground">
                  Variables: {"{{ownerName}}"}, {"{{organizationName}}"}, {"{{onboardingLink}}"}, {"{{percentComplete}}"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Onboarding Steps
          </CardTitle>
          <CardDescription>Enable or disable onboarding steps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { key: "companyProfileStepEnabled", label: "Company Profile", desc: "Business name, logo, contact info", icon: Building2 },
              { key: "teamMembersStepEnabled", label: "Team Members", desc: "Invite employees and technicians", icon: Users },
              { key: "stripeConnectStepEnabled", label: "Stripe Connect", desc: "Payment processing setup", icon: CreditCard },
              { key: "servicesStepEnabled", label: "Services & Pricing", desc: "Define service offerings", icon: Wrench },
              { key: "brandingStepEnabled", label: "Branding", desc: "Colors and invoice templates", icon: Palette },
              { key: "firstCustomerStepEnabled", label: "First Customer", desc: "Add first customer (optional)", icon: UserPlus },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <Label className="text-base font-medium">{step.label}</Label>
                      <p className="text-sm text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings[step.key as keyof OnboardingSettings] as boolean}
                    onCheckedChange={(checked) => updateSetting(step.key as keyof OnboardingSettings, checked)}
                    data-testid={`switch-step-${step.key}`}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!hasChanges || saveMutation.isPending}
          data-testid="button-save-settings"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}

export function AdminOnboardingTab() {
  return (
    <Tabs defaultValue="monitor" className="space-y-6">
      <TabsList>
        <TabsTrigger value="monitor" className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Monitor
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="monitor">
        <MonitorTab />
      </TabsContent>

      <TabsContent value="settings">
        <SettingsTab />
      </TabsContent>
    </Tabs>
  );
}
