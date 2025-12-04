import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, Briefcase, Camera, Clock, ClipboardCheck, MapPin,
  Check, ChevronRight, ChevronLeft, Sparkles, SkipForward,
  Loader2, PartyPopper, GraduationCap, PlayCircle, RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TechnicianOnboardingProgress {
  id: number;
  userId: number;
  organizationId: number;
  welcomeComplete: boolean;
  scheduleComplete: boolean;
  jobDetailsComplete: boolean;
  imageUploadsComplete: boolean;
  timeClockComplete: boolean;
  tasksComplete: boolean;
  gpsNavigationComplete: boolean;
  isComplete: boolean;
  currentStep: number;
  completedSteps: number;
  totalSteps: number;
  percentComplete: number;
}

interface StepConfig {
  id: string;
  title: string;
  description: string;
  icon: any;
  content: {
    heading: string;
    points: string[];
    tips?: string[];
  };
}

const steps: StepConfig[] = [
  { 
    id: "welcome", 
    title: "Welcome", 
    description: "Get started with Pro Field Manager", 
    icon: GraduationCap,
    content: {
      heading: "Welcome to Pro Field Manager!",
      points: [
        "This quick training will show you how to use the app",
        "You'll learn about viewing jobs, uploading photos, tracking time, and more",
        "Each section takes about 1-2 minutes to review",
        "You can skip ahead or come back to any section later"
      ],
      tips: [
        "Bookmark this page to revisit training anytime",
        "Ask your manager if you have questions about specific features"
      ]
    }
  },
  { 
    id: "schedule", 
    title: "Your Schedule", 
    description: "View your assigned jobs and calendar", 
    icon: Calendar,
    content: {
      heading: "Viewing Your Schedule",
      points: [
        "Open the 'Jobs' page from the sidebar to see all assigned jobs",
        "Jobs are organized by status: Upcoming, In Progress, and Completed",
        "Tap on any job card to see full details",
        "Use the calendar view to see jobs by date",
        "Filter jobs by date, city, or other criteria"
      ],
      tips: [
        "Check your schedule each morning for new assignments",
        "Jobs show customer name, address, and scheduled time"
      ]
    }
  },
  { 
    id: "jobDetails", 
    title: "Job Details", 
    description: "Understanding job cards and customer info", 
    icon: Briefcase,
    content: {
      heading: "Understanding Job Details",
      points: [
        "Each job card shows customer name, address, and service type",
        "Tap 'View Details' to see complete job information",
        "Job details include: customer contact info, service list, and special notes",
        "The 'Total Hours' badge shows estimated time for all services",
        "Press 'Start Job' when you arrive at the job site"
      ],
      tips: [
        "Review job notes before arriving - they may contain gate codes or special instructions",
        "Contact the customer if you'll be early or late"
      ]
    }
  },
  { 
    id: "imageUploads", 
    title: "Image Uploads", 
    description: "Taking and uploading job photos", 
    icon: Camera,
    content: {
      heading: "Uploading Job Photos",
      points: [
        "Open a job and scroll to the 'Photos' section",
        "Tap the camera icon or 'Add Photo' button",
        "Take before, during, and after photos to document your work",
        "Photos are labeled by type: Before, During, After",
        "If you lose internet, photos will upload automatically when you're back online"
      ],
      tips: [
        "Good lighting makes photos look more professional",
        "Take wide shots and close-ups for complete documentation",
        "Before/After photos help show the value of your work"
      ]
    }
  },
  { 
    id: "timeClock", 
    title: "Time Clock", 
    description: "Clocking in/out and tracking work hours", 
    icon: Clock,
    content: {
      heading: "Using the Time Clock",
      points: [
        "Tap 'Time Clock' in the sidebar to clock in/out",
        "Clock in at the start of your shift",
        "Use 'Start Break' for meal or rest breaks",
        "Clock out when your shift ends",
        "Your hours are tracked automatically for payroll"
      ],
      tips: [
        "Clock in before traveling to your first job",
        "Don't forget to clock out at the end of your day!",
        "Your manager can see your time entries"
      ]
    }
  },
  { 
    id: "tasks", 
    title: "Tasks & Inspections", 
    description: "Completing checklists and job tasks", 
    icon: ClipboardCheck,
    content: {
      heading: "Completing Tasks & Inspections",
      points: [
        "Each job may have a checklist of tasks to complete",
        "Open the job and find the 'Tasks' section",
        "Tap each task to mark it complete",
        "Some tasks require photos or notes",
        "Complete all required tasks before finishing the job"
      ],
      tips: [
        "Tasks help ensure consistent quality on every job",
        "If something prevents you from completing a task, add a note explaining why"
      ]
    }
  },
  { 
    id: "gpsNavigation", 
    title: "GPS & Navigation", 
    description: "Getting directions to job sites", 
    icon: MapPin,
    content: {
      heading: "Navigation & Directions",
      points: [
        "Tap the address on any job to open directions in Google Maps or Apple Maps",
        "GPS tracking may be enabled to help with route optimization",
        "Your location helps the office know when you arrive at jobs",
        "ETA notifications can be sent to customers automatically"
      ],
      tips: [
        "Allow location access for the best experience",
        "If the address seems wrong, contact the office before heading out"
      ]
    }
  },
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

function StepContent({ step, onComplete, isCompleted }: { step: StepConfig; onComplete: () => void; isCompleted: boolean }) {
  const Icon = step.icon;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{step.content.heading}</h2>
          <p className="text-muted-foreground">{step.description}</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5" />
            What You'll Learn
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {step.content.points.map((point, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {step.content.tips && step.content.tips.length > 0 && (
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-800 dark:text-amber-200 flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5" />
              Pro Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {step.content.tips.map((tip, idx) => (
                <li key={idx} className="text-amber-700 dark:text-amber-300 text-sm flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Button
        data-testid={`button-complete-${step.id}`}
        onClick={onComplete}
        className="w-full"
        size="lg"
      >
        {isCompleted ? (
          <>
            <Check className="w-5 h-5 mr-2" />
            Completed - Continue
          </>
        ) : (
          <>
            <Check className="w-5 h-5 mr-2" />
            Got It - Mark Complete
          </>
        )}
      </Button>
    </div>
  );
}

function CompletionScreen({ onReset }: { onReset: () => void }) {
  const [, navigate] = useLocation();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {showConfetti && <Confetti />}
      <Card className="max-w-lg w-full text-center">
        <CardHeader>
          <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
            <PartyPopper className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-3xl">Training Complete!</CardTitle>
          <CardDescription className="text-lg">
            You've finished the Pro Field Manager training. You're ready to start working!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              data-testid="button-go-to-jobs"
              onClick={() => navigate("/jobs")}
              size="lg"
            >
              <Briefcase className="w-5 h-5 mr-2" />
              View Jobs
            </Button>
            <Button
              data-testid="button-go-to-time-clock"
              variant="outline"
              onClick={() => navigate("/time-clock")}
              size="lg"
            >
              <Clock className="w-5 h-5 mr-2" />
              Time Clock
            </Button>
          </div>
          <Button
            data-testid="button-retake-training"
            variant="ghost"
            onClick={onReset}
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Retake Training
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TechnicianOnboarding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const { data: progress, isLoading } = useQuery<TechnicianOnboardingProgress>({
    queryKey: ["/api/technician-onboarding/progress"],
    enabled: !!user,
  });

  const stepMutation = useMutation({
    mutationFn: async ({ stepName, completed }: { stepName: string; completed: boolean }) => {
      return apiRequest("POST", `/api/technician-onboarding/step/${stepName}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technician-onboarding/progress"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/technician-onboarding/complete", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technician-onboarding/progress"] });
      toast({ title: "Training complete!", description: "You've completed all training sections." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/technician-onboarding/reset", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technician-onboarding/progress"] });
      setCurrentStepIndex(0);
      toast({ title: "Training reset", description: "You can now retake the training." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (progress && !progress.isComplete) {
      setCurrentStepIndex(Math.min(progress.currentStep - 1, steps.length - 1));
    }
  }, [progress]);

  const handleStepComplete = () => {
    const currentStep = steps[currentStepIndex];
    stepMutation.mutate({ stepName: currentStep.id, completed: true });
    
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleSkipAll = () => {
    completeMutation.mutate();
  };

  const handleReset = () => {
    resetMutation.mutate();
  };

  const isStepCompleted = (stepId: string): boolean => {
    if (!progress) return false;
    const key = `${stepId}Complete` as keyof TechnicianOnboardingProgress;
    return progress[key] as boolean;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (progress?.isComplete) {
    return <CompletionScreen onReset={handleReset} />;
  }

  const currentStep = steps[currentStepIndex];
  const percentComplete = progress?.percentComplete || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Technician Training</h1>
                <p className="text-muted-foreground">Learn how to use Pro Field Manager</p>
              </div>
            </div>
            <Button
              data-testid="button-skip-all"
              variant="ghost"
              onClick={handleSkipAll}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <SkipForward className="w-4 h-4 mr-2" />
              )}
              Skip All
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{percentComplete}% Complete</span>
            </div>
            <Progress value={percentComplete} className="h-2" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">TRAINING STEPS</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isCompleted = isStepCompleted(step.id);
                    const isCurrent = index === currentStepIndex;
                    
                    return (
                      <button
                        key={step.id}
                        data-testid={`nav-step-${step.id}`}
                        onClick={() => setCurrentStepIndex(index)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                          isCurrent 
                            ? "bg-primary/10 text-primary" 
                            : "hover:bg-muted",
                          isCompleted && !isCurrent && "text-muted-foreground"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          isCompleted 
                            ? "bg-green-100 dark:bg-green-900/30" 
                            : isCurrent 
                              ? "bg-primary/20" 
                              : "bg-muted"
                        )}>
                          {isCompleted ? (
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <Icon className={cn(
                              "w-4 h-4",
                              isCurrent ? "text-primary" : "text-muted-foreground"
                            )} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className={cn(
                            "text-sm font-medium truncate",
                            isCurrent && "text-primary"
                          )}>
                            {step.title}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6">
                <StepContent
                  step={currentStep}
                  onComplete={handleStepComplete}
                  isCompleted={isStepCompleted(currentStep.id)}
                />
                
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <Button
                    data-testid="button-previous-step"
                    variant="outline"
                    onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                    disabled={currentStepIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  
                  <span className="text-sm text-muted-foreground">
                    Step {currentStepIndex + 1} of {steps.length}
                  </span>
                  
                  <Button
                    data-testid="button-next-step"
                    variant="outline"
                    onClick={() => setCurrentStepIndex(Math.min(steps.length - 1, currentStepIndex + 1))}
                    disabled={currentStepIndex === steps.length - 1}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
