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

export interface InteractiveWalkthrough {
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
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlayTimer, setAutoPlayTimer] = useState<NodeJS.Timeout | null>(null);
  const [autoPlayCountdown, setAutoPlayCountdown] = useState(0);
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isNarrating, setIsNarrating] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

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

        // Add enhanced highlight styling with pulsing animation for auto-play
        element.style.position = 'relative';
        element.style.zIndex = '10001';
        element.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2)';
        element.style.borderRadius = '8px';
        element.style.transition = 'all 0.3s ease';
        
        // Add pulsing animation for auto-play mode
        if (isAutoPlaying) {
          element.classList.add('walkthrough-highlight');
        }
      }
    }

    return () => {
      if (highlightedElement) {
        highlightedElement.style.position = '';
        highlightedElement.style.zIndex = '';
        highlightedElement.style.boxShadow = '';
        highlightedElement.style.borderRadius = '';
        highlightedElement.style.transition = '';
        highlightedElement.classList.remove('walkthrough-highlight');
      }
    };
  }, [currentStep, currentStepData, highlightedElement]);

  // Audio narration function
  const narrateStep = (text: string) => {
    if (!audioEnabled || !window.speechSynthesis) return;
    
    // Cancel any existing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.7;
    
    utterance.onstart = () => setIsNarrating(true);
    utterance.onend = () => setIsNarrating(false);
    utterance.onerror = () => setIsNarrating(false);
    
    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const executeStep = async () => {
    const step = currentStepData;
    if (!step) return;

    setIsPlaying(true);
    
    // Narrate the step
    narrateStep(step.description);

    // Add visual feedback for step execution
    if (step.targetSelector) {
      const element = document.querySelector(step.targetSelector) as HTMLElement;
      if (element) {
        // Highlight the element being interacted with
        element.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5)';
        element.style.transition = 'box-shadow 0.3s ease';
        
        // Scroll to element
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for visual effect

    switch (step.action) {
      case 'click':
        if (step.targetSelector) {
          const element = document.querySelector(step.targetSelector) as HTMLElement;
          if (element) {
            // Simulate click with visual feedback
            element.style.transform = 'scale(0.98)';
            setTimeout(() => {
              element.style.transform = '';
              element.click();
            }, 150);
          }
        }
        break;
      
      case 'type':
        if (step.targetSelector && step.actionData) {
          const element = document.querySelector(step.targetSelector) as HTMLInputElement;
          if (element) {
            element.focus();
            
            // Simulate typing character by character
            const text = step.actionData;
            element.value = '';
            
            for (let i = 0; i < text.length; i++) {
              await new Promise(resolve => setTimeout(resolve, 100));
              element.value = text.substring(0, i + 1);
              element.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        break;
        
      case 'hover':
        if (step.targetSelector) {
          const element = document.querySelector(step.targetSelector) as HTMLElement;
          if (element) {
            // Add hover visual effect
            element.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 1000));
            element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
            element.style.backgroundColor = '';
          }
        }
        break;
      
      case 'wait':
        await new Promise(resolve => setTimeout(resolve, step.duration || 2000));
        break;
        
      case 'highlight':
        // Just highlight the element without any action
        await new Promise(resolve => setTimeout(resolve, 1000));
        break;
        
      case 'scroll':
        if (step.targetSelector) {
          const element = document.querySelector(step.targetSelector) as HTMLElement;
          if (element) {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'center'
            });
          }
        }
        break;
    }

    // Clean up visual effects
    if (step.targetSelector) {
      const element = document.querySelector(step.targetSelector) as HTMLElement;
      if (element) {
        setTimeout(() => {
          element.style.boxShadow = '';
          element.style.transform = '';
        }, 1000);
      }
    }

    // Mark step as completed
    setCompletedSteps(prev => new Set(prev).add(currentStep));
    setIsPlaying(false);
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

  const startAutoPlay = () => {
    setIsAutoPlaying(true);
    narrateStep(`Starting automatic walkthrough: ${walkthrough.title}. I'll guide you through each step.`);
    setIsPlaying(true);
    executeCurrentStep();
  };

  const stopAutoPlay = () => {
    setIsAutoPlaying(false);
    setIsPlaying(false);
    if (autoPlayTimer) {
      clearTimeout(autoPlayTimer);
      setAutoPlayTimer(null);
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }
    setAutoPlayCountdown(0);
  };

  const executeCurrentStep = () => {
    const step = currentStepData;
    if (!step) return;
    
    // Execute the step action
    executeStep();
    
    // Start countdown (3 seconds)
    setAutoPlayCountdown(3);
    
    // Countdown interval
    const countdown = setInterval(() => {
      setAutoPlayCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setCountdownInterval(countdown);
    
    // Set timer for next step (3 seconds)
    const timer = setTimeout(() => {
      clearInterval(countdown);
      setCountdownInterval(null);
      setAutoPlayCountdown(0);
      
      if (!isLastStep) {
        nextStep();
      } else {
        // Last step - stop auto play and show completion
        setIsAutoPlaying(false);
        setIsPlaying(false);
        setShowRating(true);
      }
    }, 3000);
    
    setAutoPlayTimer(timer);
  };

  // Auto play effect
  useEffect(() => {
    if (isAutoPlaying && isPlaying) {
      executeCurrentStep();
    }
    
    return () => {
      if (autoPlayTimer) {
        clearTimeout(autoPlayTimer);
      }
    };
  }, [currentStep, isAutoPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoPlayTimer) {
        clearTimeout(autoPlayTimer);
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, []);

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
      
      {/* Floating Play Button - Top Right */}
      {!isPlaying && !isAutoPlaying && (
        <div className="fixed top-4 right-4 z-[70]">
          <Button
            onClick={startAutoPlay}
            size="lg"
            className="rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white h-14 w-14 p-0"
          >
            <Play className="w-6 h-6" />
          </Button>
        </div>
      )}

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
              <div className="flex gap-2">
                {isAutoPlaying && (
                  <Button size="sm" variant="destructive" onClick={stopAutoPlay}>
                    <Pause className="w-4 h-4" />
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className={audioEnabled ? 'text-blue-600' : 'text-muted-foreground'}
                  title={audioEnabled ? 'Disable Audio' : 'Enable Audio'}
                >
                  🔊
                </Button>
                <Button size="sm" variant="ghost" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
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
            
            {/* Manual Controls - Only show when not in auto-play */}
            {!isAutoPlaying && (
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
                  variant="outline"
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
            )}
            
            {/* Auto-play status and countdown */}
            {isAutoPlaying && (
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600">
                  <Play className="w-4 h-4 animate-pulse" />
                  Auto-Playing Walkthrough
                  {isNarrating && <span className="text-green-600 animate-pulse">🎵</span>}
                </div>
                {autoPlayCountdown > 0 && (
                  <>
                    <div className="text-sm text-muted-foreground">
                      Next step in {autoPlayCountdown}s
                    </div>
                    <Progress 
                      value={((3 - autoPlayCountdown) / 3) * 100} 
                      className="h-2"
                    />
                  </>
                )}
              </div>
            )}
            
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
  },
  {
    id: 'create-invoice',
    title: 'Creating an Invoice',
    description: 'Step-by-step guide to create and send invoices to customers',
    category: 'core-features',
    estimatedTime: 10,
    difficulty: 'beginner',
    steps: [
      {
        id: 'navigate-invoices',
        title: 'Navigate to Invoices',
        description: 'Click on the Invoices link in the sidebar to open the invoicing section.',
        targetSelector: 'a[href="/invoices"]',
        position: 'right',
        action: 'click'
      },
      {
        id: 'add-invoice-button',
        title: 'Click Add Invoice',
        description: 'Click the "Add Invoice" or "Create Invoice" button to start creating a new invoice.',
        targetSelector: '[data-testid="add-invoice-btn"], .add-invoice-btn',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'select-customer',
        title: 'Select Customer',
        description: 'Choose the customer for this invoice from the dropdown menu.',
        targetSelector: 'select[name="customerId"], [data-testid="customer-select"]',
        position: 'top',
        action: 'click'
      },
      {
        id: 'invoice-details',
        title: 'Fill Invoice Details',
        description: 'Enter the invoice number, date, and due date for the invoice.',
        targetSelector: 'input[name="invoiceNumber"], [data-testid="invoice-number"]',
        position: 'top',
        action: 'highlight'
      },
      {
        id: 'add-line-items',
        title: 'Add Line Items',
        description: 'Add services, products, or labor to the invoice with quantities and prices.',
        targetSelector: '[data-testid="add-line-item"], .add-item-btn',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'review-total',
        title: 'Review Total Amount',
        description: 'Review the calculated total, including taxes and discounts.',
        targetSelector: '[data-testid="invoice-total"], .invoice-total',
        position: 'left',
        action: 'highlight'
      },
      {
        id: 'save-invoice',
        title: 'Save Invoice',
        description: 'Click Save to create the invoice. You can then send it to the customer.',
        targetSelector: 'button[type="submit"], .save-btn',
        position: 'bottom',
        action: 'click'
      }
    ]
  },
  {
    id: 'add-expense',
    title: 'Adding an Expense',
    description: 'Learn how to track and categorize business expenses',
    category: 'financial-management',
    estimatedTime: 8,
    difficulty: 'beginner',
    steps: [
      {
        id: 'navigate-expenses',
        title: 'Navigate to Expenses',
        description: 'Click on the Expenses link in the sidebar to open expense tracking.',
        targetSelector: 'a[href="/expenses"]',
        position: 'right',
        action: 'click'
      },
      {
        id: 'add-expense-button',
        title: 'Click Add Expense',
        description: 'Click the "Add Expense" button to create a new expense entry.',
        targetSelector: '[data-testid="add-expense-btn"], .add-expense-btn',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'expense-description',
        title: 'Enter Description',
        description: 'Provide a clear description of what the expense was for.',
        targetSelector: 'input[name="description"], textarea[name="description"]',
        position: 'top',
        action: 'type',
        actionData: 'Office supplies - printer paper and ink'
      },
      {
        id: 'expense-amount',
        title: 'Enter Amount',
        description: 'Enter the total amount spent on this expense.',
        targetSelector: 'input[name="amount"], input[type="number"]',
        position: 'top',
        action: 'type',
        actionData: '125.50'
      },
      {
        id: 'expense-category',
        title: 'Select Category',
        description: 'Choose the appropriate category for this expense for better organization.',
        targetSelector: 'select[name="category"], [data-testid="category-select"]',
        position: 'top',
        action: 'click'
      },
      {
        id: 'expense-date',
        title: 'Set Date',
        description: 'Set the date when this expense occurred.',
        targetSelector: 'input[type="date"], [data-testid="expense-date"]',
        position: 'top',
        action: 'highlight'
      },
      {
        id: 'attach-receipt',
        title: 'Attach Receipt (Optional)',
        description: 'Upload a photo or scan of the receipt for record keeping.',
        targetSelector: 'input[type="file"], [data-testid="receipt-upload"]',
        position: 'bottom',
        action: 'highlight'
      },
      {
        id: 'save-expense',
        title: 'Save Expense',
        description: 'Click Save to record the expense in your system.',
        targetSelector: 'button[type="submit"], .save-btn',
        position: 'bottom',
        action: 'click'
      }
    ]
  },
  {
    id: 'create-lead',
    title: 'Creating a Sales Lead',
    description: 'Capture and manage potential customers and sales opportunities',
    category: 'sales-marketing',
    estimatedTime: 12,
    difficulty: 'beginner',
    steps: [
      {
        id: 'navigate-leads',
        title: 'Navigate to Leads',
        description: 'Click on the Leads link in the sidebar to open lead management.',
        targetSelector: 'a[href="/leads"]',
        position: 'right',
        action: 'click'
      },
      {
        id: 'add-lead-button',
        title: 'Click Add Lead',
        description: 'Click the "Add Lead" button to create a new sales lead.',
        targetSelector: '[data-testid="add-lead-btn"], .add-lead-btn',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'lead-contact-info',
        title: 'Enter Contact Information',
        description: 'Fill in the lead\'s name, email, and phone number.',
        targetSelector: 'input[name="name"], input[name="firstName"]',
        position: 'top',
        action: 'type',
        actionData: 'Sarah Johnson'
      },
      {
        id: 'lead-email',
        title: 'Enter Email Address',
        description: 'Add the lead\'s email address for follow-up communications.',
        targetSelector: 'input[name="email"]',
        position: 'top',
        action: 'type',
        actionData: 'sarah.johnson@example.com'
      },
      {
        id: 'lead-phone',
        title: 'Enter Phone Number',
        description: 'Add the lead\'s phone number for direct contact.',
        targetSelector: 'input[name="phone"]',
        position: 'top',
        action: 'type',
        actionData: '(555) 987-6543'
      },
      {
        id: 'lead-source',
        title: 'Select Lead Source',
        description: 'Choose how this lead was acquired (website, referral, advertising, etc.).',
        targetSelector: 'select[name="source"], [data-testid="lead-source"]',
        position: 'top',
        action: 'click'
      },
      {
        id: 'lead-status',
        title: 'Set Lead Status',
        description: 'Set the current status of this lead (new, contacted, qualified, etc.).',
        targetSelector: 'select[name="status"], [data-testid="lead-status"]',
        position: 'top',
        action: 'click'
      },
      {
        id: 'lead-notes',
        title: 'Add Notes',
        description: 'Include any relevant notes or details about the lead\'s needs or interests.',
        targetSelector: 'textarea[name="notes"], textarea[name="description"]',
        position: 'top',
        action: 'type',
        actionData: 'Interested in commercial cleaning services for their office building. Prefers weekly service.'
      },
      {
        id: 'save-lead',
        title: 'Save Lead',
        description: 'Click Save to add the lead to your pipeline for follow-up.',
        targetSelector: 'button[type="submit"], .save-btn',
        position: 'bottom',
        action: 'click'
      }
    ]
  },
  {
    id: 'create-task',
    title: 'Creating a Task',
    description: 'Learn how to create and assign tasks to team members',
    category: 'task-management',
    estimatedTime: 8,
    difficulty: 'beginner',
    steps: [
      {
        id: 'navigate-tasks',
        title: 'Navigate to Tasks',
        description: 'Click on the Tasks or My Tasks link in the sidebar.',
        targetSelector: 'a[href="/my-tasks"], a[href="/tasks"]',
        position: 'right',
        action: 'click'
      },
      {
        id: 'add-task-button',
        title: 'Click Add Task',
        description: 'Click the "Add Task" or "Create Task" button to create a new task.',
        targetSelector: '[data-testid="add-task-btn"], .add-task-btn',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'task-title',
        title: 'Enter Task Title',
        description: 'Provide a clear, descriptive title for the task.',
        targetSelector: 'input[name="title"], input[name="name"]',
        position: 'top',
        action: 'type',
        actionData: 'Complete monthly inventory check'
      },
      {
        id: 'task-description',
        title: 'Add Description',
        description: 'Provide detailed instructions or notes about what needs to be done.',
        targetSelector: 'textarea[name="description"], textarea[name="notes"]',
        position: 'top',
        action: 'type',
        actionData: 'Count all supplies in storage room and update inventory spreadsheet with current quantities.'
      },
      {
        id: 'task-assignee',
        title: 'Assign to Team Member',
        description: 'Select which team member should complete this task.',
        targetSelector: 'select[name="assignedTo"], [data-testid="assignee-select"]',
        position: 'top',
        action: 'click'
      },
      {
        id: 'task-priority',
        title: 'Set Priority Level',
        description: 'Choose the priority level (low, medium, high, urgent) for this task.',
        targetSelector: 'select[name="priority"], [data-testid="priority-select"]',
        position: 'top',
        action: 'click'
      },
      {
        id: 'task-due-date',
        title: 'Set Due Date',
        description: 'Set when this task should be completed.',
        targetSelector: 'input[type="date"], [data-testid="due-date"]',
        position: 'top',
        action: 'highlight'
      },
      {
        id: 'save-task',
        title: 'Save Task',
        description: 'Click Save to create the task and assign it to the team member.',
        targetSelector: 'button[type="submit"], .save-btn',
        position: 'bottom',
        action: 'click'
      }
    ]
  },
  {
    id: 'vehicle-inspection',
    title: 'Performing a Vehicle Inspection',
    description: 'Complete a digital vehicle inspection with photos and documentation',
    category: 'field-operations',
    estimatedTime: 15,
    difficulty: 'intermediate',
    steps: [
      {
        id: 'navigate-inspections',
        title: 'Navigate to Inspections',
        description: 'Click on the Inspections link in the sidebar to access vehicle inspections.',
        targetSelector: 'a[href="/inspections"]',
        position: 'right',
        action: 'click'
      },
      {
        id: 'select-vehicle',
        title: 'Select Vehicle',
        description: 'Choose the vehicle you want to inspect from the vehicle list.',
        targetSelector: '[data-testid="vehicle-select"], .vehicle-card',
        position: 'top',
        action: 'click'
      },
      {
        id: 'start-inspection',
        title: 'Start New Inspection',
        description: 'Click "New Inspection" or "Start Inspection" to begin the inspection process.',
        targetSelector: '[data-testid="start-inspection"], .start-inspection-btn',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'pre-inspection-check',
        title: 'Pre-Inspection Checklist',
        description: 'Complete the pre-inspection items like checking fluid levels and tire pressure.',
        targetSelector: '[data-testid="pre-inspection"], .checklist-section',
        position: 'left',
        action: 'highlight'
      },
      {
        id: 'exterior-inspection',
        title: 'Exterior Inspection',
        description: 'Inspect the vehicle exterior, noting any damage or wear. Take photos as needed.',
        targetSelector: '[data-testid="exterior-section"]',
        position: 'top',
        action: 'highlight'
      },
      {
        id: 'take-photos',
        title: 'Take Photos',
        description: 'Use the camera button to document any issues or damage found during inspection.',
        targetSelector: '[data-testid="camera-btn"], .camera-btn',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'interior-inspection',
        title: 'Interior Inspection',
        description: 'Check the vehicle interior including seats, controls, and safety equipment.',
        targetSelector: '[data-testid="interior-section"]',
        position: 'top',
        action: 'highlight'
      },
      {
        id: 'engine-inspection',
        title: 'Engine Bay Inspection',
        description: 'Inspect the engine bay for leaks, wear, or maintenance needs.',
        targetSelector: '[data-testid="engine-section"]',
        position: 'top',
        action: 'highlight'
      },
      {
        id: 'add-notes',
        title: 'Add Inspection Notes',
        description: 'Include any additional notes or recommendations from the inspection.',
        targetSelector: 'textarea[name="notes"], textarea[name="comments"]',
        position: 'top',
        action: 'type',
        actionData: 'Vehicle in good overall condition. Front tires showing moderate wear, recommend replacement in 30 days.'
      },
      {
        id: 'complete-inspection',
        title: 'Complete Inspection',
        description: 'Review your inspection and click Complete to finalize the inspection report.',
        targetSelector: '[data-testid="complete-inspection"], .complete-btn',
        position: 'bottom',
        action: 'click'
      }
    ]
  },
  {
    id: 'create-team-message',
    title: 'Creating a Team Message',
    description: 'Send messages and announcements to your team members',
    category: 'communication',
    estimatedTime: 6,
    difficulty: 'beginner',
    steps: [
      {
        id: 'navigate-messages',
        title: 'Navigate to Team Messages',
        description: 'Click on the Team Messages or Internal Messages link in the sidebar.',
        targetSelector: 'a[href="/team-messages"], a[href="/internal-messages"]',
        position: 'right',
        action: 'click'
      },
      {
        id: 'compose-message',
        title: 'Start New Message',
        description: 'Click "New Message", "Compose", or the plus button to create a new message.',
        targetSelector: '[data-testid="compose-btn"], .compose-btn, .new-message-btn',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'select-recipients',
        title: 'Select Recipients',
        description: 'Choose which team members should receive this message.',
        targetSelector: '[data-testid="recipient-select"], select[name="recipients"]',
        position: 'top',
        action: 'click'
      },
      {
        id: 'message-subject',
        title: 'Enter Subject',
        description: 'Provide a clear subject line that summarizes the message content.',
        targetSelector: 'input[name="subject"], input[placeholder*="Subject"]',
        position: 'top',
        action: 'type',
        actionData: 'Weekly Team Update - New Safety Procedures'
      },
      {
        id: 'message-content',
        title: 'Write Message',
        description: 'Type your message content in the message body area.',
        targetSelector: 'textarea[name="content"], textarea[name="message"], .message-editor',
        position: 'top',
        action: 'type',
        actionData: 'Hi team! Please review the new safety procedures document I shared. We will discuss these changes in our Monday meeting. Let me know if you have any questions.'
      },
      {
        id: 'set-priority',
        title: 'Set Priority (Optional)',
        description: 'Set the message priority if it requires urgent attention.',
        targetSelector: 'select[name="priority"], [data-testid="priority-select"]',
        position: 'top',
        action: 'highlight'
      },
      {
        id: 'send-message',
        title: 'Send Message',
        description: 'Click Send to deliver the message to selected team members.',
        targetSelector: 'button[type="submit"], .send-btn',
        position: 'bottom',
        action: 'click'
      }
    ]
  },
  {
    id: 'use-file-manager',
    title: 'Using the File Manager',
    description: 'Upload, organize, and manage files and documents',
    category: 'file-management',
    estimatedTime: 10,
    difficulty: 'beginner',
    steps: [
      {
        id: 'navigate-files',
        title: 'Navigate to File Manager',
        description: 'Click on the File Manager link in the sidebar to access your files.',
        targetSelector: 'a[href="/file-manager"]',
        position: 'right',
        action: 'click'
      },
      {
        id: 'explore-folders',
        title: 'Explore Folder Structure',
        description: 'View the different folders and categories for organizing your files.',
        targetSelector: '[data-testid="folder-list"], .folder-navigation',
        position: 'left',
        action: 'highlight'
      },
      {
        id: 'upload-file',
        title: 'Upload New File',
        description: 'Click the Upload button or drag files to the upload area.',
        targetSelector: '[data-testid="upload-btn"], .upload-btn, .upload-zone',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'select-files',
        title: 'Select Files to Upload',
        description: 'Choose files from your computer to upload to the file manager.',
        targetSelector: 'input[type="file"], [data-testid="file-input"]',
        position: 'center',
        action: 'highlight'
      },
      {
        id: 'organize-files',
        title: 'Organize Files',
        description: 'Move or categorize uploaded files into appropriate folders.',
        targetSelector: '[data-testid="move-file"], .file-actions',
        position: 'right',
        action: 'highlight'
      },
      {
        id: 'search-files',
        title: 'Search Files',
        description: 'Use the search bar to quickly find specific files or documents.',
        targetSelector: 'input[type="search"], input[placeholder*="Search"], [data-testid="search-input"]',
        position: 'top',
        action: 'type',
        actionData: 'contract'
      },
      {
        id: 'share-file',
        title: 'Share Files',
        description: 'Right-click on a file or use the share button to share files with team members.',
        targetSelector: '[data-testid="share-btn"], .share-btn',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'file-preview',
        title: 'Preview Files',
        description: 'Click on files to preview their contents without downloading.',
        targetSelector: '.file-preview, [data-testid="preview-btn"]',
        position: 'center',
        action: 'highlight'
      }
    ]
  },
  {
    id: 'navigate-dashboard',
    title: 'Navigating the Dashboard',
    description: 'Master your dashboard and customize it for maximum efficiency',
    category: 'getting-started',
    estimatedTime: 8,
    difficulty: 'beginner',
    steps: [
      {
        id: 'dashboard-overview',
        title: 'Dashboard Overview',
        description: 'This is your main dashboard showing key business metrics and recent activity.',
        targetSelector: '[data-testid="dashboard-main"], .dashboard-container',
        position: 'center',
        action: 'highlight'
      },
      {
        id: 'stats-widgets',
        title: 'Key Statistics Widgets',
        description: 'These widgets show important metrics like revenue, jobs completed, and customer satisfaction.',
        targetSelector: '[data-testid="stats-cards"], .stats-section',
        position: 'bottom',
        action: 'highlight'
      },
      {
        id: 'recent-activity',
        title: 'Recent Activity Feed',
        description: 'Stay updated with recent jobs, messages, and system activities.',
        targetSelector: '[data-testid="recent-activity"], .activity-feed',
        position: 'left',
        action: 'highlight'
      },
      {
        id: 'quick-actions',
        title: 'Quick Action Buttons',
        description: 'Use these buttons to quickly create new customers, jobs, invoices, or tasks.',
        targetSelector: '[data-testid="quick-actions"], .quick-actions-section',
        position: 'top',
        action: 'highlight'
      },
      {
        id: 'navigation-sidebar',
        title: 'Navigation Sidebar',
        description: 'The sidebar provides access to all major sections of your business management system.',
        targetSelector: '.sidebar, [data-testid="sidebar"]',
        position: 'right',
        action: 'highlight'
      },
      {
        id: 'customize-dashboard',
        title: 'Customize Dashboard',
        description: 'Click the customize or settings button to personalize your dashboard layout.',
        targetSelector: '[data-testid="customize-btn"], .customize-btn, .dashboard-settings',
        position: 'top',
        action: 'click'
      },
      {
        id: 'widget-management',
        title: 'Manage Widgets',
        description: 'Add, remove, or rearrange widgets to show the information most important to you.',
        targetSelector: '[data-testid="widget-controls"], .widget-manager',
        position: 'center',
        action: 'highlight'
      },
      {
        id: 'save-layout',
        title: 'Save Dashboard Layout',
        description: 'Save your customized dashboard layout so it persists between sessions.',
        targetSelector: '[data-testid="save-layout"], .save-layout-btn',
        position: 'bottom',
        action: 'click'
      }
    ]
  }
];