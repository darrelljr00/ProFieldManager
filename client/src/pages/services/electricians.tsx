import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Phone, Zap, Calendar, DollarSign, Users, MapPin } from "lucide-react";
import { Link } from "wouter";

export default function ElectriciansPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-yellow-600 to-yellow-700 dark:from-yellow-800 dark:to-yellow-900 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Zap className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6">
              Field Service Management for Electricians
            </h1>
            <p className="text-xl text-yellow-100 mb-8">
              Power up your electrical business with tools designed for service calls, installations, and maintenance work. Manage jobs, track crews, and get paid faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-yellow-600 hover:bg-yellow-50 px-8 py-6 text-lg" asChild>
                <Link href="/demo-signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg" asChild>
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
              Built Specifically for Electrical Contractors
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              From emergency service calls to large installations, manage every aspect of your electrical business efficiently.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card data-testid="card-service-dispatch">
              <CardContent className="p-6">
                <Calendar className="h-12 w-12 text-yellow-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Smart Dispatch</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Assign emergency calls and scheduled work efficiently based on technician location, skills, and availability.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-gps-tracking">
              <CardContent className="p-6">
                <MapPin className="h-12 w-12 text-yellow-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">GPS Tracking</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Track technician locations in real-time, optimize routes, and provide accurate arrival time updates to customers.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-digital-forms">
              <CardContent className="p-6">
                <CheckCircle className="h-12 w-12 text-yellow-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Digital Forms</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Safety inspections, code compliance forms, and customer sign-offs captured digitally on mobile devices.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-parts-inventory">
              <CardContent className="p-6">
                <DollarSign className="h-12 w-12 text-yellow-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Parts & Inventory</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Track materials used on each job, manage inventory levels, and automatically add parts to invoices.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-time-tracking">
              <CardContent className="p-6">
                <Users className="h-12 w-12 text-yellow-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Time Tracking</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Mobile time clock with GPS verification ensures accurate labor costs and payroll processing.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-instant-quotes">
              <CardContent className="p-6">
                <Phone className="h-12 w-12 text-yellow-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Instant Quotes</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Create professional quotes on-site with customizable templates and send them via email or text instantly.
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
              Why Electricians Trust Pro Field Manager
            </h2>
            <div className="space-y-6">
              {[
                "Respond to emergency calls faster with smart dispatch and GPS routing",
                "Reduce no-shows with automated appointment reminders via SMS and email",
                "Complete more jobs per day with optimized scheduling and route planning",
                "Get paid immediately with mobile payment processing and digital invoices",
                "Ensure safety compliance with digital inspection forms and photo documentation",
                "Track profitability per job with detailed labor and material cost tracking"
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
      <section className="py-20 bg-yellow-600 dark:bg-yellow-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Electrify Your Business Operations?
          </h2>
          <p className="text-xl text-yellow-100 mb-8 max-w-3xl mx-auto">
            Join electrical contractors across the country using Pro Field Manager to streamline operations and grow revenue.
          </p>
          <Button size="lg" className="bg-white text-yellow-600 hover:bg-yellow-50 px-12 py-6 text-lg" asChild data-testid="button-start-trial">
            <Link href="/demo-signup">
              Start Free 30-Day Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-6 text-yellow-200">No credit card required • Setup in minutes • Cancel anytime</p>
        </div>
      </section>
    </div>
  );
}
