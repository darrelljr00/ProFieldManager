import twilio from 'twilio';

// Twilio configuration with fallback defaults
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'your_auth_token_here';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+15551234567';

// Initialize Twilio client
let twilioClient: twilio.Twilio | null = null;

try {
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && 
      TWILIO_ACCOUNT_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' && 
      TWILIO_AUTH_TOKEN !== 'your_auth_token_here') {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio client initialized successfully');
  } else {
    console.log('⚠️ Twilio credentials not configured - using mock mode');
  }
} catch (error) {
  console.error('❌ Failed to initialize Twilio client:', error);
}

export interface TwilioPhoneNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  voiceUrl?: string;
  smsUrl?: string;
  statusCallback?: string;
  dateCreated: string;
  dateUpdated: string;
}

export interface CallRecord {
  sid: string;
  from: string;
  to: string;
  status: string;
  direction: string;
  duration?: string;
  price?: string;
  priceUnit?: string;
  dateCreated: string;
  dateUpdated: string;
}

export interface AvailablePhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  postalCode: string;
  isoCountry: string;
  capabilities: {
    voice: boolean;
    SMS: boolean;
    MMS: boolean;
  };
}

export class TwilioService {
  private client: twilio.Twilio | null;
  private isConfigured: boolean;

  constructor() {
    this.client = twilioClient;
    this.isConfigured = !!twilioClient;
  }

  // Create organization-specific Twilio client
  static createOrganizationClient(accountSid: string, authToken: string): twilio.Twilio | null {
    try {
      if (!accountSid || !authToken || 
          accountSid === 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' || 
          authToken === 'your_auth_token_here') {
        return null;
      }
      return twilio(accountSid, authToken);
    } catch (error) {
      console.error('Failed to create organization Twilio client:', error);
      return null;
    }
  }

  // Check if Twilio is properly configured
  isReady(): boolean {
    return this.isConfigured;
  }

  // Get account information
  async getAccountInfo() {
    if (!this.client) {
      return {
        sid: TWILIO_ACCOUNT_SID,
        friendlyName: 'Demo Account (Not Configured)',
        status: 'inactive',
        type: 'Trial',
        dateCreated: new Date().toISOString(),
        isConfigured: false
      };
    }

    try {
      const account = await this.client.api.accounts(TWILIO_ACCOUNT_SID).fetch();
      return {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type,
        dateCreated: account.dateCreated?.toISOString(),
        isConfigured: true
      };
    } catch (error) {
      console.error('Error fetching account info:', error);
      throw new Error('Failed to fetch Twilio account information');
    }
  }

  // Get all purchased phone numbers
  async getPhoneNumbers(): Promise<TwilioPhoneNumber[]> {
    if (!this.client) {
      // Return mock data when not configured
      return [
        {
          sid: 'PN1234567890abcdef1234567890abcdef',
          phoneNumber: '+15551234567',
          friendlyName: 'Main Business Line',
          capabilities: { voice: true, sms: true, mms: true },
          dateCreated: '2024-01-15T10:30:00Z',
          dateUpdated: '2024-01-15T10:30:00Z'
        },
        {
          sid: 'PN0987654321fedcba0987654321fedcba',
          phoneNumber: '+15559876543',
          friendlyName: 'Customer Support',
          capabilities: { voice: true, sms: true, mms: false },
          dateCreated: '2024-02-20T14:15:00Z',
          dateUpdated: '2024-02-20T14:15:00Z'
        }
      ];
    }

    try {
      const numbers = await this.client.incomingPhoneNumbers.list();
      return numbers.map(number => ({
        sid: number.sid,
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName || number.phoneNumber,
        capabilities: {
          voice: number.capabilities?.voice || false,
          sms: number.capabilities?.sms || false,
          mms: number.capabilities?.mms || false
        },
        voiceUrl: number.voiceUrl,
        smsUrl: number.smsUrl,
        statusCallback: number.statusCallback,
        dateCreated: number.dateCreated?.toISOString() || '',
        dateUpdated: number.dateUpdated?.toISOString() || ''
      }));
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      throw new Error('Failed to fetch phone numbers');
    }
  }

  // Search for available phone numbers to purchase
  async searchAvailableNumbers(areaCode?: string, region?: string): Promise<AvailablePhoneNumber[]> {
    if (!this.client) {
      // Return mock available numbers when not configured
      return [
        {
          phoneNumber: '+15551234568',
          friendlyName: 'Dallas, TX',
          locality: 'Dallas',
          region: 'TX',
          postalCode: '75201',
          isoCountry: 'US',
          capabilities: { voice: true, SMS: true, MMS: true }
        },
        {
          phoneNumber: '+15551234569',
          friendlyName: 'Houston, TX',
          locality: 'Houston',
          region: 'TX',
          postalCode: '77001',
          isoCountry: 'US',
          capabilities: { voice: true, SMS: true, MMS: true }
        }
      ];
    }

    try {
      const searchParams: any = {
        limit: 20
      };

      if (areaCode) {
        searchParams.areaCode = areaCode;
      }

      if (region) {
        searchParams.inRegion = region;
      }

      const numbers = await this.client.availablePhoneNumbers('US').local.list(searchParams);
      
      return numbers.map(number => ({
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName || `${number.locality}, ${number.region}`,
        locality: number.locality || '',
        region: number.region || '',
        postalCode: number.postalCode || '',
        isoCountry: number.isoCountry,
        capabilities: {
          voice: number.capabilities?.voice || false,
          SMS: number.capabilities?.sms || false,
          MMS: number.capabilities?.mms || false
        }
      }));
    } catch (error) {
      console.error('Error searching available numbers:', error);
      throw new Error('Failed to search available phone numbers');
    }
  }

  // Purchase a phone number
  async purchasePhoneNumber(phoneNumber: string, friendlyName?: string): Promise<TwilioPhoneNumber> {
    if (!this.client) {
      throw new Error('Twilio not configured - cannot purchase phone numbers');
    }

    try {
      const purchasedNumber = await this.client.incomingPhoneNumbers.create({
        phoneNumber,
        friendlyName: friendlyName || phoneNumber
      });

      return {
        sid: purchasedNumber.sid,
        phoneNumber: purchasedNumber.phoneNumber,
        friendlyName: purchasedNumber.friendlyName || purchasedNumber.phoneNumber,
        capabilities: {
          voice: purchasedNumber.capabilities?.voice || false,
          sms: purchasedNumber.capabilities?.sms || false,
          mms: purchasedNumber.capabilities?.mms || false
        },
        dateCreated: purchasedNumber.dateCreated?.toISOString() || '',
        dateUpdated: purchasedNumber.dateUpdated?.toISOString() || ''
      };
    } catch (error) {
      console.error('Error purchasing phone number:', error);
      throw new Error('Failed to purchase phone number');
    }
  }

  // Release (delete) a phone number
  async releasePhoneNumber(sid: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Twilio not configured - cannot release phone numbers');
    }

    try {
      await this.client.incomingPhoneNumbers(sid).remove();
      return true;
    } catch (error) {
      console.error('Error releasing phone number:', error);
      throw new Error('Failed to release phone number');
    }
  }

  // Get call logs/history
  async getCallLogs(limit: number = 50): Promise<CallRecord[]> {
    if (!this.client) {
      // Return mock call data when not configured
      return [
        {
          sid: 'CA1234567890abcdef1234567890abcdef',
          from: '+15551234567',
          to: '+15559876543',
          status: 'completed',
          direction: 'outbound-api',
          duration: '125',
          price: '-0.02',
          priceUnit: 'USD',
          dateCreated: new Date(Date.now() - 3600000).toISOString(),
          dateUpdated: new Date(Date.now() - 3600000).toISOString()
        },
        {
          sid: 'CA0987654321fedcba0987654321fedcba',
          from: '+15559876543',
          to: '+15551234567',
          status: 'completed',
          direction: 'inbound',
          duration: '89',
          price: '-0.015',
          priceUnit: 'USD',
          dateCreated: new Date(Date.now() - 7200000).toISOString(),
          dateUpdated: new Date(Date.now() - 7200000).toISOString()
        }
      ];
    }

    try {
      const calls = await this.client.calls.list({ limit });
      return calls.map(call => ({
        sid: call.sid,
        from: call.from,
        to: call.to,
        status: call.status,
        direction: call.direction,
        duration: call.duration,
        price: call.price,
        priceUnit: call.priceUnit,
        dateCreated: call.dateCreated?.toISOString() || '',
        dateUpdated: call.dateUpdated?.toISOString() || ''
      }));
    } catch (error) {
      console.error('Error fetching call logs:', error);
      throw new Error('Failed to fetch call logs');
    }
  }

  // Make an outbound call
  async makeCall(from: string, to: string, callbackUrl?: string): Promise<CallRecord> {
    if (!this.client) {
      throw new Error('Twilio not configured - cannot make calls');
    }

    try {
      const call = await this.client.calls.create({
        from,
        to,
        url: callbackUrl || 'https://handler.twilio.com/twiml/EHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      });

      return {
        sid: call.sid,
        from: call.from,
        to: call.to,
        status: call.status,
        direction: call.direction,
        dateCreated: call.dateCreated?.toISOString() || '',
        dateUpdated: call.dateUpdated?.toISOString() || ''
      };
    } catch (error) {
      console.error('Error making call:', error);
      throw new Error('Failed to initiate call');
    }
  }

  // Make an outbound call with organization-specific client
  static async makeCallWithOrganizationClient(
    client: twilio.Twilio,
    from: string, 
    to: string, 
    callbackUrl?: string
  ): Promise<CallRecord> {
    try {
      const call = await client.calls.create({
        from,
        to,
        url: callbackUrl || 'https://handler.twilio.com/twiml/EHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      });

      return {
        sid: call.sid,
        from: call.from,
        to: call.to,
        status: call.status,
        direction: call.direction,
        dateCreated: call.dateCreated?.toISOString() || '',
        dateUpdated: call.dateUpdated?.toISOString() || ''
      };
    } catch (error) {
      console.error('Error making call with organization client:', error);
      throw new Error('Failed to initiate call');
    }
  }

  // Send SMS message
  async sendSMS(from: string, to: string, body: string): Promise<any> {
    if (!this.client) {
      throw new Error('Twilio not configured - cannot send SMS');
    }

    try {
      const message = await this.client.messages.create({
        from,
        to,
        body
      });

      return {
        sid: message.sid,
        from: message.from,
        to: message.to,
        body: message.body,
        status: message.status,
        direction: message.direction,
        dateCreated: message.dateCreated?.toISOString(),
        dateUpdated: message.dateUpdated?.toISOString()
      };
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw new Error('Failed to send SMS message');
    }
  }

  // Get usage statistics
  async getUsageStats(): Promise<any> {
    if (!this.client) {
      // Return mock usage data when not configured
      return {
        calls: {
          totalCalls: 47,
          totalMinutes: 1247,
          averageDuration: 159, // seconds
          totalCost: 62.35
        },
        sms: {
          totalMessages: 156,
          totalCost: 15.60
        },
        monthlySpend: 77.95,
        currentBalance: 23.45
      };
    }

    try {
      // Fetch usage records for calls and SMS
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const usage = await this.client.usage.records.list({
        startDate: startOfMonth,
        endDate: today,
        granularity: 'monthly'
      });

      let callStats = { totalCalls: 0, totalMinutes: 0, totalCost: 0 };
      let smsStats = { totalMessages: 0, totalCost: 0 };

      usage.forEach(record => {
        if (record.category === 'calls') {
          callStats.totalCalls += parseInt(record.count || '0');
          callStats.totalMinutes += parseInt(record.usage || '0');
          callStats.totalCost += parseFloat(record.price || '0');
        } else if (record.category === 'sms') {
          smsStats.totalMessages += parseInt(record.count || '0');
          smsStats.totalCost += parseFloat(record.price || '0');
        }
      });

      return {
        calls: {
          ...callStats,
          averageDuration: callStats.totalCalls > 0 ? Math.round((callStats.totalMinutes * 60) / callStats.totalCalls) : 0
        },
        sms: smsStats,
        monthlySpend: callStats.totalCost + smsStats.totalCost
      };
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      // Return mock data on error
      return {
        calls: {
          totalCalls: 47,
          totalMinutes: 1247,
          averageDuration: 159,
          totalCost: 62.35
        },
        sms: {
          totalMessages: 156,
          totalCost: 15.60
        },
        monthlySpend: 77.95
      };
    }
  }
}

export const twilioService = new TwilioService();