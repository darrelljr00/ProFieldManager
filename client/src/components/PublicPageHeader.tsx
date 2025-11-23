import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Building2, Menu } from "lucide-react";
import { Link } from "wouter";

export function PublicPageHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCustomDomain, setIsCustomDomain] = useState(false);

  // Detect if accessing via custom domain
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsCustomDomain(window.location.hostname === "profieldmanager.com");
    }
  }, []);

  // Close mobile menu when clicking outside or on escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuOpen && !(event.target as Element)?.closest("header")) {
        setMobileMenuOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [mobileMenuOpen]);

  return (
    <>
      {/* Navigation Header */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-white" />
            <span className="text-xl font-bold text-white">
              Pro Field Manager
            </span>
          </Link>
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-white hover:text-blue-200 transition-colors"
              data-testid="nav-link-home"
            >
              Home
            </Link>
            <Link
              href="/features"
              className="text-white hover:text-blue-200 transition-colors"
              data-testid="nav-link-features"
            >
              Features
            </Link>
            <Link
              href="/features#pricing"
              className="text-white hover:text-blue-200 transition-colors"
              data-testid="nav-link-pricing"
            >
              Pricing
            </Link>
            <Button
              variant="outline"
              className="border-white text-black hover:bg-white hover:text-slate-900"
              asChild
              data-testid="button-nav-login"
            >
              <Link href="/login">Login</Link>
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              asChild
              data-testid="button-nav-get-started"
            >
              <Link href="/features#signup">Get Started</Link>
            </Button>
          </nav>
          <div className="md:hidden">
            <Button
              variant="ghost"
              className="text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-200 z-40">
            <div className="container mx-auto px-4 py-6 space-y-4">
              <Link
                href="/"
                className="block text-slate-900 hover:text-blue-600 transition-colors text-lg font-medium"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="mobile-nav-link-home"
              >
                Home
              </Link>
              <Link
                href="/features"
                className="block text-slate-900 hover:text-blue-600 transition-colors text-lg font-medium"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="mobile-nav-link-features"
              >
                Features
              </Link>
              <Link
                href="/features#pricing"
                className="block text-slate-900 hover:text-blue-600 transition-colors text-lg font-medium"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="mobile-nav-link-pricing"
              >
                Pricing
              </Link>
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="outline"
                    className="w-full border-slate-900 text-black"
                    data-testid="mobile-button-login"
                  >
                    Login
                  </Button>
                </Link>
                <Link
                  href="/features#signup"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="mobile-button-get-started"
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Custom Domain Authentication Banner */}
      {isCustomDomain && (
        <div className="relative z-30 bg-blue-600 text-white py-3 px-4 mt-20">
          <div className="container mx-auto text-center">
            <p className="text-sm md:text-base">
              <strong>Welcome to Pro Field Manager!</strong> You're accessing
              via profieldmanager.com.
              <Link
                href="/login"
                className="ml-2 underline font-semibold hover:text-blue-200"
              >
                Click here to log in
              </Link>{" "}
              or{" "}
              <Link
                href="/features#signup"
                className="underline font-semibold hover:text-blue-200"
              >
                start your free trial
              </Link>
              {" • "}
              <Link
                href="/auth-debug"
                className="underline text-blue-100 hover:text-white"
              >
                Need help? Check connection status
              </Link>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
