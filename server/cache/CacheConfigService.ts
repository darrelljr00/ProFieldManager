import { db } from '../db';
import { sql } from 'drizzle-orm';

interface CacheConfig {
  notificationCacheTtl: number;
  messageCacheTtl: number;
  sidebarPollingInterval: number;
  notificationCacheEnabled: boolean;
  messageCacheEnabled: boolean;
}

class CacheConfigService {
  private config: Map<number, CacheConfig> = new Map();
  private globalDefaults: CacheConfig = {
    notificationCacheTtl: 30000,
    messageCacheTtl: 30000,
    sidebarPollingInterval: 30000,
    notificationCacheEnabled: true,
    messageCacheEnabled: true,
  };
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await this.loadGlobalDefaults();
    this.isInitialized = true;
  }

  async loadConfig(organizationId: number): Promise<CacheConfig> {
    await this.initialize(); // Ensure global defaults are loaded

    try {
      const result = await db.execute(sql`
        SELECT 
          COALESCE(org_settings.notification_cache_ttl, global_settings.notification_cache_ttl, 30000) as notification_cache_ttl,
          COALESCE(org_settings.message_cache_ttl, global_settings.message_cache_ttl, 30000) as message_cache_ttl,
          COALESCE(org_settings.sidebar_polling_interval, global_settings.sidebar_polling_interval, 30000) as sidebar_polling_interval,
          COALESCE(org_settings.notification_cache_enabled, global_settings.notification_cache_enabled, true) as notification_cache_enabled,
          COALESCE(org_settings.message_cache_enabled, global_settings.message_cache_enabled, true) as message_cache_enabled
        FROM (
          SELECT * FROM cache_settings WHERE organization_id IS NULL LIMIT 1
        ) as global_settings
        FULL OUTER JOIN (
          SELECT * FROM cache_settings WHERE organization_id = ${organizationId}
        ) as org_settings
        ON true
        LIMIT 1
      `);

      const config: CacheConfig = {
        notificationCacheTtl: (result[0] as any)?.notification_cache_ttl || this.globalDefaults.notificationCacheTtl,
        messageCacheTtl: (result[0] as any)?.message_cache_ttl || this.globalDefaults.messageCacheTtl,
        sidebarPollingInterval: (result[0] as any)?.sidebar_polling_interval || this.globalDefaults.sidebarPollingInterval,
        notificationCacheEnabled: (result[0] as any)?.notification_cache_enabled ?? this.globalDefaults.notificationCacheEnabled,
        messageCacheEnabled: (result[0] as any)?.message_cache_enabled ?? this.globalDefaults.messageCacheEnabled,
      };

      this.config.set(organizationId, config);
      console.log(`📝 Loaded cache config for org ${organizationId}:`, config);
      return config;
    } catch (error) {
      console.error('Error loading cache config for org', organizationId, error);
      return this.globalDefaults;
    }
  }

  async getConfig(organizationId: number): Promise<CacheConfig> {
    // Lazy load if not cached
    if (!this.config.has(organizationId)) {
      return await this.loadConfig(organizationId);
    }
    return this.config.get(organizationId)!;
  }

  clearConfig(organizationId?: number): void {
    if (organizationId) {
      this.config.delete(organizationId);
      console.log(`🗑️  Cleared config cache for org ${organizationId}`);
    } else {
      this.config.clear();
      console.log('🗑️  Cleared all config caches');
    }
  }

  async reloadConfig(organizationId: number): Promise<CacheConfig> {
    this.clearConfig(organizationId);
    return await this.loadConfig(organizationId);
  }

  async loadGlobalDefaults(): Promise<void> {
    try {
      const result = await db.execute(sql`
        SELECT 
          notification_cache_ttl,
          message_cache_ttl,
          sidebar_polling_interval,
          notification_cache_enabled,
          message_cache_enabled
        FROM cache_settings
        WHERE organization_id IS NULL
        LIMIT 1
      `);

      if (result[0]) {
        this.globalDefaults = {
          notificationCacheTtl: (result[0] as any).notification_cache_ttl,
          messageCacheTtl: (result[0] as any).message_cache_ttl,
          sidebarPollingInterval: (result[0] as any).sidebar_polling_interval,
          notificationCacheEnabled: (result[0] as any).notification_cache_enabled,
          messageCacheEnabled: (result[0] as any).message_cache_enabled,
        };
        console.log('📝 Loaded global cache defaults:', this.globalDefaults);
      }
    } catch (error) {
      console.error('Error loading global cache defaults:', error);
    }
  }
}

export const cacheConfigService = new CacheConfigService();
