import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Mail, Phone, MapPin, Calendar, FileText, Loader2, CheckCircle2, AlertCircle, CreditCard, Lock } from "lucide-react";
import { format } from "date-fns";
import { useAnalytics } from "@/hooks/use-analytics";

export default function PublicQuotePayment() {
  const [, params] = useRoute("/:orgSlug/quote/:quoteId/pay");
  const [location] = useLocation();
  const { orgSlug, quoteId } = params as { orgSlug: string; quoteId: string } || {};
  const [processing, setProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  
  useAnalytics({ enableInternal: true, organizationId: 4, enableGA: true, enableFB: true });
  
  // Check if payment was cancelled
  const cancelled = new URLSearchParams(location.split('?')[1]).get('cancelled');

  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/public/quote/${orgSlug}/${quoteId}`],
    enabled: !!orgSlug && !!quoteId,
  });

  const handlePayNow = async () => {
    setProcessing(true);
    setCheckoutError("");
    
    try {
      const response = await fetch(`/api/public/checkout/quote/${orgSlug}/${quoteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create checkout session');
      }
      
      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error: any) {
      console.error('Checkout error:', error);
      setCheckoutError(error.message || 'Failed to start payment');
      setProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading quote...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-center">Quote Not Found</CardTitle>
            <CardDescription className="text-center">
              The quote you're looking for doesn't exist or the link is invalid.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { quote, organization, customer } = data;

  // Check if already paid/accepted
  if (quote.status === "accepted" || quote.status === "paid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 mx-auto mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-center">Already Accepted</CardTitle>
            <CardDescription className="text-center">
              This quote has already been accepted and paid.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-sm text-muted-foreground">
              Quote #{quote.quoteNumber}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const amountInCents = Math.round(parseFloat(quote.total) * 100);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Organization Header */}
        <div className="text-center mb-8">
          {organization.logo && (
            <img 
              src={organization.logo} 
              alt={organization.name} 
              className="h-16 mx-auto mb-4"
            />
          )}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {organization.name}
          </h1>
          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
            {organization.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {organization.phone}
              </div>
            )}
            {organization.email && (
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {organization.email}
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Quote Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Quote Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Quote Number</div>
                <div className="font-semibold">{quote.quoteNumber}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Date Issued</div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(quote.date), "MMM dd, yyyy")}
                </div>
              </div>

              {quote.expiryDate && (
                <div>
                  <div className="text-sm text-muted-foreground">Valid Until</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(quote.expiryDate), "MMM dd, yyyy")}
                  </div>
                </div>
              )}

              <Separator />

              {customer && (
                <div>
                  <div className="text-sm text-muted-foreground">Quote For</div>
                  <div className="font-medium">{customer.name}</div>
                  {customer.email && (
                    <div className="text-sm text-muted-foreground">{customer.email}</div>
                  )}
                </div>
              )}

              <Separator />

              {/* Quote Items */}
              <div>
                <div className="text-sm font-semibold mb-2">Items</div>
                <div className="space-y-2">
                  {quote.items && quote.items.length > 0 ? (
                    quote.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <div>
                          <div>{item.description || item.name}</div>
                          <div className="text-muted-foreground">
                            {item.quantity} × {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: quote.currency || 'USD'
                            }).format(parseFloat(item.rate || item.price || 0))}
                          </div>
                        </div>
                        <div className="font-medium">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: quote.currency || 'USD'
                          }).format(parseFloat(item.amount || 0))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No items listed</div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <div>Total Amount</div>
                <div>
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: quote.currency || 'USD'
                  }).format(parseFloat(quote.total))}
                </div>
              </div>

              {quote.notes && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Notes</div>
                    <div className="text-sm">{quote.notes}</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment Action */}
          <Card>
            <CardHeader>
              <CardTitle>Accept & Pay Quote</CardTitle>
              <CardDescription>
                Click below to accept this quote and pay securely with Stripe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cancelled && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Payment was cancelled. You can try again below.</AlertDescription>
                </Alert>
              )}
              
              {checkoutError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{checkoutError}</AlertDescription>
                </Alert>
              )}

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span>Secure payment powered by Stripe</span>
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  You'll be redirected to Stripe's secure checkout page
                </div>
              </div>

              <Button 
                onClick={handlePayNow}
                disabled={processing}
                className="w-full"
                size="lg"
                data-testid="button-pay-now"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting to Stripe...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Accept & Pay {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: quote.currency || 'USD'
                    }).format(parseFloat(quote.total))}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
