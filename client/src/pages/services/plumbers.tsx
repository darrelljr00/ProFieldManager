import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Phone, Droplets, Calendar, DollarSign, Users, MapPin } from "lucide-react";
import { Link } from "wouter";
import { SEOHead } from "@/components/seo-head";
import { PublicPageHeader } from "@/components/PublicPageHeader";
import { ContactUsBar } from "@/components/ContactUsBar";
import { PublicPageFooter } from "@/components/PublicPageFooter";
import { useAnalytics } from "@/hooks/use-analytics";
import { getIndustryPageSEO } from "@/lib/seo-config";

export default function PlumbersPage() {
  useAnalytics({ enableInternal: true, organizationId: 4, enableGA: true, enableFB: true });
  const seo = getIndustryPageSEO('plumbers');
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PublicPageHeader />
      <SEOHead 
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        canonicalUrl={seo.canonicalUrl}
        ogImage={seo.ogImage}
        structuredData={seo.structuredData}
      />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 text-white py-20 pt-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Droplets className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6">
              Field Service Management for Plumbers
            </h1>
            <p className="text-xl text-blue-100 dark:text-blue-200 mb-8">
              Handle emergency calls, scheduled maintenance, and installations seamlessly. Manage your plumbing business with tools built for field service professionals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 dark:bg-slate-100 dark:text-blue-700 dark:hover:bg-slate-200 px-8 py-6 text-lg" asChild data-testid="button-hero-start-trial">
                <Link href="/demo-signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 dark:border-slate-300 dark:hover:bg-slate-700 px-8 py-6 text-lg" asChild data-testid="button-hero-schedule-demo">
                <Link href="/demo-signup">
                  <Phone className="mr-2 h-5 w-5" />
                  Schedule Demo
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Plumbing Business Management Made Simple
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              From burst pipes to new installations, manage every plumbing job efficiently with our comprehensive platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card data-testid="card-emergency-dispatch">
              <CardContent className="p-6">
                <Calendar className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Emergency Dispatch</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Quickly assign urgent service calls to the nearest available plumber with real-time GPS tracking and smart routing.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-customer-history">
              <CardContent className="p-6">
                <Users className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Customer History</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Access complete service history, previous work orders, and customer preferences before arriving on-site.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-mobile-invoicing">
              <CardContent className="p-6">
                <DollarSign className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Mobile Invoicing</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Create and send professional invoices from your phone, collect payments on-site, and get paid faster.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-photo-documentation">
              <CardContent className="p-6">
                <Phone className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Photo Documentation</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Capture before/after photos, document issues, and share updates with customers instantly from mobile devices.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-maintenance-scheduling">
              <CardContent className="p-6">
                <CheckCircle className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Maintenance Scheduling</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Set up recurring service appointments for water heaters, backflow testing, and routine maintenance checks.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-route-optimization">
              <CardContent className="p-6">
                <MapPin className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Route Optimization</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Minimize drive time between jobs with intelligent routing that considers traffic, job priority, and technician location.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-8 text-center">
              Why Plumbers Choose Pro Field Manager
            </h2>
            <div className="space-y-6">
              {[
                "Respond to emergencies faster with GPS-based dispatch and mobile alerts",
                "Increase daily job capacity by 30% with optimized scheduling and routing",
                "Reduce no-shows with automated SMS/email appointment reminders",
                "Improve cash flow with mobile payments and instant digital invoicing",
                "Build customer trust with photo documentation and transparent pricing",
                "Track inventory and parts usage to prevent shortages and control costs"
              ].map((benefit, index) => (
                <div key={index} className="flex items-start gap-4" data-testid={`benefit-${index}`}>
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <p className="text-lg text-slate-700 dark:text-slate-300">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 dark:bg-blue-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Fix Your Business Operations?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Join plumbing professionals using Pro Field Manager to handle more jobs, improve service quality, and grow revenue.
          </p>
          <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-12 py-6 text-lg" asChild data-testid="button-start-trial">
            <Link href="/demo-signup">
              Start Free 30-Day Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-6 text-blue-200">No credit card required • Setup in minutes • Cancel anytime</p>
        </div>
      </section>

      {/* Contact Us Bar */}
      <ContactUsBar />

      {/* Footer */}
      <PublicPageFooter />
    </div>
  );
}
