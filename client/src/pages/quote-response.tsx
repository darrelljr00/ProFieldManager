import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Clock, FileText, DollarSign, Calendar, AlertCircle } from "lucide-react";
import { useAnalytics } from "@/hooks/use-analytics";

interface QuoteData {
  id: number;
  quoteNumber: string;
  status: string;
  total: string;
  quoteDate: string;
  expiryDate: string;
  notes?: string;
  customer: {
    name: string;
    email: string;
  };
  lineItems: Array<{
    description: string;
    quantity: string;
    amount: string;
  }>;
  user: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
  organization?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export default function QuoteResponsePage() {
  const [match, params] = useRoute("/quote/:action/:token");
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  useAnalytics({ enableInternal: true, organizationId: 4, enableGA: true, enableFB: true });
  
  const action = params?.action; // 'approve' or 'deny'
  const token = params?.token;

  useEffect(() => {
    if (!token || !action) {
      setError("Invalid quote response link");
      setLoading(false);
      return;
    }

    if (action !== 'approve' && action !== 'deny') {
      setError("Invalid action. Must be approve or deny.");
      setLoading(false);
      return;
    }

    // Fetch quote data using the token
    fetchQuoteData();
  }, [token, action]);

  const fetchQuoteData = async () => {
    try {
      const response = await fetch(`/api/quotes/response/${action}/${token}`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Quote not found or link has expired");
        } else if (response.status === 410) {
          throw new Error("This quote has already been responded to");
        }
        throw new Error("Failed to load quote");
      }

      const data = await response.json();
      setQuote(data);
    } catch (err: any) {
      setError(err.message || "Failed to load quote");
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async () => {
    if (!token || !action) return;
    
    setResponding(true);
    try {
      const response = await fetch(`/api/quotes/response/${action}/${token}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Quote not found or link has expired");
        } else if (response.status === 410) {
          throw new Error("This quote has already been responded to");
        }
        throw new Error(`Failed to ${action} quote`);
      }

      const data = await response.json();
      
      // If approved and got availability token, redirect to calendar
      if (action === 'approve' && data.availabilityToken) {
        window.location.href = `/quote-availability/${data.availabilityToken}`;
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${action} quote`);
    } finally {
      setResponding(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quote...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact the company that sent you this quote.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {action === 'approve' ? (
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            )}
            <CardTitle className={action === 'approve' ? 'text-green-600' : 'text-red-600'}>
              Quote {action === 'approve' ? 'Approved' : 'Declined'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Thank you for your response! Quote #{quote?.quoteNumber} has been {action === 'approve' ? 'approved' : 'declined'}.
            </p>
            {action === 'approve' && (
              <p className="text-sm text-muted-foreground">
                {quote?.organization?.name || quote?.user?.firstName || 'The company'} will be in touch with you shortly to proceed.
              </p>
            )}
            {action === 'deny' && (
              <p className="text-sm text-muted-foreground">
                Your response has been recorded. Thank you for your consideration.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-muted-foreground">Quote not found</p>
      </div>
    );
  }

  const isExpired = new Date(quote.expiryDate) < new Date();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Quote Response</h1>
          </div>
          <p className="text-muted-foreground">
            Please review the quote details below and choose your response
          </p>
        </div>

        {/* Quote Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Quote #{quote.quoteNumber}
                  <Badge className={getStatusColor(quote.status)}>
                    {quote.status}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  From: {quote.organization?.name || `${quote.user.firstName || ''} ${quote.user.lastName || ''}`.trim() || quote.user.email}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-2xl font-bold">
                  <DollarSign className="h-6 w-6" />
                  {parseFloat(quote.total).toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Info */}
            <div>
              <h3 className="font-semibold mb-2">Customer</h3>
              <p>{quote.customer.name}</p>
              <p className="text-sm text-muted-foreground">{quote.customer.email}</p>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Quote Date</p>
                  <p className="text-sm text-muted-foreground">{formatDate(quote.quoteDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Expires On</p>
                  <p className={`text-sm ${isExpired ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {formatDate(quote.expiryDate)}
                    {isExpired && " (Expired)"}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Line Items */}
            <div>
              <h3 className="font-semibold mb-4">Services</h3>
              <div className="space-y-3">
                {quote.lineItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-muted-foreground">Qty: {parseFloat(item.quantity)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${parseFloat(item.amount).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {quote.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {quote.status === 'sent' && !isExpired && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Your Response</CardTitle>
              <CardDescription>
                {action === 'approve' 
                  ? "Click below to approve this quote and proceed with the services."
                  : "Click below to decline this quote."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                size="lg"
                className={`w-full md:w-auto min-w-[200px] ${
                  action === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                onClick={handleResponse}
                disabled={responding}
                data-testid={`button-${action}-quote`}
              >
                {responding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {action === 'approve' ? 'Approving...' : 'Declining...'}
                  </>
                ) : (
                  <>
                    {action === 'approve' ? (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    {action === 'approve' ? 'Approve Quote' : 'Decline Quote'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Already responded message */}
        {quote.status === 'accepted' && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="text-center py-6">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-800 font-medium">This quote has already been approved.</p>
            </CardContent>
          </Card>
        )}

        {quote.status === 'rejected' && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="text-center py-6">
              <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <p className="text-red-800 font-medium">This quote has already been declined.</p>
            </CardContent>
          </Card>
        )}

        {isExpired && quote.status === 'sent' && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="text-center py-6">
              <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-orange-800 font-medium">This quote has expired and can no longer be responded to.</p>
            </CardContent>
          </Card>
        )}

        {/* Contact Info */}
        <div className="text-center mt-8 p-4 bg-white rounded-lg shadow-sm">
          <p className="text-sm text-muted-foreground mb-2">
            Questions about this quote? Contact us:
          </p>
          <div className="space-y-1">
            {quote.organization?.email && (
              <p className="text-sm">
                <strong>Email:</strong> {quote.organization.email}
              </p>
            )}
            {quote.organization?.phone && (
              <p className="text-sm">
                <strong>Phone:</strong> {quote.organization.phone}
              </p>
            )}
            {!quote.organization?.email && (
              <p className="text-sm">
                <strong>Email:</strong> {quote.user.email}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}