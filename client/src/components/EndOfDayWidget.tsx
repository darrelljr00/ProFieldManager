import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Moon, ArrowRight, Clock } from "lucide-react";
import { useState } from "react";

interface EndOfDaySession {
  id: number;
  userId: number;
  organizationId: number;
  workDate: string;
  vehicleCleanedComplete: boolean;
  vehicleCleanedAt: string | null;
  toolsStoredComplete: boolean;
  toolsStoredAt: string | null;
  postInspectionComplete: boolean;
  postInspectionId: number | null;
  postInspectionCompletedAt: string | null;
  gasCardReturnedComplete: boolean;
  gasCardReturnedAt: string | null;
  status: string;
  currentStep: number;
  completedSteps: number;
  totalSteps: number;
  isComplete: boolean;
  completedAt: string | null;
  percentComplete: number;
}

export function EndOfDayWidget() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  const { data: systemSettings } = useQuery<Record<string, any>>({
    queryKey: ["/api/admin/system-settings"],
    enabled: !!user,
  });

  const { data: session, isLoading } = useQuery<EndOfDaySession>({
    queryKey: ["/api/technician-end-of-day"],
    enabled: !!user && systemSettings?.enableDailyFlow !== "false",
  });

  if (systemSettings?.enableDailyFlow === "false") {
    return null;
  }

  if (isLoading || dismissed) {
    return null;
  }

  if (session?.isComplete) {
    return null;
  }

  const completedSteps = session?.completedSteps || 0;
  const totalSteps = 4;
  const percentComplete = session?.percentComplete || 0;
  const hasStarted = completedSteps > 0;

  return (
    <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-200 dark:border-indigo-800 mb-6">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
              <Moon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">
                {hasStarted ? "Continue End of Day Tasks" : "End of Day Checklist"}
              </h3>
              <p className="text-indigo-700 dark:text-indigo-300 text-sm mt-1">
                {hasStarted
                  ? `You're ${percentComplete}% complete. Wrap up your day!`
                  : "Clean vehicle, store tools, complete post-inspection, and return gas card."}
              </p>
              {hasStarted && (
                <div className="mt-3 max-w-xs">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-indigo-600 dark:text-indigo-400">Progress</span>
                    <span className="font-medium text-indigo-700 dark:text-indigo-300">
                      {completedSteps} of {totalSteps} steps
                    </span>
                  </div>
                  <Progress value={percentComplete} className="h-2" />
                </div>
              )}
              {!hasStarted && (
                <div className="flex items-center gap-2 mt-3 text-xs text-indigo-600 dark:text-indigo-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Takes about 10 minutes</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              data-testid="button-start-end-of-day"
              onClick={() => navigate("/end-of-day")}
              className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-700"
            >
              {hasStarted ? "Continue" : "Start"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
