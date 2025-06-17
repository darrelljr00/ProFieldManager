import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  ArrowRight, 
  Star, 
  Users, 
  BarChart3, 
  Shield, 
  Zap,
  Building2,
  CreditCard,
  MapPin,
  Calendar,
  FileText,
  MessageSquare,
  Smartphone
} from "lucide-react";
import { OrganizationSignupData } from "@shared/schema";

const plans = [
  {
    name: "Starter",
    slug: "starter",
    price: 49,
    description: "Perfect for small field service teams",
    features: [
      "Up to 5 users",
      "50 projects",
      "10GB storage",
      "Basic reporting",
      "Email support",
      "Mobile apps",
      "Invoice management",
      "Customer management"
    ],
    popular: false
  },
  {
    name: "Professional", 
    slug: "professional",
    price: 99,
    description: "Best for growing businesses",
    features: [
      "Up to 25 users",
      "Unlimited projects", 
      "50GB storage",
      "Advanced reporting",
      "Priority support",
      "API access",
      "Custom branding",
      "GPS tracking",
      "SMS notifications",
      "DocuSign integration"
    ],
    popular: true
  },
  {
    name: "Enterprise",
    slug: "enterprise", 
    price: 199,
    description: "For large organizations",
    features: [
      "Unlimited users",
      "Unlimited projects",
      "500GB storage", 
      "White-label solution",
      "Dedicated support",
      "Custom integrations",
      "Advanced analytics",
      "Multi-location support",
      "SSO authentication",
      "Custom workflows"
    ],
    popular: false
  }
];

export default function LandingPage() {
  const [location, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState("professional");
  const { toast } = useToast();

  const signupMutation = useMutation({
    mutationFn: async (data: OrganizationSignupData) => {
      const response = await apiRequest("POST", "/api/saas/signup", data);
      return response.json();
    },
    onSuccess: (response) => {
      toast({
        title: "Welcome to Pro Field Manager!",
        description: `Organization created successfully. Welcome, ${response.organization.name}!`,
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Signup Failed",
        description: error.message || "Failed to create organization",
        variant: "destructive",
      });
    },
  });

  const handleSignup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const signupData: OrganizationSignupData = {
      organizationName: formData.get("organizationName") as string,
      slug: formData.get("slug") as string,
      email: formData.get("email") as string,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      password: formData.get("password") as string,
      plan: selectedPlan as "starter" | "professional" | "enterprise",
    };
    signupMutation.mutate(signupData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800">
      {/* Background Graphics */}
      <div className="absolute inset-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/10 to-indigo-400/10 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-br from-purple-400/10 to-pink-400/10 blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 p-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Building2 className="h-8 w-8 text-white" />
          <h1 className="text-2xl font-bold text-white">Pro Field Manager</h1>
        </div>
        <Button 
          variant="outline" 
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          onClick={() => setLocation("/login")}
        >
          Sign In
        </Button>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 text-center py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Streamline Your Field Service Operations
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Complete field service management platform with invoicing, project tracking, 
            customer management, and team coordination. Built for businesses that work in the field.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 px-8 py-4 text-lg">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-6 bg-white/5 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
            Everything You Need to Manage Field Operations
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: FileText, title: "Invoice Management", description: "Create, send, and track invoices with automated payment processing" },
              { icon: MapPin, title: "GPS Tracking", description: "Real-time location tracking and route optimization for field teams" },
              { icon: Calendar, title: "Scheduling", description: "Smart scheduling with conflict detection and automated notifications" },
              { icon: Users, title: "Team Management", description: "User roles, permissions, and team collaboration tools" },
              { icon: BarChart3, title: "Analytics", description: "Comprehensive reporting and business intelligence dashboards" },
              { icon: Smartphone, title: "Mobile Apps", description: "Native iOS and Android apps for field workers" },
            ].map((feature, index) => (
              <Card key={index} className="bg-white/10 border-white/20 backdrop-blur-sm">
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-blue-300 mb-4" />
                  <CardTitle className="text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-blue-100">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-blue-100 text-center mb-12 text-lg">
            Choose the plan that fits your business. All plans include a 14-day free trial.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {plans.map((plan) => (
              <Card 
                key={plan.slug}
                className={`relative bg-white/10 border-white/20 backdrop-blur-sm ${
                  plan.popular ? 'ring-2 ring-blue-400' : ''
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-white text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-blue-100">{plan.description}</CardDescription>
                  <div className="text-4xl font-bold text-white mt-4">
                    ${plan.price}
                    <span className="text-lg font-normal text-blue-100">/month</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-blue-100">
                        <Check className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                    onClick={() => setSelectedPlan(plan.slug)}
                  >
                    {selectedPlan === plan.slug ? 'Selected' : 'Select Plan'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Signup Form */}
          <Card className="max-w-2xl mx-auto bg-white/10 border-white/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-center text-2xl">Start Your Free Trial</CardTitle>
              <CardDescription className="text-blue-100 text-center">
                No credit card required. Get started in less than 2 minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-white">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      placeholder="John"
                      className="bg-white/10 border-white/20 text-white placeholder:text-blue-200"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-white">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      placeholder="Doe"
                      className="bg-white/10 border-white/20 text-white placeholder:text-blue-200"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-white">Work Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@company.com"
                    className="bg-white/10 border-white/20 text-white placeholder:text-blue-200"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="organizationName" className="text-white">Company Name</Label>
                  <Input
                    id="organizationName"
                    name="organizationName"
                    placeholder="Acme Corp"
                    className="bg-white/10 border-white/20 text-white placeholder:text-blue-200"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="slug" className="text-white">Company Subdomain</Label>
                  <div className="flex">
                    <Input
                      id="slug"
                      name="slug"
                      placeholder="acme-corp"
                      className="bg-white/10 border-white/20 text-white placeholder:text-blue-200 rounded-r-none"
                      required
                    />
                    <span className="bg-white/10 border border-white/20 border-l-0 px-3 py-2 text-blue-100 rounded-r-md">
                      .profieldmanager.com
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="text-white">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Create a secure password"
                    className="bg-white/10 border-white/20 text-white placeholder:text-blue-200"
                    required
                  />
                </div>

                <div className="text-center pt-4">
                  <p className="text-blue-100 text-sm mb-4">
                    Selected Plan: <span className="font-semibold text-white">
                      {plans.find(p => p.slug === selectedPlan)?.name} (${plans.find(p => p.slug === selectedPlan)?.price}/month)
                    </span>
                  </p>
                  
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={signupMutation.isPending}
                  >
                    {signupMutation.isPending ? 'Creating Account...' : 'Start Free Trial'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 bg-white/5 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-blue-100">
            © 2024 Pro Field Manager. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}