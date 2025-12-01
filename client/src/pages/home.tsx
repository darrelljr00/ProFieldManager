import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wrench,
  Zap,
  Droplets,
  Hammer,
  HardHat,
  Truck,
  Star,
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shield,
  Award,
  Users,
  Calendar,
  Building2,
  Menu,
  Sparkles,
  Glasses,
  Settings,
  FileText,
  CreditCard,
  Smartphone,
  BarChart,
  Camera,
  MessageSquare,
  Navigation,
  Bell,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHeroSlides } from "@/hooks/useHeroSlides";
import { ContactUsBar } from "@/components/ContactUsBar";
import { PublicPageFooter } from "@/components/PublicPageFooter";
import { useAnalytics } from "@/hooks/use-analytics";
import { SEOHead } from "@/components/seo-head";
import { getSEOForPage } from "@/lib/seo-config";

const serviceTypes = [
  {
    icon: Wrench,
    name: "General Contractors",
    color: "text-blue-600 dark:text-blue-400",
    path: "/services/general-contractors",
  },
  {
    icon: Zap,
    name: "Electricians",
    color: "text-yellow-600 dark:text-yellow-400",
    path: "/services/electricians",
  },
  {
    icon: Droplets,
    name: "Plumbers",
    color: "text-blue-500 dark:text-blue-300",
    path: "/services/plumbers",
  },
  {
    icon: HardHat,
    name: "Construction",
    color: "text-orange-600 dark:text-orange-400",
    path: "/services/construction",
  },
  {
    icon: Hammer,
    name: "Handyman Services",
    color: "text-red-600 dark:text-red-400",
    path: "/services/handyman",
  },
  {
    icon: Truck,
    name: "HVAC Technicians",
    color: "text-green-600 dark:text-green-400",
    path: "/services/hvac",
  },
  {
    icon: Sparkles,
    name: "Pressure Washers",
    color: "text-cyan-600 dark:text-cyan-400",
    path: "/services/pressure-washers",
  },
  {
    icon: Glasses,
    name: "Window Washers",
    color: "text-sky-600 dark:text-sky-400",
    path: "/services/window-washers",
  },
  {
    icon: Settings,
    name: "Service Techs",
    color: "text-purple-600 dark:text-purple-400",
    path: "/services/service-techs",
  },
];

const features = [
  {
    icon: Calendar,
    title: "Job Scheduling",
    description:
      "Drag-and-drop scheduling with real-time updates and crew assignments",
  },
  {
    icon: MapPin,
    title: "Route Optimization",
    description:
      "Smart routing to minimize travel time and fuel costs between job sites",
  },
  {
    icon: Users,
    title: "Team Management",
    description:
      "Track employee performance, hours, and location with mobile apps",
  },
  {
    icon: CheckCircle,
    title: "Quality Control",
    description: "Digital forms, photo documentation, and customer sign-offs",
  },
];

const featureTabs = [
  {
    id: "scheduling",
    label: "Scheduling",
    icon: Calendar,
    title: "Smart Scheduling & Dispatch",
    description: "Efficiently assign jobs to the right technicians at the right time with our intelligent scheduling system.",
    features: [
      { icon: Calendar, title: "Drag & Drop Scheduler", description: "Visual calendar with easy job assignment" },
      { icon: Users, title: "Crew Management", description: "Assign teams and track availability" },
      { icon: Clock, title: "Time Tracking", description: "Automatic time clock with GPS verification" },
      { icon: Bell, title: "Smart Notifications", description: "Real-time alerts for schedule changes" },
    ],
  },
  {
    id: "gps",
    label: "GPS Tracking",
    icon: Navigation,
    title: "Real-Time GPS & Fleet Tracking",
    description: "Know where your team is at all times with live GPS tracking and route optimization.",
    features: [
      { icon: MapPin, title: "Live Location", description: "Real-time technician and vehicle tracking" },
      { icon: Navigation, title: "Route History", description: "Complete trip logs and mileage reports" },
      { icon: Truck, title: "Fleet Management", description: "Vehicle maintenance and fuel tracking" },
      { icon: Clock, title: "ETA Notifications", description: "Automatic customer arrival alerts" },
    ],
  },
  {
    id: "invoicing",
    label: "Invoicing",
    icon: FileText,
    title: "Professional Invoicing & Payments",
    description: "Create and send professional invoices instantly, and get paid faster with online payments.",
    features: [
      { icon: FileText, title: "Quick Invoicing", description: "Generate invoices from completed jobs" },
      { icon: CreditCard, title: "Online Payments", description: "Accept credit cards and digital payments" },
      { icon: Camera, title: "Smart Capture", description: "OCR receipt scanning and expense tracking" },
      { icon: BarChart, title: "Financial Reports", description: "Revenue, profit/loss, and tax reports" },
    ],
  },
  {
    id: "quotes",
    label: "Quotes",
    icon: FileText,
    title: "Quotes & Estimates",
    description: "Create professional quotes quickly and convert them to jobs with a single click.",
    features: [
      { icon: FileText, title: "Quick Quotes", description: "Professional estimates in minutes" },
      { icon: CheckCircle, title: "Digital Signatures", description: "E-sign approvals from customers" },
      { icon: CreditCard, title: "Deposit Collection", description: "Collect upfront payments easily" },
      { icon: ArrowRight, title: "Quote to Invoice", description: "One-click conversion to jobs" },
    ],
  },
  {
    id: "mobile",
    label: "Mobile Apps",
    icon: Smartphone,
    title: "Powerful Mobile Applications",
    description: "Equip your field technicians with everything they need on their mobile devices.",
    features: [
      { icon: Smartphone, title: "iOS & Android Apps", description: "Native apps for all devices" },
      { icon: Camera, title: "Photo Documentation", description: "Before/after photos and signatures" },
      { icon: MessageSquare, title: "Team Chat", description: "Built-in messaging and file sharing" },
      { icon: CheckCircle, title: "Digital Forms", description: "Custom inspection and work orders" },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    title: "Customer Management & CRM",
    description: "Build lasting relationships with complete customer profiles and communication history.",
    features: [
      { icon: Users, title: "Customer Portal", description: "Self-service booking and payments" },
      { icon: MessageSquare, title: "SMS & Email", description: "Automated appointment reminders" },
      { icon: Star, title: "Review Requests", description: "Google review collection automation" },
      { icon: FileText, title: "Service History", description: "Complete job and communication logs" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Wrench,
    title: "Inventory & Parts Management",
    description: "Track parts, materials, and equipment across your warehouse and service vehicles.",
    features: [
      { icon: Wrench, title: "Parts Tracking", description: "Real-time inventory levels" },
      { icon: Truck, title: "Vehicle Stock", description: "Track parts in each truck" },
      { icon: Bell, title: "Low Stock Alerts", description: "Automatic reorder notifications" },
      { icon: BarChart, title: "Usage Reports", description: "Parts consumption analytics" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart,
    title: "Analytics & Reporting",
    description: "Make data-driven decisions with comprehensive business analytics and reporting.",
    features: [
      { icon: BarChart, title: "Dashboard Analytics", description: "Real-time business metrics" },
      { icon: Users, title: "Employee Performance", description: "Productivity and efficiency tracking" },
      { icon: CreditCard, title: "Revenue Reports", description: "Income, expenses, and profit analysis" },
      { icon: MapPin, title: "Job Analytics", description: "Completion rates and time tracking" },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Settings,
    title: "Seamless Integrations",
    description: "Connect with your favorite tools and services for a unified workflow.",
    features: [
      { icon: CreditCard, title: "Stripe & QuickBooks", description: "Payment and accounting sync" },
      { icon: MessageSquare, title: "Twilio SMS", description: "Automated text messaging" },
      { icon: MapPin, title: "Google Maps", description: "Routing and geocoding" },
      { icon: FileText, title: "DocuSign", description: "Electronic contract signing" },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    title: "Enterprise Security",
    description: "Keep your business data safe with enterprise-grade security and compliance.",
    features: [
      { icon: Shield, title: "Role-Based Access", description: "Control who sees what data" },
      { icon: CheckCircle, title: "Data Encryption", description: "256-bit SSL encryption" },
      { icon: Clock, title: "Auto Backups", description: "Daily automated backups" },
      { icon: Users, title: "Audit Logs", description: "Track all system activity" },
    ],
  },
];

const testimonials = [
  {
    name: "Mike Rodriguez",
    company: "Rodriguez Electrical",
    role: "Owner",
    content:
      "Pro Field Manager transformed our business. We're now 40% more efficient with job scheduling and our cash flow improved dramatically.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Sarah Johnson",
    company: "Johnson Plumbing Co.",
    role: "Operations Manager",
    content:
      "The GPS tracking and mobile apps are game-changers. Our customers love the real-time updates and professional invoices.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b169?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Tom Wilson",
    company: "Wilson Construction",
    role: "Project Manager",
    content:
      "We've saved 15+ hours per week on administrative tasks. The automated invoicing alone pays for the software.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80",
  },
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  const { data: heroSlides = [], isLoading } = useHeroSlides();
  
  // Track page views for analytics (using Pro Field Manager org ID for main site)
  useAnalytics({ 
    enableInternal: true, 
    organizationId: 4,
    enableGA: true,
    enableFB: true 
  });

  // Detect if accessing via custom domain
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsCustomDomain(window.location.hostname === "profieldmanager.com");
    }
  }, []);

  // Auto-advance slides
  useEffect(() => {
    if (!isAutoPlaying || !heroSlides.length) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isAutoPlaying, heroSlides.length]);

  // Close mobile menu when clicking outside or on escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuOpen && !(event.target as Element)?.closest("header")) {
        setMobileMenuOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [mobileMenuOpen]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + heroSlides.length) % heroSlides.length,
    );
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  const seo = getSEOForPage('home');

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <SEOHead
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        canonicalUrl={seo.canonicalUrl}
        ogImage={seo.ogImage}
        structuredData={seo.structuredData}
      />
      {/* Navigation Header */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-white" />
            <span className="text-xl font-bold text-white">
              Pro Field Manager
            </span>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/website-preview"
              className="text-white hover:text-blue-200 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/features"
              className="text-white hover:text-blue-200 transition-colors"
            >
              Features
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="text-white hover:text-blue-200 transition-colors flex items-center gap-1">
                Industries <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                {serviceTypes.map((service) => {
                  const Icon = service.icon;
                  return (
                    <DropdownMenuItem key={service.path} asChild>
                      <Link href={service.path} className="flex items-center gap-2 cursor-pointer">
                        <Icon className="h-4 w-4" />
                        {service.name}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              href="/features#pricing"
              className="text-white hover:text-blue-200 transition-colors"
            >
              Pricing
            </Link>
            <Button
              variant="outline"
              className="border-white text-black hover:bg-white hover:text-slate-900"
            >
              <Link href="/login">Login</Link>
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/features#signup">Get Started</Link>
            </Button>
          </nav>
          <div className="md:hidden">
            <Button
              variant="ghost"
              className="text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-200 z-40">
            <div className="container mx-auto px-4 py-6 space-y-4">
              <Link
                href="/website-preview"
                className="block text-slate-900 hover:text-blue-600 transition-colors text-lg font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/features"
                className="block text-slate-900 hover:text-blue-600 transition-colors text-lg font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="/features#pricing"
                className="block text-slate-900 hover:text-blue-600 transition-colors text-lg font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="outline"
                    className="w-full border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
                  >
                    Login
                  </Button>
                </Link>
                <Link
                  href="/features#signup"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Custom Domain Authentication Banner */}
      {isCustomDomain && (
        <div className="relative z-30 bg-blue-600 text-white py-3 px-4">
          <div className="container mx-auto text-center">
            <p className="text-sm md:text-base">
              <strong>Welcome to Pro Field Manager!</strong> You're accessing
              via profieldmanager.com.
              <Link
                href="/login"
                className="ml-2 underline font-semibold hover:text-blue-200"
              >
                Click here to log in
              </Link>{" "}
              or{" "}
              <Link
                href="/features#signup"
                className="underline font-semibold hover:text-blue-200"
              >
                start your free trial
              </Link>
              {" • "}
              <Link
                href="/auth-debug"
                className="underline text-blue-100 hover:text-white"
              >
                Need help? Check connection status
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Hero Slider Section */}
      <section className="relative h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-slate-900/40 z-10" />

        {/* Background Images */}
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
            style={{
              backgroundImage: `url(${slide.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ))}

        {/* Content */}
        <div className="relative z-20 h-full flex items-center">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl">
              {heroSlides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`transition-all duration-700 ${
                    index === currentSlide
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 translate-x-4"
                  }`}
                  style={{ display: index === currentSlide ? "block" : "none" }}
                >
                  {slide.subtitle && (
                    <Badge
                      variant="secondary"
                      className="mb-4 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {slide.subtitle.split(" ").slice(0, 3).join(" ")}
                    </Badge>
                  )}
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                    {slide.title}
                  </h1>
                  <h2 className="text-2xl md:text-3xl text-blue-200 mb-6 font-medium">
                    {slide.subtitle}
                  </h2>
                  <p className="text-xl text-slate-200 mb-8 max-w-2xl leading-relaxed">
                    {slide.description}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
                    >
                      <Link
                        href={slide.buttonLink || "/features#signup"}
                        className="flex items-center"
                      >
                        {slide.buttonText || "Get Started"}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white text-black hover:bg-white hover:text-slate-900 px-8 py-4 text-lg"
                    >
                      <Link href="/features">View All Features</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-30 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-all"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-30 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-all"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex space-x-3">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide
                  ? "bg-white scale-125"
                  : "bg-white/50 hover:bg-white/75"
              }`}
            />
          ))}
        </div>
      </section>

      {/* Service Types Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Built for Service Professionals
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Whether you're running a one-person operation or managing multiple
              crews, Pro Field Manager scales with your business needs.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {serviceTypes.map((service, index) => {
              const Icon = service.icon;
              return (
                <Link
                  key={index}
                  href={service.path}
                  className="text-center group hover:scale-105 transition-transform duration-200"
                  data-testid={`link-service-${service.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="bg-white dark:bg-slate-700 rounded-2xl p-6 shadow-lg group-hover:shadow-xl transition-shadow cursor-pointer">
                    <Icon
                      className={`h-12 w-12 mx-auto mb-4 ${service.color}`}
                    />
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-tight">
                      {service.name}
                    </h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Tabs Section */}
      <section className="py-20 bg-white dark:bg-slate-900" id="features">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              Powerful Features
            </Badge>
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              All the Tools You Need in One Platform
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              From scheduling to invoicing, GPS tracking to customer management - 
              Pro Field Manager has everything to run your field service business.
            </p>
          </div>

          <Tabs defaultValue="scheduling" className="w-full">
            <TabsList className="flex flex-wrap justify-center gap-2 mb-8 bg-transparent h-auto p-0">
              {featureTabs.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    data-testid={`tab-feature-${tab.id}`}
                  >
                    <TabIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {featureTabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-0">
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 md:p-12">
                  <div className="grid lg:grid-cols-2 gap-8 items-center">
                    <div>
                      <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                        {tab.title}
                      </h3>
                      <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
                        {tab.description}
                      </p>
                      <div className="flex gap-4">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                          <Link href="/features#signup" className="flex items-center">
                            Start Free Trial
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="outline" className="border-slate-300 dark:border-slate-600">
                          <Link href="/features">Learn More</Link>
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {tab.features.map((feature, idx) => {
                        const FeatureIcon = feature.icon;
                        return (
                          <Card key={idx} className="border-0 shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-slate-800">
                            <CardContent className="p-5">
                              <div className="bg-blue-100 dark:bg-blue-900 rounded-lg w-10 h-10 flex items-center justify-center mb-3">
                                <FeatureIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <h4 className="font-semibold text-slate-900 dark:text-white mb-1 text-sm">
                                {feature.title}
                              </h4>
                              <p className="text-slate-500 dark:text-slate-400 text-xs">
                                {feature.description}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="text-center mt-10">
            <Link href="/features">
              <Button variant="outline" size="lg" className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-slate-800">
                View All Features
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Everything You Need to Run Your Field Business
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Streamline operations, increase productivity, and deliver
              exceptional service with our comprehensive field service
              management platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200"
                >
                  <CardContent className="p-8 text-center">
                    <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                      <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-blue-600 dark:bg-blue-700 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">10,000+</div>
              <div className="text-blue-200 text-lg">Active Businesses</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">45%</div>
              <div className="text-blue-200 text-lg">Efficiency Increase</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">$2.8M</div>
              <div className="text-blue-200 text-lg">Revenue Processed</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">99.9%</div>
              <div className="text-blue-200 text-lg">Uptime Guarantee</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Trusted by Service Professionals
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              See how businesses like yours are transforming their operations
              with Pro Field Manager
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 text-yellow-400 fill-current"
                      />
                    ))}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover mr-4"
                    />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {testimonial.name}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {testimonial.role}, {testimonial.company}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-900 dark:bg-black text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Field Business?
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
            Join thousands of service professionals who trust Pro Field Manager
            to run their operations. Start your free trial today - no credit
            card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-lg"
              asChild
            >
              <Link href="/demo-signup">
                Start Free 30-Day Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-slate-900 px-12 py-4 text-lg"
              asChild
            >
              <Link href="/demo-signup">
                <Phone className="mr-2 h-5 w-5" />
                Schedule Demo
              </Link>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>30-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span>No setup fees</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Service Links Footer Section */}
      <section className="py-16 bg-slate-800 dark:bg-slate-950 border-t border-slate-700">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">
              Solutions for Every Service Professional
            </h2>
            <p className="text-slate-400 text-lg">
              Learn more about how Pro Field Manager helps your specific
              industry
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-6xl mx-auto">
            {serviceTypes.map((service, index) => {
              const Icon = service.icon;
              return (
                <Link
                  key={index}
                  href={service.path}
                  className="flex flex-col items-center p-4 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group"
                  data-testid={`footer-link-${service.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Icon
                    className={`h-8 w-8 mb-3 ${service.color} group-hover:scale-110 transition-transform`}
                  />
                  <span className="text-white text-sm font-medium text-center leading-tight">
                    {service.name}
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400 mt-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              );
            })}
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
