import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { authenticateUser } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { PuzzleCaptcha } from "@/components/PuzzleCaptcha";

export default function LoginPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  useEffect(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    localStorage.removeItem("intended_destination");
    sessionStorage.removeItem("auth_suppressed");
    queryClient.clear();
  }, [queryClient]);

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      return authenticateUser({
        username: data.username,
        password: data.password,
      });
    },
    onSuccess: (response: any) => {
      if (response?.token) {
        localStorage.setItem("auth_token", response.token);
        localStorage.setItem("user_data", JSON.stringify(response.user));
      }

      toast({
        title: "Login Successful",
        description: `Welcome back, ${response.user?.username || ""}`,
      });

      setLocation("/dashboard");
    },
    onError: (err: any) => {
      toast({
        title: "Login Failed",
        description: err?.message || "Invalid username or password.",
        variant: "destructive",
      });
      setCaptchaVerified(false);
      setCaptchaToken(null);
    },
  });

  const handleCaptchaVerified = (token: string) => {
    setCaptchaVerified(true);
    setCaptchaToken(token);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!captchaVerified) {
      toast({
        title: "Captcha Required",
        description: "Please complete the puzzle captcha before signing in.",
        variant: "destructive",
      });
      return;
    }

    const fd = new FormData(e.currentTarget);
    const username = fd.get("real_username") as string;
    const password = fd.get("real_password") as string;

    if (!username || !password) {
      toast({
        title: "Missing Fields",
        description: "Please enter both username and password.",
        variant: "destructive",
      });
      return;
    }

    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-xl flex items-center justify-center gap-2">
            <Lock className="h-5 w-5" />
            Login
          </CardTitle>
          <CardDescription className="text-center">
            Enter your account credentials to continue
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit}
            autoComplete="off"
            className="space-y-5"
          >
            <input
              type="text"
              name="trap_username"
              autoComplete="username"
              style={{ opacity: 0, height: 0, position: "absolute" }}
            />
            <input
              type="password"
              name="trap_password"
              autoComplete="current-password"
              style={{ opacity: 0, height: 0, position: "absolute" }}
            />

            <div>
              <Label>Username</Label>
              <div className="relative">
                <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  name="real_username"
                  placeholder="Enter username"
                  autoComplete="new-user"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  className="pl-10"
                  data-testid="input-username"
                />
              </div>
            </div>

            <div>
              <Label>Password</Label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                <Input
                  type={showPassword ? "text" : "password"}
                  name="real_password"
                  placeholder="Enter password"
                  autoComplete="new-password"
                  className="pl-10 pr-10"
                  data-testid="input-password"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-center">
              <PuzzleCaptcha 
                onVerified={handleCaptchaVerified}
                onError={(msg) => toast({ title: "Captcha Error", description: msg, variant: "destructive" })}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending || !captchaVerified}
              data-testid="button-submit-login"
            >
              {loginMutation.isPending ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
