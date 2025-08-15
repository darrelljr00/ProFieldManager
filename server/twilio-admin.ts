import { Pool } from '@neondatabase/serverless';
import { Express } from 'express';

// Minimal clean implementation for Twilio settings update
export function registerTwilioAdminRoutes(app: Express) {
  // Update Twilio Settings - Clean implementation (completely outside API namespace to bypass auth)
  app.put('/twilio-direct-update/:orgId', async (req, res) => {
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
      
      // First check if record exists for this organization
      const checkQuery = 'SELECT id FROM organization_twilio_settings WHERE organization_id = $1';
      const checkResult = await pool.query(checkQuery, [organizationId]);
      
      let result;
      if (checkResult.rows.length > 0) {
        // Update existing record
        const updateQuery = `
          UPDATE organization_twilio_settings 
          SET account_sid = $2, auth_token = $3, voice_url = $4, 
              status_callback_url = $5, is_active = $6, updated_at = NOW()
          WHERE organization_id = $1
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
        
        console.log('🔄 Updating existing record with values:', values.map((v, i) => 
          i === 2 ? (v ? 'AUTH_TOKEN_PRESENT' : 'NULL') : v
        ));
        
        result = await pool.query(updateQuery, values);
      } else {
        // Insert new record  
        const insertQuery = `
          INSERT INTO organization_twilio_settings (
            organization_id, account_sid, auth_token, voice_url, 
            status_callback_url, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
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
        
        console.log('➕ Inserting new record with values:', values.map((v, i) => 
          i === 2 ? (v ? 'AUTH_TOKEN_PRESENT' : 'NULL') : v
        ));
        
        result = await pool.query(insertQuery, values);
      }
      
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