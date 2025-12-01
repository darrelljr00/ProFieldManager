import type { Express } from "express";

const SITE_URL = process.env.SITE_URL || 'https://profieldmanager.com';

const publicRoutes = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/features', priority: 0.9, changefreq: 'monthly' },
  { path: '/get-started', priority: 0.9, changefreq: 'monthly' },
  { path: '/demo-signup', priority: 0.8, changefreq: 'monthly' },
  { path: '/services/hvac', priority: 0.8, changefreq: 'monthly' },
  { path: '/services/electricians', priority: 0.8, changefreq: 'monthly' },
  { path: '/services/plumbers', priority: 0.8, changefreq: 'monthly' },
  { path: '/services/construction', priority: 0.8, changefreq: 'monthly' },
  { path: '/services/general-contractors', priority: 0.8, changefreq: 'monthly' },
  { path: '/services/handyman', priority: 0.8, changefreq: 'monthly' },
  { path: '/services/pressure-washers', priority: 0.8, changefreq: 'monthly' },
  { path: '/services/window-washers', priority: 0.8, changefreq: 'monthly' },
  { path: '/services/service-techs', priority: 0.8, changefreq: 'monthly' },
];

function generateSitemap(): string {
  const lastmod = new Date().toISOString().split('T')[0];
  
  const urls = publicRoutes.map(route => `
  <url>
    <loc>${SITE_URL}${route.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">${urls}
</urlset>`;
}

function generateRobotsTxt(): string {
  return `# Pro Field Manager Robots.txt
User-agent: *
Allow: /
Allow: /features
Allow: /get-started
Allow: /demo-signup
Allow: /services/

# Disallow private/admin areas
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /settings/

# Sitemap
Sitemap: ${SITE_URL}/sitemap.xml

# Crawl-delay for polite crawling
Crawl-delay: 1
`;
}

export function registerSEORoutes(app: Express): void {
  app.get('/sitemap.xml', (_req, res) => {
    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(generateSitemap());
  });

  app.get('/robots.txt', (_req, res) => {
    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(generateRobotsTxt());
  });

  console.log('✅ SEO routes registered (sitemap.xml, robots.txt)');
}
