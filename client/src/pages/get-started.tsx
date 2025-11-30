import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Check, ArrowRight, Building2, Users, Zap, Shield, Star, Clock, 
  CreditCard, Rocket, Target, Award, ChevronRight, Phone, Mail,
  CheckCircle, Play, Calendar, Headphones, TrendingUp, Lock,
  Gift, Timer, Sparkles, MessageCircle, Loader2
} from "lucide-react";
import { PublicPageHeader } from "@/components/PublicPageHeader";
import { PublicPageFooter } from "@/components/PublicPageFooter";
import { ContactUsBar } from "@/components/ContactUsBar";
import { useAnalytics } from "@/hooks/use-analytics";
import type { SubscriptionPlan } from "@shared/schema";

interface PlanWithFeatures extends SubscriptionPlan {
  features?: string[];
  yearlyPrice?: number;
}

const fallbackPlans = [
  {
    id: 1,
    name: "Starter",
    slug: "starter",
    price: "49",
    description: "Perfect for small field service teams",
    billingInterval: "month",
    maxUsers: 5,
    maxProjects: 50,
    maxStorageGB: 10,
    maxCustomers: 100,
    isPopular: false,
    features: [
      "Up to 5 team members",
      "50 active projects",
      "10GB cloud storage",
      "Basic analytics & reports",
      "Email support",
      "Mobile app access",
      "Customer management",
      "Invoice creation"
    ]
  },
  {
    id: 2,
    name: "Professional",
    slug: "professional", 
    price: "99",
    description: "Best for growing businesses",
    billingInterval: "month",
    maxUsers: 25,
    maxProjects: -1,
    maxStorageGB: 50,
    maxCustomers: 500,
    isPopular: true,
    features: [
      "Up to 25 team members",
      "Unlimited projects",
      "50GB cloud storage",
      "Advanced analytics & custom reports",
      "Priority email & chat support",
      "Full API access",
      "Custom branding",
      "All integrations (Stripe, Twilio, etc.)",
      "GPS tracking & route optimization",
      "Automated notifications",
      "Quote & proposal builder"
    ]
  },
  {
    id: 3,
    name: "Enterprise",
    slug: "enterprise",
    price: "199",
    description: "For large organizations",
    billingInterval: "month",
    maxUsers: -1,
    maxProjects: -1,
    maxStorageGB: 500,
    maxCustomers: -1,
    isPopular: false,
    features: [
      "Unlimited team members",
      "Unlimited projects", 
      "500GB cloud storage",
      "Enterprise analytics & BI tools",
      "24/7 priority phone & chat support",
      "Full API access with higher limits",
      "White-label branding",
      "All integrations + custom",
      "Advanced GPS fleet tracking",
      "Dedicated account manager",
      "Custom deployment options",
      "SLA guarantee",
      "Training & onboarding"
    ]
  }
];

const funnelSteps = [
  {
    step: 1,
    title: "Start Your Free Trial",
    description: "No credit card required. Get instant access to all Professional features for 30 days.",
    icon: Rocket
  },
  {
    step: 2,
    title: "Set Up Your Business",
    description: "Import customers, add your team, and configure your workflows in minutes.",
    icon: Building2
  },
  {
    step: 3,
    title: "Start Managing Jobs",
    description: "Create projects, dispatch technicians, and track progress in real-time.",
    icon: Target
  },
  {
    step: 4,
    title: "Grow Your Business",
    description: "Use analytics to optimize operations and scale with confidence.",
    icon: TrendingUp
  }
];

const testimonials = [
  {
    name: "Mike Johnson",
    company: "Johnson HVAC Services",
    role: "Owner",
    quote: "Pro Field Manager transformed how we run our HVAC business. We've increased productivity by 40% and our customers love the automated updates.",
    rating: 5,
    avatar: "MJ"
  },
  {
    name: "Sarah Chen",
    company: "Premier Plumbing Co.",
    role: "Operations Manager",
    quote: "The GPS tracking and route optimization alone saved us $2,000/month in fuel costs. The ROI was immediate.",
    rating: 5,
    avatar: "SC"
  },
  {
    name: "David Williams",
    company: "Williams Electric",
    role: "CEO",
    quote: "We went from using spreadsheets to a fully automated system. Our team loves the mobile app and our invoicing is 10x faster.",
    rating: 5,
    avatar: "DW"
  }
];

const faqs = [
  {
    question: "How long is the free trial?",
    answer: "Our free trial lasts 30 days and includes full access to all Professional plan features. No credit card is required to start, and you can cancel anytime."
  },
  {
    question: "Can I change plans later?",
    answer: "Absolutely! You can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to new features. When downgrading, changes take effect at your next billing cycle."
  },
  {
    question: "Is there a setup fee?",
    answer: "No, there are no setup fees or hidden costs. You only pay for your subscription. Enterprise customers may have optional paid onboarding and training services."
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer: "Yes! When you choose annual billing, you save 20% compared to monthly billing. This is reflected in our pricing above."
  },
  {
    question: "What happens to my data if I cancel?",
    answer: "Your data remains accessible for 30 days after cancellation. You can export all your data at any time. After 30 days, data is securely deleted per our privacy policy."
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We use bank-level encryption (256-bit SSL), secure cloud infrastructure with daily backups, and comply with industry security standards. Your data is never shared with third parties."
  },
  {
    question: "Do you offer phone support?",
    answer: "Professional plans include priority email and chat support with typical response times under 2 hours. Enterprise plans include 24/7 phone support with a dedicated account manager."
  },
  {
    question: "Can I integrate with my existing tools?",
    answer: "Yes! We integrate with popular tools including Stripe for payments, Twilio for SMS, Google Maps for routing, QuickBooks for accounting, and many more. Enterprise plans support custom integrations."
  }
];

const trustBadges = [
  { label: "30-Day Free Trial", icon: Gift },
  { label: "No Credit Card Required", icon: CreditCard },
  { label: "Cancel Anytime", icon: Timer },
  { label: "99.9% Uptime", icon: Shield },
  { label: "24/7 Support", icon: Headphones },
  { label: "Bank-Level Security", icon: Lock }
];

export default function GetStartedPage() {
  const [, setLocation] = useLocation();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>("professional");
  
  useAnalytics({ enableInternal: true, organizationId: 4, enableGA: true, enableFB: true });

  const { data: apiPlans, isLoading: isLoadingPlans } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/pricing-plans'],
  });

  const subscriptionPlans = apiPlans && apiPlans.length > 0 
    ? apiPlans.map(plan => ({
        ...plan,
        features: generateFeaturesFromPlan(plan),
        isPopular: plan.isPopular || plan.slug === "professional"
      }))
    : fallbackPlans;

  function generateFeaturesFromPlan(plan: SubscriptionPlan): string[] {
    const features: string[] = [];
    
    if (plan.maxUsers === -1 || plan.maxUsers === null) {
      features.push("Unlimited team members");
    } else {
      features.push(`Up to ${plan.maxUsers} team members`);
    }
    
    if (plan.maxProjects === -1 || plan.maxProjects === null) {
      features.push("Unlimited projects");
    } else {
      features.push(`${plan.maxProjects} active projects`);
    }
    
    if (plan.maxStorageGB) {
      features.push(`${plan.maxStorageGB}GB cloud storage`);
    }
    
    if (plan.slug === "starter") {
      features.push("Basic analytics & reports", "Email support", "Mobile app access", "Customer management", "Invoice creation");
    } else if (plan.slug === "professional") {
      features.push("Advanced analytics & custom reports", "Priority email & chat support", "Full API access", "Custom branding", "All integrations (Stripe, Twilio, etc.)", "GPS tracking & route optimization", "Automated notifications", "Quote & proposal builder");
    } else if (plan.slug === "enterprise") {
      features.push("Enterprise analytics & BI tools", "24/7 priority phone & chat support", "Full API access with higher limits", "White-label branding", "All integrations + custom", "Advanced GPS fleet tracking", "Dedicated account manager", "Custom deployment options", "SLA guarantee", "Training & onboarding");
    }
    
    return features;
  }

  const getPrice = (plan: any) => {
    const monthlyPrice = parseFloat(plan.price) || 0;
    if (billingCycle === "yearly") {
      return Math.round(monthlyPrice * 0.8);
    }
    return monthlyPrice;
  };

  const getSavings = (plan: any) => {
    const monthlyPrice = parseFloat(plan.price) || 0;
    const yearlyPrice = Math.round(monthlyPrice * 0.8);
    return (monthlyPrice - yearlyPrice) * 12;
  };

  const handleSelectPlan = (planSlug: string) => {
    setSelectedPlanSlug(planSlug);
    localStorage.setItem('selectedPlan', planSlug);
    localStorage.setItem('selectedBillingCycle', billingCycle);
  };

  const handleStartTrial = (planSlug: string) => {
    if (planSlug === "enterprise") {
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    handleSelectPlan(planSlug);
    setLocation("/demo-signup");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
      <PublicPageHeader />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-4 py-2" data-testid="badge-promo">
              <Gift className="h-4 w-4 mr-2 inline" />
              Limited Time: 30-Day Free Trial + 20% Off Annual Plans
            </Badge>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight" data-testid="text-hero-title">
              Start Managing Your Field Service Business
              <span className="text-blue-600"> Like a Pro</span>
            </h1>
            
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-3xl mx-auto" data-testid="text-hero-description">
              Join thousands of field service professionals who have streamlined their operations, 
              increased revenue, and delivered exceptional customer experiences with Pro Field Manager.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
                onClick={() => setLocation("/demo-signup")}
                data-testid="button-start-trial-hero"
              >
                <Rocket className="mr-2 h-5 w-5" />
                Start Free 30-Day Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="px-8 py-6 text-lg border-2"
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                data-testid="button-view-pricing"
              >
                View Pricing Plans
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-6">
              {trustBadges.slice(0, 4).map((badge, index) => (
                <div key={index} className="flex items-center gap-2 text-slate-600 dark:text-slate-400" data-testid={`badge-trust-${index}`}>
                  <badge.icon className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Sales Funnel Steps */}
      <section className="py-20 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4" data-testid="text-how-it-works-title">
              Get Started in 4 Simple Steps
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              From signup to scaling your business, we make it easy every step of the way
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {funnelSteps.map((step, index) => (
              <div key={index} className="relative" data-testid={`step-${step.step}`}>
                {index < funnelSteps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-blue-600 to-blue-300 -translate-x-1/2" />
                )}
                <Card className="text-center p-6 h-full hover:shadow-lg transition-shadow border-2 hover:border-blue-200 dark:hover:border-blue-800">
                  <div className="relative">
                    <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <step.icon className="h-8 w-8" />
                    </div>
                    <Badge className="absolute -top-2 -right-2 bg-blue-100 text-blue-700">
                      Step {step.step}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">{step.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{step.description}</p>
                </Card>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setLocation("/demo-signup")}
              data-testid="button-start-trial-steps"
            >
              <Play className="mr-2 h-5 w-5" />
              Start Your Journey Now
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4" data-testid="text-pricing-title">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
              Choose the plan that fits your business. All plans include a 30-day free trial.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg mb-8">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  billingCycle === "monthly" 
                    ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm" 
                    : "text-slate-600 dark:text-slate-400"
                }`}
                data-testid="button-billing-monthly"
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-6 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
                  billingCycle === "yearly" 
                    ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm" 
                    : "text-slate-600 dark:text-slate-400"
                }`}
                data-testid="button-billing-yearly"
              >
                Yearly
                <Badge className="bg-green-100 text-green-700 text-xs">Save 20%</Badge>
              </button>
            </div>
          </div>

          {isLoadingPlans ? (
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="relative overflow-hidden">
                  <CardHeader className="text-center pb-2">
                    <Skeleton className="h-8 w-32 mx-auto mb-2" />
                    <Skeleton className="h-4 w-48 mx-auto" />
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Skeleton className="h-12 w-24 mx-auto mb-4" />
                    <Skeleton className="h-10 w-full mb-6" />
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <Skeleton key={j} className="h-4 w-full" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
          <RadioGroup value={selectedPlanSlug} onValueChange={handleSelectPlan} className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {subscriptionPlans.map((plan, index) => {
              const isSelected = selectedPlanSlug === plan.slug;
              const isPopular = plan.isPopular || plan.slug === "professional";
              
              return (
              <Card 
                key={plan.slug}
                onClick={() => handleSelectPlan(plan.slug)}
                className={`relative overflow-hidden cursor-pointer transition-all ${
                  isSelected
                    ? "border-2 border-blue-600 shadow-xl ring-2 ring-blue-600 ring-offset-2" 
                    : isPopular 
                      ? "border-2 border-blue-400 shadow-lg" 
                      : "border hover:border-blue-200 dark:hover:border-blue-800"
                } ${isPopular ? "scale-105" : ""}`}
                data-testid={`card-plan-${plan.slug}`}
              >
                {isPopular && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 text-sm font-medium rounded-bl-lg">
                    Most Popular
                  </div>
                )}

                {isSelected && (
                  <div className="absolute top-0 left-0 bg-green-600 text-white px-4 py-1 text-sm font-medium rounded-br-lg flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Selected
                  </div>
                )}
                
                <CardHeader className="text-center pb-2 pt-8">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <RadioGroupItem 
                      value={plan.slug} 
                      id={`plan-${plan.slug}`}
                      className="h-5 w-5"
                      data-testid={`radio-plan-${plan.slug}`}
                    />
                    <Label htmlFor={`plan-${plan.slug}`} className="text-2xl font-bold text-slate-900 dark:text-white cursor-pointer">
                      {plan.name}
                    </Label>
                  </div>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4">
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-slate-900 dark:text-white">
                        ${getPrice(plan)}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">/month</span>
                    </div>
                    {billingCycle === "yearly" && (
                      <p className="text-sm text-green-600 mt-1">
                        Save ${getSavings(plan)}/year
                      </p>
                    )}
                    {billingCycle === "monthly" && (
                      <p className="text-sm text-slate-500 mt-1">
                        billed monthly
                      </p>
                    )}
                  </div>

                  <Button 
                    className={`w-full mb-6 ${
                      isSelected 
                        ? "bg-green-600 hover:bg-green-700" 
                        : isPopular 
                          ? "bg-blue-600 hover:bg-blue-700" 
                          : plan.slug === "enterprise" 
                            ? "bg-slate-800 hover:bg-slate-900 dark:bg-slate-600" 
                            : ""
                    }`}
                    variant={isSelected || isPopular || plan.slug === "enterprise" ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartTrial(plan.slug);
                    }}
                    data-testid={`button-select-${plan.slug}`}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Continue with {plan.name}
                      </>
                    ) : plan.slug === "enterprise" ? (
                      <>Contact Sales</>
                    ) : (
                      <>Start Free Trial</>
                    )}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <div className="space-y-3">
                    {(plan.features || []).map((feature: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </RadioGroup>
          )}

          {/* Enterprise CTA */}
          <div className="mt-12 text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Need a custom solution? Our Enterprise team can help.
            </p>
            <Button variant="outline" size="lg" asChild>
              <Link href="#contact" data-testid="link-contact-sales">
                <Phone className="mr-2 h-4 w-4" />
                Talk to Sales
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Social Proof - Testimonials */}
      <section className="py-20 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4" data-testid="text-testimonials-title">
              Trusted by Field Service Professionals
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              See what our customers have to say
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6" data-testid={`card-testimonial-${index}`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">{testimonial.name}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{testimonial.role}, {testimonial.company}</p>
                  </div>
                </div>
                <div className="flex gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-600 dark:text-slate-400 italic">"{testimonial.quote}"</p>
              </Card>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-16 grid md:grid-cols-4 gap-8 text-center">
            <div data-testid="stat-users">
              <div className="text-4xl font-bold text-blue-600 mb-2">10,000+</div>
              <div className="text-slate-600 dark:text-slate-400">Active Users</div>
            </div>
            <div data-testid="stat-jobs">
              <div className="text-4xl font-bold text-green-600 mb-2">500M+</div>
              <div className="text-slate-600 dark:text-slate-400">Jobs Completed</div>
            </div>
            <div data-testid="stat-uptime">
              <div className="text-4xl font-bold text-purple-600 mb-2">99.9%</div>
              <div className="text-slate-600 dark:text-slate-400">Uptime</div>
            </div>
            <div data-testid="stat-rating">
              <div className="text-4xl font-bold text-orange-600 mb-2">4.9/5</div>
              <div className="text-slate-600 dark:text-slate-400">Customer Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4" data-testid="text-faq-title">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Got questions? We've got answers.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`faq-${index}`}
                  className="bg-white dark:bg-slate-800 rounded-lg border px-6"
                  data-testid={`faq-item-${index}`}
                >
                  <AccordionTrigger className="text-left font-semibold text-slate-900 dark:text-white hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-600 dark:text-slate-400">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="contact" className="py-20 bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6" data-testid="text-final-cta-title">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of field service professionals who are saving time, reducing costs, 
            and growing their businesses with Pro Field Manager.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg"
              onClick={() => setLocation("/demo-signup")}
              data-testid="button-start-trial-final"
            >
              <Rocket className="mr-2 h-5 w-5" />
              Start Your Free Trial
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-6 text-lg"
              data-testid="button-schedule-demo"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Schedule a Demo
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-white/80">
            {trustBadges.map((badge, index) => (
              <div key={index} className="flex items-center gap-2">
                <badge.icon className="h-4 w-4" />
                <span className="text-sm">{badge.label}</span>
              </div>
            ))}
          </div>

          {/* Contact Options */}
          <div className="mt-12 flex flex-col sm:flex-row gap-8 justify-center items-center text-white">
            <a href="tel:1-800-PRO-FIELD" className="flex items-center gap-2 hover:text-blue-200 transition-colors" data-testid="link-phone">
              <Phone className="h-5 w-5" />
              <span>1-800-PRO-FIELD</span>
            </a>
            <a href="mailto:sales@profieldmanager.com" className="flex items-center gap-2 hover:text-blue-200 transition-colors" data-testid="link-email">
              <Mail className="h-5 w-5" />
              <span>sales@profieldmanager.com</span>
            </a>
            <div className="flex items-center gap-2" data-testid="text-chat">
              <MessageCircle className="h-5 w-5" />
              <span>Live Chat Available</span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Us Bar */}
      <ContactUsBar />

      {/* Footer */}
      <PublicPageFooter />
    </div>
  );
}
