import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export function SEOHead({ title, description, ogTitle, ogDescription, ogImage }: SEOHeadProps) {
  useEffect(() => {
    // Set page title
    document.title = title;

    // Set or update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    // Set or update Open Graph title
    let ogTitleMeta = document.querySelector('meta[property="og:title"]');
    if (!ogTitleMeta) {
      ogTitleMeta = document.createElement('meta');
      ogTitleMeta.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitleMeta);
    }
    ogTitleMeta.setAttribute('content', ogTitle || title);

    // Set or update Open Graph description
    let ogDescriptionMeta = document.querySelector('meta[property="og:description"]');
    if (!ogDescriptionMeta) {
      ogDescriptionMeta = document.createElement('meta');
      ogDescriptionMeta.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescriptionMeta);
    }
    ogDescriptionMeta.setAttribute('content', ogDescription || description);

    // Set or update Open Graph image
    if (ogImage) {
      let ogImageMeta = document.querySelector('meta[property="og:image"]');
      if (!ogImageMeta) {
        ogImageMeta = document.createElement('meta');
        ogImageMeta.setAttribute('property', 'og:image');
        document.head.appendChild(ogImageMeta);
      }
      ogImageMeta.setAttribute('content', ogImage);
    }

    // Set og:type
    let ogTypeMeta = document.querySelector('meta[property="og:type"]');
    if (!ogTypeMeta) {
      ogTypeMeta = document.createElement('meta');
      ogTypeMeta.setAttribute('property', 'og:type');
      ogTypeMeta.setAttribute('content', 'website');
      document.head.appendChild(ogTypeMeta);
    }

    // Cleanup function
    return () => {
      document.title = 'Pro Field Manager';
    };
  }, [title, description, ogTitle, ogDescription, ogImage]);

  return null;
}
