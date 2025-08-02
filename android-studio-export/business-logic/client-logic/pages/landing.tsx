import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Check, Star, Building2, Users, Shield, Zap, 
  Smartphone, Calendar, MapPin, Camera, Clock, 
  FileText, BarChart, MessageSquare, CreditCard, 
  Settings, Globe, Lock, Database, Workflow, 
  Truck, Calculator, FileSpreadsheet, Bell,
  Cloud, Wrench, Target, TrendingUp, Award,
  Headphones, Palette, Cog, Share2, Mail
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { organizationSignupSchema, type OrganizationSignupData } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubscriptionPlanSelector } from "@/components/subscription-plan-selector";

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

          {/* Core Features Grid */}
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

          {/* Advanced SaaS Features Section */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 mb-16 shadow-lg">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Comprehensive Business Solutions
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Everything you need to run your field service business efficiently
              </p>
            </div>

            {/* Mobile & Field Operations */}
            <div className="mb-12">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-8 text-center">
                🚀 Mobile & Field Operations
              </h3>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="bg-cyan-100 dark:bg-cyan-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Smartphone className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Mobile App</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Native iOS & Android apps for field workers</p>
                </div>
                <div className="text-center">
                  <div className="bg-red-100 dark:bg-red-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <MapPin className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">GPS Tracking</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Real-time location tracking with addresses</p>
                </div>
                <div className="text-center">
                  <div className="bg-emerald-100 dark:bg-emerald-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Camera className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Photo Management</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Before/after photos with cloud storage</p>
                </div>
                <div className="text-center">
                  <div className="bg-indigo-100 dark:bg-indigo-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Clock className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Time Clock</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Digital time tracking with location verification</p>
                </div>
              </div>
            </div>

            {/* Business Intelligence */}
            <div className="mb-12">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-8 text-center">
                📊 Business Intelligence & Analytics
              </h3>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="bg-violet-100 dark:bg-violet-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <BarChart className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Advanced Reports</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Comprehensive analytics and KPI dashboards</p>
                </div>
                <div className="text-center">
                  <div className="bg-amber-100 dark:bg-amber-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Market Research</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Local demand analysis and competitor insights</p>
                </div>
                <div className="text-center">
                  <div className="bg-rose-100 dark:bg-rose-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Target className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Performance Metrics</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Employee efficiency and project profitability</p>
                </div>
                <div className="text-center">
                  <div className="bg-teal-100 dark:bg-teal-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <FileSpreadsheet className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Custom Reports</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Build custom reports with date filters</p>
                </div>
              </div>
            </div>

            {/* Communication & Automation */}
            <div className="mb-12">
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-8 text-center">
                💬 Communication & Automation
              </h3>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="bg-sky-100 dark:bg-sky-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Team Messaging</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Real-time internal communication system</p>
                </div>
                <div className="text-center">
                  <div className="bg-pink-100 dark:bg-pink-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Mail className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">SMS Integration</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Automated customer notifications via SMS</p>
                </div>
                <div className="text-center">
                  <div className="bg-lime-100 dark:bg-lime-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Bell className="h-6 w-6 text-lime-600 dark:text-lime-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Smart Notifications</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Customizable alerts with sound notifications</p>
                </div>
                <div className="text-center">
                  <div className="bg-cyan-100 dark:bg-cyan-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Workflow className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Task Automation</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Trigger-based task creation and workflows</p>
                </div>
              </div>
            </div>

            {/* Financial Management */}
            <div>
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-8 text-center">
                💳 Financial Management
              </h3>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="bg-green-100 dark:bg-green-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Payment Processing</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Integrated Stripe payments and subscriptions</p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Calculator className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Expense Tracking</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Receipt scanning and expense management</p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 dark:bg-purple-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Quote Management</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Professional quotes and proposals</p>
                </div>
                <div className="text-center">
                  <div className="bg-orange-100 dark:bg-orange-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Truck className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Vehicle Management</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Fleet tracking and maintenance schedules</p>
                </div>
              </div>
            </div>
          </div>

          {/* Enterprise Features */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 rounded-2xl p-8 mb-16 text-white">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Enterprise-Grade Features</h2>
              <p className="text-lg text-slate-300">
                Advanced capabilities for growing businesses
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-white/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Lock className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Security & Compliance</h3>
                <ul className="text-slate-300 space-y-2 text-left">
                  <li>• Multi-factor authentication</li>
                  <li>• Role-based access control</li>
                  <li>• Data encryption at rest</li>
                  <li>• Audit trails and logging</li>
                  <li>• GDPR compliance ready</li>
                </ul>
              </div>
              
              <div className="text-center">
                <div className="bg-white/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Cloud className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Cloud Infrastructure</h3>
                <ul className="text-slate-300 space-y-2 text-left">
                  <li>• 99.9% uptime guarantee</li>
                  <li>• Automatic backups</li>
                  <li>• Global CDN delivery</li>
                  <li>• Scalable cloud storage</li>
                  <li>• Disaster recovery</li>
                </ul>
              </div>
              
              <div className="text-center">
                <div className="bg-white/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Settings className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Customization & API</h3>
                <ul className="text-slate-300 space-y-2 text-left">
                  <li>• Custom branding options</li>
                  <li>• RESTful API access</li>
                  <li>• Webhook integrations</li>
                  <li>• Custom form builder</li>
                  <li>• White-label solutions</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Industry-Specific Features */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
              Built for Field Service Industries
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                    <Wrench className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">HVAC & Plumbing</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Service calls, maintenance schedules, parts inventory</p>
                </div>
              </Card>
              
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="bg-green-100 dark:bg-green-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                    <Globe className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Landscaping</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Route optimization, equipment tracking, seasonal planning</p>
                </div>
              </Card>
              
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="bg-purple-100 dark:bg-purple-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Electrical</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Safety inspections, compliance tracking, emergency dispatch</p>
                </div>
              </Card>
              
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="bg-orange-100 dark:bg-orange-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Cleaning Services</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Quality checks, supply management, client satisfaction</p>
                </div>
              </Card>
            </div>
          </div>

          {/* Integration & Support Section */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Integrations */}
            <Card className="p-8">
              <div className="text-center mb-6">
                <div className="bg-indigo-100 dark:bg-indigo-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Share2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Powerful Integrations
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Connect with your favorite business tools
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 dark:bg-green-900 rounded p-2">
                    <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">Payment Processing</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Stripe, Square, PayPal integration</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900 rounded p-2">
                    <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">Email & SMS</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Twilio, SendGrid, Mailchimp</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 dark:bg-purple-900 rounded p-2">
                    <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">Mapping & GPS</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Google Maps, route optimization</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 dark:bg-orange-900 rounded p-2">
                    <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">Document Management</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">DocuSign, cloud storage</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Support & Training */}
            <Card className="p-8">
              <div className="text-center mb-6">
                <div className="bg-emerald-100 dark:bg-emerald-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Headphones className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  World-Class Support
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  We're here to help you succeed
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900 rounded p-2">
                    <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">24/7 Live Chat</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Instant support when you need it</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 dark:bg-purple-900 rounded p-2">
                    <Globe className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">Knowledge Base</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Comprehensive guides and tutorials</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 dark:bg-green-900 rounded p-2">
                    <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">Free Training</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Onboarding and advanced workshops</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 dark:bg-orange-900 rounded p-2">
                    <Settings className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">Custom Setup</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">White-glove implementation service</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Customer Success Stories */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-8 mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Trusted by Growing Businesses
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                See how Pro Field Manager transforms field service operations
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-12 h-12 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">CleanPro Services</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Commercial Cleaning</div>
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  "Increased our efficiency by 40% and customer satisfaction scores went through the roof. 
                  The mobile app keeps our teams connected and the GPS tracking gives us complete visibility."
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">5.0 rating</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-100 dark:bg-green-900 rounded-full w-12 h-12 flex items-center justify-center">
                    <Wrench className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">Expert HVAC</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">HVAC Services</div>
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  "The automated invoicing and payment processing saved us 15 hours per week. 
                  Customer portal reduces support calls and the reporting helps us make better business decisions."
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">5.0 rating</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-purple-100 dark:bg-purple-900 rounded-full w-12 h-12 flex items-center justify-center">
                    <Globe className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">GreenScape Pro</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Landscaping</div>
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-4">
                  "Scaled from 5 to 25 employees seamlessly. The dispatch routing optimizes our daily routes 
                  and the vehicle maintenance tracking prevents costly breakdowns."
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">5.0 rating</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats & Achievements */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-12">
              Proven Results Across Industries
            </h2>
            <div className="grid md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">10,000+</div>
                <div className="text-slate-600 dark:text-slate-400">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">500M+</div>
                <div className="text-slate-600 dark:text-slate-400">Jobs Completed</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">99.9%</div>
                <div className="text-slate-600 dark:text-slate-400">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">4.9/5</div>
                <div className="text-slate-600 dark:text-slate-400">Customer Rating</div>
              </div>
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

          <div className="mb-12">
            <SubscriptionPlanSelector
              plans={subscriptionPlans.map((plan, index) => ({
                id: index + 1,
                name: plan.name,
                slug: plan.slug,
                price: plan.price,
                billingInterval: "month",
                description: plan.description,
                isPopular: plan.popular,
                features: plan.features,
                maxUsers: plan.name === "Starter" ? 5 : plan.name === "Professional" ? 25 : -1,
                maxProjects: plan.name === "Starter" ? 50 : -1,
                maxCustomers: plan.name === "Starter" ? 100 : plan.name === "Professional" ? 500 : -1,
                maxStorageGB: plan.name === "Starter" ? 10 : plan.name === "Professional" ? 50 : 500
              }))}
              selectedPlanId={subscriptionPlans.findIndex(p => p.slug === selectedPlan) + 1 + ""}
              onPlanSelect={(planId) => {
                const plan = subscriptionPlans[parseInt(planId) - 1];
                if (plan) setSelectedPlan(plan.slug);
              }}
              showFeatures={true}
              showRadioButtons={true}
            />
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