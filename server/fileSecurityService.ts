import { FileTypeResult, fileTypeFromBuffer } from 'file-type';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { db } from './db';
import { fileSecuritySettings, fileSecurityScans, fileAccessLogs } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface SecurityScanResult {
  isClean: boolean;
  threats: Array<{
    name: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  scanProvider: string;
  scanDuration: number;
  errorMessage?: string;
}

interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  mimeType: string;
  actualFileType?: FileTypeResult;
}

export class FileSecurityService {
  private static instance: FileSecurityService;
  
  public static getInstance(): FileSecurityService {
    if (!FileSecurityService.instance) {
      FileSecurityService.instance = new FileSecurityService();
    }
    return FileSecurityService.instance;
  }

  private constructor() {}

  /**
   * Get file security settings for an organization
   */
  async getSecuritySettings(organizationId: number) {
    const [settings] = await db
      .select()
      .from(fileSecuritySettings)
      .where(eq(fileSecuritySettings.organizationId, organizationId))
      .limit(1);

    if (!settings) {
      // Create default settings for organization
      return await this.createDefaultSecuritySettings(organizationId);
    }

    return settings;
  }

  /**
   * Create default security settings for an organization
   */
  private async createDefaultSecuritySettings(organizationId: number) {
    const [settings] = await db
      .insert(fileSecuritySettings)
      .values({ organizationId })
      .returning();
    
    return settings;
  }

  /**
   * Validate file before processing
   */
  async validateFile(
    filePath: string, 
    originalName: string, 
    organizationId: number
  ): Promise<FileValidationResult> {
    const settings = await this.getSecuritySettings(organizationId);
    const errors: string[] = [];

    try {
      // Get file stats
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // Check file size limits
      if (fileSize > settings.maxFileSize) {
        errors.push(`File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(settings.maxFileSize / 1024 / 1024)}MB)`);
      }

      // Read file buffer for content validation
      const buffer = await fs.readFile(filePath);
      const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

      // Detect actual file type
      const actualFileType = await fileTypeFromBuffer(buffer);
      
      // Validate file extension
      const fileExtension = path.extname(originalName).toLowerCase();
      const allowedExtensions = settings.allowedExtensions as string[];
      const blockedExtensions = settings.blockedExtensions as string[];

      if (settings.enableContentTypeValidation) {
        if (blockedExtensions.includes(fileExtension)) {
          errors.push(`File extension '${fileExtension}' is not allowed`);
        }
        
        if (allowedExtensions.length > 0 && !allowedExtensions.includes(fileExtension)) {
          errors.push(`File extension '${fileExtension}' is not in the allowed list`);
        }
      }

      // Validate MIME type
      const declaredMimeType = actualFileType?.mime || 'application/octet-stream';
      const allowedMimeTypes = settings.allowedMimeTypes as string[];
      const blockedMimeTypes = settings.blockedMimeTypes as string[];

      if (settings.enableContentTypeValidation) {
        if (blockedMimeTypes.includes(declaredMimeType)) {
          errors.push(`MIME type '${declaredMimeType}' is not allowed`);
        }
        
        if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(declaredMimeType)) {
          errors.push(`MIME type '${declaredMimeType}' is not in the allowed list`);
        }
      }

      // Validate file header consistency
      if (settings.enableFileHeaderValidation && actualFileType) {
        const expectedExtension = '.' + actualFileType.ext;
        if (fileExtension !== expectedExtension) {
          errors.push(`File extension '${fileExtension}' does not match actual file type '${expectedExtension}'`);
        }
      }

      // Check for suspicious file names
      if (settings.blockSuspiciousFileNames) {
        const suspiciousPatterns = [
          /\.(exe|bat|cmd|scr|pif|com|dll|sys|vbs|jar)$/i,
          /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i,
          /[<>:"|?*\x00-\x1f]/,
          /\.\./,
          /^\./, // Hidden files
        ];

        for (const pattern of suspiciousPatterns) {
          if (pattern.test(originalName)) {
            errors.push(`Suspicious file name pattern detected: ${originalName}`);
            break;
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        mimeType: declaredMimeType,
        actualFileType
      };

    } catch (error) {
      console.error('File validation error:', error);
      return {
        isValid: false,
        errors: [`File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        mimeType: 'application/octet-stream'
      };
    }
  }

  /**
   * Scan file for malware and viruses
   */
  async scanFile(
    filePath: string,
    fileName: string,
    organizationId: number,
    uploadedBy?: number,
    fileId?: number
  ): Promise<SecurityScanResult> {
    const settings = await this.getSecuritySettings(organizationId);
    const scanStartTime = Date.now();

    try {
      // Create scan log entry
      const scanLogData = {
        fileId,
        fileName,
        filePath,
        fileSize: (await fs.stat(filePath)).size,
        mimeType: 'application/octet-stream',
        uploadedBy,
        organizationId,
        scanProvider: settings.primaryScanProvider,
        scanStatus: 'scanning' as const,
      };

      const [scanLog] = await db
        .insert(fileSecurityScans)
        .values(scanLogData)
        .returning();

      let scanResult: SecurityScanResult;

      // Perform scan based on provider
      switch (settings.primaryScanProvider) {
        case 'clamav':
          scanResult = await this.scanWithClamAV(filePath);
          break;
        case 'virustotal':
          scanResult = await this.scanWithVirusTotal(filePath);
          break;
        case 'defender':
          scanResult = await this.scanWithDefender(filePath);
          break;
        default:
          scanResult = await this.scanWithClamAV(filePath);
      }

      const scanDuration = Date.now() - scanStartTime;
      scanResult.scanDuration = scanDuration;

      // Update scan log with results
      await db
        .update(fileSecurityScans)
        .set({
          scanStatus: scanResult.isClean ? 'clean' : 'infected',
          scanCompleted: new Date(),
          scanDuration,
          threatsDetected: scanResult.threats,
          threatCount: scanResult.threats.length,
          threatSeverity: scanResult.threats.length > 0 ? 
            scanResult.threats.reduce((max, threat) => {
              const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
              return severityOrder[threat.severity] > severityOrder[max] ? threat.severity : max;
            }, 'low' as const) : null,
          actionTaken: scanResult.isClean ? 'allowed' : (settings.quarantineOnThreatDetection ? 'quarantined' : 'allowed'),
          errorMessage: scanResult.errorMessage,
        })
        .where(eq(fileSecurityScans.id, scanLog.id));

      // Quarantine file if threats detected and quarantine is enabled
      if (!scanResult.isClean && settings.quarantineOnThreatDetection) {
        await this.quarantineFile(filePath, scanLog.id, organizationId);
      }

      return scanResult;

    } catch (error) {
      console.error('File scan error:', error);
      return {
        isClean: false,
        threats: [{
          name: 'Scan Error',
          severity: 'high',
          description: `Failed to scan file: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        scanProvider: settings.primaryScanProvider,
        scanDuration: Date.now() - scanStartTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * ClamAV scanning implementation
   */
  private async scanWithClamAV(filePath: string): Promise<SecurityScanResult> {
    try {
      const NodeClam = require('clamscan');
      const clamscan = await new NodeClam().init({
        removeInfected: false,
        quarantineInfected: false,
        scanLog: null,
        debugMode: false,
        fileList: null,
        scanRecursively: false,
        clamscan: {
          path: '/usr/bin/clamscan',
          scanArchives: true,
          active: true
        },
        clamdscan: {
          socket: false,
          host: false,
          port: false,
          timeout: 30000,
          localFallback: true,
          path: '/usr/bin/clamdscan',
          configFile: null,
          multiscan: true,
          reloadDb: false,
          active: true,
          bypassTest: false,
        },
        preference: 'clamdscan'
      });

      const scanResult = await clamscan.scanFile(filePath);

      return {
        isClean: scanResult.isInfected === false,
        threats: scanResult.isInfected ? [{
          name: scanResult.viruses[0] || 'Unknown virus',
          severity: 'high' as const,
          description: `Virus detected: ${scanResult.viruses.join(', ')}`
        }] : [],
        scanProvider: 'clamav',
        scanDuration: 0
      };

    } catch (error) {
      console.warn('ClamAV not available, using basic scan:', error);
      return this.basicFileScan(filePath);
    }
  }

  /**
   * VirusTotal scanning (requires API key)
   */
  private async scanWithVirusTotal(filePath: string): Promise<SecurityScanResult> {
    // This would require VirusTotal API integration
    console.log('VirusTotal scanning not implemented, falling back to basic scan');
    return this.basicFileScan(filePath);
  }

  /**
   * Windows Defender scanning
   */
  private async scanWithDefender(filePath: string): Promise<SecurityScanResult> {
    // This would require Windows Defender integration
    console.log('Windows Defender scanning not implemented, falling back to basic scan');
    return this.basicFileScan(filePath);
  }

  /**
   * Basic file scanning (fallback)
   */
  private async basicFileScan(filePath: string): Promise<SecurityScanResult> {
    try {
      const buffer = await fs.readFile(filePath);
      const threats: Array<{name: string; severity: 'low' | 'medium' | 'high' | 'critical'; description: string}> = [];

      // Check for suspicious patterns in file content
      const suspiciousPatterns = [
        { pattern: /MZ[\x00-\xFF]{58}PE/g, name: 'PE_Executable', severity: 'high' as const },
        { pattern: /<script[^>]*>[\s\S]*?<\/script>/gi, name: 'Embedded_Script', severity: 'medium' as const },
        { pattern: /eval\s*\(/gi, name: 'Dynamic_Code_Execution', severity: 'medium' as const },
        { pattern: /document\.write\s*\(/gi, name: 'DOM_Manipulation', severity: 'low' as const },
      ];

      for (const { pattern, name, severity } of suspiciousPatterns) {
        if (pattern.test(buffer.toString('utf8', 0, Math.min(buffer.length, 10000)))) {
          threats.push({
            name,
            severity,
            description: `Suspicious pattern detected: ${name}`
          });
        }
      }

      return {
        isClean: threats.length === 0,
        threats,
        scanProvider: 'basic',
        scanDuration: 0
      };

    } catch (error) {
      return {
        isClean: false,
        threats: [{
          name: 'Scan_Error',
          severity: 'high',
          description: `Failed to perform basic scan: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        scanProvider: 'basic',
        scanDuration: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Quarantine infected file
   */
  private async quarantineFile(filePath: string, scanLogId: number, organizationId: number): Promise<void> {
    try {
      const quarantineDir = path.join(process.cwd(), 'quarantine', `org-${organizationId}`);
      await fs.mkdir(quarantineDir, { recursive: true });

      const fileName = path.basename(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const quarantinePath = path.join(quarantineDir, `${timestamp}-${fileName}`);

      await fs.rename(filePath, quarantinePath);

      // Update scan log with quarantine path
      await db
        .update(fileSecurityScans)
        .set({ quarantinePath })
        .where(eq(fileSecurityScans.id, scanLogId));

      console.log(`File quarantined: ${quarantinePath}`);
    } catch (error) {
      console.error('Failed to quarantine file:', error);
    }
  }

  /**
   * Log file access for security monitoring
   */
  async logFileAccess(params: {
    fileId?: number;
    fileName: string;
    filePath: string;
    userId?: number;
    organizationId: number;
    accessType: 'view' | 'download' | 'share' | 'upload' | 'delete';
    accessMethod?: 'web' | 'api' | 'mobile';
    ipAddress?: string;
    userAgent?: string;
    shareToken?: string;
    latitude?: string;
    longitude?: string;
    suspiciousActivity?: boolean;
    accessDenied?: boolean;
    denialReason?: string;
  }): Promise<void> {
    try {
      await db.insert(fileAccessLogs).values({
        ...params,
        accessMethod: params.accessMethod || 'web',
      });
    } catch (error) {
      console.error('Failed to log file access:', error);
    }
  }

  /**
   * Check if file access should be allowed
   */
  async checkFileAccess(
    filePath: string,
    userId: number | undefined,
    organizationId: number,
    ipAddress?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const settings = await this.getSecuritySettings(organizationId);

    // Check authentication requirement
    if (settings.requireAuthentication && !userId) {
      return { allowed: false, reason: 'Authentication required' };
    }

    // Check if file exists and is not quarantined
    try {
      await fs.access(filePath);
      
      // Check if file is in quarantine
      if (filePath.includes('/quarantine/')) {
        return { allowed: false, reason: 'File is quarantined' };
      }

      return { allowed: true };
    } catch {
      return { allowed: false, reason: 'File not found' };
    }
  }

  /**
   * Get file security statistics for organization
   */
  async getSecurityStats(organizationId: number, days: number = 30) {
    const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    const [scanStats, accessStats] = await Promise.all([
      db
        .select()
        .from(fileSecurityScans)
        .where(eq(fileSecurityScans.organizationId, organizationId)),
      
      db
        .select()
        .from(fileAccessLogs)
        .where(eq(fileAccessLogs.organizationId, organizationId))
    ]);

    const recentScans = scanStats.filter(scan => 
      scan.createdAt && scan.createdAt >= since
    );

    const recentAccess = accessStats.filter(access => 
      access.createdAt >= since
    );

    return {
      totalScans: scanStats.length,
      recentScans: recentScans.length,
      threatsDetected: scanStats.filter(scan => scan.threatCount > 0).length,
      quarantinedFiles: scanStats.filter(scan => scan.actionTaken === 'quarantined').length,
      totalAccess: accessStats.length,
      recentAccess: recentAccess.length,
      suspiciousActivity: accessStats.filter(access => access.suspiciousActivity).length,
      deniedAccess: accessStats.filter(access => access.accessDenied).length,
    };
  }
}

export const fileSecurityService = FileSecurityService.getInstance();