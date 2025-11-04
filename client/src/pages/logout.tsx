import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut } from "lucide-react";

export default function Logout() {
  const { logout } = useAuth();

  useEffect(() => {
    console.log('🔴 Logout page - executing logout');
    // Perform logout (this will clear auth data and redirect to login)
    logout();
  }, [logout]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <LogOut className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Logging Out</CardTitle>
          <CardDescription>
            Please wait while we log you out...
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          You will be redirected to the login page shortly.
        </CardContent>
      </Card>
    </div>
  );
}
