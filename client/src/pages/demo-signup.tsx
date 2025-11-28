import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registerSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useHeroSlides } from "@/hooks/useHeroSlides";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff, Rocket, CheckCircle, Building2, Users, TrendingUp, Clock, Shield, Star, ChevronLeft, ChevronRight, FileText, Scale } from "lucide-react";
import { ContactUsBar } from "@/components/ContactUsBar";
import { PublicPageFooter } from "@/components/PublicPageFooter";
import { useAnalytics } from "@/hooks/use-analytics";

const demoSignupSchema = registerSchema.extend({
  organizationName: z.string().min(1, "Business name is required"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required").max(2, "State must be 2 characters"),
  zipCode: z.string().min(5, "ZIP code is required"),
});

type DemoSignupFormValues = z.infer<typeof demoSignupSchema>;

export default function DemoSignupPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentSlide, setCurrentSlide] = useState(0);
  const { data: slides = [], isLoading: slidesLoading } = useHeroSlides();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(false);
  
  useAnalytics({ enableInternal: true, organizationId: 4, enableGA: true, enableFB: true });

  const form = useForm<DemoSignupFormValues>({
    resolver: zodResolver(demoSignupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      organizationName: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
    },
  });

  useEffect(() => {
    if (slides.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, slides[0]?.displayDuration || 5000);
      return () => clearInterval(interval);
    }
  }, [slides]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const registerMutation = useMutation({
    mutationFn: async (data: DemoSignupFormValues) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, isDemo: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      return response.json();
    },
    onSuccess: async (response) => {
      if (response.token) {
        localStorage.setItem("auth_token", response.token);
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      setPendingRedirect(true);
      setShowTermsModal(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DemoSignupFormValues) => {
    registerMutation.mutate(data);
  };

  const currentSlideData = slides[currentSlide];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Slider Section */}
      {slides.length > 0 && (
        <div className="relative w-full h-96 overflow-hidden bg-slate-900">
          <div className="absolute inset-0">
            {currentSlideData && (
              <div
                className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
                style={{
                  backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${currentSlideData.imageUrl})`,
                }}
                data-testid={`slider-image-${currentSlide}`}
              />
            )}
          </div>

          <div className="relative z-10 h-full flex items-center justify-center text-center px-4">
            <div className="max-w-4xl">
              {currentSlideData && (
                <>
                  <h1 
                    className="text-4xl md:text-6xl font-bold text-white mb-4 animate-fade-in"
                    data-testid="slider-title"
                  >
                    {currentSlideData.title}
                  </h1>
                  <p 
                    className="text-xl md:text-2xl text-blue-100 mb-6 animate-fade-in"
                    data-testid="slider-subtitle"
                  >
                    {currentSlideData.subtitle}
                  </p>
                  <p 
                    className="text-lg text-gray-200 max-w-2xl mx-auto animate-fade-in"
                    data-testid="slider-description"
                  >
                    {currentSlideData.description}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Slider Controls */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm transition-all"
            aria-label="Previous slide"
            data-testid="button-slider-prev"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm transition-all"
            aria-label="Next slide"
            data-testid="button-slider-next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Slide Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide ? "bg-white w-8" : "bg-white/50"
                }`}
                aria-label={`Go to slide ${index + 1}`}
                data-testid={`slider-indicator-${index}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
          {/* Left Column - Value Propositions */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white" data-testid="text-value-title">
                Why Choose Pro Field Manager?
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300" data-testid="text-value-subtitle">
                Join thousands of field service professionals who trust us to streamline their operations.
              </p>
            </div>

            {/* Key Benefits */}
            <div className="grid gap-6">
              <div className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md" data-testid="card-benefit-gps">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Real-Time GPS Tracking</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Monitor your team's location, optimize routes, and improve efficiency with live tracking.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md" data-testid="card-benefit-invoicing">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Smart Invoicing & Payments</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Create professional invoices instantly, track payments, and get paid faster.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md" data-testid="card-benefit-team">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Team Coordination</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Manage your team, assign jobs, track time, and communicate seamlessly in one platform.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md" data-testid="card-benefit-time">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Save 10+ Hours Per Week</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Automate paperwork, streamline workflows, and focus on growing your business.
                  </p>
                </div>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-lg" data-testid="card-trust-indicators">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg">Trusted by Field Service Professionals</h3>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div data-testid="stat-users">
                  <div className="text-3xl font-bold text-blue-600">5,000+</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Active Users</div>
                </div>
                <div data-testid="stat-satisfaction">
                  <div className="text-3xl font-bold text-blue-600">98%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Satisfaction</div>
                </div>
                <div data-testid="stat-support">
                  <div className="text-3xl font-bold text-blue-600">24/7</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Support</div>
                </div>
              </div>
            </div>

            {/* Testimonial */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-blue-600" data-testid="card-testimonial">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4 italic">
                "Pro Field Manager transformed our business. We've cut administrative time by 60% and our team loves the GPS tracking and mobile app. Best investment we've made!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  JD
                </div>
                <div>
                  <div className="font-semibold">John Davidson</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Owner, Davidson HVAC Services</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Signup Form */}
          <div>
            <Card className="shadow-xl sticky top-4" data-testid="card-signup-form">
              <CardHeader className="space-y-1 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Rocket className="h-8 w-8 text-blue-600" data-testid="icon-demo-rocket" />
                  <CardTitle className="text-3xl font-bold" data-testid="text-demo-title">
                    Start Your Free 30-Day Demo
                  </CardTitle>
                </div>
                <CardDescription className="text-lg" data-testid="text-demo-description">
                  Get full access with pre-loaded sample data. No credit card required!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-demo-signup">
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                        Your Information
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="John"
                                  data-testid="input-firstName"
                                />
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
                                <Input
                                  {...field}
                                  placeholder="Doe"
                                  data-testid="input-lastName"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="johndoe"
                                  data-testid="input-username"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="email"
                                  placeholder="john@company.com"
                                  data-testid="input-email"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Business Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        Business Details
                      </h3>

                      <FormField
                        control={form.control}
                        name="organizationName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Name *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Your Company LLC"
                                data-testid="input-organizationName"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="tel"
                                placeholder="(555) 123-4567"
                                data-testid="input-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="123 Main Street"
                                data-testid="input-address"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem className="col-span-1">
                              <FormLabel>City *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Austin"
                                  data-testid="input-city"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="TX"
                                  maxLength={2}
                                  data-testid="input-state"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ZIP *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="78701"
                                  maxLength={10}
                                  data-testid="input-zipCode"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a secure password"
                                className="pr-10"
                                data-testid="input-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                                onClick={() => setShowPassword(!showPassword)}
                                data-testid="button-toggle-password"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Features List */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg" data-testid="card-features-included">
                      <p className="font-semibold mb-2">What's included in your demo:</p>
                      <ul className="space-y-1 text-sm">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          Pre-loaded sample data (customers, projects, invoices)
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          Full access to all features for 30 days
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          No credit card required
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          Cancel anytime - no strings attached
                        </li>
                      </ul>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
                      disabled={registerMutation.isPending}
                      data-testid="button-submit-demo"
                    >
                      {registerMutation.isPending
                        ? "Creating Your Demo Account..."
                        : "Start Free 30-Day Demo"}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => setLocation("/login")}
                        data-testid="link-login"
                      >
                        Sign in here
                      </Button>
                    </p>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Contact Us Bar */}
      <ContactUsBar />

      {/* Footer */}
      <PublicPageFooter />

      {/* Terms of Service Agreement Modal */}
      <Dialog open={showTermsModal} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Scale className="h-6 w-6 text-blue-600" />
              Terms of Service Agreement
            </DialogTitle>
            <DialogDescription>
              Please review and accept our Terms of Service to continue
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-gray-50 dark:bg-gray-900">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <h3 className="text-lg font-semibold mb-4">Pro Field Manager Terms of Service</h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                <strong>Effective Date:</strong> January 1, 2025
              </p>

              <h4 className="font-semibold mt-4 mb-2">1. Acceptance of Terms</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                By accessing or using Pro Field Manager ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.
              </p>

              <h4 className="font-semibold mt-4 mb-2">2. Description of Service</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Pro Field Manager is a cloud-based field service management platform that provides tools for invoicing, project management, customer management, team coordination, GPS tracking, and real-time communication.
              </p>

              <h4 className="font-semibold mt-4 mb-2">3. User Accounts</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account.
              </p>

              <h4 className="font-semibold mt-4 mb-2">4. Acceptable Use</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                You agree not to use the Service for any unlawful purpose or in any way that could damage, disable, or impair the Service. You may not attempt to gain unauthorized access to any part of the Service.
              </p>

              <h4 className="font-semibold mt-4 mb-2">5. Data Privacy</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to our collection and use of personal data as described in our Privacy Policy.
              </p>

              <h4 className="font-semibold mt-4 mb-2">6. Subscription and Billing</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Some features of the Service require a paid subscription. You agree to pay all fees associated with your subscription plan. Fees are non-refundable except as required by law.
              </p>

              <h4 className="font-semibold mt-4 mb-2">7. Demo Account Terms</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Demo accounts are provided for evaluation purposes and expire after 30 days. Demo data may be deleted upon expiration. No credit card is required for demo accounts.
              </p>

              <h4 className="font-semibold mt-4 mb-2">8. Intellectual Property</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                The Service and its original content, features, and functionality are owned by Pro Field Manager and are protected by international copyright, trademark, and other intellectual property laws.
              </p>

              <h4 className="font-semibold mt-4 mb-2">9. Limitation of Liability</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                In no event shall Pro Field Manager be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service.
              </p>

              <h4 className="font-semibold mt-4 mb-2">10. Changes to Terms</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page. Your continued use of the Service after changes constitutes acceptance of the modified Terms.
              </p>

              <h4 className="font-semibold mt-4 mb-2">11. Contact Information</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                If you have any questions about these Terms, please contact us at support@profieldmanager.com.
              </p>
            </div>
          </ScrollArea>

          <div className="flex items-start space-x-3 mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <Checkbox
              id="terms-agreement"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              data-testid="checkbox-terms-agreement"
            />
            <label
              htmlFor="terms-agreement"
              className="text-sm font-medium leading-tight cursor-pointer"
            >
              I have read and agree to the{" "}
              <Link href="/terms" className="text-blue-600 hover:underline" target="_blank">
                Terms of Service
              </Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                Privacy Policy
              </Link>
            </label>
          </div>

          <DialogFooter className="mt-4">
            <Button
              onClick={() => {
                if (termsAccepted) {
                  toast({
                    title: "Demo Account Created!",
                    description: "Your 30-day demo account is ready with sample data. Explore all features risk-free!",
                  });
                  setLocation("/dashboard");
                }
              }}
              disabled={!termsAccepted}
              className="w-full bg-blue-600 hover:bg-blue-700"
              data-testid="button-accept-terms"
            >
              <FileText className="mr-2 h-4 w-4" />
              {termsAccepted ? "Accept & Continue to Dashboard" : "Please Accept Terms to Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
