const BASE_URL = "https://profieldmanager.com";
const DEFAULT_OG_IMAGE = "https://profieldmanager.com/og-image.png";

export interface PageSEO {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl?: string;
  ogImage?: string;
  structuredData?: Record<string, unknown>;
}

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Pro Field Manager",
  "url": BASE_URL,
  "logo": `${BASE_URL}/logo.png`,
  "description": "Professional field service management software for contractors, technicians, and service businesses.",
  "sameAs": [
    "https://facebook.com/profieldmanager",
    "https://twitter.com/profieldmanager",
    "https://linkedin.com/company/profieldmanager"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-800-PRO-FIELD",
    "contactType": "customer service",
    "availableLanguage": "English"
  }
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Pro Field Manager",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web, iOS, Android",
  "offers": {
    "@type": "AggregateOffer",
    "lowPrice": "49",
    "highPrice": "199",
    "priceCurrency": "USD",
    "offerCount": "3"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "2847",
    "bestRating": "5",
    "worstRating": "1"
  }
};

export const seoConfig: Record<string, PageSEO> = {
  home: {
    title: "Pro Field Manager | Field Service Management Software",
    description: "Streamline field service operations with Pro Field Manager. GPS tracking, scheduling, invoicing, and team management in one platform. Start free trial.",
    keywords: "field service management software, field service CRM, contractor management software, technician scheduling, GPS fleet tracking, service business software, job scheduling software",
    canonicalUrl: BASE_URL,
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      "@context": "https://schema.org",
      "@graph": [organizationSchema, softwareSchema]
    }
  },
  
  features: {
    title: "Features | GPS, Scheduling & Invoicing | Pro Field Manager",
    description: "Pro Field Manager features: GPS tracking, scheduling, automated invoicing, mobile apps, and team management tools for field service businesses.",
    keywords: "GPS fleet tracking software, technician scheduling software, automated invoicing, field service mobile app, team management, route optimization, time tracking software",
    canonicalUrl: `${BASE_URL}/features`,
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Pro Field Manager Features",
      "description": "Complete field service management features including GPS tracking, scheduling, invoicing, and mobile apps.",
      "mainEntity": {
        "@type": "ItemList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "GPS Fleet Tracking", "description": "Real-time location tracking with route history" },
          { "@type": "ListItem", "position": 2, "name": "Smart Scheduling", "description": "Drag-and-drop job scheduling with crew assignments" },
          { "@type": "ListItem", "position": 3, "name": "Automated Invoicing", "description": "Generate and send professional invoices instantly" },
          { "@type": "ListItem", "position": 4, "name": "Mobile Apps", "description": "Native iOS and Android apps for field technicians" },
          { "@type": "ListItem", "position": 5, "name": "Customer Portal", "description": "Self-service portal for customer approvals and payments" }
        ]
      }
    }
  },
  
  getStarted: {
    title: "Pricing & Plans | Pro Field Manager Free Trial",
    description: "Pro Field Manager plans: Starter $49/mo, Professional $99/mo, Enterprise $199/mo. 14-day free trial, no credit card required.",
    keywords: "field service software pricing, contractor software free trial, field service management plans, service business software cost, Pro Field Manager pricing",
    canonicalUrl: `${BASE_URL}/get-started`,
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Pro Field Manager",
      "description": "Professional field service management software",
      "brand": { "@type": "Brand", "name": "Pro Field Manager" },
      "offers": [
        {
          "@type": "Offer",
          "name": "Starter Plan",
          "price": "49",
          "priceCurrency": "USD",
          "priceValidUntil": "2025-12-31",
          "availability": "https://schema.org/InStock"
        },
        {
          "@type": "Offer",
          "name": "Professional Plan",
          "price": "99",
          "priceCurrency": "USD",
          "priceValidUntil": "2025-12-31",
          "availability": "https://schema.org/InStock"
        },
        {
          "@type": "Offer",
          "name": "Enterprise Plan",
          "price": "199",
          "priceCurrency": "USD",
          "priceValidUntil": "2025-12-31",
          "availability": "https://schema.org/InStock"
        }
      ]
    }
  },
  
  demoSignup: {
    title: "Book a Demo | See Pro Field Manager in Action",
    description: "Schedule a personalized demo of Pro Field Manager. See how our field service software can transform your business operations. Free 30-minute walkthrough.",
    keywords: "field service software demo, contractor software demonstration, Pro Field Manager demo, service management walkthrough",
    canonicalUrl: `${BASE_URL}/demo-signup`,
    ogImage: DEFAULT_OG_IMAGE
  },

  hvac: {
    title: "HVAC Field Service Software | Pro Field Manager",
    description: "HVAC software for heating and cooling contractors. Dispatch technicians, track equipment, manage schedules, and invoice customers.",
    keywords: "HVAC field service software, HVAC dispatch software, heating and cooling contractor software, HVAC technician scheduling, HVAC service management, HVAC CRM software",
    canonicalUrl: `${BASE_URL}/services/hvac`,
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Pro Field Manager for HVAC",
      "applicationCategory": "BusinessApplication",
      "description": "Specialized field service software for HVAC contractors and technicians"
    }
  },
  
  electricians: {
    title: "Electrical Contractor Software | Pro Field Manager",
    description: "Field service software for electrical contractors. Manage jobs, schedule electricians, track permits, create estimates, and invoice customers from one platform.",
    keywords: "electrical contractor software, electrician scheduling software, electrical field service management, electrician dispatch software, electrical business software, electrician CRM",
    canonicalUrl: `${BASE_URL}/services/electricians`,
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Pro Field Manager for Electricians",
      "applicationCategory": "BusinessApplication",
      "description": "Field service management software designed for electrical contractors"
    }
  },
  
  plumbers: {
    title: "Plumbing Contractor Software | Pro Field Manager",
    description: "Plumbing field service software for drain cleaning, pipe repair, and plumbing contractors. Schedule jobs, dispatch plumbers, and manage customer relationships.",
    keywords: "plumbing contractor software, plumber scheduling software, plumbing dispatch software, plumbing field service management, plumber CRM software, plumbing business software",
    canonicalUrl: `${BASE_URL}/services/plumbers`,
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Pro Field Manager for Plumbers",
      "applicationCategory": "BusinessApplication",
      "description": "Field service management software for plumbing contractors"
    }
  },
  
  construction: {
    title: "Construction Management Software | Pro Field Manager",
    description: "Construction field service software for builders and contractors. Manage projects, track crews, schedule subcontractors, and handle billing all in one place.",
    keywords: "construction management software, contractor project management, construction scheduling software, builder management software, construction crew tracking, construction CRM",
    canonicalUrl: `${BASE_URL}/services/construction`,
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Pro Field Manager for Construction",
      "applicationCategory": "BusinessApplication",
      "description": "Project and field management software for construction contractors"
    }
  },
  
  generalContractors: {
    title: "General Contractor Software | Pro Field Manager",
    description: "All-in-one software for general contractors. Manage multiple projects, coordinate subcontractors, track budgets, schedule inspections, and invoice clients.",
    keywords: "general contractor software, GC management software, contractor scheduling software, subcontractor management, general contracting CRM, project management for contractors",
    canonicalUrl: `${BASE_URL}/services/general-contractors`,
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Pro Field Manager for General Contractors",
      "applicationCategory": "BusinessApplication",
      "description": "Comprehensive management software for general contractors"
    }
  },
  
  handyman: {
    title: "Handyman Service Software | Pro Field Manager",
    description: "Handyman business software for home repair professionals. Schedule jobs, send quotes, manage customers, and get paid faster with automated invoicing.",
    keywords: "handyman software, handyman business management, home repair scheduling software, handyman dispatch software, handyman CRM, home services software",
    canonicalUrl: `${BASE_URL}/services/handyman`,
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Pro Field Manager for Handyman Services",
      "applicationCategory": "BusinessApplication",
      "description": "Business management software for handyman and home repair services"
    }
  },
  
  pressureWashers: {
    title: "Pressure Washing Business Software | Pro Field Manager",
    description: "Software for pressure washing businesses. Schedule cleanings, route optimization, before/after photos, instant estimates, and professional invoicing.",
    keywords: "pressure washing software, power washing business software, pressure washing scheduling, exterior cleaning software, pressure wash CRM, cleaning contractor software",
    canonicalUrl: `${BASE_URL}/services/pressure-washers`,
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Pro Field Manager for Pressure Washing",
      "applicationCategory": "BusinessApplication",
      "description": "Business software for pressure washing and exterior cleaning services"
    }
  },
  
  windowWashers: {
    title: "Window Cleaning Business Software | Pro Field Manager",
    description: "Window washing business software for residential and commercial cleaners. Schedule recurring jobs, manage routes, track equipment, and invoice customers.",
    keywords: "window cleaning software, window washing business software, window cleaner scheduling, glass cleaning software, window washing CRM, cleaning service software",
    canonicalUrl: `${BASE_URL}/services/window-washers`,
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Pro Field Manager for Window Cleaning",
      "applicationCategory": "BusinessApplication",
      "description": "Business management software for window cleaning services"
    }
  },
  
  serviceTechs: {
    title: "Service Technician Software | Pro Field Manager",
    description: "Field service software for service technicians and repair professionals. Mobile-first design, GPS tracking, digital forms, and instant invoicing.",
    keywords: "service technician software, field tech software, repair technician management, service tech scheduling, technician dispatch software, field worker app",
    canonicalUrl: `${BASE_URL}/services/service-techs`,
    ogImage: DEFAULT_OG_IMAGE,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Pro Field Manager for Service Technicians",
      "applicationCategory": "BusinessApplication",
      "description": "Mobile-first field service software for service technicians"
    }
  }
};

export function getSEOForPage(pageKey: string): PageSEO {
  return seoConfig[pageKey] || seoConfig.home;
}

export function getIndustryPageSEO(industry: string): PageSEO {
  const keyMap: Record<string, string> = {
    'hvac': 'hvac',
    'electricians': 'electricians',
    'plumbers': 'plumbers',
    'construction': 'construction',
    'general-contractors': 'generalContractors',
    'handyman': 'handyman',
    'pressure-washers': 'pressureWashers',
    'window-washers': 'windowWashers',
    'service-techs': 'serviceTechs'
  };
  
  return seoConfig[keyMap[industry]] || seoConfig.home;
}
