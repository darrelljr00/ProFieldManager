import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Check, Star, Zap, Users } from "lucide-react";

interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  price: number;
  billingInterval: string;
  description: string;
  isPopular?: boolean;
  features: string[];
  maxUsers: number;
  maxProjects: number;
  maxCustomers: number;
  maxStorageGB: number;
}

interface SubscriptionPlanSelectorProps {
  plans: SubscriptionPlan[];
  selectedPlanId?: string;
  onPlanSelect: (planId: string) => void;
  showFeatures?: boolean;
  showRadioButtons?: boolean;
}

export function SubscriptionPlanSelector({ 
  plans, 
  selectedPlanId, 
  onPlanSelect,
  showFeatures = true,
  showRadioButtons = true
}: SubscriptionPlanSelectorProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>(selectedPlanId || '');

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    onPlanSelect(planId);
  };

  if (showRadioButtons) {
    return (
      <RadioGroup value={selectedPlan} onValueChange={handlePlanSelect}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="relative">
              <Label htmlFor={`plan-${plan.id}`} className="cursor-pointer">
                <Card className={`relative transition-all border-2 hover:shadow-lg ${
                  selectedPlan === plan.id.toString() 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'border-border hover:border-primary/50'
                } ${plan.isPopular ? 'scale-105' : ''}`}>
                  {plan.isPopular && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <div className="flex items-center justify-center mb-2">
                      <RadioGroupItem value={plan.id.toString()} id={`plan-${plan.id}`} className="mr-3" />
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">/{plan.billingInterval}</span>
                    </div>
                  </CardHeader>
                  
                  {showFeatures && (
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {/* Usage Limits */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-primary" />
                            <span>{plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers} users</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Zap className="h-4 w-4 text-primary" />
                            <span>{plan.maxProjects === -1 ? 'Unlimited' : plan.maxProjects} projects</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            <span>{plan.maxCustomers === -1 ? 'Unlimited' : plan.maxCustomers} customers</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary" />
                            <span>{plan.maxStorageGB === -1 ? 'Unlimited' : `${plan.maxStorageGB}GB`} storage</span>
                          </div>
                        </div>
                        
                        {/* Feature List */}
                        {plan.features && plan.features.length > 0 && (
                          <div className="border-t pt-3">
                            <div className="space-y-1">
                              {plan.features.slice(0, 6).map((feature, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                  <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                                  <span className="text-muted-foreground">{feature}</span>
                                </div>
                              ))}
                              {plan.features.length > 6 && (
                                <div className="text-xs text-muted-foreground mt-2">
                                  +{plan.features.length - 6} more features
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
    );
  }

  // Fallback to card selection without radio buttons
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <Card 
          key={plan.id}
          className={`relative cursor-pointer transition-all border-2 hover:shadow-lg ${
            selectedPlan === plan.id.toString() 
              ? 'border-primary ring-2 ring-primary/20' 
              : 'border-border hover:border-primary/50'
          } ${plan.isPopular ? 'scale-105' : ''}`}
          onClick={() => handlePlanSelect(plan.id.toString())}
        >
          {plan.isPopular && (
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
              <Star className="h-3 w-3 mr-1" />
              Most Popular
            </Badge>
          )}
          
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
            <div className="mt-4">
              <span className="text-3xl font-bold">${plan.price}</span>
              <span className="text-muted-foreground">/{plan.billingInterval}</span>
            </div>
          </CardHeader>
          
          {showFeatures && (
            <CardContent>
              <div className="space-y-3">
                {/* Usage Limits */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers} users</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-primary" />
                    <span>{plan.maxProjects === -1 ? 'Unlimited' : plan.maxProjects} projects</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>{plan.maxCustomers === -1 ? 'Unlimited' : plan.maxCustomers} customers</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>{plan.maxStorageGB === -1 ? 'Unlimited' : `${plan.maxStorageGB}GB`} storage</span>
                  </div>
                </div>
                
                {/* Feature List */}
                {plan.features && plan.features.length > 0 && (
                  <div className="border-t pt-3">
                    <div className="space-y-1">
                      {plan.features.slice(0, 6).map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                      {plan.features.length > 6 && (
                        <div className="text-xs text-muted-foreground mt-2">
                          +{plan.features.length - 6} more features
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}