import { Link } from "wouter";
import { Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicPageFooter } from "@/components/PublicPageFooter";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <header className="bg-slate-900 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <Link href="/website-preview" className="flex items-center space-x-2">
              <Building2 className="h-8 w-8" />
              <span className="text-xl font-bold">Pro Field Manager</span>
            </Link>
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-slate-900" asChild>
              <Link href="/website-preview">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-8">Terms of Service</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
            Last updated: November 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-600 dark:text-slate-300">
              By accessing and using Pro Field Manager ("the Service"), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by these terms, please do not use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">2. Description of Service</h2>
            <p className="text-slate-600 dark:text-slate-300">
              Pro Field Manager is a field service management platform that provides tools for invoicing, project management, GPS tracking, team coordination, and customer communication. The Service is provided "as is" and we reserve the right to modify, suspend, or discontinue any aspect of the Service at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">3. User Accounts</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              To use certain features of the Service, you must register for an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">4. Subscription and Payment</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Pro Field Manager offers subscription-based services. By subscribing, you agree to:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li>Pay all fees associated with your selected plan</li>
              <li>Provide valid payment information</li>
              <li>Allow automatic renewal unless cancelled before the renewal date</li>
              <li>Accept that fees are non-refundable except as required by law</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">5. Acceptable Use</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on the rights of others</li>
              <li>Transmit harmful, offensive, or illegal content</li>
              <li>Attempt to gain unauthorized access to the Service or other accounts</li>
              <li>Interfere with or disrupt the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">6. Data and Privacy</h2>
            <p className="text-slate-600 dark:text-slate-300">
              Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to the collection and use of your information as described in our Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">7. Intellectual Property</h2>
            <p className="text-slate-600 dark:text-slate-300">
              The Service and its original content, features, and functionality are owned by Pro Field Manager and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">8. Limitation of Liability</h2>
            <p className="text-slate-600 dark:text-slate-300">
              In no event shall Pro Field Manager be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">9. Termination</h2>
            <p className="text-slate-600 dark:text-slate-300">
              We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">10. Changes to Terms</h2>
            <p className="text-slate-600 dark:text-slate-300">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">11. Contact Us</h2>
            <p className="text-slate-600 dark:text-slate-300">
              If you have any questions about these Terms, please contact us at support@profieldmanager.com.
            </p>
          </section>
        </div>
      </main>

      <PublicPageFooter />
    </div>
  );
}
