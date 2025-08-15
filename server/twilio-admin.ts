import { Pool } from '@neondatabase/serverless';
import { Express } from 'express';

// Minimal clean implementation for Twilio settings update
export function registerTwilioAdminRoutes(app: Express) {
  // Update Twilio Settings - Clean implementation
  app.put('/api/saas-admin/call-manager/twilio-settings/:orgId', async (req, res) => {
    try {
      console.log('🔧 TWILIO SETTINGS UPDATE STARTED');
      console.log('Request params:', req.params);
      console.log('Request body:', req.body);
      
      const { orgId } = req.params;
      const { accountSid, authToken, webhookUrl, statusCallbackUrl } = req.body;
      
      const organizationId = parseInt(orgId);
      if (isNaN(organizationId)) {
        console.log('❌ Invalid organization ID:', orgId);
        return res.status(400).json({ message: 'Invalid organization ID' });
      }

      console.log('✅ Processing update for organization:', organizationId);
      
      // Use direct database connection
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      const query = `
        INSERT INTO organization_twilio_settings (
          organization_id, account_sid, auth_token, webhook_url, 
          status_callback_url, is_configured, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (organization_id) 
        DO UPDATE SET 
          account_sid = EXCLUDED.account_sid,
          auth_token = EXCLUDED.auth_token,
          webhook_url = EXCLUDED.webhook_url,
          status_callback_url = EXCLUDED.status_callback_url,
          is_configured = EXCLUDED.is_configured,
          updated_at = NOW()
        RETURNING *;
      `;
      
      const values = [
        organizationId,
        accountSid || null,
        authToken || null,
        webhookUrl || null,
        statusCallbackUrl || null,
        !!(accountSid && authToken)
      ];
      
      console.log('🚀 Executing SQL with values:', values.map((v, i) => 
        i === 2 ? (v ? 'AUTH_TOKEN_PRESENT' : 'NULL') : v
      ));
      
      const result = await pool.query(query, values);
      
      console.log('✅ Database update successful:', result.rows[0]);
      
      await pool.end();
      
      res.json({ 
        message: 'Twilio settings updated successfully',
        settings: result.rows[0]
      });
      
    } catch (error) {
      console.error('❌ Error updating Twilio settings:', error);
      res.status(500).json({ 
        message: 'Failed to update Twilio settings',
        error: error.message 
      });
    }
  });
}