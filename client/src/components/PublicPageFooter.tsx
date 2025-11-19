import { Building2, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import { Link } from "wouter";

export function PublicPageFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-white" data-testid="public-page-footer">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div data-testid="footer-section-company">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-8 w-8 text-blue-500" />
              <span className="text-xl font-bold">Pro Field Manager</span>
            </div>
            <p className="text-gray-400 mb-4">
              Professional field service management software designed to streamline your operations and grow your business.
            </p>
            <div className="flex gap-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors" aria-label="Facebook" data-testid="link-social-facebook">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors" aria-label="Twitter" data-testid="link-social-twitter">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors" aria-label="LinkedIn" data-testid="link-social-linkedin">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500 transition-colors" aria-label="Instagram" data-testid="link-social-instagram">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div data-testid="footer-section-links">
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors" data-testid="footer-link-home">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/features" className="text-gray-400 hover:text-white transition-colors" data-testid="footer-link-features">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/features#pricing" className="text-gray-400 hover:text-white transition-colors" data-testid="footer-link-pricing">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/demo-signup" className="text-gray-400 hover:text-white transition-colors" data-testid="footer-link-demo">
                  Free Demo
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-gray-400 hover:text-white transition-colors" data-testid="footer-link-login">
                  Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div data-testid="footer-section-services">
            <h3 className="text-lg font-semibold mb-4">Services</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/services/general-contractors" className="text-gray-400 hover:text-white transition-colors" data-testid="footer-link-contractors">
                  General Contractors
                </Link>
              </li>
              <li>
                <Link href="/services/electricians" className="text-gray-400 hover:text-white transition-colors" data-testid="footer-link-electricians">
                  Electricians
                </Link>
              </li>
              <li>
                <Link href="/services/plumbers" className="text-gray-400 hover:text-white transition-colors" data-testid="footer-link-plumbers">
                  Plumbers
                </Link>
              </li>
              <li>
                <Link href="/services/hvac" className="text-gray-400 hover:text-white transition-colors" data-testid="footer-link-hvac">
                  HVAC Technicians
                </Link>
              </li>
              <li>
                <Link href="/services/construction" className="text-gray-400 hover:text-white transition-colors" data-testid="footer-link-construction">
                  Construction
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div data-testid="footer-section-contact">
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400">
                  123 Business Ave<br />
                  Suite 100<br />
                  Austin, TX 78701
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <a href="tel:+1-555-123-4567" className="text-gray-400 hover:text-white transition-colors" data-testid="footer-link-phone">
                  (555) 123-4567
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <a href="mailto:sales@profieldmanager.com" className="text-gray-400 hover:text-white transition-colors" data-testid="footer-link-email">
                  sales@profieldmanager.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm" data-testid="text-copyright">
            © {currentYear} Pro Field Manager. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="/privacy" className="text-gray-400 hover:text-white transition-colors" data-testid="footer-link-privacy">
              Privacy Policy
            </a>
            <a href="/terms" className="text-gray-400 hover:text-white transition-colors" data-testid="footer-link-terms">
              Terms of Service
            </a>
            <a href="/cookies" className="text-gray-400 hover:text-white transition-colors" data-testid="footer-link-cookies">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
