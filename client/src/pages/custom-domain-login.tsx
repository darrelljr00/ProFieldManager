import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { authenticateUser } from "@/lib/api-config";
import { PuzzleCaptcha } from "@/components/PuzzleCaptcha";

export default function CustomDomainLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const handleCaptchaVerified = (token: string) => {
    setCaptchaVerified(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      const result = await authenticateUser({
        username,
        password
      });

      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      toast({
        title: "Login Successful",
        description: "Welcome to Pro Field Manager!",
      });

      // Check if user needs to complete onboarding
      if (result?.needsOnboarding) {
        window.location.href = '/onboarding';
        return;
      }

      window.location.href = '/dashboard';

    } catch (error) {
      console.error('Login error:', error);
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
