import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { authenticateUser, isCustomDomain } from "@/lib/api-config";
import { useAnalytics } from "@/hooks/use-analytics";
import { PuzzleCaptcha } from "@/components/PuzzleCaptcha";

export default function UniversalLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  useAnalytics({ enableInternal: true, organizationId: 4, enableGA: true, enableFB: true });

  useEffect(() => {
    const checkCrossDomainAuth = async () => {
      if (isCustomDomain()) {
        console.log('🌐 CUSTOM DOMAIN DETECTED - Checking for existing authentication');
        
        try {
          const authCheckUrl = `/api/auth/me`;
          const response = await fetch(authCheckUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Origin': window.location.origin,
              'Accept': 'application/json',
            }
          });

          if (response.ok) {
            const authData = await response.json();
            if (authData.user && authData.token) {
              console.log('✅ CROSS-DOMAIN AUTH SUCCESS - User already authenticated');
              
              localStorage.setItem('auth_token', authData.token);
              localStorage.setItem('user_data', JSON.stringify(authData.user));
              
              queryClient.clear();
              
              toast({
                title: "Welcome Back!",
                description: "You're already logged in. Redirecting to dashboard...",
              });
              
              setTimeout(() => {
                if (isCustomDomain()) {
                  console.log('🌐 CUSTOM DOMAIN: Keeping user on custom domain for dashboard');
                  window.location.href = '/dashboard';
                } else {
                  window.location.href = '/dashboard';
                }
              }, 1000);
              
              return;
            }
          }
        } catch (error) {
          console.log('🔍 CROSS-DOMAIN AUTH CHECK FAILED - User needs to login', error);
        }
      }
    };

    checkCrossDomainAuth();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auto') === 'true') {
      setCaptchaVerified(true);
      setTimeout(() => handleLogin(), 100);
    }
  }, []);

  const handleCaptchaVerified = (token: string) => {
    setCaptchaVerified(true);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!captchaVerified) {
      toast({
        title: "Captcha Required",
        description: "Please complete the puzzle captcha before signing in.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      console.log('🔐 UNIVERSAL LOGIN: Starting authentication');
      console.log('🌐 Domain detection:', {
        hostname: window.location.hostname,
        isCustomDomain: isCustomDomain(),
        protocol: window.location.protocol
      });

      const result = await authenticateUser({
        username,
        password
      });

      console.log('✅ AUTHENTICATION SUCCESS:', result);

      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user_data');
      console.log('🔐 POST-LOGIN VERIFICATION:', {
        hasToken: !!storedToken,
        hasUserData: !!storedUser,
        tokenLength: storedToken?.length,
        resultHasToken: !!result?.token,
        resultHasUser: !!result?.user
      });

      if (result?.token && result?.user && !storedToken) {
        console.log('🔧 BACKUP TOKEN STORAGE');
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('user_data', JSON.stringify(result.user));
      }

      console.log('🔄 FORCING AUTH STATE REFRESH AFTER LOGIN');
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });

      toast({
        title: "Login Successful",
        description: "Welcome to Pro Field Manager!",
      });

      console.log('🚀 LOGIN COMPLETE - REDIRECTING TO DASHBOARD');
      setTimeout(() => {
        if (isCustomDomain()) {
          console.log('🌐 CUSTOM DOMAIN: Staying on custom domain for dashboard');
          window.location.replace('/dashboard');
        } else {
          console.log('🔗 REPLIT DOMAIN: Standard redirect to dashboard');
          window.location.href = '/dashboard';
        }
      }, 100);

    } catch (error) {
      console.error('🚨 LOGIN ERROR:', error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Authentication failed",
        variant: "destructive",
      });
      setCaptchaVerified(false);
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
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username / Email
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter your username or email"
                required
                data-testid="input-username"
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
                data-testid="input-password"
              />
            </div>

            <div className="flex justify-center">
              <PuzzleCaptcha 
                onVerified={handleCaptchaVerified}
                onError={(msg) => toast({ title: "Captcha Error", description: msg, variant: "destructive" })}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !captchaVerified}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-submit-login"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setLocation("/password-reset-request")}
              className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:dark:text-blue-300"
              data-testid="link-forgot-password"
            >
              Forgot Password?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
