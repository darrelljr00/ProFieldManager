import { useState, useEffect, useCallback, useRef } from "react";
import { X, MessageSquare, User, Bell, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export interface ChatNotification {
  id: string;
  type: "new_session" | "new_message";
  sessionId: number;
  visitorName?: string;
  visitorEmail?: string;
  message?: string;
  departmentName?: string;
  departmentColor?: string;
  timestamp: Date;
}

interface LiveChatNotificationProps {
  notification: ChatNotification | null;
  onDismiss: () => void;
  onViewChat: (sessionId: number) => void;
  autoDismissMs?: number;
}

function useRepeatingChime(isActive: boolean, intervalMs: number = 3000) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const playChime = useCallback(() => {
    if (isMuted) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const context = audioContextRef.current;
      
      if (context.state === 'suspended') {
        context.resume();
      }

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + 0.15);
      oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.4, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing chime:', error);
    }
  }, [isMuted]);

  const stopChime = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isActive && !isMuted) {
      playChime();
      
      intervalRef.current = setInterval(() => {
        playChime();
      }, intervalMs);
    } else {
      stopChime();
    }

    return () => {
      stopChime();
    };
  }, [isActive, isMuted, intervalMs, playChime, stopChime]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return { isMuted, toggleMute, stopChime };
}

export function LiveChatNotification({
  notification,
  onDismiss,
  onViewChat,
  autoDismissMs = 30000,
}: LiveChatNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { isMuted, toggleMute, stopChime } = useRepeatingChime(isVisible, 3000);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        stopChime();
        setTimeout(onDismiss, 300);
      }, autoDismissMs);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [notification, autoDismissMs, onDismiss, stopChime]);

  const handleViewChat = useCallback(() => {
    if (notification) {
      stopChime();
      onViewChat(notification.sessionId);
      setIsVisible(false);
      setTimeout(onDismiss, 300);
    }
  }, [notification, onViewChat, onDismiss, stopChime]);

  const handleDismiss = useCallback(() => {
    stopChime();
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  }, [onDismiss, stopChime]);

  if (!notification) return null;

  const isNewSession = notification.type === "new_session";

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-[100]"
            onClick={handleDismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-md"
            data-testid="live-chat-notification"
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-2 border-primary/20 overflow-hidden">
              <div
                className={`px-6 py-4 ${
                  isNewSession
                    ? "bg-gradient-to-r from-green-500 to-emerald-600"
                    : "bg-gradient-to-r from-blue-500 to-indigo-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-white">
                    <motion.div 
                      className="p-2 bg-white/20 rounded-full"
                      animate={!isMuted ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      {isNewSession ? (
                        <Bell className="h-6 w-6" />
                      ) : (
                        <MessageSquare className="h-6 w-6" />
                      )}
                    </motion.div>
                    <div>
                      <h3 className="font-bold text-lg">
                        {isNewSession ? "New Chat Started!" : "New Message!"}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {isNewSession
                          ? "A visitor wants to chat"
                          : "You have a new message"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                      data-testid="button-toggle-sound"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? (
                        <VolumeX className="h-5 w-5 text-white" />
                      ) : (
                        <Volume2 className="h-5 w-5 text-white" />
                      )}
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                      data-testid="button-dismiss-notification"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <User className="h-8 w-8 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                      {notification.visitorName || "Anonymous Visitor"}
                    </h4>
                    {notification.visitorEmail && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {notification.visitorEmail}
                      </p>
                    )}
                    {notification.departmentName && (
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              notification.departmentColor || "#3b82f6",
                          }}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {notification.departmentName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {notification.message && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                    <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3">
                      "{notification.message}"
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleViewChat}
                    className="flex-1 h-12 text-base font-semibold"
                    data-testid="button-view-chat"
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Answer Chat
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDismiss}
                    className="h-12 px-6"
                    data-testid="button-later"
                  >
                    Later
                  </Button>
                </div>

                {!isMuted && (
                  <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
                    <Volume2 className="h-3 w-3" />
                    Sound repeating until answered
                  </p>
                )}
              </div>

              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: autoDismissMs / 1000, ease: "linear" }}
                className={`h-1 origin-left ${
                  isNewSession ? "bg-green-500" : "bg-blue-500"
                }`}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface NotificationQueueProps {
  notifications: ChatNotification[];
  onDismiss: (id: string) => void;
  onViewChat: (sessionId: number) => void;
}

export function LiveChatNotificationQueue({
  notifications,
  onDismiss,
  onViewChat,
}: NotificationQueueProps) {
  const currentNotification = notifications[0] || null;

  const handleDismiss = useCallback(() => {
    if (currentNotification) {
      onDismiss(currentNotification.id);
    }
  }, [currentNotification, onDismiss]);

  return (
    <LiveChatNotification
      notification={currentNotification}
      onDismiss={handleDismiss}
      onViewChat={onViewChat}
    />
  );
}
