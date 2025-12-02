import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, Users, CreditCard, Wrench, Palette, UserPlus, 
  Check, X, Clock, Mail, RefreshCw, Loader2, AlertCircle
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

const stepIcons = {
  companyProfile: Building2,
  teamMembers: Users,
  stripeConnect: CreditCard,
  services: Wrench,
  branding: Palette,
  firstCustomer: UserPlus,
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

export function AdminOnboardingTab() {
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
