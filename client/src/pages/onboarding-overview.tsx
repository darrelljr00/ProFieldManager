import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, Users, CreditCard, Wrench, Palette, UserPlus, 
  Check, ArrowRight, Sparkles, Rocket, CheckCircle2, Circle
} from "lucide-react";

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
  createdAt?: string;
  updatedAt?: string;
}

const steps = [
  { 
    id: "companyProfile", 
    key: "companyProfileComplete", 
    title: "Company Profile", 
    description: "Set up your business name, logo, and contact information",
    icon: Building2,
    stepNumber: 1
  },
  { 
    id: "teamMembers", 
    key: "teamMembersComplete", 
    title: "Team Members", 
    description: "Invite your employees and technicians to join your account",
    icon: Users,
    stepNumber: 2
  },
  { 
    id: "stripeConnect", 
    key: "stripeConnectComplete", 
    title: "Payment Setup", 
    description: "Connect your Stripe account to receive payments from customers",
    icon: CreditCard,
    stepNumber: 3
  },
  { 
    id: "services", 
    key: "servicesComplete", 
    title: "Services & Pricing", 
    description: "Define the services you offer and set your pricing",
    icon: Wrench,
    stepNumber: 4
  },
  { 
    id: "branding", 
    key: "brandingComplete", 
    title: "Branding", 
    description: "Customize your invoice templates and brand colors",
    icon: Palette,
    stepNumber: 5
  },
  { 
    id: "firstCustomer", 
    key: "firstCustomerComplete", 
    title: "First Customer", 
    description: "Add your first customer to get started with jobs and invoices",
    icon: UserPlus,
    stepNumber: 6
  },
];

export default function OnboardingOverview() {
  const [, navigate] = useLocation();

  const { data: progress, isLoading } = useQuery<OnboardingProgress>({
    queryKey: ["/api/onboarding/progress"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="grid gap-4 mt-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <Rocket className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Onboarding Data</h2>
            <p className="text-muted-foreground mb-4">
              Onboarding progress could not be loaded.
            </p>
            <Button onClick={() => navigate("/onboarding")}>
              Start Onboarding
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedCount = progress.completedSteps || 0;
  const nextIncompleteStep = steps.find(
    (step) => !progress[step.key as keyof OnboardingProgress]
  );

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Rocket className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Setup Your Account</h1>
          {progress.isComplete && (
            <Badge className="bg-green-500 text-white">Complete</Badge>
          )}
        </div>
        <p className="text-muted-foreground text-lg">
          {progress.isComplete 
            ? "Congratulations! Your account is fully set up and ready to use."
            : "Complete these steps to get the most out of Pro Field Manager."
          }
        </p>
      </div>

      <Card className="mb-8">
        <CardContent className="py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">Overall Progress</h3>
              <p className="text-muted-foreground">
                {completedCount} of {progress.totalSteps} steps completed
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-primary">{progress.percentComplete}%</span>
            </div>
          </div>
          <Progress value={progress.percentComplete} className="h-3" />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const isComplete = progress[step.key as keyof OnboardingProgress] as boolean;
          const isNext = !isComplete && step === nextIncompleteStep;
          const Icon = step.icon;
          
          return (
            <Card 
              key={step.id}
              className={`transition-all ${
                isComplete 
                  ? "border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800" 
                  : isNext 
                    ? "border-primary shadow-md" 
                    : "border-muted"
              }`}
            >
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    isComplete 
                      ? "bg-green-500 text-white" 
                      : isNext 
                        ? "bg-primary text-white" 
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {isComplete ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold ${isComplete ? "text-green-700 dark:text-green-400" : ""}`}>
                        Step {step.stepNumber}: {step.title}
                      </h3>
                      {isComplete && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <Check className="w-3 h-3 mr-1" /> Complete
                        </Badge>
                      )}
                      {isNext && (
                        <Badge className="bg-primary">Next Step</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm mt-1">
                      {step.description}
                    </p>
                  </div>
                  
                  <Button
                    variant={isComplete ? "outline" : isNext ? "default" : "ghost"}
                    size="sm"
                    onClick={() => navigate(`/onboarding?step=${step.stepNumber}`)}
                    data-testid={`button-step-${step.id}`}
                  >
                    {isComplete ? "Review" : isNext ? "Continue" : "Start"}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!progress.isComplete && (
        <div className="mt-8 text-center">
          <Button 
            size="lg" 
            onClick={() => navigate("/onboarding")}
            data-testid="button-continue-full-onboarding"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Continue Full Setup Wizard
          </Button>
        </div>
      )}

      {progress.isComplete && (
        <Card className="mt-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
              Setup Complete!
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Your account is fully configured. You're ready to manage your business with Pro Field Manager.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate("/")}>
                Go to Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate("/jobs")}>
                View Jobs
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
