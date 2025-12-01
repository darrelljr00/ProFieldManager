import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Phone, Hammer, Calendar, DollarSign, Users, MapPin } from "lucide-react";
import { Link } from "wouter";
import { SEOHead } from "@/components/seo-head";
import { PublicPageHeader } from "@/components/PublicPageHeader";
import { ContactUsBar } from "@/components/ContactUsBar";
import { PublicPageFooter } from "@/components/PublicPageFooter";
import { useAnalytics } from "@/hooks/use-analytics";
import { getIndustryPageSEO } from "@/lib/seo-config";

export default function HandymanPage() {
  useAnalytics({ enableInternal: true, organizationId: 4, enableGA: true, enableFB: true });
  const seo = getIndustryPageSEO('handyman');
  
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
      <section className="bg-gradient-to-br from-red-600 to-red-700 dark:from-red-800 dark:to-red-900 text-white py-20 pt-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Hammer className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6">
              Business Management for Handyman Services
            </h1>
            <p className="text-xl text-red-100 dark:text-red-200 mb-8">
              From small repairs to complete remodels, manage your handyman business efficiently with tools designed for versatile service professionals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-red-600 hover:bg-red-50 dark:bg-slate-100 dark:text-red-700 dark:hover:bg-slate-200 px-8 py-6 text-lg" asChild data-testid="button-hero-start-trial">
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
              Everything You Need to Run Your Handyman Business
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Handle diverse jobs efficiently with scheduling, invoicing, customer management, and mobile tools all in one platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card data-testid="card-flexible-scheduling">
              <CardContent className="p-6">
                <Calendar className="h-12 w-12 text-red-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Flexible Scheduling</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Manage multiple small jobs per day with visual calendar, drag-and-drop scheduling, and automated reminders.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-quick-quotes">
              <CardContent className="p-6">
                <DollarSign className="h-12 w-12 text-red-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Quick Quotes</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Create and send professional estimates instantly from your phone with customizable templates and pricing libraries.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-before-after-photos">
              <CardContent className="p-6">
                <Phone className="h-12 w-12 text-red-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Before/After Photos</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Document your work with photos, build trust with customers, and create a portfolio for marketing purposes.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-route-planning">
              <CardContent className="p-6">
                <MapPin className="h-12 w-12 text-red-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Route Planning</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Optimize your daily route to complete more jobs with less drive time and lower fuel costs.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-customer-database">
              <CardContent className="p-6">
                <Users className="h-12 w-12 text-red-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Customer Database</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Track customer history, preferences, and past jobs. Build relationships and encourage repeat business.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-mobile-payments">
              <CardContent className="p-6">
                <CheckCircle className="h-12 w-12 text-red-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Mobile Payments</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Get paid on the spot with mobile card readers, digital invoices, and online payment links.
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
              Why Handyman Professionals Love Pro Field Manager
            </h2>
            <div className="space-y-6">
              {[
                "Complete 2-3 more jobs per day with efficient scheduling and route optimization",
                "Get paid faster with professional invoices sent automatically after job completion",
                "Reduce no-shows by 60% with automated appointment reminders via SMS",
                "Build your reputation with before/after photos and customer reviews",
                "Track which services are most profitable and focus on high-margin work",
                "Spend less time on paperwork and more time doing what you love"
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
      <section className="py-20 bg-red-600 dark:bg-red-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Fix Your Business Workflow?
          </h2>
          <p className="text-xl text-red-100 mb-8 max-w-3xl mx-auto">
            Join handyman professionals using Pro Field Manager to streamline operations, complete more jobs, and grow their business.
          </p>
          <Button size="lg" className="bg-white text-red-600 hover:bg-red-50 px-12 py-6 text-lg" asChild data-testid="button-start-trial">
            <Link href="/demo-signup">
              Start Free 30-Day Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-6 text-red-200">No credit card required • Setup in minutes • Cancel anytime</p>
        </div>
      </section>

      {/* Contact Us Bar */}
      <ContactUsBar />

      {/* Footer */}
      <PublicPageFooter />
    </div>
  );
}
