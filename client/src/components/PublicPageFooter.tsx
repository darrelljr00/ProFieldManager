import { useState } from "react";
import { Building2, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Youtube, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SalesLiveChatWidget } from "./SalesLiveChatWidget";

interface LayoutSettings {
  footerCompanyName?: string;
  footerCompanyDescription?: string;
  footerAddress?: string;
  footerPhone?: string;
  footerEmail?: string;
  footerCopyright?: string;
}

interface SocialLink {
  id: number;
  platform: string;
  label: string;
  url: string;
  isActive: boolean;
}

interface FooterLink {
  id: number;
  label: string;
  href: string;
  isExternal: boolean;
  isActive: boolean;
}

interface FooterSection {
  id: number;
  key: string;
  title: string;
  isActive: boolean;
  links?: FooterLink[];
}

const socialIcons: Record<string, any> = {
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
};

export function PublicPageFooter() {
  const currentYear = new Date().getFullYear();
  const organizationSlug = "pro-field-manager";
  const [isChatOpen, setIsChatOpen] = useState(false);

  const { data: settings } = useQuery<LayoutSettings>({
    queryKey: ['/api/public/website-layout/settings', organizationSlug],
  });

  const { data: socialLinks = [] } = useQuery<SocialLink[]>({
    queryKey: ['/api/public/website-layout/social-links', organizationSlug],
  });

  const { data: footerSections = [] } = useQuery<FooterSection[]>({
    queryKey: ['/api/public/website-layout/footer-sections', organizationSlug],
  });

  const companyName = settings?.footerCompanyName || "Pro Field Manager";
  const companyDescription = settings?.footerCompanyDescription || "Professional field service management software designed to streamline your operations and grow your business.";
  const address = settings?.footerAddress || "123 Business Ave, Suite 100, Austin, TX 78701";
  const phone = settings?.footerPhone || "(555) 123-4567";
  const email = settings?.footerEmail || "sales@profieldmanager.com";
  const copyright = settings?.footerCopyright || "Pro Field Manager. All rights reserved.";

  const activeSocialLinks = socialLinks.filter(link => link.isActive);
  const activeSections = footerSections.filter(section => section.isActive);

  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-white" data-testid="public-page-footer">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div data-testid="footer-section-company">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-8 w-8 text-blue-500" />
              <span className="text-xl font-bold">{companyName}</span>
            </div>
            <p className="text-gray-400 mb-4">
              {companyDescription}
            </p>
            {activeSocialLinks.length > 0 && (
              <div className="flex gap-4">
                {activeSocialLinks.map((link) => {
                  const Icon = socialIcons[link.platform.toLowerCase()] || Building2;
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-blue-500 transition-colors"
                      aria-label={link.label}
                      data-testid={`link-social-${link.platform.toLowerCase()}`}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dynamic Footer Sections */}
          {activeSections.map((section) => {
            const activeLinks = (section.links || []).filter(link => link.isActive);
            if (activeLinks.length === 0) return null;
            
            return (
              <div key={section.id} data-testid={`footer-section-${section.key}`}>
                <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
                <ul className="space-y-2">
                  {activeLinks.map((link) => (
                    <li key={link.id}>
                      {link.isExternal ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-white transition-colors"
                          data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-gray-400 hover:text-white transition-colors"
                          data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Contact Info */}
          <div data-testid="footer-section-contact">
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              {address && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-400" style={{ whiteSpace: 'pre-line' }}>
                    {address}
                  </span>
                </li>
              )}
              {phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <a href={`tel:${phone.replace(/[^0-9+]/g, '')}`} className="text-gray-400 hover:text-white transition-colors" data-testid="footer-link-phone">
                    {phone}
                  </a>
                </li>
              )}
              {email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <a href={`mailto:${email}`} className="text-gray-400 hover:text-white transition-colors" data-testid="footer-link-email">
                    {email}
                  </a>
                </li>
              )}
              <li className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                  data-testid="button-open-sales-chat"
                >
                  Live Chat with Sales
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Sales Live Chat Widget */}
        <SalesLiveChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm" data-testid="text-copyright">
            © {currentYear} {copyright}
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
