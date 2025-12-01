import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  twitterCard?: "summary" | "summary_large_image";
  structuredData?: Record<string, unknown>;
  noIndex?: boolean;
}

export function SEOHead({ 
  title, 
  description, 
  keywords,
  canonicalUrl,
  ogTitle, 
  ogDescription, 
  ogImage,
  ogType = "website",
  twitterCard = "summary_large_image",
  structuredData,
  noIndex = false
}: SEOHeadProps) {
  useEffect(() => {
    document.title = title;

    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const removeMetaTag = (name: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      const meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (meta) meta.remove();
    };

    setMetaTag('description', description);

    if (keywords) {
      setMetaTag('keywords', keywords);
    }

    if (noIndex) {
      setMetaTag('robots', 'noindex, nofollow');
    } else {
      setMetaTag('robots', 'index, follow');
    }

    setMetaTag('og:title', ogTitle || title, true);
    setMetaTag('og:description', ogDescription || description, true);
    setMetaTag('og:type', ogType, true);
    
    if (ogImage) {
      setMetaTag('og:image', ogImage, true);
    }

    if (canonicalUrl) {
      setMetaTag('og:url', canonicalUrl, true);
      
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', canonicalUrl);
    }

    setMetaTag('twitter:card', twitterCard);
    setMetaTag('twitter:title', ogTitle || title);
    setMetaTag('twitter:description', ogDescription || description);
    if (ogImage) {
      setMetaTag('twitter:image', ogImage);
    }

    if (structuredData) {
      let scriptTag = document.querySelector('script[data-seo-structured-data]');
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.setAttribute('type', 'application/ld+json');
        scriptTag.setAttribute('data-seo-structured-data', 'true');
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(structuredData);
    }

    return () => {
      document.title = 'Pro Field Manager';
      const structuredDataScript = document.querySelector('script[data-seo-structured-data]');
      if (structuredDataScript) structuredDataScript.remove();
    };
  }, [title, description, keywords, canonicalUrl, ogTitle, ogDescription, ogImage, ogType, twitterCard, structuredData, noIndex]);

  return null;
}
