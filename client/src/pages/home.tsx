import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Wrench, Zap, Droplets, Hammer, HardHat, Truck, 
  Star, MapPin, Phone, Clock, CheckCircle, 
  ArrowRight, ChevronLeft, ChevronRight,
  Shield, Award, Users, Calendar, Building2, Menu
} from "lucide-react";
import { Link } from "wouter";

const heroSlides = [
  {
    id: 1,
    title: "Professional Field Service Management",
    subtitle: "Streamline Your Construction & Service Operations",
    description: "Complete business management solution for contractors, electricians, plumbers, and service professionals. Manage jobs, teams, invoicing, and customer relationships all in one place.",
    image: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    cta: "Start Your Free Trial",
    badge: "30-Day Free Trial"
  },
  {
    id: 2,
    title: "Real-Time Job Tracking & GPS",
    subtitle: "Know Where Your Team Is, Always",
    description: "Track your field crews in real-time, monitor job progress, and optimize routes. GPS tracking, time clock, and location-based job management keep your business running efficiently.",
    image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    cta: "See GPS Features",
    badge: "Live Tracking"
  },
  {
    id: 3,
    title: "Smart Invoicing & Payments",
    subtitle: "Get Paid Faster With Automated Billing",
    description: "Create professional invoices instantly from completed jobs. Automated billing, payment tracking, and customer portal ensure faster payments and better cash flow.",
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2126&q=80",
    cta: "Try Invoicing",
    badge: "Fast Payments"
  },
  {
    id: 4,
    title: "Construction Project Management",
    subtitle: "Coordinate Your Crews & Equipment",
    description: "Manage construction projects from start to finish. Coordinate multiple work crews, track equipment, monitor safety compliance, and keep projects on schedule and budget.",
    image: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    cta: "Manage Projects",
    badge: "Project Control"
  },
  {
    id: 5,
    title: "HVAC Service Excellence",
    subtitle: "Optimize Your HVAC Operations",
    description: "Streamline HVAC service calls, maintenance schedules, and emergency repairs. Track technician locations, manage equipment inventory, and deliver exceptional customer service.",
    image: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80",
    cta: "Optimize HVAC",
    badge: "Service Ready"
  },
  {
    id: 6,
    title: "Centralized Call Management",
    subtitle: "Professional Customer Communication",
    description: "Manage all customer communications from one central hub. Route calls efficiently, track customer interactions, and ensure no service request goes unanswered with our integrated call management system.",
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80",
    cta: "Manage Calls",
    badge: "Always Connected"
  }
];

const serviceTypes = [
  { icon: Wrench, name: "General Contractors", color: "text-blue-600 dark:text-blue-400" },
  { icon: Zap, name: "Electricians", color: "text-yellow-600 dark:text-yellow-400" },
  { icon: Droplets, name: "Plumbers", color: "text-blue-500 dark:text-blue-300" },
  { icon: HardHat, name: "Construction", color: "text-orange-600 dark:text-orange-400" },
  { icon: Hammer, name: "Handyman Services", color: "text-red-600 dark:text-red-400" },
  { icon: Truck, name: "HVAC Technicians", color: "text-green-600 dark:text-green-400" }
];

const features = [
  {
    icon: Calendar,
    title: "Job Scheduling",
    description: "Drag-and-drop scheduling with real-time updates and crew assignments"
  },
  {
    icon: MapPin,
    title: "Route Optimization",
    description: "Smart routing to minimize travel time and fuel costs between job sites"
  },
  {
    icon: Users,
    title: "Team Management", 
    description: "Track employee performance, hours, and location with mobile apps"
  },
  {
    icon: CheckCircle,
    title: "Quality Control",
    description: "Digital forms, photo documentation, and customer sign-offs"
  }
];

const testimonials = [
  {
    name: "Mike Rodriguez",
    company: "Rodriguez Electrical",
    role: "Owner",
    content: "Pro Field Manager transformed our business. We're now 40% more efficient with job scheduling and our cash flow improved dramatically.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
  },
  {
    name: "Sarah Johnson", 
    company: "Johnson Plumbing Co.",
    role: "Operations Manager",
    content: "The GPS tracking and mobile apps are game-changers. Our customers love the real-time updates and professional invoices.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b169?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
  },
  {
    name: "Tom Wilson",
    company: "Wilson Construction",
    role: "Project Manager", 
    content: "We've saved 15+ hours per week on administrative tasks. The automated invoicing alone pays for the software.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80"
  }
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCustomDomain, setIsCustomDomain] = useState(false);

  // Detect if accessing via custom domain
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsCustomDomain(window.location.hostname === 'profieldmanager.com');
    }
  }, []);

  // Auto-advance slides
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  // Close mobile menu when clicking outside or on escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuOpen && !(event.target as Element)?.closest('header')) {
        setMobileMenuOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [mobileMenuOpen]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Navigation Header */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-white" />
            <span className="text-xl font-bold text-white">Pro Field Manager</span>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-white hover:text-blue-200 transition-colors">Home</Link>
            <Link href="/features" className="text-white hover:text-blue-200 transition-colors">Features</Link>
            <Link href="/features#pricing" className="text-white hover:text-blue-200 transition-colors">Pricing</Link>
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-slate-900">
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
                href="/" 
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
                  <Button variant="outline" className="w-full border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white">
                    Login
                  </Button>
                </Link>
                <Link href="/features#signup" onClick={() => setMobileMenuOpen(false)}>
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
              <strong>Welcome to Pro Field Manager!</strong> You're accessing via profieldmanager.com. 
              <Link href="/login" className="ml-2 underline font-semibold hover:text-blue-200">
                Click here to log in
              </Link>
              {" "}or{" "}
              <Link href="/features#signup" className="underline font-semibold hover:text-blue-200">
                start your free trial
              </Link>
              {" • "}
              <Link href="/auth-debug" className="underline text-blue-100 hover:text-white">
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
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url(${slide.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
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
                      ? 'opacity-100 translate-x-0' 
                      : 'opacity-0 translate-x-4'
                  }`}
                  style={{ display: index === currentSlide ? 'block' : 'none' }}
                >
                  <Badge variant="secondary" className="mb-4 bg-blue-600 hover:bg-blue-700 text-white">
                    {slide.badge}
                  </Badge>
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
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg">
                      <Link href="/features#signup" className="flex items-center">
                        {slide.cta}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-slate-900 px-8 py-4 text-lg">
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
                  ? 'bg-white scale-125'
                  : 'bg-white/50 hover:bg-white/75'
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
              Whether you're running a one-person operation or managing multiple crews, 
              Pro Field Manager scales with your business needs.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {serviceTypes.map((service, index) => {
              const Icon = service.icon;
              return (
                <div
                  key={index}
                  className="text-center group hover:scale-105 transition-transform duration-200"
                >
                  <div className="bg-white dark:bg-slate-700 rounded-2xl p-6 shadow-lg group-hover:shadow-xl transition-shadow">
                    <Icon className={`h-12 w-12 mx-auto mb-4 ${service.color}`} />
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-tight">
                      {service.name}
                    </h3>
                  </div>
                </div>
              );
            })}
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
              Streamline operations, increase productivity, and deliver exceptional service 
              with our comprehensive field service management platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
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
              See how businesses like yours are transforming their operations with Pro Field Manager
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
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
            Join thousands of service professionals who trust Pro Field Manager to run their operations. 
            Start your free trial today - no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-lg">
              Start Free 30-Day Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-slate-900 px-12 py-4 text-lg">
              <Phone className="mr-2 h-5 w-5" />
              Schedule Demo
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
    </div>
  );
}