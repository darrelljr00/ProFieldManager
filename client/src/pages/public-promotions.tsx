import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Loader2, Gift, Ticket, Zap } from "lucide-react";
import { format } from "date-fns";

interface Promotion {
  id: number;
  name: string;
  description: string | null;
  status: string;
  discountType: string;
  discountValue: string | null;
  startDate: string | null;
  endDate: string | null;
  maxRedemptions: number | null;
  currentRedemptions: number;
}

interface WheelConfig {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function PublicPromotionsPage() {
  const { data: promotions = [], isLoading: promoLoading } = useQuery<Promotion[]>({
    queryKey: ["/api/promotions/public"],
    queryFn: async () => {
      const response = await fetch("/api/promotions/public");
      if (!response.ok) return [];
      return response.json();
    }
  });

  const { data: wheels = [], isLoading: wheelLoading } = useQuery<WheelConfig[]>({
    queryKey: ["/api/promotions/wheels/active"],
    queryFn: async () => {
      const response = await fetch("/api/promotions/wheels/active");
      if (!response.ok) return [];
      return response.json();
    }
  });

  const isLoading = promoLoading || wheelLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading promotions...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activePromotions = promotions.filter(p => p.status === "active");
  const activeWheels = wheels.filter(w => w.isActive);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3 flex items-center justify-center gap-2">
            <Gift className="w-10 h-10 text-primary" />
            Current Promotions
          </h1>
          <p className="text-lg text-muted-foreground">
            Check out our latest deals and special offers
          </p>
        </div>

        {/* Promotions Section */}
        {activePromotions.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Ticket className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-semibold">Active Promotions</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activePromotions.map(promotion => (
                <Card key={promotion.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{promotion.name}</CardTitle>
                        <CardDescription>{promotion.description}</CardDescription>
                      </div>
                      <Badge variant="default">
                        {promotion.discountType === "percentage" ? `${promotion.discountValue}%` : `$${promotion.discountValue}`}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {promotion.endDate && (
                      <div className="text-sm text-muted-foreground">
                        <p>Expires: <strong>{format(new Date(promotion.endDate), "MMM d, yyyy")}</strong></p>
                      </div>
                    )}
                    {promotion.maxRedemptions && (
                      <div className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Available</span>
                          <span className="font-medium">{promotion.maxRedemptions - promotion.currentRedemptions} / {promotion.maxRedemptions}</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${((promotion.currentRedemptions / promotion.maxRedemptions) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Spin Wheel Section */}
        {activeWheels.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-semibold">Spin to Win!</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeWheels.map(wheel => (
                <Card key={wheel.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl">{wheel.name}</CardTitle>
                    <CardDescription>{wheel.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/spin-wheel/${wheel.id}`}>
                      <Button className="w-full" size="lg">
                        <Gift className="w-4 h-4 mr-2" />
                        Spin the Wheel
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {activePromotions.length === 0 && activeWheels.length === 0 && (
          <div className="text-center py-12">
            <Gift className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h2 className="text-2xl font-semibold mb-2">No Active Promotions</h2>
            <p className="text-muted-foreground">Check back soon for exciting new deals!</p>
          </div>
        )}
      </div>
    </div>
  );
}
