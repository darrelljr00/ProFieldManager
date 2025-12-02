import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SpinWheel } from "@/components/SpinWheel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Gift } from "lucide-react";

interface WheelData {
  id: number;
  name: string;
  description: string | null;
  backgroundColor: string;
  pointerColor: string;
  spinDuration: number;
  requireEmail: boolean;
  segments: {
    id: number;
    label: string;
    color: string;
    displayOrder: number;
  }[];
}

export default function SpinWheelPage() {
  const { id } = useParams<{ id: string }>();
  const wheelId = parseInt(id || "0");

  const { data: wheel, isLoading, error } = useQuery<WheelData>({
    queryKey: ["/api/promotions/wheel", wheelId, "public"],
    queryFn: async () => {
      const response = await fetch(`/api/promotions/wheel/${wheelId}/public`);
      if (!response.ok) {
        throw new Error("Wheel not found");
      }
      return response.json();
    },
    enabled: wheelId > 0
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-red-500">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading wheel...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !wheel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Gift className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Wheel Not Found</h2>
            <p className="text-muted-foreground">
              This spin wheel is not available or has been deactivated.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (wheel.segments.length < 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Gift className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
            <p className="text-muted-foreground">
              This spin wheel is being set up. Check back soon!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center py-8 px-4"
      style={{
        background: `linear-gradient(135deg, ${wheel.pointerColor}22 0%, ${wheel.backgroundColor} 50%, ${wheel.pointerColor}22 100%)`
      }}
    >
      <Card className="w-full max-w-xl shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent" data-testid="text-wheel-title">
            {wheel.name}
          </CardTitle>
          {wheel.description && (
            <CardDescription className="text-lg" data-testid="text-wheel-description">
              {wheel.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <SpinWheel
            wheelId={wheel.id}
            segments={wheel.segments}
            spinDuration={wheel.spinDuration}
            pointerColor={wheel.pointerColor}
            backgroundColor={wheel.backgroundColor}
            requireEmail={wheel.requireEmail}
          />
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Spin the wheel for a chance to win amazing prizes!</p>
            <p className="mt-1">Each person gets one spin. Good luck!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
