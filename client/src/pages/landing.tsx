import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Building2, Users, Shield, Zap } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { organizationSignupSchema, type OrganizationSignupData } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const subscriptionPlans = [
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
      "Email support"
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
      "API access",
      "Custom branding",
      "Integrations",
      "Priority support"
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
      "Advanced reporting",
      "Full API access",
      "Custom branding",
      "All integrations",
      "24/7 priority support",
      "Custom deployment"
    ],
    popular: false
  }
];

export default function LandingPage() {
  const [selectedPlan, setSelectedPlan] = useState("professional");
  const { toast } = useToast();

  const form = useForm<OrganizationSignupData>({
    resolver: zodResolver(organizationSignupSchema),
    defaultValues: {
      organizationName: "",
      slug: "",
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      plan: "professional"
    }
  });

  const signupMutation = useMutation({
    mutationFn: async (data: OrganizationSignupData) => {
      const response = await apiRequest("POST", "/api/organizations/signup", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Signup failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Welcome to Pro Field Manager!",
        description: "Your organization has been created successfully. You can now login.",
      });
      // Redirect to login page
      window.location.href = "/login";
    },
    onError: (error: Error) => {
      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: OrganizationSignupData) => {
    signupMutation.mutate({ ...data, plan: selectedPlan as "starter" | "professional" | "enterprise" });
  };

  const generateSlug = (orgName: string) => {
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    form.setValue('slug', slug);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
      {/* Hero Section */}
      <div className="relative">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-6">
              <Building2 className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white ml-3">
                Pro Field Manager
              </h1>
            </div>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-3xl mx-auto">
              The complete field service management platform that scales with your business. 
              Manage projects, teams, invoicing, and customer relationships all in one place.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Check className="h-5 w-5 text-green-500" />
                <span>30-day free trial</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Check className="h-5 w-5 text-green-500" />
                <span>No setup fees</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Check className="h-5 w-5 text-green-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Team Management</h3>
              <p className="text-slate-600 dark:text-slate-400">Organize your field teams and track performance</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Project Tracking</h3>
              <p className="text-slate-600 dark:text-slate-400">Monitor project progress and deadlines</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Smart Invoicing</h3>
              <p className="text-slate-600 dark:text-slate-400">Automated billing and payment tracking</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 dark:bg-orange-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Customer Portal</h3>
              <p className="text-slate-600 dark:text-slate-400">Self-service portal for your clients</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="bg-white dark:bg-slate-800 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Choose Your Plan
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Start with a 30-day free trial, then choose the plan that fits your business
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {subscriptionPlans.map((plan) => (
              <Card 
                key={plan.slug} 
                className={`relative cursor-pointer transition-all ${
                  selectedPlan === plan.slug 
                    ? 'ring-2 ring-blue-500 dark:ring-blue-400' 
                    : 'hover:shadow-lg'
                } ${plan.popular ? 'scale-105' : ''}`}
                onClick={() => setSelectedPlan(plan.slug)}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-slate-900 dark:text-white">
                      ${plan.price}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">/month</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Signup Form */}
      <div className="bg-slate-50 dark:bg-slate-900 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Start Your Free Trial</CardTitle>
                <CardDescription>
                  Create your organization account and get started in minutes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@company.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="organizationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Acme Field Services" 
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                generateSlug(e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization URL</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <span className="text-sm text-slate-500 mr-2">profieldmanager.com/</span>
                              <Input placeholder="acme-field-services" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <Label>Selected Plan</Label>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white">
                              {subscriptionPlans.find(p => p.slug === selectedPlan)?.name}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              {subscriptionPlans.find(p => p.slug === selectedPlan)?.description}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                              ${subscriptionPlans.find(p => p.slug === selectedPlan)?.price}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-300">per month</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={signupMutation.isPending}
                    >
                      {signupMutation.isPending ? "Creating Account..." : "Start Free Trial"}
                    </Button>

                    <p className="text-sm text-center text-slate-600 dark:text-slate-400">
                      Already have an account?{" "}
                      <a href="/login" className="text-blue-600 hover:underline">
                        Sign in here
                      </a>
                    </p>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}