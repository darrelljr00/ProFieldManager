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
          } else {
            // Handle navigation for common routes
            if (step.targetSelector.includes('dashboard') || step.targetSelector.includes('#/')) {
              window.location.hash = '#/';
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else if (step.targetSelector.includes('invoice')) {
              window.location.hash = '#/invoices';
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else if (step.targetSelector.includes('customer')) {
              window.location.hash = '#/customers';
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else if (step.targetSelector.includes('expense')) {
              window.location.hash = '#/expenses';
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
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

// Import and re-export walkthroughs from data module
export { BUILTIN_WALKTHROUGHS } from "@/data/walkthroughs";
