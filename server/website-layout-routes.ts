import { Express } from 'express';
import { 
  insertWebsiteLayoutSettingsSchema,
  insertWebsiteSocialLinkSchema,
  insertWebsiteFooterSectionSchema,
  insertWebsiteFooterLinkSchema
} from '@shared/schema';
import type { IStorage } from './storage';

export function setupWebsiteLayoutRoutes(
  app: Express, 
  storage: IStorage,
  requireAuth: any,
  requireManagerOrAdmin: any,
  getAuthenticatedUser: any
) {
  
  // ========== PUBLIC READ-ONLY ENDPOINTS (Unauthenticated) ==========
  
  // Public: Get website layout settings by organization slug (sanitized for public access)
  app.get('/api/public/website-layout/settings/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const org = await storage.getOrganizationBySlug(slug);
      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      const settings = await storage.getWebsiteLayoutSettings(org.id);
      
      // Return only public-facing fields (sanitized DTO)
      const publicSettings = {
        contactBarTitle: settings?.contactBarTitle,
        contactBarSubtitle: settings?.contactBarSubtitle,
        contactBarPhone: settings?.contactBarPhone,
        contactBarEmail: settings?.contactBarEmail,
        contactBarButtonText: settings?.contactBarButtonText,
        contactBarButtonLink: settings?.contactBarButtonLink,
        contactBarBackgroundColor: settings?.contactBarBackgroundColor,
        footerCompanyName: settings?.footerCompanyName,
        footerCompanyDescription: settings?.footerCompanyDescription,
        footerAddress: settings?.footerAddress,
        footerPhone: settings?.footerPhone,
        footerEmail: settings?.footerEmail,
        footerCopyright: settings?.footerCopyright,
      };
      
      res.json(publicSettings);
    } catch (error: any) {
      console.error('Error fetching public website layout settings:', error);
      res.status(500).json({ message: 'Failed to fetch website layout settings' });
    }
  });

  // Public: Get social links by organization slug (sanitized for public access)
  app.get('/api/public/website-layout/social-links/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const org = await storage.getOrganizationBySlug(slug);
      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      const links = await storage.getWebsiteSocialLinks(org.id);
      
      // Return only public-facing fields and filter by isActive
      const publicLinks = links
        .filter(link => link.isActive)
        .map(link => ({
          id: link.id,
          platform: link.platform,
          label: link.label,
          url: link.url,
          isActive: link.isActive,
        }));
      
      res.json(publicLinks);
    } catch (error: any) {
      console.error('Error fetching public social links:', error);
      res.status(500).json({ message: 'Failed to fetch social links' });
    }
  });

  // Public: Get footer sections by organization slug (sanitized for public access)
  app.get('/api/public/website-layout/footer-sections/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const org = await storage.getOrganizationBySlug(slug);
      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      const sections = await storage.getWebsiteFooterSections(org.id);
      
      // Return only public-facing fields and filter by isActive
      const publicSections = sections
        .filter(section => section.isActive)
        .map(section => ({
          id: section.id,
          key: section.key,
          title: section.title,
          isActive: section.isActive,
          links: (section.links || [])
            .filter(link => link.isActive)
            .map(link => ({
              id: link.id,
              label: link.label,
              href: link.href,
              isExternal: link.isExternal,
              isActive: link.isActive,
            })),
        }));
      
      res.json(publicSections);
    } catch (error: any) {
      console.error('Error fetching public footer sections:', error);
      res.status(500).json({ message: 'Failed to fetch footer sections' });
    }
  });
  
  // ========== AUTHENTICATED ADMIN ENDPOINTS ==========
  
  // Get website layout settings for organization
  app.get('/api/website-layout/settings', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const settings = await storage.getWebsiteLayoutSettings(user.organizationId);
      res.json(settings);
    } catch (error: any) {
      console.error('Error fetching website layout settings:', error);
      res.status(500).json({ message: 'Failed to fetch website layout settings' });
    }
  });

  // Update website layout settings
  app.put('/api/website-layout/settings', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const validated = insertWebsiteLayoutSettingsSchema.parse({
        ...req.body,
        organizationId: user.organizationId
      });
      
      const updated = await storage.updateWebsiteLayoutSettings(user.organizationId, validated);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating website layout settings:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update website layout settings' });
    }
  });

  // Get social links for organization
  app.get('/api/website-layout/social-links', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const links = await storage.getWebsiteSocialLinks(user.organizationId);
      res.json(links);
    } catch (error: any) {
      console.error('Error fetching social links:', error);
      res.status(500).json({ message: 'Failed to fetch social links' });
    }
  });

  // Create new social link
  app.post('/api/website-layout/social-links', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const validated = insertWebsiteSocialLinkSchema.parse({
        ...req.body,
        organizationId: user.organizationId
      });
      
      const link = await storage.createWebsiteSocialLink(validated);
      res.json(link);
    } catch (error: any) {
      console.error('Error creating social link:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create social link' });
    }
  });

  // Update social link
  app.put('/api/website-layout/social-links/:id', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const id = parseInt(req.params.id);
      const validated = insertWebsiteSocialLinkSchema.parse({
        ...req.body,
        organizationId: user.organizationId
      });
      
      const updated = await storage.updateWebsiteSocialLink(id, validated);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating social link:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update social link' });
    }
  });

  // Delete social link
  app.delete('/api/website-layout/social-links/:id', requireManagerOrAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWebsiteSocialLink(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting social link:', error);
      res.status(500).json({ message: 'Failed to delete social link' });
    }
  });

  // Get footer sections with links for organization
  app.get('/api/website-layout/footer-sections', requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const sections = await storage.getWebsiteFooterSections(user.organizationId);
      res.json(sections);
    } catch (error: any) {
      console.error('Error fetching footer sections:', error);
      res.status(500).json({ message: 'Failed to fetch footer sections' });
    }
  });

  // Create new footer section
  app.post('/api/website-layout/footer-sections', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const validated = insertWebsiteFooterSectionSchema.parse({
        ...req.body,
        organizationId: user.organizationId
      });
      
      const section = await storage.createWebsiteFooterSection(validated);
      res.json(section);
    } catch (error: any) {
      console.error('Error creating footer section:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create footer section' });
    }
  });

  // Update footer section
  app.put('/api/website-layout/footer-sections/:id', requireManagerOrAdmin, async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      const id = parseInt(req.params.id);
      const validated = insertWebsiteFooterSectionSchema.parse({
        ...req.body,
        organizationId: user.organizationId
      });
      
      const updated = await storage.updateWebsiteFooterSection(id, validated);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating footer section:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update footer section' });
    }
  });

  // Delete footer section
  app.delete('/api/website-layout/footer-sections/:id', requireManagerOrAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWebsiteFooterSection(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting footer section:', error);
      res.status(500).json({ message: 'Failed to delete footer section' });
    }
  });

  // Get all footer links for a section
  app.get('/api/website-layout/footer-sections/:sectionId/links', requireAuth, async (req, res) => {
    try {
      const sectionId = parseInt(req.params.sectionId);
      const links = await storage.getWebsiteFooterLinks(sectionId);
      res.json(links);
    } catch (error: any) {
      console.error('Error fetching footer links:', error);
      res.status(500).json({ message: 'Failed to fetch footer links' });
    }
  });

  // Create new footer link
  app.post('/api/website-layout/footer-links', requireManagerOrAdmin, async (req, res) => {
    try {
      const validated = insertWebsiteFooterLinkSchema.parse(req.body);
      const link = await storage.createWebsiteFooterLink(validated);
      res.json(link);
    } catch (error: any) {
      console.error('Error creating footer link:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create footer link' });
    }
  });

  // Update footer link
  app.put('/api/website-layout/footer-links/:id', requireManagerOrAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertWebsiteFooterLinkSchema.parse(req.body);
      const updated = await storage.updateWebsiteFooterLink(id, validated);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating footer link:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update footer link' });
    }
  });

  // Delete footer link
  app.delete('/api/website-layout/footer-links/:id', requireManagerOrAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWebsiteFooterLink(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting footer link:', error);
      res.status(500).json({ message: 'Failed to delete footer link' });
    }
  });
}
