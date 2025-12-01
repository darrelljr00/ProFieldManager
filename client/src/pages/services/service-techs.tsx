import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Phone, Settings, Calendar, DollarSign, Users, MapPin } from "lucide-react";
import { Link } from "wouter";
import { SEOHead } from "@/components/seo-head";
import { PublicPageHeader } from "@/components/PublicPageHeader";
import { ContactUsBar } from "@/components/ContactUsBar";
import { PublicPageFooter } from "@/components/PublicPageFooter";
import { useAnalytics } from "@/hooks/use-analytics";
import { getIndustryPageSEO } from "@/lib/seo-config";

export default function ServiceTechsPage() {
  useAnalytics({ enableInternal: true, organizationId: 4, enableGA: true, enableFB: true });
  const seo = getIndustryPageSEO('service-techs');
  
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
      <section className="bg-gradient-to-br from-purple-600 to-purple-700 dark:from-purple-800 dark:to-purple-900 text-white py-20 pt-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Settings className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6">
              Field Service Management for Service Technicians
            </h1>
            <p className="text-xl text-purple-100 dark:text-purple-200 mb-8">
              Equip your service techs with powerful mobile tools to complete more jobs, deliver better service, and keep customers happy.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50 dark:bg-slate-100 dark:text-purple-700 dark:hover:bg-slate-200 px-8 py-6 text-lg" asChild data-testid="button-hero-start-trial">
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
              Everything Service Techs Need in the Field
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Mobile-first tools designed for technicians on the go. Access everything you need from your smartphone or tablet.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card data-testid="card-mobile-work-orders">
              <CardContent className="p-6">
                <Settings className="h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Mobile Work Orders</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Access job details, customer history, and service notes from your mobile device. Complete work orders on-site without paperwork.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-smart-dispatch">
              <CardContent className="p-6">
                <MapPin className="h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Smart Dispatch</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Get assigned jobs based on location, skills, and availability. GPS navigation to each site with real-time traffic updates.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-parts-inventory">
              <CardContent className="p-6">
                <CheckCircle className="h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Parts & Inventory</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Track truck stock, order parts from the field, and automatically update inventory when parts are used on jobs.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-time-tracking">
              <CardContent className="p-6">
                <Calendar className="h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Time Tracking</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Clock in/out on jobs with GPS verification. Automatically calculate labor costs and billable hours for accurate invoicing.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-digital-forms">
              <CardContent className="p-6">
                <Settings className="h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Digital Forms</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Complete safety checklists, service reports, and customer sign-offs digitally. Eliminate paper forms and manual data entry.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-customer-communication">
              <CardContent className="p-6">
                <Phone className="h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Customer Communication</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Send arrival notifications, share photos, and collect payments via text. Keep customers informed throughout the service.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-knowledge-base">
              <CardContent className="p-6">
                <Users className="h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Knowledge Base</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Access technical manuals, troubleshooting guides, and repair procedures from your mobile device. Never be stuck without answers.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-photo-documentation">
              <CardContent className="p-6">
                <CheckCircle className="h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Photo Documentation</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Capture before/after photos, document issues, and attach images to work orders. Build trust with visual proof of work completed.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-offline-mode">
              <CardContent className="p-6">
                <DollarSign className="h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Offline Mode</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Work in areas with poor connectivity. All data syncs automatically when you're back online. Never lose job information.
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
              Built for Technicians, Loved by Managers
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Complete More Jobs Daily
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Optimized routing and mobile tools help technicians finish jobs faster and take on more work each day. Increase revenue without adding staff.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Reduce Callbacks
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Access to service history, equipment manuals, and knowledge base ensures techs have the information needed to fix issues right the first time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Improve Customer Satisfaction
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Real-time updates, professional digital documentation, and on-site payment options create a seamless customer experience that earns 5-star reviews.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Simplify Payroll & Billing
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Automatic time tracking and job costing make payroll accurate and billing transparent. Know exactly how profitable each technician is.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-purple-600 dark:bg-purple-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Empower Your Service Technicians Today
          </h2>
          <p className="text-xl text-purple-100 dark:text-purple-200 mb-8 max-w-3xl mx-auto">
            Give your field techs the tools they need to work smarter, faster, and more efficiently. Start your free trial now.
          </p>
          <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50 dark:bg-slate-100 dark:text-purple-700 dark:hover:bg-slate-200 px-12 py-4 text-lg" asChild data-testid="button-cta-start-trial">
            <Link href="/demo-signup">
              Start Your Free 30-Day Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-6 text-purple-100 dark:text-purple-200">
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
