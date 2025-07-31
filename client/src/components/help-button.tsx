import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { HelpDocumentation } from "./help-documentation";

export function HelpButton() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsHelpOpen(true)}
        className="fixed bottom-4 right-4 z-40 shadow-lg"
      >
        <HelpCircle className="w-4 h-4 mr-2" />
        Help
      </Button>
      
      <HelpDocumentation
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </>
  );
}