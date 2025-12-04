import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, ArrowRight, X } from "lucide-react";
import { useState } from "react";

interface TechnicianOnboardingProgress {
  id: number;
  userId: number;
  isComplete: boolean;
  completedSteps: number;
  totalSteps: number;
  percentComplete: number;
}

export function TechnicianTrainingWidget() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  const { data: progress, isLoading } = useQuery<TechnicianOnboardingProgress>({
    queryKey: ["/api/technician-onboarding/progress"],
    enabled: !!user,
  });

  if (isLoading || !progress || progress.isComplete || dismissed) {
    return null;
  }

  const hasStarted = progress.completedSteps > 0;

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800 mb-6">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                {hasStarted ? "Continue Your Training" : "Welcome! Start Your Training"}
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                {hasStarted 
                  ? `You're ${progress.percentComplete}% complete. Pick up where you left off!`
                  : "Learn how to use Pro Field Manager with our quick training guide."
                }
              </p>
              {hasStarted && (
                <div className="mt-3 max-w-xs">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-blue-600 dark:text-blue-400">Progress</span>
                    <span className="font-medium text-blue-700 dark:text-blue-300">
                      {progress.completedSteps} of {progress.totalSteps} steps
                    </span>
                  </div>
                  <Progress value={progress.percentComplete} className="h-2" />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              data-testid="button-start-training"
              onClick={() => navigate("/technician-training")}
              className="whitespace-nowrap"
            >
              {hasStarted ? "Continue" : "Start Training"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              data-testid="button-dismiss-training"
              variant="ghost"
              size="icon"
              className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50"
              onClick={() => setDismissed(true)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
