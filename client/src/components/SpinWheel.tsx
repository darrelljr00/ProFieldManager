import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Gift, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WheelSegment {
  id: number;
  label: string;
  color: string;
  displayOrder: number;
}

interface SpinWheelProps {
  wheelId: number;
  segments: WheelSegment[];
  spinDuration?: number;
  pointerColor?: string;
  backgroundColor?: string;
  requireEmail?: boolean;
  onSpinComplete?: (result: SpinResult) => void;
}

interface SpinResult {
  segmentIndex: number;
  segment: {
    id: number;
    label: string;
    color: string;
    isWinner: boolean;
    couponCode: string | null;
  };
}

export function SpinWheel({
  wheelId,
  segments,
  spinDuration = 5000,
  pointerColor = "#ff6b6b",
  backgroundColor = "#ffffff",
  requireEmail = false,
  onSpinComplete
}: SpinWheelProps) {
  const { toast } = useToast();
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [email, setEmail] = useState("");
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  const getUserIdentifier = () => {
    let id = localStorage.getItem(`wheel_user_${wheelId}`);
    if (!id) {
      id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(`wheel_user_${wheelId}`, id);
    }
    return id;
  };

  useEffect(() => {
    const checkPreviousSpin = async () => {
      try {
        const userIdentifier = getUserIdentifier();
        const response = await fetch(`/api/promotions/wheel/${wheelId}/check-spin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIdentifier })
        });
        const data = await response.json();
        if (data.hasSpun) {
          setHasSpun(true);
          if (data.previousResult) {
            setResult({
              segmentIndex: 0,
              segment: {
                id: 0,
                label: data.previousResult.label,
                color: '',
                isWinner: data.previousResult.wonPrize,
                couponCode: data.previousResult.couponCode
              }
            });
          }
        }
      } catch (error) {
        console.error('Error checking spin status:', error);
      }
    };
    checkPreviousSpin();
  }, [wheelId]);

  const spinWheel = async () => {
    if (isSpinning || hasSpun) return;

    if (requireEmail && !email) {
      setShowEmailPrompt(true);
      return;
    }

    setIsSpinning(true);

    try {
      const userIdentifier = getUserIdentifier();
      const response = await fetch(`/api/promotions/wheel/${wheelId}/spin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIdentifier, email: email || null })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.alreadySpun) {
          setHasSpun(true);
          toast({
            title: "Already Spun",
            description: "You have already used your spin on this wheel.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: data.message || "Failed to spin the wheel",
            variant: "destructive"
          });
        }
        setIsSpinning(false);
        return;
      }

      const { segmentIndex, segment } = data;
      const segmentCount = segments.length;
      const segmentAngle = 360 / segmentCount;
      
      const targetAngle = 360 - (segmentIndex * segmentAngle) - (segmentAngle / 2);
      const fullSpins = 5 + Math.floor(Math.random() * 3);
      const finalRotation = rotation + (fullSpins * 360) + targetAngle + (Math.random() * 10 - 5);
      
      setRotation(finalRotation);

      setTimeout(() => {
        setIsSpinning(false);
        setHasSpun(true);
        setResult({ segmentIndex, segment });
        setShowResultDialog(true);
        
        if (onSpinComplete) {
          onSpinComplete({ segmentIndex, segment });
        }
      }, spinDuration);

    } catch (error) {
      console.error('Error spinning wheel:', error);
      toast({
        title: "Error",
        description: "Failed to spin the wheel. Please try again.",
        variant: "destructive"
      });
      setIsSpinning(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: `Code "${code}" copied to clipboard`
    });
  };

  const handleEmailSubmit = () => {
    if (email) {
      setShowEmailPrompt(false);
      spinWheel();
    }
  };

  if (segments.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No wheel segments configured
      </div>
    );
  }

  const segmentAngle = 360 / segments.length;

  return (
    <div className="flex flex-col items-center gap-6" style={{ backgroundColor }}>
      <div className="relative" style={{ width: 320, height: 320 }}>
        <div
          className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10"
          style={{
            width: 0,
            height: 0,
            borderLeft: '15px solid transparent',
            borderRight: '15px solid transparent',
            borderTop: `30px solid ${pointerColor}`,
          }}
          data-testid="wheel-pointer"
        />

        <div
          ref={wheelRef}
          className="relative rounded-full overflow-hidden shadow-2xl"
          style={{
            width: 300,
            height: 300,
            margin: '10px',
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? `transform ${spinDuration}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)` : 'none',
          }}
          data-testid="spin-wheel"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {segments.map((segment, index) => {
              const startAngle = index * segmentAngle - 90;
              const endAngle = startAngle + segmentAngle;
              
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;
              
              const x1 = 50 + 50 * Math.cos(startRad);
              const y1 = 50 + 50 * Math.sin(startRad);
              const x2 = 50 + 50 * Math.cos(endRad);
              const y2 = 50 + 50 * Math.sin(endRad);
              
              const largeArc = segmentAngle > 180 ? 1 : 0;
              
              const midAngle = startAngle + segmentAngle / 2;
              const midRad = (midAngle * Math.PI) / 180;
              const textRadius = 32;
              const textX = 50 + textRadius * Math.cos(midRad);
              const textY = 50 + textRadius * Math.sin(midRad);
              
              return (
                <g key={segment.id} data-testid={`wheel-segment-${index}`}>
                  <path
                    d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={segment.color}
                    stroke="#fff"
                    strokeWidth="0.5"
                  />
                  <text
                    x={textX}
                    y={textY}
                    fill="#fff"
                    fontSize="4"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                    style={{ 
                      textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                      filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))'
                    }}
                  >
                    {segment.label.length > 12 ? segment.label.substring(0, 10) + '...' : segment.label}
                  </text>
                </g>
              );
            })}
            <circle cx="50" cy="50" r="8" fill="#333" stroke="#fff" strokeWidth="2" />
          </svg>
        </div>
      </div>

      <Button
        size="lg"
        onClick={spinWheel}
        disabled={isSpinning || hasSpun}
        className="text-lg px-8 py-6"
        data-testid="button-spin"
      >
        {isSpinning ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Spinning...
          </>
        ) : hasSpun ? (
          <>
            <Gift className="w-5 h-5 mr-2" />
            Already Spun
          </>
        ) : (
          <>
            <Gift className="w-5 h-5 mr-2" />
            Spin to Win!
          </>
        )}
      </Button>

      {hasSpun && result && (
        <div className="text-center p-4 bg-muted rounded-lg" data-testid="spin-result">
          <p className="text-lg font-semibold mb-2">You won: {result.segment.label}</p>
          {result.segment.couponCode && (
            <div className="flex items-center justify-center gap-2">
              <code className="bg-primary/10 text-primary px-3 py-1 rounded font-mono text-lg">
                {result.segment.couponCode}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyCode(result.segment.couponCode!)}
                data-testid="button-copy-code"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {result?.segment.isWinner ? "🎉 Congratulations!" : "Thanks for playing!"}
            </DialogTitle>
            <DialogDescription className="text-lg pt-4">
              {result?.segment.isWinner ? (
                <>
                  <p className="mb-4">You won: <strong>{result.segment.label}</strong></p>
                  {result.segment.couponCode && (
                    <div className="flex flex-col items-center gap-3">
                      <p>Your discount code:</p>
                      <div className="flex items-center gap-2">
                        <code className="bg-primary/10 text-primary px-4 py-2 rounded font-mono text-xl" data-testid="text-won-code">
                          {result.segment.couponCode}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyCode(result.segment.couponCode!)}
                          data-testid="button-copy-won-code"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Use this code at checkout to redeem your prize!
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p>{result?.segment.label}</p>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={showEmailPrompt} onOpenChange={setShowEmailPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Your Email</DialogTitle>
            <DialogDescription>
              Please enter your email to spin the wheel and receive your prize.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="wheel-email">Email Address</Label>
              <Input
                id="wheel-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                data-testid="input-wheel-email"
              />
            </div>
            <Button
              onClick={handleEmailSubmit}
              disabled={!email}
              className="w-full"
              data-testid="button-submit-email"
            >
              Spin the Wheel!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
