import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Phone, Wrench, Calendar, DollarSign, Users, MapPin } from "lucide-react";
import { Link } from "wouter";
import { SEOHead } from "@/components/seo-head";
import { PublicPageHeader } from "@/components/PublicPageHeader";
import { ContactUsBar } from "@/components/ContactUsBar";
import { PublicPageFooter } from "@/components/PublicPageFooter";

export default function GeneralContractorsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PublicPageHeader />
      <SEOHead 
        title="General Contractors Software - Pro Field Manager"
        description="Streamline construction projects with Pro Field Manager. Manage crews, track costs, schedule jobs, and deliver exceptional results with our comprehensive platform for general contractors."
        ogTitle="Field Service Management for General Contractors"
        ogDescription="Professional software for general contractors to manage projects, crews, invoicing, and customer communication all in one powerful platform."
      />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white py-20 pt-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Wrench className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6">
              Field Service Management for General Contractors
            </h1>
            <p className="text-xl text-blue-100 dark:text-blue-200 mb-8">
              Streamline your construction projects, manage crews efficiently, and deliver exceptional results with our comprehensive platform built specifically for general contractors.
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
              Everything You Need to Manage Construction Projects
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              From project scheduling to crew management, invoicing to customer communication - all in one powerful platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card data-testid="card-project-scheduling">
              <CardContent className="p-6">
                <Calendar className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Project Scheduling</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Drag-and-drop calendar with crew assignments, material tracking, and automated reminders for milestones.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-crew-management">
              <CardContent className="p-6">
                <Users className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Crew Management</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Track crew locations, hours worked, and productivity with GPS tracking and mobile time clock integration.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-job-costing">
              <CardContent className="p-6">
                <DollarSign className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Job Costing</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Real-time labor and material cost tracking to ensure projects stay profitable and within budget.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-professional-invoicing">
              <CardContent className="p-6">
                <CheckCircle className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Professional Invoicing</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Generate detailed invoices with progress billing, customizable templates, and automated payment reminders.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-route-optimization">
              <CardContent className="p-6">
                <MapPin className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Route Optimization</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Smart routing between job sites to reduce travel time, fuel costs, and improve daily efficiency.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-mobile-apps">
              <CardContent className="p-6">
                <Phone className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Mobile Apps</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Field crews can access schedules, capture photos, get customer signatures, and update job status on-site.
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
              Why General Contractors Choose Pro Field Manager
            </h2>
            <div className="space-y-6">
              {[
                "Reduce administrative time by 40% with automated scheduling and invoicing",
                "Improve crew productivity with real-time job updates and GPS tracking",
                "Get paid faster with professional invoices and online payment options",
                "Track project profitability with detailed cost breakdowns and reports",
                "Enhance customer satisfaction with real-time updates and professional communication",
                "Scale your business without adding administrative overhead"
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
            Ready to Streamline Your Construction Business?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Join hundreds of general contractors using Pro Field Manager to manage projects more efficiently and grow their business.
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
