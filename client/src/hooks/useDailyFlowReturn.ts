import { useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useDailyFlowReturn() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();

  const params = new URLSearchParams(searchString);
  const isFromDailyFlow = params.get("from") === "daily-flow";
  const stepId = params.get("step");

  const completeStepMutation = useMutation({
    mutationFn: async (stepName: string) => {
      return apiRequest(`/api/technician-daily-flow/step/${stepName}`, "PATCH", { completed: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technician-daily-flow"] });
      toast({
        title: "Step Complete",
        description: "Great job! Moving to the next step.",
      });
      navigate("/daily-flow");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update step",
        variant: "destructive",
      });
    },
  });

  const completeAndReturn = () => {
    if (isFromDailyFlow && stepId) {
      completeStepMutation.mutate(stepId);
    }
  };

  const returnToDailyFlow = () => {
    if (isFromDailyFlow) {
      navigate("/daily-flow");
    }
  };

  return {
    isFromDailyFlow,
    stepId,
    completeAndReturn,
    returnToDailyFlow,
    isPending: completeStepMutation.isPending,
  };
}
