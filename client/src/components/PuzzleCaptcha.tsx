import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface CaptchaChallenge {
  token: string;
  backgroundImage: string;
  puzzlePiece: string;
  pieceY: number;
  imageWidth: number;
  imageHeight: number;
  pieceWidth: number;
  pieceHeight: number;
}

interface PuzzleCaptchaProps {
  onVerified: (token: string) => void;
  onError?: (message: string) => void;
}

export function PuzzleCaptcha({ onVerified, onError }: PuzzleCaptchaProps) {
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pieceX, setPieceX] = useState(10);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startPieceXRef = useRef(0);

  const fetchChallenge = useCallback(async () => {
    setLoading(true);
    setVerified(false);
    setError(null);
    setPieceX(10);
    
    try {
      const response = await fetch("/api/captcha/generate");
      if (!response.ok) throw new Error("Failed to load captcha");
      const data = await response.json();
      setChallenge(data);
    } catch (err) {
      setError("Failed to load captcha. Please try again.");
      onError?.("Failed to load captcha");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  const validateSolution = async () => {
    if (!challenge) return;
    
    setVerifying(true);
    setError(null);
    
    try {
      const response = await fetch("/api/captcha/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: challenge.token, x: pieceX }),
      });
      
      const result = await response.json();
      
      if (result.valid) {
        setVerified(true);
        onVerified(challenge.token);
      } else {
        setError(result.message || "Verification failed");
        setTimeout(() => fetchChallenge(), 1500);
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
      setTimeout(() => fetchChallenge(), 1500);
    } finally {
      setVerifying(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (verified || verifying) return;
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startPieceXRef.current = pieceX;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (verified || verifying) return;
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
    startPieceXRef.current = pieceX;
  };

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging || !challenge || !containerRef.current) return;
    
    const delta = clientX - startXRef.current;
    const newX = Math.max(0, Math.min(
      challenge.imageWidth - challenge.pieceWidth,
      startPieceXRef.current + delta
    ));
    setPieceX(newX);
  }, [isDragging, challenge]);

  const handleEnd = useCallback(() => {
    if (isDragging && challenge && !verified) {
      setIsDragging(false);
      validateSolution();
    }
  }, [isDragging, challenge, verified]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const handleMouseUp = () => handleEnd();
    const handleTouchEnd = () => handleEnd();

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg"
        style={{ width: 280, height: 200 }}
        data-testid="captcha-loading"
      >
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div 
        className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-4"
        style={{ width: 280, height: 200 }}
        data-testid="captcha-error"
      >
        <XCircle className="h-8 w-8 text-red-500 mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Failed to load captcha</p>
        <Button variant="outline" size="sm" onClick={fetchChallenge}>
          <RefreshCw className="h-4 w-4 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="puzzle-captcha">
      <div 
        ref={containerRef}
        className="relative rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 select-none"
        style={{ width: challenge.imageWidth, height: challenge.imageHeight }}
      >
        <img 
          src={challenge.backgroundImage} 
          alt="Captcha background"
          className="absolute top-0 left-0 w-full h-full"
          draggable={false}
        />
        
        <div
          className={`absolute cursor-grab active:cursor-grabbing transition-transform ${
            isDragging ? 'scale-105' : ''
          } ${verified ? 'opacity-0' : ''}`}
          style={{
            left: pieceX,
            top: challenge.pieceY,
            width: challenge.pieceWidth + 20,
            height: challenge.pieceHeight + 20,
            transform: 'translate(-10px, -10px)',
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          data-testid="captcha-puzzle-piece"
        >
          <img 
            src={challenge.puzzlePiece}
            alt="Puzzle piece"
            className="w-full h-full"
            draggable={false}
          />
        </div>

        {verified && (
          <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        )}

        {verifying && (
          <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {verified ? (
            <span className="text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Verified
            </span>
          ) : error ? (
            <span className="text-red-500">{error}</span>
          ) : (
            "Drag the puzzle piece to complete"
          )}
        </div>
        
        {!verified && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchChallenge}
            disabled={verifying}
            data-testid="captcha-refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
