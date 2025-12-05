import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Clock,
  ClipboardList,
  Package,
  Car,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  SkipForward,
  Play,
  PartyPopper,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface DailyFlowSession {
  id: number;
  userId: number;
  organizationId: number;
  workDate: string;
  checkInComplete: boolean;
  checkInTime: string | null;
  dailyJobsReviewed: boolean;
  dailyJobsReviewedAt: string | null;
  inventoryChecked: boolean;
  inventoryCheckedAt: string | null;
  vehicleInspectionComplete: boolean;
  vehicleInspectionId: number | null;
  vehicleInspectionCompletedAt: string | null;
  status: string;
  currentStep: number;
  completedSteps: number;
  totalSteps: number;
  isComplete: boolean;
  completedAt: string | null;
  skippedSteps: string[] | null;
  skipReasons: Record<string, string> | null;
  percentComplete: number;
  isClockedIn?: boolean;
}

interface Job {
  id: number;
  name: string;
  status: string;
  scheduledDate: string | null;
  address: string | null;
  customerName?: string;
}

const STEPS = [
  {
    id: "checkIn",
    title: "Check In",
    description: "Clock in for your work day",
    icon: Clock,
    action: "time-clock",
    actionLabel: "Go to Time Clock",
  },
  {
    id: "dailyJobs",
    title: "Daily Jobs",
    description: "Review your assigned jobs for today",
    icon: ClipboardList,
    action: "my-schedule",
    actionLabel: "View My Schedule",
  },
  {
    id: "inventory",
    title: "Tech Inventory",
    description: "Check your assigned parts and supplies",
    icon: Package,
    action: "tech-inventory",
    actionLabel: "Check Inventory",
  },
  {
    id: "vehicleInspection",
    title: "Vehicle Inspection",
    description: "Complete your vehicle inspection checklist",
    icon: Car,
    action: "inspections",
    actionLabel: "Start Inspection",
  },
];

export default function TechnicianDailyFlow() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [skipReason, setSkipReason] = useState("");
  const [stepToSkip, setStepToSkip] = useState<string | null>(null);

  const { data: session, isLoading, refetch } = useQuery<DailyFlowSession>({
    queryKey: ["/api/technician-daily-flow"],
    refetchInterval: 30000,
  });

  const { data: todayJobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/technician-daily-flow/jobs"],
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ stepName, completed, skipReason }: { stepName: string; completed: boolean; skipReason?: string }) => {
      return apiRequest("PATCH", `/api/technician-daily-flow/step/${stepName}`, { completed, skipReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technician-daily-flow"] });
      setSkipDialogOpen(false);
      setSkipReason("");
      setStepToSkip(null);
      toast({
        title: "Progress Saved",
        description: "Your daily flow progress has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update progress",
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/technician-daily-flow/complete", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technician-daily-flow"] });
      toast({
        title: "Daily Flow Complete!",
        description: "Great job! You've completed all your daily tasks.",
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/technician-daily-flow/reset", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technician-daily-flow"] });
      toast({
        title: "Daily Flow Reset",
        description: "Your daily flow has been reset.",
      });
    },
  });

  const getStepStatus = (stepId: string) => {
    if (!session) return "pending";
    switch (stepId) {
      case "checkIn":
        return session.checkInComplete ? "completed" : "pending";
      case "dailyJobs":
        return session.dailyJobsReviewed ? "completed" : "pending";
      case "inventory":
        return session.inventoryChecked ? "completed" : "pending";
      case "vehicleInspection":
        return session.vehicleInspectionComplete ? "completed" : "pending";
      default:
        return "pending";
    }
  };

  const isStepSkipped = (stepId: string) => {
    return session?.skippedSteps?.includes(stepId) || false;
  };

  const isCurrentStep = (stepIndex: number) => {
    if (!session) return stepIndex === 0;
    return session.currentStep === stepIndex + 1;
  };

  const handleMarkComplete = (stepId: string) => {
    updateStepMutation.mutate({ stepName: stepId, completed: true });
  };

  const handleSkipStep = (stepId: string) => {
    setStepToSkip(stepId);
    setSkipReason("");
    setSkipDialogOpen(true);
  };

  const confirmSkip = () => {
    if (stepToSkip) {
      updateStepMutation.mutate({
        stepName: stepToSkip,
        completed: true,
        skipReason: skipReason || "No reason provided",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const percentComplete = session?.percentComplete || 0;
  const isComplete = session?.isComplete || false;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Daily Flow</h1>
          <p className="text-muted-foreground">
            Complete your daily tasks to start your work day
          </p>
        </div>
        <div className="flex items-center gap-2">
          {session && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
              data-testid="button-reset-flow"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {isComplete ? (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <PartyPopper className="h-16 w-16 mx-auto text-green-600" />
              <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">All Done!</h2>
              <p className="text-muted-foreground">
                You've completed your daily flow. Have a great work day!
              </p>
              <p className="text-sm text-muted-foreground">
                Completed at {session?.completedAt ? new Date(session.completedAt).toLocaleTimeString() : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Today's Progress</CardTitle>
                <Badge variant={percentComplete === 100 ? "default" : "secondary"}>
                  {percentComplete}% Complete
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={percentComplete} className="h-3" />
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>{session?.completedSteps || 0} of {session?.totalSteps || 4} steps</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {STEPS.map((step, index) => {
              const status = getStepStatus(step.id);
              const isSkipped = isStepSkipped(step.id);
              const isCurrent = isCurrentStep(index);
              const StepIcon = step.icon;

              return (
                <Card
                  key={step.id}
                  className={`transition-all ${
                    status === "completed"
                      ? "border-green-500 bg-green-50/50 dark:bg-green-950/10"
                      : isCurrent
                      ? "border-primary ring-2 ring-primary/20"
                      : "opacity-75"
                  }`}
                  data-testid={`card-step-${step.id}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-full ${
                          status === "completed"
                            ? "bg-green-100 text-green-600 dark:bg-green-900/30"
                            : isCurrent
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {status === "completed" ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <StepIcon className="h-6 w-6" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{step.title}</CardTitle>
                          {status === "completed" && (
                            <Badge variant="default" className="bg-green-600">
                              {isSkipped ? "Skipped" : "Complete"}
                            </Badge>
                          )}
                          {isCurrent && status !== "completed" && (
                            <Badge variant="outline" className="border-primary text-primary">
                              Current
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="mt-1">{step.description}</CardDescription>
                        
                        {step.id === "checkIn" && session?.checkInTime && (
                          <p className="text-sm text-green-600 mt-2">
                            Checked in at {new Date(session.checkInTime).toLocaleTimeString()}
                          </p>
                        )}
                        
                        {step.id === "dailyJobs" && status !== "completed" && todayJobs.length > 0 && (
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-2">Today's Jobs ({todayJobs.length})</p>
                            <ul className="space-y-1">
                              {todayJobs.slice(0, 3).map((job) => (
                                <li key={job.id} className="text-sm text-muted-foreground flex items-center gap-2">
                                  <Circle className="h-2 w-2" />
                                  {job.name || `Job #${job.id}`}
                                </li>
                              ))}
                              {todayJobs.length > 3 && (
                                <li className="text-sm text-muted-foreground">
                                  +{todayJobs.length - 3} more
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                        
                        {isSkipped && session?.skipReasons?.[step.id] && (
                          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded text-sm text-yellow-700 dark:text-yellow-400">
                            <AlertCircle className="h-4 w-4 inline mr-1" />
                            Skipped: {session.skipReasons[step.id]}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {status !== "completed" && (
                    <CardFooter className="pt-0 pb-4">
                      <div className="flex gap-2 w-full">
                        <Link href={`/${step.action}?from=daily-flow&step=${step.id}`} className="flex-1">
                          <Button className="w-full" data-testid={`button-action-${step.id}`}>
                            <Play className="h-4 w-4 mr-2" />
                            {step.actionLabel}
                            <ChevronRight className="h-4 w-4 ml-auto" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          onClick={() => handleMarkComplete(step.id)}
                          disabled={updateStepMutation.isPending}
                          data-testid={`button-complete-${step.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Done
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleSkipStep(step.id)}
                          disabled={updateStepMutation.isPending}
                          data-testid={`button-skip-${step.id}`}
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>

          {percentComplete === 100 && !isComplete && (
            <Button
              className="w-full"
              size="lg"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              data-testid="button-finish-flow"
            >
              <PartyPopper className="h-5 w-5 mr-2" />
              Complete Daily Flow
            </Button>
          )}
        </>
      )}

      <Dialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skip Step</DialogTitle>
            <DialogDescription>
              Please provide a reason for skipping this step. Your manager will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="skip-reason">Reason</Label>
              <Textarea
                id="skip-reason"
                placeholder="Why are you skipping this step?"
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                data-testid="input-skip-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkipDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmSkip}
              disabled={updateStepMutation.isPending}
              data-testid="button-confirm-skip"
            >
              {updateStepMutation.isPending ? "Skipping..." : "Skip Step"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
