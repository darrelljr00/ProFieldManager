// Lead Automation Service for automatic follow-ups via email and SMS
import { db } from "./db";
import { leads, organizations, leadSettings } from "@shared/schema";
import { eq, and, lte, isNotNull } from "drizzle-orm";
import sgMail from "@sendgrid/mail";
import { TwilioService } from "./twilio";
import { storage } from "./storage";

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface AutoFollowUpLead {
  id: number;
  name: string;
  email: string;
  phone: string;
  serviceDescription: string;
  automaticFollowUpTemplate: string;
  automaticFollowUpCount: number;
  automaticFollowUpEmailCount: number;
  automaticFollowUpSmsCount: number;
  automaticFollowUpInterval: number;
  organizationId: number;
  organizationName: string;
  organizationEmail: string;
}

export class LeadAutomationService {
  
  /**
   * Process all leads that are due for automatic follow-up
   */
  async processAutomaticFollowUps(): Promise<void> {
    console.log("🔄 Starting automatic lead follow-up processing...");
    
    try {
      // Get all leads that have automatic follow-up enabled and are due for follow-up
      const dueleads = await this.getLeadsDueForFollowUp();
      
      console.log(`📊 Found ${dueleads.length} leads due for automatic follow-up`);
      
      for (const lead of dueleads) {
        await this.processLeadFollowUp(lead);
      }
      
      console.log("✅ Automatic lead follow-up processing completed");
    } catch (error) {
      console.error("❌ Error in automatic lead follow-up processing:", error);
    }
  }

  /**
   * Get all leads that are due for automatic follow-up
   */
  private async getLeadsDueForFollowUp(): Promise<AutoFollowUpLead[]> {
    const now = new Date();
    
    const result = await db
      .select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        serviceDescription: leads.serviceDescription,
        automaticFollowUpTemplate: leads.automaticFollowUpTemplate,
        automaticFollowUpCount: leads.automaticFollowUpCount,
        automaticFollowUpEmailCount: leads.automaticFollowUpEmailCount,
        automaticFollowUpSmsCount: leads.automaticFollowUpSmsCount,
        automaticFollowUpInterval: leads.automaticFollowUpInterval,
        organizationId: leads.organizationId,
        organizationName: organizations.name,
        organizationEmail: organizations.email
      })
      .from(leads)
      .leftJoin(organizations, eq(leads.organizationId, organizations.id))
      .where(
        and(
          eq(leads.automaticFollowUpEnabled, true),
          lte(leads.nextAutomaticFollowUp, now)
        )
      );
    
    return result.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email || '',
      phone: row.phone || '',
      serviceDescription: row.serviceDescription,
      automaticFollowUpTemplate: row.automaticFollowUpTemplate || '',
      automaticFollowUpCount: row.automaticFollowUpCount || 0,
      automaticFollowUpEmailCount: row.automaticFollowUpEmailCount || 0,
      automaticFollowUpSmsCount: row.automaticFollowUpSmsCount || 0,
      automaticFollowUpInterval: row.automaticFollowUpInterval || 1,
      organizationId: row.organizationId,
      organizationName: row.organizationName || '',
      organizationEmail: row.organizationEmail || ''
    }));
  }

  /**
   * Process follow-up for a single lead
   */
  private async processLeadFollowUp(lead: AutoFollowUpLead): Promise<void> {
    console.log(`📨 Processing follow-up for lead: ${lead.name} (ID: ${lead.id})`);
    
    let emailSent = false;
    let smsSent = false;
    
    // Send email follow-up if email is available
    if (lead.email && process.env.SENDGRID_API_KEY) {
      try {
        await this.sendEmailFollowUp(lead);
        emailSent = true;
        console.log(`✅ Email sent to ${lead.email}`);
      } catch (error) {
        console.error(`❌ Failed to send email to ${lead.email}:`, error);
      }
    }
    
    // Send SMS follow-up if phone is available
    if (lead.phone) {
      try {
        await this.sendSMSFollowUp(lead);
        smsSent = true;
        console.log(`✅ SMS sent to ${lead.phone}`);
      } catch (error) {
        console.error(`❌ Failed to send SMS to ${lead.phone}:`, error);
      }
    }
    
    // Update lead follow-up tracking
    await this.updateLeadFollowUpTracking(lead, emailSent, smsSent);
  }

  /**
   * Send email follow-up to a lead
   */
  private async sendEmailFollowUp(lead: AutoFollowUpLead): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error("SendGrid API key not configured");
    }
    
    // Get lead settings for email template
    const leadSettingsData = await storage.getLeadSettings(lead.organizationId);
    
    // Use email template from lead settings or fallback
    const emailTemplate = leadSettingsData?.emailTemplate ||
      lead.automaticFollowUpTemplate || 
      "Hi {name}, this is a follow-up regarding your {service} request. Please let us know if you have any questions!";
    
    const emailSubject = leadSettingsData?.emailSubject || 
      `Follow-up on your ${lead.serviceDescription} inquiry`;
    
    // Prepare email content with template variables
    const message = this.replaceTemplateVariables(emailTemplate, lead);
    const subject = this.replaceTemplateVariables(emailSubject, lead);
    
    const fromEmail = lead.organizationEmail || 'noreply@profieldmanager.com';
    const fromName = lead.organizationName || 'Pro Field Manager';
    
    const emailData = {
      to: lead.email,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: subject,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            ${subject}
          </h2>
          <div style="line-height: 1.6; color: #555; margin: 20px 0;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #007bff;">
            <p style="margin: 0; font-size: 12px; color: #666;">
              This is an automated follow-up from ${fromName}. 
              If you have any questions, please reply to this email or contact us directly.
            </p>
          </div>
        </div>
      `
    };
    
    await sgMail.send(emailData);
  }

  /**
   * Send SMS follow-up to a lead
   */
  private async sendSMSFollowUp(lead: AutoFollowUpLead): Promise<void> {
    // Get organization-specific Twilio settings
    const twilioSettings = await storage.getOrganizationTwilioSettings(lead.organizationId);
    
    if (!twilioSettings || !twilioSettings.accountSid || !twilioSettings.authToken) {
      throw new Error(`Twilio not configured for organization ${lead.organizationId}`);
    }
    
    // Get lead settings for SMS template
    const leadSettingsData = await storage.getLeadSettings(lead.organizationId);
    
    // Create organization-specific Twilio client
    const twilioClient = TwilioService.createOrganizationClient(
      twilioSettings.accountSid,
      twilioSettings.authToken
    );
    
    if (!twilioClient) {
      throw new Error(`Failed to create Twilio client for organization ${lead.organizationId}`);
    }
    
    // Use SMS template from lead settings or fallback
    const smsTemplate = leadSettingsData?.smsTemplate || 
      "Hi {name}, we wanted to follow up on your recent inquiry about our {service} services. Are you still interested in learning more?";
    
    // Get from phone number (use first available number)
    const phoneNumbers = await twilioClient.incomingPhoneNumbers.list();
    if (phoneNumbers.length === 0) {
      throw new Error(`No phone numbers available for organization ${lead.organizationId}`);
    }
    
    const fromNumber = phoneNumbers[0].phoneNumber;
    
    // Prepare SMS content with template variables
    const message = this.replaceTemplateVariables(smsTemplate, lead);
    
    // Send SMS using Twilio client
    await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: lead.phone
    });
  }

  /**
   * Replace template variables in message content
   */
  private replaceTemplateVariables(template: string, lead: AutoFollowUpLead): string {
    return template
      .replace(/{name}/g, lead.name)
      .replace(/{service}/g, lead.serviceDescription)
      .replace(/{company}/g, lead.organizationName);
  }

  /**
   * Update lead follow-up tracking after sending communications
   */
  private async updateLeadFollowUpTracking(
    lead: AutoFollowUpLead, 
    emailSent: boolean, 
    smsSent: boolean
  ): Promise<void> {
    const now = new Date();
    const nextFollowUp = new Date(now.getTime() + (lead.automaticFollowUpInterval * 24 * 60 * 60 * 1000));
    
    await db
      .update(leads)
      .set({
        automaticFollowUpCount: lead.automaticFollowUpCount + (emailSent || smsSent ? 1 : 0),
        automaticFollowUpEmailCount: lead.automaticFollowUpEmailCount + (emailSent ? 1 : 0),
        automaticFollowUpSmsCount: lead.automaticFollowUpSmsCount + (smsSent ? 1 : 0),
        lastAutomaticFollowUp: now,
        nextAutomaticFollowUp: nextFollowUp,
        updatedAt: now
      })
      .where(eq(leads.id, lead.id));
      
    console.log(`📊 Updated tracking for lead ${lead.id}: Email: ${emailSent}, SMS: ${smsSent}, Next: ${nextFollowUp.toISOString()}`);
  }

  /**
   * Enable automatic follow-up for a lead
   */
  async enableAutomaticFollowUp(leadId: number, intervalDays: number = 1): Promise<void> {
    const now = new Date();
    const nextFollowUp = new Date(now.getTime() + (intervalDays * 24 * 60 * 60 * 1000));
    
    await db
      .update(leads)
      .set({
        automaticFollowUpEnabled: true,
        automaticFollowUpInterval: intervalDays,
        nextAutomaticFollowUp: nextFollowUp,
        updatedAt: now
      })
      .where(eq(leads.id, leadId));
      
    console.log(`✅ Enabled automatic follow-up for lead ${leadId} with ${intervalDays} day interval`);
  }

  /**
   * Disable automatic follow-up for a lead
   */
  async disableAutomaticFollowUp(leadId: number): Promise<void> {
    await db
      .update(leads)
      .set({
        automaticFollowUpEnabled: false,
        nextAutomaticFollowUp: null,
        updatedAt: new Date()
      })
      .where(eq(leads.id, leadId));
      
    console.log(`❌ Disabled automatic follow-up for lead ${leadId}`);
  }
}

// Export singleton instance
export const leadAutomationService = new LeadAutomationService();

// Daily cron job function (to be called by scheduler)
export async function runDailyLeadFollowUps(): Promise<void> {
  await leadAutomationService.processAutomaticFollowUps();
}