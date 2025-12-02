import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, Users, CreditCard, Wrench, Palette, UserPlus, 
  Check, ArrowRight, Sparkles, X
} from "lucide-react";
import { useState } from "react";

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
}

const steps = [
  { id: "companyProfile", key: "companyProfileComplete", title: "Company Profile", icon: Building2 },
  { id: "teamMembers", key: "teamMembersComplete", title: "Team Members", icon: Users },
  { id: "stripeConnect", key: "stripeConnectComplete", title: "Payment Setup", icon: CreditCard },
  { id: "services", key: "servicesComplete", title: "Services", icon: Wrench },
  { id: "branding", key: "brandingComplete", title: "Branding", icon: Palette },
  { id: "firstCustomer", key: "firstCustomerComplete", title: "First Customer", icon: UserPlus },
];

export function OnboardingWidget() {
  const [, navigate] = useLocation();
  const [isDismissed, setIsDismissed] = useState(false);

  const { data: progress, isLoading } = useQuery<OnboardingProgress>({
    queryKey: ["/api/onboarding/progress"],
  });

  if (isLoading || !progress || progress.isComplete || isDismissed) {
    return null;
  }

  const completedCount = progress.completedSteps || 0;
  const nextIncompleteStep = steps.find(
    (step) => !progress[step.key as keyof OnboardingProgress]
  );

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-dismiss-onboarding-widget"
      >
        <X className="w-4 h-4" />
      </button>
      
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Complete Your Setup</CardTitle>
        </div>
        <CardDescription>
          {completedCount === 0 
            ? "Let's get your account ready to go!"
            : `${completedCount} of ${progress.totalSteps} steps completed`
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress.percentComplete}%</span>
          </div>
          <Progress value={progress.percentComplete} className="h-2" />
        </div>

        <div className="flex flex-wrap gap-2">
          {steps.map((step) => {
            const isComplete = progress[step.key as keyof OnboardingProgress];
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  isComplete 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isComplete ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                <span>{step.title}</span>
              </div>
            );
          })}
        </div>

        <Button 
          data-testid="button-continue-onboarding"
          onClick={() => navigate("/onboarding")}
          className="w-full"
        >
          {nextIncompleteStep ? (
            <>Continue: {nextIncompleteStep.title} <ArrowRight className="w-4 h-4 ml-2" /></>
          ) : (
            <>Finish Setup <ArrowRight className="w-4 h-4 ml-2" /></>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
