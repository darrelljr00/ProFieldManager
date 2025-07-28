import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MapPin } from "lucide-react";

interface LoginData {
  username: string;
  password: string;
  gpsData?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };
}

export default function SimpleLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [gpsData, setGpsData] = useState<{latitude?: number; longitude?: number; accuracy?: number}>({});
  const [gpsLoading, setGpsLoading] = useState(false);
  const [locationRequested, setLocationRequested] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Get intended destination from URL params or localStorage
  const getIntendedDestination = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTo = urlParams.get('redirect');
    if (redirectTo) {
      return decodeURIComponent(redirectTo);
    }
    
    const storedDestination = localStorage.getItem('intended_destination');
    if (storedDestination) {
      localStorage.removeItem('intended_destination'); // Clear it after use
      return storedDestination;
    }
    
    return '/'; // Default to dashboard
  };

  // Check if device is mobile and request GPS on component mount
  useEffect(() => {
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile && 'geolocation' in navigator && !locationRequested) {
      requestLocation();
      setLocationRequested(true);
    }
  }, [locationRequested]);

  const requestLocation = () => {
    setGpsLoading(true);
    
    if (!('geolocation' in navigator)) {
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsData({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setGpsLoading(false);
        toast({
          title: "Location captured",
          description: "Your location has been recorded for security purposes",
        });
      },
      (error) => {
        console.warn('GPS error:', error);
        setGpsLoading(false);
        // Don't show error toast for GPS failures to avoid disrupting login
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const loginDataWithGps = { ...data, gpsData };
      const response = await apiRequest("POST", "/api/auth/login", loginDataWithGps);
      return response.json();
    },
    onSuccess: async (response) => {
      // Store token in localStorage for cross-domain access
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
        console.log('🔑 CUSTOM DOMAIN: Token stored for cross-domain auth:', response.token.slice(0, 8) + '...');
        console.log('🌐 Domain detection:', {
          hostname: window.location.hostname,
          isCustomDomain: window.location.hostname === 'profieldmanager.com',
          tokenStored: !!localStorage.getItem('auth_token')
        });
      }
      
      // Clear all cached auth queries to force fresh fetch
      queryClient.removeQueries({ queryKey: ["/api/auth/me"] });
      
      // Force a refetch of auth data to ensure state is current
      await queryClient.fetchQuery({ 
        queryKey: ["/api/auth/me"],
        queryFn: async () => {
          const response = await apiRequest('GET', '/api/auth/me');
          if (!response.ok) {
            throw new Error(`Auth failed: ${response.status}`);
          }
          return response.json();
        }
      });
      
      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in",
      });
      
      // Use immediate redirect since auth state is now properly set
      const destination = getIntendedDestination();
      setLocation(destination);
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: "Missing credentials",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Pro Field Manager</h1>
            <p className="text-gray-600 mt-2">Sign in to your account</p>
            {gpsLoading && (
              <div className="flex items-center justify-center gap-2 mt-4 p-2 bg-blue-50 rounded-lg">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-blue-700">Capturing location for security...</span>
              </div>
            )}
            {gpsData.latitude && (
              <div className="flex items-center justify-center gap-2 mt-4 p-2 bg-green-50 rounded-lg">
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">Location captured</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ fontSize: '16px', minHeight: '48px' }}
                placeholder="Enter your username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ fontSize: '16px', minHeight: '48px' }}
                placeholder="Enter your password"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ 
                minHeight: '48px',
                fontSize: '16px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {loginMutation.isPending ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}