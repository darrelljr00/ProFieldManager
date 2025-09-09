import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function CustomDomainLogin() {
  const [username, setUsername] = useState("sales@texaspowerwash.net");
  const [password, setPassword] = useState("test123");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Auto-login for demo purposes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auto') === 'true') {
      handleDirectLogin();
    }
  }, []);

  const handleDirectLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      console.log('🔐 CUSTOM DOMAIN LOGIN: Starting authentication');

      // Step 1: Create a popup window to handle authentication
      const popup = window.open(
        `https://d08781a3-d8ec-4b72-a274-8e025593045b-00-1v1hzi896az5i.riker.replit.dev/api/auth/login-fallback?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&popup=true`,
        'auth_popup',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked - please allow popups for this site');
      }

      // Step 2: Listen for popup messages
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== 'https://d08781a3-d8ec-4b72-a274-8e025593045b-00-1v1hzi896az5i.riker.replit.dev') {
          return;
        }

        if (event.data.type === 'auth_success') {
          console.log('✅ POPUP AUTH SUCCESS:', event.data);
          
          // Store authentication data
          localStorage.setItem('auth_token', event.data.token);
          localStorage.setItem('user_data', JSON.stringify(event.data.user));
          
          // Clear queries to force refresh
          queryClient.clear();
          
          popup.close();
          window.removeEventListener('message', messageHandler);
          
          toast({
            title: "Login Successful",
            description: "Welcome to Pro Field Manager!",
          });
          
          setLocation('/dashboard');
          return;
        }

        if (event.data.type === 'auth_error') {
          popup.close();
          window.removeEventListener('message', messageHandler);
          
          toast({
            title: "Login Failed",
            description: event.data.message || "Invalid credentials",
            variant: "destructive",
          });
          return;
        }
      };

      window.addEventListener('message', messageHandler);

      // Step 3: Fallback - check popup periodically and try JSONP
      let attempts = 0;
      const checkPopup = setInterval(() => {
        attempts++;
        
        if (popup.closed || attempts > 30) {
          clearInterval(checkPopup);
          window.removeEventListener('message', messageHandler);
          
          if (attempts > 30) {
            // Try JSONP fallback
            console.log('🔄 TRYING JSONP FALLBACK');
            tryJSONPAuth();
          } else {
            setLoading(false);
          }
          return;
        }

        // Try to get data from popup
        try {
          if (popup.location.href.includes('success')) {
            const urlParams = new URLSearchParams(popup.location.search);
            const token = urlParams.get('token');
            const userData = urlParams.get('user');
            
            if (token && userData) {
              localStorage.setItem('auth_token', token);
              localStorage.setItem('user_data', userData);
              
              queryClient.clear();
              popup.close();
              clearInterval(checkPopup);
              window.removeEventListener('message', messageHandler);
              
              toast({
                title: "Login Successful",
                description: "Welcome to Pro Field Manager!",
              });
              
              setLocation('/dashboard');
              return;
            }
          }
        } catch (e) {
          // Cross-origin error - expected
        }
      }, 1000);

    } catch (error) {
      console.error('🚨 CUSTOM DOMAIN LOGIN ERROR:', error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const tryJSONPAuth = () => {
    console.log('🔄 JSONP FALLBACK: Attempting JSONP authentication');
    
    // Create JSONP callback
    const callbackName = 'authCallback_' + Date.now();
    
    (window as any)[callbackName] = (data: any) => {
      console.log('✅ JSONP AUTH SUCCESS:', data);
      
      if (data.success && data.token && data.user) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        
        queryClient.clear();
        
        toast({
          title: "Login Successful",
          description: "Welcome to Pro Field Manager!",
        });
        
        setLocation('/dashboard');
      } else {
        toast({
          title: "Login Failed",
          description: data.message || "Authentication failed",
          variant: "destructive",
        });
      }
      
      // Cleanup
      delete (window as any)[callbackName];
      document.head.removeChild(script);
    };

    // Create script tag for JSONP
    const script = document.createElement('script');
    script.src = `https://d08781a3-d8ec-4b72-a274-8e025593045b-00-1v1hzi896az5i.riker.replit.dev/api/auth/jsonp-login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&callback=${callbackName}`;
    
    script.onerror = () => {
      console.error('🚨 JSONP FAILED');
      toast({
        title: "Login Failed",
        description: "Network error - please try again",
        variant: "destructive",
      });
      
      delete (window as any)[callbackName];
      document.head.removeChild(script);
    };

    document.head.appendChild(script);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-lg px-8 pt-6 pb-8 mb-4">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Pro Field Manager
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Custom Domain Authentication
            </p>
          </div>

          <form onSubmit={handleDirectLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter your username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 space-y-2">
            <button
              onClick={() => window.location.href = '?auto=true'}
              className="w-full text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:dark:text-blue-300"
            >
              Auto-Login (Quick Test)
            </button>
          </div>

          <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>Advanced Custom Domain Solution</p>
            <p className="mt-1">Uses popup + JSONP fallback methods</p>
          </div>
        </div>
      </div>
    </div>
  );
}