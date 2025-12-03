import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, CreditCard, Eye, EyeOff, Save, Key } from "lucide-react";

type StripeConnectStatus = {
  isConnected: boolean;
  accountId?: string;
  hasCompletedOnboarding: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
};

type StripeKeysSettings = {
  stripePublishableKey: string;
  stripeSecretKey: string;
  hasSecretKey: boolean;
};

export function StripeConnectSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [publishableKey, setPublishableKey] = useState("");
  const [secretKey, setSecretKey] = useState("");

  const { data: status, isLoading } = useQuery<StripeConnectStatus>({
    queryKey: ["/api/stripe-connect/status"],
  });

  const { data: keysSettings, isLoading: isLoadingKeys } = useQuery<StripeKeysSettings>({
    queryKey: ["/api/stripe-connect/keys"],
  });

  // Update publishable key when data loads
  if (keysSettings?.stripePublishableKey && !publishableKey) {
    setPublishableKey(keysSettings.stripePublishableKey);
  }

  const saveKeysMutation = useMutation({
    mutationFn: async (keys: { publishableKey: string; secretKey: string }) => {
      const response = await apiRequest("POST", "/api/stripe-connect/keys", keys);
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return response.json();
      }
      throw new Error("Failed to save keys");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Stripe API keys saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stripe-connect/keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stripe-connect/status"] });
      setSecretKey("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save Stripe keys",
        variant: "destructive",
      });
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/stripe-connect/create-account", {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe-connect/status"] });
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Stripe account",
        variant: "destructive",
      });
    },
  });

  const createOnboardingLinkMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/stripe-connect/create-account-link", {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe-connect/status"] });
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create onboarding link",
        variant: "destructive",
      });
    },
  });

  const createDashboardLinkMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/stripe-connect/dashboard-link", {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe-connect/status"] });
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create dashboard link",
        variant: "destructive",
      });
    },
  });

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      if (!status?.isConnected) {
        await createAccountMutation.mutateAsync();
      } else if (!status?.hasCompletedOnboarding) {
        await createOnboardingLinkMutation.mutateAsync();
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleViewDashboard = () => {
    createDashboardLinkMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const needsOnboarding = !status?.isConnected || !status?.hasCompletedOnboarding;
  const isFullyActive = status?.chargesEnabled && status?.payoutsEnabled;
  const hasPendingRequirements = (status?.requirements?.currently_due?.length || 0) > 0 || 
                                  (status?.requirements?.past_due?.length || 0) > 0;

  const handleSaveKeys = () => {
    if (!publishableKey.startsWith("pk_")) {
      toast({
        title: "Invalid Publishable Key",
        description: "Publishable key should start with 'pk_'",
        variant: "destructive",
      });
      return;
    }
    if (secretKey && !secretKey.startsWith("sk_")) {
      toast({
        title: "Invalid Secret Key",
        description: "Secret key should start with 'sk_'",
        variant: "destructive",
      });
      return;
    }
    saveKeysMutation.mutate({ publishableKey, secretKey });
  };

  return (
    <div className="space-y-6" data-testid="stripe-connect-settings">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Stripe API Keys
          </CardTitle>
          <CardDescription>
            Configure your Stripe API keys for payment processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stripePublishableKey">Publishable Key</Label>
              <Input
                id="stripePublishableKey"
                placeholder="pk_live_... or pk_test_..."
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                data-testid="input-stripe-publishable-key"
              />
              <p className="text-xs text-muted-foreground">
                Your Stripe publishable key (starts with pk_)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripeSecretKey">Secret Key</Label>
              <div className="relative">
                <Input
                  id="stripeSecretKey"
                  type={showSecretKey ? "text" : "password"}
                  placeholder={keysSettings?.hasSecretKey ? "••••••••••••••••" : "sk_live_... or sk_test_..."}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  data-testid="input-stripe-secret-key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                >
                  {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {keysSettings?.hasSecretKey 
                  ? "Secret key is configured. Enter a new value to update it."
                  : "Your Stripe secret key (starts with sk_)"}
              </p>
            </div>
          </div>
          
          {keysSettings?.hasSecretKey && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Stripe API keys are configured and ready for use.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button 
              onClick={handleSaveKeys}
              disabled={saveKeysMutation.isPending || !publishableKey}
              data-testid="button-save-stripe-keys"
            >
              {saveKeysMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save API Keys
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Stripe Connect - Marketplace Payments
              </CardTitle>
              <CardDescription>
                Accept customer payments directly with automatic platform fee collection
              </CardDescription>
            </div>
            {status?.isConnected && (
              <Badge 
                variant={isFullyActive ? "default" : "secondary"}
                className="ml-auto"
                data-testid="status-badge"
              >
                {isFullyActive ? (
                  <>
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Active
                  </>
                ) : status?.hasCompletedOnboarding ? (
                  <>
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Pending Verification
                  </>
                ) : (
                  <>
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Setup Incomplete
                  </>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!status?.isConnected && (
            <Alert>
              <AlertDescription className="flex items-start justify-between">
                <div>
                  <p className="font-medium mb-1">Connect Your Stripe Account</p>
                  <p className="text-sm text-muted-foreground">
                    Connect your Stripe account to accept customer payments for invoices, quotes, and marketplace transactions. 
                    The platform automatically deducts a small fee from each transaction.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {status?.isConnected && !status?.hasCompletedOnboarding && (
            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Complete Your Account Setup</p>
                <p className="text-sm">
                  Your Stripe account needs additional information before you can accept payments.
                  Click below to complete the onboarding process.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {status?.isConnected && status?.hasCompletedOnboarding && hasPendingRequirements && (
            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Action Required</p>
                <p className="text-sm">
                  Stripe requires additional information to keep your account active.
                  {status.requirements?.past_due && status.requirements.past_due.length > 0 && (
                    <span className="text-destructive font-medium"> (Overdue)</span>
                  )}
                </p>
                {status.requirements && (
                  <ul className="mt-2 text-sm space-y-1">
                    {status.requirements.past_due?.map((req) => (
                      <li key={req} className="text-destructive">• {req.replace(/_/g, ' ')}</li>
                    ))}
                    {status.requirements.currently_due?.map((req) => (
                      <li key={req}>• {req.replace(/_/g, ' ')}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          {status?.isConnected && isFullyActive && !hasPendingRequirements && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <p className="font-medium text-green-900 dark:text-green-100">Account Active</p>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Your Stripe account is fully set up and ready to accept payments. You can now receive customer payments
                  for invoices and marketplace transactions.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {status?.isConnected && (
            <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Account ID</p>
                  <p className="font-mono text-xs">{status.accountId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1">
                      {status.chargesEnabled ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-orange-600" />
                      )}
                      <span className="text-xs">Charges</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {status.payoutsEnabled ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-orange-600" />
                      )}
                      <span className="text-xs">Payouts</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {needsOnboarding ? (
              <Button
                onClick={handleConnect}
                disabled={isConnecting || createAccountMutation.isPending || createOnboardingLinkMutation.isPending}
                data-testid="button-connect-stripe"
              >
                {(isConnecting || createAccountMutation.isPending || createOnboardingLinkMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {!status?.isConnected ? "Connect Stripe Account" : "Complete Setup"}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                {hasPendingRequirements && (
                  <Button
                    onClick={() => createOnboardingLinkMutation.mutate()}
                    disabled={createOnboardingLinkMutation.isPending}
                    variant="default"
                    data-testid="button-update-info"
                  >
                    {createOnboardingLinkMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Update Information
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                )}
                <Button
                  onClick={handleViewDashboard}
                  disabled={createDashboardLinkMutation.isPending}
                  variant="outline"
                  data-testid="button-view-dashboard"
                >
                  {createDashboardLinkMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  View Stripe Dashboard
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">How it works:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Customers pay directly to your Stripe account</li>
              <li>Platform fee is automatically deducted from each transaction</li>
              <li>You receive payouts according to your Stripe schedule</li>
              <li>All payment disputes and refunds are handled through Stripe</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
