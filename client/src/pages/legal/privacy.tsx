import { Link } from "wouter";
import { Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicPageFooter } from "@/components/PublicPageFooter";

export default function PrivacyPolicy() {
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
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-8">Privacy Policy</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
            Last updated: November 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">1. Introduction</h2>
            <p className="text-slate-600 dark:text-slate-300">
              Pro Field Manager ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our field service management platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">2. Information We Collect</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li>Account information (name, email, phone number, company name)</li>
              <li>Customer and project data you enter into the system</li>
              <li>GPS location data (when using tracking features)</li>
              <li>Payment information (processed securely through Stripe)</li>
              <li>Communications with us (support requests, feedback)</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">3. How We Use Your Information</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, investigate, and prevent fraudulent transactions and abuse</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">4. GPS and Location Data</h2>
            <p className="text-slate-600 dark:text-slate-300">
              Our Service includes GPS tracking features for field service management. Location data is collected only when the feature is enabled and is used to track technician locations, optimize routes, and provide accurate job-site arrival times. You can control location sharing through your device settings and our application settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              We may share your information with:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li>Service providers who perform services on our behalf</li>
              <li>Professional advisors (lawyers, accountants, auditors)</li>
              <li>Law enforcement when required by law</li>
              <li>Other parties in connection with a company transaction</li>
            </ul>
            <p className="text-slate-600 dark:text-slate-300 mt-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">6. Data Security</h2>
            <p className="text-slate-600 dark:text-slate-300">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and regular security assessments.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">7. Data Retention</h2>
            <p className="text-slate-600 dark:text-slate-300">
              We retain your information for as long as your account is active or as needed to provide you services. We will retain and use your information as necessary to comply with legal obligations, resolve disputes, and enforce our agreements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">8. Your Rights</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing</li>
              <li>Data portability</li>
              <li>Withdraw consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">9. Children's Privacy</h2>
            <p className="text-slate-600 dark:text-slate-300">
              Our Service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If we learn we have collected personal information from a child under 13, we will delete that information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">10. Changes to This Policy</h2>
            <p className="text-slate-600 dark:text-slate-300">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">11. Contact Us</h2>
            <p className="text-slate-600 dark:text-slate-300">
              If you have any questions about this Privacy Policy, please contact us at privacy@profieldmanager.com.
            </p>
          </section>
        </div>
      </main>

      <PublicPageFooter />
    </div>
  );
}
