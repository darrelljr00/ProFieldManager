import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  X, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Target,
  Mouse,
  Keyboard,
  Eye,
  Clock,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action: 'click' | 'hover' | 'type' | 'scroll' | 'wait' | 'highlight' | 'info';
  actionData?: string;
  duration?: number;
  isRequired?: boolean;
  validation?: string;
}

interface InteractiveWalkthrough {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  steps: WalkthroughStep[];
  prerequisites?: string[];
}

interface WalkthroughPlayerProps {
  walkthrough: InteractiveWalkthrough;
  onComplete: (rating?: number, feedback?: string) => void;
  onClose: () => void;
}

export function WalkthroughPlayer({ walkthrough, onComplete, onClose }: WalkthroughPlayerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStepData = walkthrough.steps[currentStep];
  const progress = ((currentStep + 1) / walkthrough.steps.length) * 100;
  const isLastStep = currentStep === walkthrough.steps.length - 1;

  // Highlight target element
  useEffect(() => {
    if (currentStepData?.targetSelector) {
      const element = document.querySelector(currentStepData.targetSelector) as HTMLElement;
      if (element) {
        setHighlightedElement(element);
        
        // Scroll element into view
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });

        // Add highlight styles
        element.style.position = 'relative';
        element.style.zIndex = '10001';
        element.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2)';
        element.style.borderRadius = '8px';
        element.style.transition = 'all 0.3s ease';
      }
    }

    return () => {
      if (highlightedElement) {
        highlightedElement.style.position = '';
        highlightedElement.style.zIndex = '';
        highlightedElement.style.boxShadow = '';
        highlightedElement.style.borderRadius = '';
        highlightedElement.style.transition = '';
      }
    };
  }, [currentStep, currentStepData, highlightedElement]);

  const executeStep = async () => {
    const step = currentStepData;
    if (!step) return;

    switch (step.action) {
      case 'click':
        if (step.targetSelector) {
          const element = document.querySelector(step.targetSelector) as HTMLElement;
          if (element) {
            element.click();
          }
        }
        break;
      
      case 'type':
        if (step.targetSelector && step.actionData) {
          const element = document.querySelector(step.targetSelector) as HTMLInputElement;
          if (element) {
            element.focus();
            element.value = step.actionData;
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        break;
      
      case 'wait':
        await new Promise(resolve => setTimeout(resolve, step.duration || 2000));
        break;
    }

    // Mark step as completed
    setCompletedSteps(prev => new Set(prev).add(currentStep));
  };

  const nextStep = () => {
    if (isLastStep) {
      setShowRating(true);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    onComplete(rating, feedback);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'click': return <Mouse className="w-4 h-4" />;
      case 'type': return <Keyboard className="w-4 h-4" />;
      case 'highlight': return <Target className="w-4 h-4" />;
      case 'wait': return <Clock className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  if (showRating) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Walkthrough Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You've completed "{walkthrough.title}". How would you rate this walkthrough?
            </p>
            
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={cn(
                    "p-1 rounded",
                    rating >= star ? "text-yellow-500" : "text-gray-300 hover:text-yellow-400"
                  )}
                >
                  <Star className="w-6 h-6 fill-current" />
                </button>
              ))}
            </div>
            
            <textarea
              placeholder="Any feedback to help us improve? (optional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full p-2 border rounded-md resize-none h-20 text-sm"
            />
            
            <div className="flex gap-2">
              <Button onClick={handleComplete} className="flex-1">
                Complete
              </Button>
              <Button variant="outline" onClick={onClose}>
                Skip Rating
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div 
        ref={overlayRef}
        className="fixed inset-0 bg-black/30 z-50"
      />
      
      {/* Walkthrough Controls */}
      <div className="fixed top-4 right-4 z-[60]">
        <Card className="w-80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">{walkthrough.title}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    Step {currentStep + 1} of {walkthrough.steps.length}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {walkthrough.difficulty}
                  </Badge>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Progress value={progress} className="h-2 mt-2" />
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {getActionIcon(currentStepData?.action)}
                <h4 className="font-medium text-sm">{currentStepData?.title}</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {currentStepData?.description}
              </p>
              
              {currentStepData?.action === 'type' && currentStepData?.actionData && (
                <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                  Type: "{currentStepData.actionData}"
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                onClick={executeStep}
                className="flex-1"
                disabled={isPlaying}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Execute
                  </>
                )}
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={nextStep}
              >
                {isLastStep ? 'Finish' : <ArrowRight className="w-4 h-4" />}
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground text-center">
              {completedSteps.size} of {walkthrough.steps.length} steps completed
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Predefined walkthroughs
export const BUILTIN_WALKTHROUGHS: InteractiveWalkthrough[] = [
  {
    id: 'dashboard-tour',
    title: 'Dashboard Overview',
    description: 'Get familiar with your main dashboard and key metrics',
    category: 'getting-started',
    estimatedTime: 5,
    difficulty: 'beginner',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Your Dashboard',
        description: 'This is your main dashboard where you can see an overview of your business.',
        position: 'center',
        action: 'info'
      },
      {
        id: 'stats-cards',
        title: 'Key Metrics Cards',
        description: 'These cards show your most important business metrics at a glance.',
        targetSelector: '[data-testid="dashboard-stats"]',
        position: 'bottom',
        action: 'highlight'
      },
      {
        id: 'recent-jobs',
        title: 'Recent Jobs',
        description: 'View your most recent jobs and their current status.',
        targetSelector: '[data-testid="recent-jobs"]',
        position: 'left',
        action: 'highlight'
      },
      {
        id: 'quick-actions',
        title: 'Quick Actions',
        description: 'Use these buttons to quickly create new jobs, customers, or quotes.',
        targetSelector: '[data-testid="quick-actions"]',
        position: 'top',
        action: 'highlight'
      }
    ]
  },
  {
    id: 'create-customer',
    title: 'Creating Your First Customer',
    description: 'Learn how to add a new customer to your system',
    category: 'core-features',
    estimatedTime: 8,
    difficulty: 'beginner',
    steps: [
      {
        id: 'navigate-customers',
        title: 'Navigate to Customers',
        description: 'Click on the Customers link in the sidebar to open the customers page.',
        targetSelector: 'a[href="/customers"]',
        position: 'right',
        action: 'click'
      },
      {
        id: 'add-customer-button',
        title: 'Click Add Customer',
        description: 'Click the "Add Customer" button to open the customer creation form.',
        targetSelector: '[data-testid="add-customer-btn"]',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'fill-name',
        title: 'Enter Customer Name',
        description: 'Type the customer\'s name in the name field.',
        targetSelector: 'input[name="name"]',
        position: 'top',
        action: 'type',
        actionData: 'John Smith'
      },
      {
        id: 'fill-email',
        title: 'Enter Email Address',
        description: 'Add the customer\'s email address for communication.',
        targetSelector: 'input[name="email"]',
        position: 'top',
        action: 'type',
        actionData: 'john.smith@example.com'
      },
      {
        id: 'fill-phone',
        title: 'Enter Phone Number',
        description: 'Add the customer\'s phone number.',
        targetSelector: 'input[name="phone"]',
        position: 'top',
        action: 'type',
        actionData: '(555) 123-4567'
      },
      {
        id: 'save-customer',
        title: 'Save Customer',
        description: 'Click the Save button to create the customer.',
        targetSelector: 'button[type="submit"]',
        position: 'bottom',
        action: 'click'
      }
    ]
  },
  {
    id: 'mobile-features',
    title: 'Mobile App Features',
    description: 'Discover how to use the mobile features effectively',
    category: 'mobile-app',
    estimatedTime: 12,
    difficulty: 'intermediate',
    steps: [
      {
        id: 'mobile-intro',
        title: 'Mobile Features Overview',
        description: 'Learn about GPS tracking, time clock, and field reporting features.',
        position: 'center',
        action: 'info'
      },
      {
        id: 'time-clock',
        title: 'Access Time Clock',
        description: 'Navigate to the time clock to track work hours.',
        targetSelector: 'a[href="/time-clock"]',
        position: 'right',
        action: 'click'
      },
      {
        id: 'gps-tracking',
        title: 'GPS Tracking',
        description: 'View GPS tracking features for field workers.',
        targetSelector: 'a[href="/gps-tracking"]',
        position: 'right',
        action: 'click'
      }
    ]
  }
];