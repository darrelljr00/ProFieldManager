import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileText, Home } from "lucide-react";
import { useAnalytics } from "@/hooks/use-analytics";

export default function PaymentSuccess() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split('?')[1]);
  const type = params.get('type'); // 'invoice' or 'quote'
  const id = params.get('id');
  const paymentIntentId = params.get('pi');
  
  useAnalytics({ enableInternal: true, organizationId: 4, enableGA: true, enableFB: true });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-center text-2xl">Payment Successful!</CardTitle>
          <CardDescription className="text-center">
            Your payment has been processed successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium capitalize">{type || 'Payment'}</span>
            </div>
            {id && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{type === 'invoice' ? 'Invoice' : 'Quote'} ID:</span>
                <span className="font-medium">#{id}</span>
              </div>
            )}
            {paymentIntentId && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transaction ID:</span>
                <span className="font-mono text-xs">{paymentIntentId.substring(0, 20)}...</span>
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground text-center">
            <p>A confirmation email will be sent to you shortly.</p>
            <p className="mt-2">Thank you for your business!</p>
          </div>

          <div className="pt-4">
            <Button 
              onClick={() => window.close()} 
              className="w-full"
              data-testid="button-close-window"
            >
              Close Window
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
