import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Mail, Phone, MapPin, Calendar, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import StripeCheckoutForm from "@/components/payments/stripe-checkout-form";

export default function PublicInvoicePayment() {
  const [, params] = useRoute("/:orgSlug/invoice/:invoiceId/pay");
  const [, setLocation] = useLocation();
  const { orgSlug, invoiceId } = params || {};

  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/public/invoice/${orgSlug}/${invoiceId}`],
    enabled: !!orgSlug && !!invoiceId,
  });

  const handlePaymentSuccess = (paymentIntentId: string) => {
    setLocation(`/payment/success?type=invoice&id=${invoiceId}&pi=${paymentIntentId}`);
  };

  const handlePaymentError = (error: string) => {
    console.error("Payment failed:", error);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading invoice...</p>
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
            <CardTitle className="text-center">Invoice Not Found</CardTitle>
            <CardDescription className="text-center">
              The invoice you're looking for doesn't exist or the link is invalid.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { invoice, organization, customer } = data;

  // Check if already paid
  if (invoice.status === "paid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 mx-auto mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-center">Already Paid</CardTitle>
            <CardDescription className="text-center">
              This invoice has already been paid.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-sm text-muted-foreground">
              Invoice #{invoice.invoiceNumber}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const amountInCents = Math.round(parseFloat(invoice.total) * 100);

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
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Invoice Number</div>
                <div className="font-semibold">{invoice.invoiceNumber}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Date Issued</div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(invoice.date), "MMM dd, yyyy")}
                </div>
              </div>

              {invoice.dueDate && (
                <div>
                  <div className="text-sm text-muted-foreground">Due Date</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                  </div>
                </div>
              )}

              <Separator />

              {customer && (
                <div>
                  <div className="text-sm text-muted-foreground">Bill To</div>
                  <div className="font-medium">{customer.name}</div>
                  {customer.email && (
                    <div className="text-sm text-muted-foreground">{customer.email}</div>
                  )}
                </div>
              )}

              <Separator />

              {/* Invoice Items */}
              <div>
                <div className="text-sm font-semibold mb-2">Items</div>
                <div className="space-y-2">
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <div>
                          <div>{item.description || item.name}</div>
                          <div className="text-muted-foreground">
                            {item.quantity} × {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: invoice.currency || 'USD'
                            }).format(parseFloat(item.rate || item.price || 0))}
                          </div>
                        </div>
                        <div className="font-medium">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: invoice.currency || 'USD'
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
                    currency: invoice.currency || 'USD'
                  }).format(parseFloat(invoice.total))}
                </div>
              </div>

              {invoice.notes && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Notes</div>
                    <div className="text-sm">{invoice.notes}</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Pay Invoice</CardTitle>
              <CardDescription>
                Enter your card details to complete payment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StripeCheckoutForm
                amount={amountInCents}
                currency={invoice.currency || 'USD'}
                invoiceId={invoice.id}
                description={`Invoice #${invoice.invoiceNumber}`}
                businessName={customer?.name || organization.name}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />

              <div className="mt-4 text-xs text-muted-foreground text-center">
                <div>Secure payment powered by Stripe</div>
                <div>Your payment information is encrypted and secure</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
