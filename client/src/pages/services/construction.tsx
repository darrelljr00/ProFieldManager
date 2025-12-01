import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Phone, HardHat, Calendar, DollarSign, Users, MapPin } from "lucide-react";
import { Link } from "wouter";
import { SEOHead } from "@/components/seo-head";
import { PublicPageHeader } from "@/components/PublicPageHeader";
import { ContactUsBar } from "@/components/ContactUsBar";
import { PublicPageFooter } from "@/components/PublicPageFooter";
import { useAnalytics } from "@/hooks/use-analytics";
import { getIndustryPageSEO } from "@/lib/seo-config";

export default function ConstructionPage() {
  useAnalytics({ enableInternal: true, organizationId: 4, enableGA: true, enableFB: true });
  const seo = getIndustryPageSEO('construction');
  
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
      <section className="bg-gradient-to-br from-orange-600 to-orange-700 dark:from-orange-800 dark:to-orange-900 text-white py-20 pt-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <HardHat className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6">
              Construction Project Management Software
            </h1>
            <p className="text-xl text-orange-100 dark:text-orange-200 mb-8">
              Build better with comprehensive tools for managing construction projects, coordinating crews, tracking costs, and ensuring projects stay on schedule and within budget.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 dark:bg-slate-100 dark:text-orange-700 dark:hover:bg-slate-200 px-8 py-6 text-lg" asChild data-testid="button-hero-start-trial">
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
              Complete Construction Management Platform
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              From residential builds to commercial projects, manage every phase with precision and efficiency.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card data-testid="card-project-tracking">
              <CardContent className="p-6">
                <Calendar className="h-12 w-12 text-orange-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Project Tracking</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Monitor multiple projects simultaneously with Gantt charts, milestone tracking, and real-time progress updates.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-subcontractor-management">
              <CardContent className="p-6">
                <Users className="h-12 w-12 text-orange-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Subcontractor Management</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Coordinate with subcontractors, track their work, manage payments, and ensure quality standards are met.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-cost-control">
              <CardContent className="p-6">
                <DollarSign className="h-12 w-12 text-orange-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Cost Control</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Track labor, materials, and equipment costs in real-time. Compare budgets vs. actuals to prevent cost overruns.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-safety-compliance">
              <CardContent className="p-6">
                <CheckCircle className="h-12 w-12 text-orange-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Safety & Compliance</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Digital safety forms, incident reporting, and compliance documentation to keep your job sites safe and compliant.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-equipment-tracking">
              <CardContent className="p-6">
                <MapPin className="h-12 w-12 text-orange-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Equipment Tracking</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Track equipment location, usage, maintenance schedules, and rental costs across multiple job sites.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-document-management">
              <CardContent className="p-6">
                <Phone className="h-12 w-12 text-orange-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Document Management</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Store blueprints, permits, change orders, and photos in the cloud. Access project documents from anywhere.
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
              Why Construction Companies Choose Pro Field Manager
            </h2>
            <div className="space-y-6">
              {[
                "Complete projects on time with visual schedules and automated task dependencies",
                "Reduce cost overruns by 25% with real-time budget tracking and alerts",
                "Improve communication between office, field crews, and subcontractors",
                "Eliminate paperwork with digital forms, signatures, and photo documentation",
                "Track profitability per project with detailed cost allocation and reporting",
                "Scale operations efficiently without adding administrative staff"
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
      <section className="py-20 bg-orange-600 dark:bg-orange-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Build Smarter, Not Harder
          </h2>
          <p className="text-xl text-orange-100 mb-8 max-w-3xl mx-auto">
            Join construction companies using Pro Field Manager to deliver projects on time, within budget, and to the highest quality standards.
          </p>
          <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 px-12 py-6 text-lg" asChild data-testid="button-start-trial">
            <Link href="/demo-signup">
              Start Free 30-Day Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-6 text-orange-200">No credit card required • Setup in minutes • Cancel anytime</p>
        </div>
      </section>

      {/* Contact Us Bar */}
      <ContactUsBar />

      {/* Footer */}
      <PublicPageFooter />
    </div>
  );
}
