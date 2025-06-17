import { useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface WebSocketMessage {
  type: string;
  eventType?: string;
  data?: any;
  timestamp?: string;
}

export function useWebSocket() {
  const { user } = useAuth();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
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
        userType: 'web'
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
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [user]);

  const handleRealtimeUpdate = (eventType: string, data: any) => {
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
      'calendar_job_created': `New calendar job scheduled by ${data.createdBy}`,
      'gas_card_created': `New gas card added by ${data.createdBy}`,
      'review_request_sent': `Review request sent by ${data.sentBy}`,
      'user_created': `New user registered: ${data.user?.username}`,
      'payment_processed': `Payment processed by ${data.processedBy}`,
      'disciplinary_action_created': `Disciplinary action recorded by ${data.createdBy}`
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
    refreshPageData(eventType);
  };

  const refreshPageData = (eventType: string) => {
    // Trigger query invalidation based on event type
    const currentPath = window.location.pathname;
    
    const refreshRules: Record<string, string[]> = {
      'invoice_created': ['/invoices', '/dashboard'],
      'expense_created': ['/expenses', '/expense-reports', '/dashboard'],
      'expense_with_line_items_created': ['/expenses', '/expense-reports', '/dashboard'],
      'quote_created': ['/quotes', '/dashboard'],
      'customer_created': ['/customers'],
      'project_created': ['/projects', '/dashboard'],
      'sms_sent': ['/sms'],
      'lead_created': ['/leads'],
      'message_created': ['/internal-messages'],
      'calendar_job_created': ['/calendar'],
      'gas_card_created': ['/gas-cards'],
      'review_request_sent': ['/reviews'],
      'user_created': ['/users'],
      'payment_processed': ['/payments', '/invoices', '/dashboard'],
      'disciplinary_action_created': ['/human-resources']
    };

    const shouldRefresh = refreshRules[eventType]?.some(path => currentPath.includes(path));
    
    if (shouldRefresh) {
      // Trigger a page refresh or query invalidation
      window.dispatchEvent(new CustomEvent('websocket-update', { 
        detail: { eventType, data: lastMessage?.data } 
      }));
    }
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