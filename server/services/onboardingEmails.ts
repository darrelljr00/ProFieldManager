import { db } from '../db';
import { settings, organizations } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface EmailSettings {
  sendgridApiKey?: string;
  fromEmail?: string;
  fromName?: string;
}

async function getEmailSettings(organizationId?: number): Promise<EmailSettings> {
  const result: EmailSettings = {};
  
  // Try to get SendGrid API key from environment first
  result.sendgridApiKey = process.env.SENDGRID_API_KEY;
  
  // Try to get from settings if organizationId is provided
  if (organizationId) {
    try {
      const emailSettings = await db.query.settings.findMany({
        where: and(
          eq(settings.organizationId, organizationId),
          eq(settings.category, 'email'),
        ),
      });
      
      for (const setting of emailSettings) {
        if (setting.key === 'email_sendgridApiKey' && setting.value) {
          result.sendgridApiKey = setting.value;
        }
        if (setting.key === 'email_fromEmail' && setting.value) {
          result.fromEmail = setting.value;
        }
        if (setting.key === 'email_fromName' && setting.value) {
          result.fromName = setting.value;
        }
      }
    } catch (e) {
      console.log('Could not fetch org-specific email settings, using defaults');
    }
  }
  
  // Set defaults
  if (!result.fromEmail) {
    result.fromEmail = 'noreply@profieldmanager.com';
  }
  if (!result.fromName) {
    result.fromName = 'Pro Field Manager';
  }
  
  return result;
}

export async function sendWelcomeEmail(
  toEmail: string,
  orgName: string,
  onboardingLink: string,
  organizationId?: number
): Promise<boolean> {
  try {
    const emailSettings = await getEmailSettings(organizationId);
    
    if (!emailSettings.sendgridApiKey) {
      console.warn('SendGrid API key not configured, skipping welcome email');
      return false;
    }
    
    const sgMail = await import('@sendgrid/mail');
    sgMail.default.setApiKey(emailSettings.sendgridApiKey);
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Pro Field Manager! 🎉</h1>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi there,</p>
            
            <p style="margin-bottom: 20px;">Welcome to <strong>${orgName}</strong>'s new Pro Field Manager account! We're excited to have you on board.</p>
            
            <p style="margin-bottom: 20px;">To help you get the most out of your account, we've created a quick setup wizard that will guide you through:</p>
            
            <ul style="background: #f8f9fa; padding: 20px 20px 20px 40px; border-radius: 8px; margin-bottom: 25px;">
              <li style="margin-bottom: 10px;">📋 Setting up your company profile</li>
              <li style="margin-bottom: 10px;">👥 Adding your team members</li>
              <li style="margin-bottom: 10px;">💳 Connecting payment processing</li>
              <li style="margin-bottom: 10px;">🛠️ Configuring your services</li>
              <li style="margin-bottom: 10px;">🎨 Customizing your branding</li>
              <li style="margin-bottom: 0;">👤 Adding your first customer</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${onboardingLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Start Setup Wizard →</a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">The setup only takes about 5-10 minutes and will help you hit the ground running!</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #888; font-size: 12px; text-align: center;">
              If you have any questions, our support team is here to help.<br>
              © ${new Date().getFullYear()} Pro Field Manager. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await sgMail.default.send({
      to: toEmail,
      from: {
        email: emailSettings.fromEmail!,
        name: emailSettings.fromName!,
      },
      subject: `Welcome to Pro Field Manager - Let's Get Started! 🚀`,
      html,
    });
    
    console.log(`✅ Welcome email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}

export async function sendOnboardingReminderEmail(
  toEmail: string,
  orgName: string,
  organizationId?: number
): Promise<boolean> {
  try {
    const emailSettings = await getEmailSettings(organizationId);
    
    if (!emailSettings.sendgridApiKey) {
      console.warn('SendGrid API key not configured, skipping reminder email');
      return false;
    }
    
    const sgMail = await import('@sendgrid/mail');
    sgMail.default.setApiKey(emailSettings.sendgridApiKey);
    
    // Get the base URL from environment or use default
    const baseUrl = process.env.APP_URL || 'https://profieldmanager.com';
    const onboardingLink = `${baseUrl}/onboarding`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Don't Forget to Finish Setup! 👋</h1>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi there,</p>
            
            <p style="margin-bottom: 20px;">We noticed you haven't finished setting up <strong>${orgName}</strong>'s Pro Field Manager account yet.</p>
            
            <p style="margin-bottom: 20px;">Completing the setup wizard will help you:</p>
            
            <ul style="background: #fff3cd; padding: 20px 20px 20px 40px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
              <li style="margin-bottom: 10px;">✅ Start accepting payments from customers</li>
              <li style="margin-bottom: 10px;">✅ Manage your team more efficiently</li>
              <li style="margin-bottom: 10px;">✅ Create professional branded invoices</li>
              <li style="margin-bottom: 0;">✅ Get the most out of your free trial</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${onboardingLink}" style="display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Continue Setup →</a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">It only takes a few minutes to complete, and you can always come back later if needed.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #888; font-size: 12px; text-align: center;">
              Need help? Our support team is always here for you.<br>
              © ${new Date().getFullYear()} Pro Field Manager. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await sgMail.default.send({
      to: toEmail,
      from: {
        email: emailSettings.fromEmail!,
        name: emailSettings.fromName!,
      },
      subject: `🔔 Complete Your Pro Field Manager Setup`,
      html,
    });
    
    console.log(`✅ Onboarding reminder email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending onboarding reminder email:', error);
    return false;
  }
}
