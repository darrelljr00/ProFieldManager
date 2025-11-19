import { db } from './db';
import { customerEtaSettings, customerEtaNotifications, projects, users, customers, gpsTrackingData } from '@shared/schema';
import { eq, and, sql, isNull, gte } from 'drizzle-orm';
import { TwilioService } from './twilio';

interface EtaCalculation {
  estimatedMinutesAway: number;
  estimatedArrivalTime: Date;
  technicianLat: string;
  technicianLng: string;
}

export class CustomerEtaService {
  private static checkIntervalMs = 60000; // Check every 60 seconds
  private static isRunning = false;
  private static intervalId: NodeJS.Timeout | null = null;

  static start() {
    if (this.isRunning) {
      console.log('⏰ Customer ETA service is already running');
      return;
    }

    console.log('🚀 Starting Customer ETA notification service...');
    this.isRunning = true;

    // Run immediately on startup
    this.checkForEtaNotifications();

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.checkForEtaNotifications();
    }, this.checkIntervalMs);

    console.log(`✅ Customer ETA service started - checking every ${this.checkIntervalMs / 1000} seconds`);
  }

  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏹️  Customer ETA service stopped');
  }

  private static async checkForEtaNotifications() {
    try {
      // Get all organizations with ETA notifications enabled
      const enabledSettings = await db
        .select()
        .from(customerEtaSettings)
        .where(eq(customerEtaSettings.enabled, true));

      if (enabledSettings.length === 0) {
        return;
      }

      for (const settings of enabledSettings) {
        await this.processOrganizationEtas(settings);
      }
    } catch (error) {
      console.error('❌ Error checking ETA notifications:', error);
    }
  }

  private static async processOrganizationEtas(settings: any) {
    try {
      // Get all active jobs for this organization with assigned technicians
      const activeJobs = await db
        .select({
          projectId: projects.id,
          projectName: projects.name,
          jobLatitude: projects.latitude,
          jobLongitude: projects.longitude,
          jobAddress: projects.location,
          userId: projects.userId,
          customerId: projects.customerId,
          customerName: projects.contactName,
          customerPhone: projects.contactPhone,
          organizationId: projects.organizationId,
        })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, settings.organizationId),
            eq(projects.status, 'active'),
            sql`${projects.latitude} IS NOT NULL`,
            sql`${projects.longitude} IS NOT NULL`,
            sql`${projects.contactPhone} IS NOT NULL`,
            sql`${projects.contactPhone} != ''`
          )
        );

      console.log(`📋 Found ${activeJobs.length} active jobs with location for org ${settings.organizationId}`);

      for (const job of activeJobs) {
        await this.checkJobEta(job, settings);
      }
    } catch (error) {
      console.error(`❌ Error processing ETA for org ${settings.organizationId}:`, error);
    }
  }

  private static async checkJobEta(job: any, settings: any) {
    try {
      if (!job.jobLatitude || !job.jobLongitude || !job.customerPhone || !job.userId) {
        return;
      }

      // Check if we've already sent a notification for this job today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingNotification = await db
        .select()
        .from(customerEtaNotifications)
        .where(
          and(
            eq(customerEtaNotifications.projectId, job.projectId),
            gte(customerEtaNotifications.sentAt, today),
            eq(customerEtaNotifications.smsSent, true)
          )
        )
        .limit(1);

      if (existingNotification.length > 0) {
        // Already sent notification for this job today
        return;
      }

      // Get the technician's current GPS location
      const technicianLocation = await db
        .select()
        .from(gpsTrackingData)
        .where(eq(gpsTrackingData.userId, job.userId))
        .orderBy(sql`${gpsTrackingData.timestamp} DESC`)
        .limit(1);

      if (technicianLocation.length === 0) {
        console.log(`⚠️  No GPS data found for technician user ${job.userId} on job ${job.projectId}`);
        return;
      }

      const techLoc = technicianLocation[0];
      const etaData = await this.calculateEta(
        techLoc.latitude!,
        techLoc.longitude!,
        job.jobLatitude,
        job.jobLongitude
      );

      if (!etaData) {
        return;
      }

      // Check if technician is within the configured time threshold
      if (etaData.estimatedMinutesAway <= settings.notifyMinutesBeforeArrival) {
        console.log(`📍 Technician ${job.userId} is ${etaData.estimatedMinutesAway} min away from job ${job.projectId} - sending ETA notification`);
        await this.sendEtaNotification(job, techLoc, etaData, settings);
      }
    } catch (error) {
      console.error(`❌ Error checking ETA for job ${job.projectId}:`, error);
    }
  }

  private static async calculateEta(
    techLat: string,
    techLng: string,
    jobLat: string,
    jobLng: string
  ): Promise<EtaCalculation | null> {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('⚠️  Google Maps API key not configured - cannot calculate ETA');
        return null;
      }

      // Use Google Maps Distance Matrix API to get real-time driving duration
      const origin = `${techLat},${techLng}`;
      const destination = `${jobLat},${jobLng}`;
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&mode=driving&departure_time=now&key=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || data.rows[0].elements[0].status !== 'OK') {
        console.warn('⚠️  Google Maps Distance Matrix API error:', data.status);
        return null;
      }

      const element = data.rows[0].elements[0];
      const durationInSeconds = element.duration_in_traffic?.value || element.duration.value;
      const durationInMinutes = Math.ceil(durationInSeconds / 60);

      const estimatedArrivalTime = new Date();
      estimatedArrivalTime.setMinutes(estimatedArrivalTime.getMinutes() + durationInMinutes);

      return {
        estimatedMinutesAway: durationInMinutes,
        estimatedArrivalTime,
        technicianLat: techLat,
        technicianLng: techLng,
      };
    } catch (error) {
      console.error('❌ Error calculating ETA:', error);
      return null;
    }
  }

  private static async sendEtaNotification(
    job: any,
    techLocation: any,
    etaData: EtaCalculation,
    settings: any
  ) {
    try {
      // Get technician details
      const technician = await db
        .select()
        .from(users)
        .where(eq(users.id, job.userId))
        .limit(1);

      if (technician.length === 0) {
        console.error(`❌ Technician user ${job.userId} not found`);
        return;
      }

      const techName = `${technician[0].firstName || ''} ${technician[0].lastName || ''}`.trim() || 'Your technician';

      // Generate tracking link if enabled
      let trackingLink = '';
      if (settings.trackingEnabled) {
        trackingLink = `https://www.google.com/maps/dir/?api=1&origin=${etaData.technicianLat},${etaData.technicianLng}&destination=${job.jobLatitude},${job.jobLongitude}`;
      }

      // Format SMS message from template
      let smsContent = settings.smsTemplate || "Hi {customerName}, {technicianName} is about 15 minutes away from your location.";
      smsContent = smsContent
        .replace('{customerName}', job.customerName || 'there')
        .replace('{technicianName}', techName)
        .replace('{companyName}', 'our team')
        .replace('{address}', job.jobAddress || 'your location')
        .replace('{estimatedMinutes}', etaData.estimatedMinutesAway.toString())
        .replace('{trackingLink}', trackingLink);

      // Send SMS via Twilio
      const twilioService = new TwilioService();
      let smsSid: string | null = null;
      let smsStatus = 'pending';
      let smsError: string | null = null;

      if (twilioService.isReady()) {
        try {
          const result = await twilioService.sendSms(job.customerPhone, smsContent);
          smsSid = result.sid;
          smsStatus = result.status;
          console.log(`✅ ETA SMS sent to ${job.customerPhone} - SID: ${smsSid}`);
        } catch (twilioError: any) {
          smsError = twilioError.message;
          smsStatus = 'failed';
          console.error(`❌ Failed to send ETA SMS:`, twilioError);
        }
      } else {
        smsStatus = 'failed';
        smsError = 'Twilio not configured';
        console.warn('⚠️  Twilio not configured - ETA notification not sent');
      }

      // Record the notification in database
      await db.insert(customerEtaNotifications).values({
        organizationId: job.organizationId,
        projectId: job.projectId,
        userId: job.userId,
        customerId: job.customerId,
        customerPhone: job.customerPhone,
        customerName: job.customerName,
        estimatedMinutesAway: etaData.estimatedMinutesAway,
        estimatedArrivalTime: etaData.estimatedArrivalTime,
        technicianLatitude: etaData.technicianLat,
        technicianLongitude: etaData.technicianLng,
        jobLatitude: job.jobLatitude,
        jobLongitude: job.jobLongitude,
        jobAddress: job.jobAddress,
        smsSent: twilioService.isReady() && smsStatus !== 'failed',
        smsContent,
        smsSid,
        smsStatus,
        smsError,
        trackingLink,
        sentAt: new Date(),
      });

      console.log(`📨 ETA notification recorded for job ${job.projectId}`);
    } catch (error) {
      console.error(`❌ Error sending ETA notification for job ${job.projectId}:`, error);
    }
  }
}
