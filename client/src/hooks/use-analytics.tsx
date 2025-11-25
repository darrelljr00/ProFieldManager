import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { 
  trackPageView, 
  trackFBEvent,
  getVisitorId,
  getSessionId,
  getUTMParams,
  getDeviceType,
  getBrowser,
  getOS
} from '../lib/analytics';

interface TrackingOptions {
  enableGA?: boolean;
  enableFB?: boolean;
  enableInternal?: boolean;
  organizationId?: number;
}

export const useAnalytics = (options: TrackingOptions = {}) => {
  const { 
    enableGA = true, 
    enableFB = true, 
    enableInternal = true,
    organizationId 
  } = options;
  
  const [location] = useLocation();
  const prevLocationRef = useRef<string>(location);
  const pageLoadTimeRef = useRef<number>(Date.now());
  
  useEffect(() => {
    if (location !== prevLocationRef.current) {
      // Calculate time on previous page
      const timeOnPage = Math.floor((Date.now() - pageLoadTimeRef.current) / 1000);
      
      // Track page view with Google Analytics
      if (enableGA) {
        trackPageView(location);
      }
      
      // Track page view with Facebook Pixel
      if (enableFB && window.fbq) {
        trackFBEvent('PageView');
      }
      
      // Track with internal analytics
      if (enableInternal && organizationId) {
        trackInternalPageView(location, prevLocationRef.current, timeOnPage, organizationId);
      }
      
      // Update refs
      prevLocationRef.current = location;
      pageLoadTimeRef.current = Date.now();
    }
  }, [location, enableGA, enableFB, enableInternal, organizationId]);
  
  // Track initial page load
  useEffect(() => {
    if (enableGA) {
      trackPageView(location);
    }
    if (enableFB && window.fbq) {
      trackFBEvent('PageView');
    }
    if (enableInternal && organizationId) {
      trackInternalPageView(location, document.referrer, 0, organizationId);
    }
  }, []);
};

// Send internal page view tracking
async function trackInternalPageView(
  pagePath: string, 
  referrer: string, 
  timeOnPage: number,
  organizationId: number
) {
  try {
    const visitorId = getVisitorId();
    const sessionId = getSessionId();
    const utmParams = getUTMParams();
    
    await fetch('/api/analytics/track-pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId,
        pagePath,
        pageTitle: document.title,
        referrer,
        visitorId,
        sessionId,
        userAgent: navigator.userAgent,
        deviceType: getDeviceType(),
        browser: getBrowser(),
        os: getOS(),
        timeOnPage,
        ...utmParams
      }),
    });
  } catch (error) {
    // Silent fail - don't break user experience for analytics
    console.debug('Analytics tracking failed:', error);
  }
}

// Hook to track specific events
export const useTrackEvent = () => {
  return {
    trackGA: (action: string, category?: string, label?: string, value?: number) => {
      if (window.gtag) {
        window.gtag('event', action, {
          event_category: category,
          event_label: label,
          value: value,
        });
      }
    },
    trackFB: (eventName: string, params?: Record<string, any>) => {
      if (window.fbq) {
        trackFBEvent(eventName, params);
      }
    }
  };
};
