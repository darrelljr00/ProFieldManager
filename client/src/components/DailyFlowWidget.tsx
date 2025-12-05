import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, ArrowRight, Clock } from "lucide-react";
import { useState } from "react";

interface DailyFlowSession {
  id: number;
  userId: number;
  organizationId: number;
  workDate: string;
  status: "pending" | "in_progress" | "completed";
  stepStates: {
    check_in: { completed: boolean; completedAt?: string };
    daily_jobs: { completed: boolean; completedAt?: string };
    tech_inventory: { completed: boolean; completedAt?: string };
    vehicle_inspection: { completed: boolean; completedAt?: string };
  };
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function DailyFlowWidget() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  const { data: systemSettings } = useQuery<Record<string, any>>({
    queryKey: ["/api/admin/system-settings"],
    enabled: !!user,
  });

  const { data: session, isLoading } = useQuery<DailyFlowSession>({
    queryKey: ["/api/technician-daily-flow"],
    enabled: !!user && systemSettings?.enableDailyFlow !== "false",
  });

  if (systemSettings?.enableDailyFlow === "false") {
    return null;
  }

  if (isLoading || dismissed) {
    return null;
  }

  if (session?.status === "completed") {
    return null;
  }

  const completedSteps = session?.stepStates
    ? Object.values(session.stepStates).filter((s) => s.completed).length
    : 0;
  const totalSteps = 4;
  const percentComplete = Math.round((completedSteps / totalSteps) * 100);
  const hasStarted = completedSteps > 0;

  return (
    <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800 mb-6">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                {hasStarted ? "Continue Your Daily Flow" : "Start Your Day Right"}
              </h3>
              <p className="text-emerald-700 dark:text-emerald-300 text-sm mt-1">
                {hasStarted
                  ? `You're ${percentComplete}% complete. Finish your daily checklist!`
                  : "Complete your daily check-in, review jobs, inventory, and vehicle inspection."}
              </p>
              {hasStarted && (
                <div className="mt-3 max-w-xs">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-emerald-600 dark:text-emerald-400">Progress</span>
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      {completedSteps} of {totalSteps} steps
                    </span>
                  </div>
                  <Progress value={percentComplete} className="h-2" />
                </div>
              )}
              {!hasStarted && (
                <div className="flex items-center gap-2 mt-3 text-xs text-emerald-600 dark:text-emerald-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Takes about 5 minutes</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              data-testid="button-start-daily-flow"
              onClick={() => navigate("/daily-flow")}
              className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-700"
            >
              {hasStarted ? "Continue" : "Start Flow"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
