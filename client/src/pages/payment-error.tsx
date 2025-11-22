import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { XCircle, AlertCircle, ArrowLeft } from "lucide-react";

export default function PaymentError() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split('?')[1]);
  const error = params.get('error');
  const type = params.get('type');
  const id = params.get('id');
  const orgSlug = params.get('org');

  const handleTryAgain = () => {
    if (type && id && orgSlug) {
      window.location.href = `/${orgSlug}/${type}/${id}/pay`;
    } else {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 mx-auto mb-4">
            <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-center text-2xl">Payment Failed</CardTitle>
          <CardDescription className="text-center">
            We couldn't process your payment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground text-center">
            <p>Common reasons for payment failure:</p>
            <ul className="list-disc list-inside mt-2 text-left space-y-1">
              <li>Insufficient funds</li>
              <li>Incorrect card details</li>
              <li>Card declined by your bank</li>
              <li>Payment method not supported</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={handleTryAgain} 
              className="w-full"
              data-testid="button-try-again"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button 
              onClick={() => window.close()} 
              variant="outline" 
              className="w-full"
              data-testid="button-close-window"
            >
              Close Window
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            If you continue to experience issues, please contact the business directly
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
