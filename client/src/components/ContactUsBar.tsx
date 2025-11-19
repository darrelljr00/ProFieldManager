import { Phone, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface LayoutSettings {
  contactBarTitle?: string;
  contactBarSubtitle?: string;
  contactBarPhone?: string;
  contactBarEmail?: string;
  contactBarButtonText?: string;
  contactBarButtonLink?: string;
  contactBarBackgroundColor?: string;
}

export function ContactUsBar() {
  const organizationSlug = "pro-field-manager";
  
  const { data: settings } = useQuery<LayoutSettings>({
    queryKey: ['/api/public/website-layout/settings', organizationSlug],
  });

  const title = settings?.contactBarTitle || "Ready to Transform Your Field Service Business?";
  const subtitle = settings?.contactBarSubtitle || "Get started with a free demo or speak with our team";
  const phone = settings?.contactBarPhone || "(555) 123-4567";
  const email = settings?.contactBarEmail || "sales@profieldmanager.com";
  const buttonText = settings?.contactBarButtonText || "Start Free Demo";
  const buttonLink = settings?.contactBarButtonLink || "/demo-signup";
  const bgColor = settings?.contactBarBackgroundColor || "#2563eb";

  const phoneHref = `tel:${phone.replace(/[^0-9+]/g, '')}`;
  const emailHref = `mailto:${email}`;

  return (
    <div 
      className="text-white py-6" 
      style={{ background: `linear-gradient(to right, ${bgColor}, ${bgColor}dd)` }}
      data-testid="contact-us-bar"
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold mb-1" data-testid="text-contact-title">
              {title}
            </h3>
            <p className="opacity-90" data-testid="text-contact-subtitle">
              {subtitle}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 justify-center">
            <a href={phoneHref} className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity" data-testid="link-phone">
              <Phone className="h-4 w-4" />
              <span className="font-semibold">{phone}</span>
            </a>
            
            <a href={emailHref} className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity" data-testid="link-email">
              <Mail className="h-4 w-4" />
              <span className="font-semibold">{email}</span>
            </a>
            
            <Button 
              variant="secondary" 
              className="bg-white text-blue-600 hover:bg-blue-50"
              asChild
              data-testid="button-contact-demo"
            >
              <Link href={buttonLink}>
                <MessageSquare className="h-4 w-4 mr-2" />
                {buttonText}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
