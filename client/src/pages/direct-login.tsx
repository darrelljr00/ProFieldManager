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

      // Use the standard login endpoint with POST
      const currentOrigin = window.location.origin;
      const loginUrl = `${currentOrigin}/api/auth/login`;
      
      console.log('🔐 DIRECT LOGIN: Attempting login via POST:', loginUrl);

      // Perform direct POST request to login endpoint
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          username,
          password
        })
      });

      console.log('🔐 LOGIN RESPONSE:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🚨 LOGIN ERROR:', errorText);
        toast({
          title: "Login Failed",
          description: "Invalid credentials - please try again",
          variant: "destructive",
        });
        document.body.removeChild(iframe);
        return;
      }

      const data = await response.json();
      console.log('✅ LOGIN SUCCESS:', data);

      if (data.token && data.user) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.user));

        toast({
          title: "Login Successful",
          description: `Welcome back, ${data.user.firstName || data.user.username}!`,
        });

        document.body.removeChild(iframe);
        setLocation('/dashboard');
      } else {
        console.error('⚠️ MISSING AUTH DATA:', data);
        toast({
          title: "Login Failed",
          description: "Invalid response from server",
          variant: "destructive",
        });
        document.body.removeChild(iframe);
      }

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