import { Phone, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function ContactUsBar() {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white py-6" data-testid="contact-us-bar">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold mb-1" data-testid="text-contact-title">
              Ready to Transform Your Field Service Business?
            </h3>
            <p className="text-blue-100" data-testid="text-contact-subtitle">
              Get started with a free demo or speak with our team
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 justify-center">
            <a href="tel:+1-555-123-4567" className="flex items-center gap-2 text-white hover:text-blue-100 transition-colors" data-testid="link-phone">
              <Phone className="h-4 w-4" />
              <span className="font-semibold">(555) 123-4567</span>
            </a>
            
            <a href="mailto:sales@profieldmanager.com" className="flex items-center gap-2 text-white hover:text-blue-100 transition-colors" data-testid="link-email">
              <Mail className="h-4 w-4" />
              <span className="font-semibold">sales@profieldmanager.com</span>
            </a>
            
            <Button 
              variant="secondary" 
              className="bg-white text-blue-600 hover:bg-blue-50"
              asChild
              data-testid="button-contact-demo"
            >
              <Link href="/demo-signup">
                <MessageSquare className="h-4 w-4 mr-2" />
                Start Free Demo
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
