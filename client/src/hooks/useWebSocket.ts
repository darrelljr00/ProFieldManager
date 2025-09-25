import { useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { useSoundNotifications } from "./useSoundNotifications";
import { useQueryClient } from "@tanstack/react-query";

interface WebSocketMessage {
  type: string;
  eventType?: string;
  data?: any;
  timestamp?: string;
}

export function useWebSocket() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { playTeamMessageSound, playTextMessageSound } = useSoundNotifications();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    if (!user) return;
    
    // Clear any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`🔌 Creating WebSocket connection to: ${wsUrl} for user: ${user.username}`);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Authenticate the WebSocket connection
      ws.send(JSON.stringify({
        type: 'auth',
        userId: user.id,
        username: user.username,
        userType: 'web',
        organizationId: user.organizationId
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        setLastMessage(message);

        if (message.type === 'auth_success') {
          console.log('WebSocket authenticated successfully');
          return;
        }

        if (message.type === 'update' && message.eventType && message.data) {
          // Handle authentication refresh
          if (message.eventType === 'auth_refresh_required') {
            console.log('🔄 Received auth refresh request, invalidating auth cache');
            
            // Force a complete cache invalidation and refetch
            queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
            queryClient.removeQueries({ queryKey: ['/api/auth/me'] });
            
            // Also invalidate navigation queries to ensure fresh data
            queryClient.invalidateQueries({ queryKey: ['/api/navigation-order'] });
            queryClient.removeQueries({ queryKey: ['/api/navigation-order'] });
            
            console.log('🔄 Auth cache completely cleared, forcing fresh fetch');
            
            toast({
              title: "Permissions Updated",
              description: "Your navigation permissions have been refreshed",
              duration: 3000,
            });
            return;
          }
          
          // Play sound notifications for messages
          if (message.eventType === 'new_message' || message.eventType === 'message_sent') {
            playTeamMessageSound();
          } else if (message.eventType === 'sms_sent' || message.eventType === 'sms_received') {
            playTextMessageSound();
          }
          
          handleRealtimeUpdate(message.eventType, message.data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      console.log('WebSocket error details:', {
        readyState: ws.readyState,
        url: ws.url,
        protocol: ws.protocol,
        extensions: ws.extensions
      });
      setIsConnected(false);
      
      // Don't auto-reconnect immediately on error - let the useEffect handle it
      // This prevents rapid reconnection loops
    };

    return () => {
      ws.close();
    };
  }, [user]);

  const handleRealtimeUpdate = (eventType: string, data: any) => {
    // Dispatch custom event for immediate UI updates
    window.dispatchEvent(new CustomEvent('websocket-update', {
      detail: { eventType, data }
    }));

    const notifications: Record<string, string> = {
      'invoice_created': `New invoice created by ${data.createdBy}`,
      'expense_created': `New expense added by ${data.createdBy}`,
      'expense_with_line_items_created': `Detailed expense created by ${data.createdBy}`,
      'quote_created': `New quote created by ${data.createdBy}`,
      'customer_created': `New customer added by ${data.createdBy}`,
      'project_created': `New project created by ${data.createdBy}`,
      'sms_sent': `SMS message sent by ${data.sentBy}`,
      'lead_created': `New lead added by ${data.createdBy}`,
      'message_created': `New message from ${data.createdBy}`,
      'new_message': `New message received from ${data.message?.senderUsername || 'someone'}`,
      'message_sent': `Message sent successfully`,
      'calendar_job_created': `New calendar job scheduled by ${data.createdBy}`,
      'gas_card_created': `New gas card added by ${data.createdBy}`,
      'review_request_sent': `Review request sent by ${data.sentBy}`,
      'user_created': `New user registered: ${data.user?.username}`,
      'payment_processed': `Payment processed by ${data.processedBy}`,
      'disciplinary_action_created': `Disciplinary action recorded by ${data.createdBy}`,
      'navigation_order_updated': `Navigation tabs reordered by ${data.updatedBy}`,
      'navigation_order_reset': `Navigation tabs reset to default by ${data.resetBy}`,
      'navigation_order_forced_update': `Navigation updates pushed to all users by ${data.pushedBy}`,
      'smart_capture_item_created': `Smart Capture item added by ${data?.createdBy || 'system'}`,
      'smart_capture_item_updated': `Smart Capture item updated by ${data?.updatedBy || 'system'}`,
      'smart_capture_item_deleted': `Smart Capture item removed by ${data?.deletedBy || 'system'}`,
      'draft_invoice_created': `Draft invoice created for project "${data?.projectName || `project #${data?.projectId || 'unknown'}`}" by ${data?.createdBy || 'system'}`,
      'project_invoice_finalized': `Invoice finalized for completed project "${data?.projectName || `project #${data?.projectId || 'unknown'}`}" by ${data?.finalizedBy || 'system'}`,
      'notification_created': `New notification: ${data?.title || 'You have a new notification'}`,
      'task_completed': `Task completed by ${data?.completedBy || 'team member'}`,
      'project_completed': `Project completed by ${data?.completedBy || 'team member'}`,
      'user_clock_in': `${data?.user || 'Team member'} clocked in`,
      'user_clock_out': `${data?.user || 'Team member'} clocked out`,
      'user_late': `${data?.user || 'Team member'} arrived late`
    };

    const notificationMessage = notifications[eventType];
    if (notificationMessage) {
      toast({
        title: "Real-time Update",
        description: notificationMessage,
        duration: 4000,
      });
    }

    // Trigger data refresh for relevant pages
    refreshPageData(eventType, data);
  };

  const refreshPageData = (eventType: string, eventData: any) => {
    // Trigger websocket update event for global query invalidation
    // Note: This is called after the main dispatch in handleRealtimeUpdate
    // Consider if this second dispatch is needed for your use case
  };

  return {
    isConnected,
    lastMessage,
    sendMessage: (message: any) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
      }
    }
  };
}