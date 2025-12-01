import { useState, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle, Loader2 } from "lucide-react";

const HelpDocumentation = lazy(() => import("./help-documentation").then(m => ({ default: m.HelpDocumentation })));

export function HelpButton() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsHelpOpen(true)}
        className="fixed bottom-4 right-4 z-40 shadow-lg"
        data-testid="button-help"
      >
        <HelpCircle className="w-4 h-4 mr-2" />
        Help
      </Button>
      
      {isHelpOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }>
          <HelpDocumentation
            isOpen={isHelpOpen}
            onClose={() => setIsHelpOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}
