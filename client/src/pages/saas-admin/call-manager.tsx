import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Phone, Plus, Settings, Edit, Trash2, Building2, Users, ChevronDown, PhoneCall, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PhoneNumber {
  id: number;
  organizationId: number;
  phoneNumber: string;
  friendlyName?: string;
  areaCode?: string;
  country: string;
  numberType: string;
  provider: string;
  isActive: boolean;
  isCallEnabled: boolean;
  isSmsEnabled: boolean;
  assignedTo?: number;
  assignedToUser?: { firstName: string; lastName: string; email: string };
  department?: string;
  purpose?: string;
  monthlyCost: number;
  usageCost: number;
  organization?: { name: string };
}

interface Organization {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  plan?: { name: string; hasCallManager: boolean };
  phoneNumbers?: PhoneNumber[];
  twilioSettings?: TwilioSettings;
}

interface TwilioSettings {
  accountSid?: string;
  authToken?: string;
  isConfigured: boolean;
  webhookUrl?: string;
  statusCallbackUrl?: string;
}

export default function SaasCallManagerPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrg, setSelectedOrg] = useState<number | null>(null);
  const [showAddPhoneDialog, setShowAddPhoneDialog] = useState(false);
  const [editingPhone, setEditingPhone] = useState<PhoneNumber | null>(null);
  const [showTwilioSettings, setShowTwilioSettings] = useState(false);
  const [selectedOrgForSettings, setSelectedOrgForSettings] = useState<Organization | null>(null);

  // Fetch all organizations with Call Manager access
  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["/api/saas-admin/call-manager/organizations"],
  });

  // Fetch phone numbers for selected organization
  const { data: phoneNumbers = [], isLoading: phonesLoading } = useQuery({
    queryKey: ["/api/saas-admin/call-manager/phone-numbers", selectedOrg],
    queryFn: () => selectedOrg ? fetch(`/api/saas-admin/call-manager/phone-numbers/${selectedOrg}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    }) : [],
    enabled: !!selectedOrg,
  });

  // Provision new phone number mutation
  const provisionPhoneMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/saas-admin/call-manager/provision-phone`, data);
    },
    onSuccess: () => {
      toast({ title: "Phone number provisioned successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/saas-admin/call-manager/phone-numbers"] });
      setShowAddPhoneDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to provision phone number",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update phone number mutation
  const updatePhoneMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return apiRequest("PUT", `/api/saas-admin/call-manager/phone-numbers/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Phone number updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/saas-admin/call-manager/phone-numbers"] });
      setEditingPhone(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update phone number",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Release phone number mutation
  const releasePhoneMutation = useMutation({
    mutationFn: async (phoneId: number) => {
      return apiRequest("DELETE", `/api/saas-admin/call-manager/phone-numbers/${phoneId}/release`);
    },
    onSuccess: () => {
      toast({ title: "Phone number released successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/saas-admin/call-manager/phone-numbers"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to release phone number",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update Twilio settings mutation
  const updateTwilioSettingsMutation = useMutation({
    mutationFn: async ({ orgId, settings }: { orgId: number; settings: TwilioSettings }) => {
      return apiRequest("PUT", `/api/saas-admin/call-manager/twilio-settings/${orgId}`, settings);
    },
    onSuccess: () => {
      toast({ title: "Twilio settings updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/saas-admin/call-manager/organizations"] });
      setShowTwilioSettings(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update Twilio settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test call mutation
  const testCallMutation = useMutation({
    mutationFn: async ({ phoneId, testNumber }: { phoneId: number; testNumber: string }) => {
      return apiRequest("POST", `/api/saas-admin/call-manager/test-call`, { phoneId, testNumber });
    },
    onSuccess: () => {
      toast({ title: "Test call initiated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Test call failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const selectedOrgData = (organizations as Organization[]).find((org: Organization) => org.id === selectedOrg);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Call Manager Administration</h1>
          <p className="text-muted-foreground">
            Manage phone numbers and call features for organizations
          </p>
        </div>
      </div>

      <Tabs defaultValue="organizations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="phone-numbers">Phone Numbers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organizations with Call Manager
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orgsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {(organizations as Organization[]).map((org: Organization) => (
                    <div
                      key={org.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedOrg === org.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedOrg(org.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-medium">{org.name}</h3>
                          <p className="text-sm text-muted-foreground">{org.email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={org.plan?.hasCallManager ? "default" : "secondary"}>
                            {org.plan?.name || "No Plan"}
                          </Badge>
                          <Badge variant="outline">
                            {org.phoneNumbers?.length || 0} numbers
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrgForSettings(org);
                              setShowTwilioSettings(true);
                            }}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phone-numbers" className="space-y-6">
          {selectedOrg ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    Phone Numbers for {selectedOrgData?.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Manage phone numbers and call routing
                  </p>
                </div>
                <Dialog open={showAddPhoneDialog} onOpenChange={setShowAddPhoneDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Provision Number
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Provision New Phone Number</DialogTitle>
                    </DialogHeader>
                    <PhoneNumberForm
                      organizationId={selectedOrg}
                      onSubmit={(data) => provisionPhoneMutation.mutate(data)}
                      isLoading={provisionPhoneMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {phonesLoading ? (
                  [...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="h-20 bg-muted animate-pulse rounded" />
                      </CardContent>
                    </Card>
                  ))
                ) : (phoneNumbers as PhoneNumber[]).length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No phone numbers provisioned</h3>
                      <p className="text-muted-foreground mb-4">
                        Provision phone numbers to enable call management features.
                      </p>
                      <Button onClick={() => setShowAddPhoneDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Provision First Number
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  (phoneNumbers as PhoneNumber[]).map((phone: PhoneNumber) => (
                    <PhoneNumberCard
                      key={phone.id}
                      phone={phone}
                      onEdit={setEditingPhone}
                      onRelease={(phoneId) => releasePhoneMutation.mutate(phoneId)}
                      onTestCall={(phoneId, testNumber) => testCallMutation.mutate({ phoneId, testNumber })}
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Select an organization</h3>
                <p className="text-muted-foreground">
                  Choose an organization from the Organizations tab to manage phone numbers.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <CallManagerAnalytics organizations={organizations as Organization[]} />
        </TabsContent>
      </Tabs>

      {/* Edit Phone Number Dialog */}
      <Dialog open={!!editingPhone} onOpenChange={() => setEditingPhone(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Phone Number</DialogTitle>
          </DialogHeader>
          {editingPhone && (
            <PhoneNumberForm
              organizationId={editingPhone.organizationId}
              phone={editingPhone}
              onSubmit={(data) => updatePhoneMutation.mutate({ id: editingPhone.id, ...data })}
              isLoading={updatePhoneMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Twilio Settings Dialog */}
      <Dialog open={showTwilioSettings} onOpenChange={setShowTwilioSettings}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Twilio Settings - {selectedOrgForSettings?.name}</DialogTitle>
            <DialogDescription>
              Configure Twilio integration for this organization
            </DialogDescription>
          </DialogHeader>
          {selectedOrgForSettings && (
            <TwilioSettingsForm
              organization={selectedOrgForSettings}
              onSubmit={(settings) => updateTwilioSettingsMutation.mutate({ orgId: selectedOrgForSettings.id, settings })}
              isLoading={updateTwilioSettingsMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PhoneNumberForm({
  organizationId,
  phone,
  onSubmit,
  isLoading,
}: {
  organizationId: number;
  phone?: PhoneNumber;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    organizationId,
    phoneNumber: phone?.phoneNumber || "",
    friendlyName: phone?.friendlyName || "",
    areaCode: phone?.areaCode || "",
    country: phone?.country || "US",
    numberType: phone?.numberType || "local",
    provider: phone?.provider || "twilio",
    department: phone?.department || "",
    purpose: phone?.purpose || "",
    isCallEnabled: phone?.isCallEnabled ?? true,
    isSmsEnabled: phone?.isSmsEnabled ?? true,
    monthlyCost: phone?.monthlyCost || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            placeholder="+1234567890"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="friendlyName">Friendly Name</Label>
          <Input
            id="friendlyName"
            value={formData.friendlyName}
            onChange={(e) => setFormData({ ...formData, friendlyName: e.target.value })}
            placeholder="Main Office"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="areaCode">Area Code</Label>
          <Input
            id="areaCode"
            value={formData.areaCode}
            onChange={(e) => setFormData({ ...formData, areaCode: e.target.value })}
            placeholder="555"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="numberType">Number Type</Label>
          <Select
            value={formData.numberType}
            onValueChange={(value) => setFormData({ ...formData, numberType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">Local</SelectItem>
              <SelectItem value="toll-free">Toll-Free</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="purpose">Purpose</Label>
        <Textarea
          id="purpose"
          value={formData.purpose}
          onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
          placeholder="Customer service line..."
          rows={2}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            id="isCallEnabled"
            checked={formData.isCallEnabled}
            onCheckedChange={(checked) => setFormData({ ...formData, isCallEnabled: checked })}
          />
          <Label htmlFor="isCallEnabled">Voice calls enabled</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="isSmsEnabled"
            checked={formData.isSmsEnabled}
            onCheckedChange={(checked) => setFormData({ ...formData, isSmsEnabled: checked })}
          />
          <Label htmlFor="isSmsEnabled">SMS enabled</Label>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Processing..." : phone ? "Update" : "Provision"}
        </Button>
      </div>
    </form>
  );
}

// Twilio Settings Form Component
function TwilioSettingsForm({
  organization,
  onSubmit,
  isLoading,
}: {
  organization: Organization;
  onSubmit: (settings: TwilioSettings) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<TwilioSettings>({
    accountSid: organization.twilioSettings?.accountSid || "",
    authToken: organization.twilioSettings?.authToken || "",
    webhookUrl: organization.twilioSettings?.webhookUrl || "",
    statusCallbackUrl: organization.twilioSettings?.statusCallbackUrl || "",
    isConfigured: organization.twilioSettings?.isConfigured || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="accountSid">Account SID</Label>
        <Input
          id="accountSid"
          type="password"
          value={formData.accountSid}
          onChange={(e) => setFormData({ ...formData, accountSid: e.target.value })}
          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="authToken">Auth Token</Label>
        <Input
          id="authToken"
          type="password"
          value={formData.authToken}
          onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="webhookUrl">Webhook URL (Optional)</Label>
        <Input
          id="webhookUrl"
          value={formData.webhookUrl}
          onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
          placeholder="https://your-domain.com/webhooks/twilio"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="statusCallbackUrl">Status Callback URL (Optional)</Label>
        <Input
          id="statusCallbackUrl"
          value={formData.statusCallbackUrl}
          onChange={(e) => setFormData({ ...formData, statusCallbackUrl: e.target.value })}
          placeholder="https://your-domain.com/callbacks/twilio"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </form>
  );
}

function PhoneNumberCard({
  phone,
  onEdit,
  onRelease,
  onTestCall,
}: {
  phone: PhoneNumber;
  onEdit: (phone: PhoneNumber) => void;
  onRelease: (phoneId: number) => void;
  onTestCall?: (phoneId: number, testNumber: string) => void;
}) {
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testNumber, setTestNumber] = useState("");

  const handleTestCall = () => {
    if (testNumber && onTestCall) {
      onTestCall(phone.id, testNumber);
      setShowTestDialog(false);
      setTestNumber("");
    }
  };
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{phone.phoneNumber}</h3>
              {phone.friendlyName && (
                <Badge variant="outline">{phone.friendlyName}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {phone.purpose || "No purpose specified"}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{phone.numberType}</span>
              <span>{phone.provider}</span>
              {phone.assignedToUser && (
                <span>Assigned to {phone.assignedToUser.firstName} {phone.assignedToUser.lastName}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <Badge variant={phone.isCallEnabled ? "default" : "secondary"}>
                Calls {phone.isCallEnabled ? "enabled" : "disabled"}
              </Badge>
              <Badge variant={phone.isSmsEnabled ? "default" : "secondary"}>
                SMS {phone.isSmsEnabled ? "enabled" : "disabled"}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => onEdit(phone)}>
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRelease(phone.id)}
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CallManagerAnalytics({ organizations }: { organizations: Organization[] }) {
  const orgsArray = organizations as Organization[];
  const totalOrgs = orgsArray.length;
  const totalPhoneNumbers = orgsArray.reduce((sum, org) => sum + (org.phoneNumbers?.length || 0), 0);
  const avgPhonePerOrg = totalOrgs > 0 ? (totalPhoneNumbers / totalOrgs).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalOrgs}</p>
                <p className="text-sm text-muted-foreground">Organizations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Phone className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPhoneNumbers}</p>
                <p className="text-sm text-muted-foreground">Phone Numbers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgPhonePerOrg}</p>
                <p className="text-sm text-muted-foreground">Avg per Org</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orgsArray.map((org: Organization) => (
              <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">{org.name}</h3>
                  <p className="text-sm text-muted-foreground">{org.email}</p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={org.plan?.hasCallManager ? "default" : "secondary"}>
                    {org.plan?.name || "No Plan"}
                  </Badge>
                  <span className="text-sm font-medium">
                    {org.phoneNumbers?.length || 0} numbers
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}