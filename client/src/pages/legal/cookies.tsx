import { Link } from "wouter";
import { Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicPageFooter } from "@/components/PublicPageFooter";

export default function CookiePolicy() {
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
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-8">Cookie Policy</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
            Last updated: November 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">1. What Are Cookies</h2>
            <p className="text-slate-600 dark:text-slate-300">
              Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide information to the owners of the site.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">2. How We Use Cookies</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Pro Field Manager uses cookies for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for the website to function properly, including authentication and security</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our website</li>
              <li><strong>Marketing Cookies:</strong> Used to track visitors across websites for advertising purposes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">3. Types of Cookies We Use</h2>
            
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Session Cookies</h3>
              <p className="text-slate-600 dark:text-slate-300">
                These are temporary cookies that expire when you close your browser. They are essential for the website to function and keep you logged in during your session.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Persistent Cookies</h3>
              <p className="text-slate-600 dark:text-slate-300">
                These cookies remain on your device for a set period of time. They help us remember your preferences and improve your experience on subsequent visits.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Third-Party Cookies</h3>
              <p className="text-slate-600 dark:text-slate-300">
                We use third-party services like Google Analytics and Facebook Pixel that may set their own cookies to help us analyze website traffic and marketing effectiveness.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">4. Specific Cookies We Use</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-slate-200 dark:border-slate-700">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-slate-900 dark:text-white">Cookie Name</th>
                    <th className="px-4 py-2 text-left text-slate-900 dark:text-white">Purpose</th>
                    <th className="px-4 py-2 text-left text-slate-900 dark:text-white">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600 dark:text-slate-300">
                  <tr className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-4 py-2">auth_token</td>
                    <td className="px-4 py-2">User authentication</td>
                    <td className="px-4 py-2">Session</td>
                  </tr>
                  <tr className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-4 py-2">_ga</td>
                    <td className="px-4 py-2">Google Analytics tracking</td>
                    <td className="px-4 py-2">2 years</td>
                  </tr>
                  <tr className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-4 py-2">_fbp</td>
                    <td className="px-4 py-2">Facebook Pixel tracking</td>
                    <td className="px-4 py-2">3 months</td>
                  </tr>
                  <tr className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-4 py-2">preferences</td>
                    <td className="px-4 py-2">User preferences</td>
                    <td className="px-4 py-2">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">5. Managing Cookies</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              You can control and manage cookies in various ways:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li><strong>Browser Settings:</strong> Most browsers allow you to refuse or accept cookies, delete existing cookies, and set preferences for certain websites</li>
              <li><strong>Opt-Out Links:</strong> You can opt out of Google Analytics by installing the Google Analytics Opt-out Browser Add-on</li>
              <li><strong>Do Not Track:</strong> Some browsers have a "Do Not Track" feature that signals websites not to track you</li>
            </ul>
            <p className="text-slate-600 dark:text-slate-300 mt-4">
              Please note that disabling certain cookies may affect the functionality of our website.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">6. Updates to This Policy</h2>
            <p className="text-slate-600 dark:text-slate-300">
              We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our data practices. We encourage you to review this page periodically for the latest information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">7. Contact Us</h2>
            <p className="text-slate-600 dark:text-slate-300">
              If you have any questions about our use of cookies, please contact us at privacy@profieldmanager.com.
            </p>
          </section>
        </div>
      </main>

      <PublicPageFooter />
    </div>
  );
}
