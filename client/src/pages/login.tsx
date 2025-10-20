import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { authenticateUser } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Eye, EyeOff, Lock, User, UserPlus, AlertCircle, MapPin } from "lucide-react";

interface LoginData {
  username: string;
  password: string;
  gpsData?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export default function LoginPage() {
  const [location, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [gpsData, setGpsData] = useState<{latitude?: number; longitude?: number; accuracy?: number} | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if device is mobile and request GPS on component mount
  useState(() => {
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile && 'geolocation' in navigator) {
      requestLocation();
    }
  });

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
      console.log('🔑 Attempting login for:', data.username);
      
      // Clear any existing auth state before attempting login
      localStorage.removeItem('auth_token');
      queryClient.clear();
      
      try {
        // Use enhanced authentication function for custom domain compatibility
        const result = await authenticateUser({
          username: data.username,
          password: data.password
        });
        console.log('✅ Login successful with enhanced auth');
        return result;
      } catch (fetchError: any) {
        console.error('💥 Authentication error:', fetchError);
        throw fetchError;
      }
    },
    onSuccess: async (response) => {
      console.log('🎉 Login onSuccess called with response:', { hasToken: !!response.token, hasUser: !!response.user });
      
      // Store token in localStorage for custom domain authentication
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
        console.log('🔑 Auth token stored in localStorage');
      }
      
      // CRITICAL: Store user data immediately so useAuth can recognize authenticated state
      if (response.user) {
        localStorage.setItem('user_data', JSON.stringify(response.user));
        console.log('👤 User data stored in localStorage');
      }
      
      // Show success toast
      toast({
        title: "Login Successful",
        description: `Welcome back, ${response.user.firstName || response.user.username}!`,
      });
      
      // Invalidate auth queries to refresh user state
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      console.log('🔄 Auth queries invalidated');
      
      // Small delay to allow auth state to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check for intended destination and redirect appropriately
      const intendedDestination = localStorage.getItem('intended_destination');
      console.log('🧭 Redirecting to:', intendedDestination || '/dashboard');
      
      if (intendedDestination && intendedDestination !== '/login') {
        localStorage.removeItem('intended_destination');
        setLocation(intendedDestination);
      } else {
        setLocation("/dashboard");
      }
    },
    onError: (error: any) => {
      console.error('🚨 Login failed:', error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please check your username and password.",
        variant: "destructive",
      });
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response.json();
    },
    onSuccess: (response) => {
      // Store token in localStorage for custom domain authentication
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
        console.log('🔑 Auth token stored in localStorage for custom domain');
      }
      
      // Invalidate auth queries to refresh user state
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Registration Successful",
        description: `Welcome, ${response.user.firstName || response.user.username}!`,
      });
      setShowRegisterDialog(false);
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    
    if (!username || !password) {
      toast({
        title: "Missing credentials",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }
    
    const loginData: LoginData = { username, password };
    
    // Add small delay for mobile touch feedback
    setTimeout(() => {
      loginMutation.mutate(loginData, {
        onSuccess: (response) => {
          console.log('🎉 Login success handler triggered');
          
          // Store token in localStorage for custom domain authentication
          if (response.token) {
            localStorage.setItem('auth_token', response.token);
            console.log('🔑 Auth token stored in localStorage for custom domain');
          }
          
          // Invalidate auth queries to refresh user state
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          
          // Clear any previous auth cache to force fresh authentication
          queryClient.clear();
          
          toast({
            title: "Login Successful",
            description: `Welcome back, ${response.user.firstName || response.user.username}!`,
          });
          
          // Small delay to ensure token is stored and auth state is updated
          setTimeout(() => {
            // Check for intended destination or redirect to dashboard
            const intendedDestination = localStorage.getItem('intended_destination');
            localStorage.removeItem('intended_destination');
            const redirectPath = intendedDestination || "/dashboard";
            
            console.log('🎯 CUSTOM DOMAIN LOGIN: Redirecting to:', redirectPath);
            
            // Force page reload for custom domain to ensure proper authentication
            if (window.location.hostname === 'profieldmanager.com') {
              window.location.href = redirectPath;
            } else {
              setLocation(redirectPath);
            }
          }, 200);
        },
        onError: (error: any) => {
          console.error('🚨 Login error handler triggered:', error);
          
          // Clear any potentially corrupted auth state
          localStorage.removeItem('auth_token');
          queryClient.clear();
          
          toast({
            title: "Login Failed",
            description: error.message || "Network error when attempting to fetch resource",
            variant: "destructive",
          });
        },
      });
    }, 100);
  };

  const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const registerData: RegisterData = {
      username: formData.get("username") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
    };
    registerMutation.mutate(registerData);
  };

  const seedDatabase = async () => {
    try {
      await apiRequest("POST", "/api/seed", {});
      toast({
        title: "Database Seeded",
        description: "Sample data and user accounts created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Seeding Failed",
        description: error.message || "Failed to seed database",
        variant: "destructive",
      });
    }
  };

  const clearCache = () => {
    try {
      // Clear all localStorage
      localStorage.clear();
      
      // Clear all React Query cache
      queryClient.clear();
      
      // Clear session storage
      sessionStorage.clear();
      
      // Force reload to clear any remaining state
      window.location.reload();
      
      toast({
        title: "Cache Cleared",
        description: "All cached data has been cleared. Please try logging in again.",
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast({
        title: "Cache Clear Failed",
        description: "Please manually refresh the page",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Graphics */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-600/20 animate-pulse"></div>
        
        {/* Geometric shapes */}
        <div className="absolute inset-0">
          {/* Large background circles */}
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/10 to-indigo-400/10 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-br from-purple-400/10 to-pink-400/10 blur-3xl"></div>
          
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          
          {/* Floating geometric elements */}
          <div className="absolute top-20 left-20 w-4 h-4 bg-blue-400/30 rounded-full animate-bounce"></div>
          <div className="absolute top-40 right-32 w-6 h-6 bg-purple-400/30 rotate-45 animate-pulse"></div>
          <div className="absolute bottom-32 left-16 w-5 h-5 bg-indigo-400/30 rounded-full animate-bounce delay-1000"></div>
          <div className="absolute bottom-20 right-20 w-4 h-4 bg-pink-400/30 rotate-12 animate-pulse delay-500"></div>
          
          {/* Abstract shapes */}
          <svg className="absolute top-1/4 left-10 w-24 h-24 text-blue-400/20" viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 10 L90 50 L50 90 L10 50 Z" />
          </svg>
          
          <svg className="absolute bottom-1/4 right-10 w-20 h-20 text-purple-400/20" viewBox="0 0 100 100" fill="currentColor">
            <circle cx="50" cy="50" r="40" />
            <circle cx="50" cy="50" r="20" fill="transparent" stroke="currentColor" strokeWidth="4" />
          </svg>
          
          {/* Invoice-themed decorative elements */}
          <div className="absolute top-16 right-16 opacity-10">
            <svg className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
          </div>
          
          <div className="absolute bottom-16 left-16 opacity-10">
            <svg className="w-14 h-14 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z" />
            </svg>
          </div>
        </div>
        
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="2" fill="white" fillOpacity="0.1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>
      </div>
      
      {/* Content container with backdrop blur */}
      <div className="relative z-10 w-full max-w-md space-y-6 p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">Pro Field Manager</h1>
          <p className="text-blue-100 mt-2 drop-shadow-sm">Professional field service management platform</p>
        </div>

        <Card className="backdrop-blur-lg bg-white/90 border-white/20 shadow-2xl shadow-black/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
              <Lock className="h-5 w-5" />
              Sign In
            </CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form 
              onSubmit={handleLogin} 
              className="space-y-4"
              noValidate
              style={{ touchAction: 'manipulation' }}
            >
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    placeholder="Enter your username"
                    className="pl-10 min-h-[48px]"
                    style={{ fontSize: '16px' }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    placeholder="Enter your password"
                    className="pl-10 pr-10 min-h-[48px]"
                    style={{ fontSize: '16px' }}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full touch-manipulation" 
                disabled={loginMutation.isPending}
                style={{ 
                  minHeight: '48px',
                  fontSize: '16px',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                {loginMutation.isPending ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6">
              <Separator />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create New Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Account</DialogTitle>
                    <DialogDescription>
                      Fill in your information to create a new account
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="register-firstName">First Name</Label>
                        <Input
                          id="register-firstName"
                          name="firstName"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <Label htmlFor="register-lastName">Last Name</Label>
                        <Input
                          id="register-lastName"
                          name="lastName"
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="register-username">Username *</Label>
                      <Input
                        id="register-username"
                        name="username"
                        placeholder="johndoe"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="register-email">Email *</Label>
                      <Input
                        id="register-email"
                        name="email"
                        type="email"
                        placeholder="john@example.com"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="register-password">Password *</Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          name="password"
                          type={showRegisterPassword ? "text" : "password"}
                          placeholder="Create a password"
                          className="pr-10"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        >
                          {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowRegisterDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={registerMutation.isPending}>
                        {registerMutation.isPending ? "Creating..." : "Create Account"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={seedDatabase}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Setup Demo Data
              </Button>

              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={clearCache}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Clear Cache & Fix Login Issues
              </Button>
            </div>


          </CardContent>
        </Card>
      </div>
    </div>
  );
}