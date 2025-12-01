import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Phone, Glasses, Calendar, DollarSign, Users, MapPin } from "lucide-react";
import { Link } from "wouter";
import { SEOHead } from "@/components/seo-head";
import { PublicPageHeader } from "@/components/PublicPageHeader";
import { ContactUsBar } from "@/components/ContactUsBar";
import { PublicPageFooter } from "@/components/PublicPageFooter";
import { useAnalytics } from "@/hooks/use-analytics";
import { getIndustryPageSEO } from "@/lib/seo-config";

export default function WindowWashersPage() {
  useAnalytics({ enableInternal: true, organizationId: 4, enableGA: true, enableFB: true });
  const seo = getIndustryPageSEO('window-washers');
  
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
      <section className="bg-gradient-to-br from-sky-600 to-sky-700 dark:from-sky-800 dark:to-sky-900 text-white py-20 pt-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Glasses className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6">
              Business Management for Window Washing Services
            </h1>
            <p className="text-xl text-sky-100 dark:text-sky-200 mb-8">
              Crystal clear operations for your window cleaning business. Manage recurring routes, commercial accounts, and residential services with ease.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-sky-600 hover:bg-sky-50 dark:bg-slate-100 dark:text-sky-700 dark:hover:bg-slate-200 px-8 py-6 text-lg" asChild data-testid="button-hero-start-trial">
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
              Built for Window Cleaning Professionals
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              From high-rise commercial buildings to residential homes, manage every window cleaning job efficiently.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card data-testid="card-recurring-routes">
              <CardContent className="p-6">
                <Calendar className="h-12 w-12 text-sky-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Recurring Routes</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Set up monthly, quarterly, or annual cleaning schedules. Automatically generate work orders and send reminders to customers.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-commercial-accounts">
              <CardContent className="p-6">
                <Users className="h-12 w-12 text-sky-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Commercial Accounts</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Manage multi-location commercial contracts. Track service history, special requirements, and billing cycles for each property.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-route-optimization">
              <CardContent className="p-6">
                <MapPin className="h-12 w-12 text-sky-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Route Optimization</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Plan efficient daily routes to maximize jobs and minimize drive time. Group nearby customers for back-to-back appointments.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-crew-assignments">
              <CardContent className="p-6">
                <Users className="h-12 w-12 text-sky-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Crew Assignments</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Assign teams to routes, track real-time locations with GPS, and monitor productivity across multiple crews.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-mobile-payments">
              <CardContent className="p-6">
                <DollarSign className="h-12 w-12 text-sky-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Mobile Payments</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Accept payments on-site via mobile app. Process credit cards, track cash payments, and send digital receipts instantly.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-service-history">
              <CardContent className="p-6">
                <CheckCircle className="h-12 w-12 text-sky-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Service History</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Track every cleaning with detailed notes, photos, and completion records. Build customer trust with documented service quality.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-slate-100 dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-12 text-center">
              Why Window Cleaners Choose Pro Field Manager
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-sky-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Automated Recurring Billing
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Set up automatic invoicing for regular customers. Never miss a billing cycle and maintain consistent cash flow.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-sky-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Weather Alerts
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Get real-time weather notifications for scheduled jobs. Automatically notify customers of rain delays and reschedule efficiently.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-sky-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Multi-Story Building Tools
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Track floor-by-floor progress on high-rise buildings. Manage safety checklists, equipment requirements, and crew certifications.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-sky-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Customer Self-Service Portal
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Let customers schedule cleanings, view service history, and manage their account online. Reduce administrative calls and improve satisfaction.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-sky-600 dark:bg-sky-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            See Your Window Cleaning Business More Clearly
          </h2>
          <p className="text-xl text-sky-100 dark:text-sky-200 mb-8 max-w-3xl mx-auto">
            Join window cleaning professionals who trust Pro Field Manager to organize routes, manage teams, and grow revenue.
          </p>
          <Button size="lg" className="bg-white text-sky-600 hover:bg-sky-50 dark:bg-slate-100 dark:text-sky-700 dark:hover:bg-slate-200 px-12 py-4 text-lg" asChild data-testid="button-cta-start-trial">
            <Link href="/demo-signup">
              Start Your Free 30-Day Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-6 text-sky-100 dark:text-sky-200">
            No credit card required • Full access to all features • Cancel anytime
          </p>
        </div>
      </section>

      {/* Contact Us Bar */}
      <ContactUsBar />

      {/* Footer */}
      <PublicPageFooter />
    </div>
  );
}
