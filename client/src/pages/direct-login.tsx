import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function DirectLogin() {
  const [username, setUsername] = useState("sales@texaspowerwash.net");
  const [password, setPassword] = useState("test123");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🔐 DIRECT LOGIN: Starting cross-origin authentication');

      // Create an iframe to handle cross-origin authentication
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      document.body.appendChild(iframe);

      // Build the authentication URL with credentials
      const authUrl = `https://d08781a3-d8ec-4b72-a274-8e025593045b-00-1v1hzi896az5i.riker.replit.dev/api/auth/login-fallback?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      
      console.log('🔐 DIRECT LOGIN: Using iframe authentication URL:', authUrl);

      // Set up message listener for iframe response
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== 'https://d08781a3-d8ec-4b72-a274-8e025593045b-00-1v1hzi896az5i.riker.replit.dev') {
          return;
        }

        console.log('📨 IFRAME RESPONSE:', event.data);

        if (event.data.type === 'auth_success') {
          // Store the authentication data
          localStorage.setItem('auth_token', event.data.token);
          localStorage.setItem('user_data', JSON.stringify(event.data.user));

          toast({
            title: "Login Successful",
            description: "Welcome to Pro Field Manager!",
          });

          window.removeEventListener('message', messageHandler);
          document.body.removeChild(iframe);
          setLocation('/dashboard');
        } else if (event.data.type === 'auth_error') {
          toast({
            title: "Login Failed",
            description: event.data.message || "Invalid credentials",
            variant: "destructive",
          });

          window.removeEventListener('message', messageHandler);
          document.body.removeChild(iframe);
        }
      };

      window.addEventListener('message', messageHandler);

      // Set timeout
      const timeout = setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        document.body.removeChild(iframe);
        
        // Fallback: Direct authentication attempt
        console.log('🔐 IFRAME TIMEOUT - Attempting direct fetch');
        
        fetch(authUrl, {
          method: 'GET',
          mode: 'cors',
          credentials: 'include'
        }).then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            console.log('✅ DIRECT FETCH SUCCESS:', data);
            
            if (data.token && data.user) {
              localStorage.setItem('auth_token', data.token);
              localStorage.setItem('user_data', JSON.stringify(data.user));
              
              toast({
                title: "Login Successful",
                description: "Welcome to Pro Field Manager!",
              });
              
              setLocation('/dashboard');
              return;
            }
          }
          
          toast({
            title: "Login Failed",
            description: "Please check your credentials and try again",
            variant: "destructive",
          });
        }).catch((error) => {
          console.error('🚨 DIRECT FETCH ERROR:', error);
          toast({
            title: "Login Failed", 
            description: "Network error - please try again",
            variant: "destructive",
          });
        });
      }, 5000);

      // Load the authentication URL in the iframe
      iframe.src = authUrl;

    } catch (error) {
      console.error('🚨 DIRECT LOGIN ERROR:', error);
      toast({
        title: "Login Failed",
        description: "Authentication error - please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
              Direct Login (Custom Domain Fix)
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

          <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>Custom Domain Authentication Workaround</p>
            <p className="mt-1">This bypasses the custom domain API routing issues</p>
          </div>
        </div>
      </div>
    </div>
  );
}