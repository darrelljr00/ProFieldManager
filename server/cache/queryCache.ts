import { NotificationService } from '../notificationService';
import { cacheConfigService } from './CacheConfigService';

// ============================================================================
// Simple Map-based Cache with Dynamic TTL
// ============================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class QueryCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();

  get(key: string, ttl: number): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T, ttl: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  deleteByPrefix(prefix: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(prefix));
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    const entriesToDelete = Array.from(this.cache.entries()).filter(([_, entry]) => now > entry.expiresAt);
    for (const [key] of entriesToDelete) {
      this.cache.delete(key);
    }
  }
}

// ============================================================================
// Notification Unread Count Cache
// ============================================================================

const notificationCache = new QueryCache<number>();

export const getCachedNotificationUnreadCount = async (userId: number, organizationId: number): Promise<number> => {
  const config = await cacheConfigService.getConfig(organizationId);
  
  // If caching is disabled, bypass cache
  if (!config.notificationCacheEnabled) {
    return await NotificationService.getUnreadCount(userId, organizationId);
  }

  const cacheKey = `notification:${userId}:${organizationId}`;
  const cached = notificationCache.get(cacheKey, config.notificationCacheTtl);

  if (cached !== null) {
    return cached;
  }

  const result = await NotificationService.getUnreadCount(userId, organizationId);
  notificationCache.set(cacheKey, result, config.notificationCacheTtl);
  
  return result;
};

export const invalidateNotificationUnreadCount = (userId: number, organizationId: number) => {
  const cacheKey = `notification:${userId}:${organizationId}`;
  notificationCache.delete(cacheKey);
  console.log(`🗑️  Invalidated notification cache for user ${userId}:${organizationId}`);
};

// ============================================================================
// Internal Messages Cache
// ============================================================================

const messagesCache = new QueryCache<any[]>();

export const getCachedInternalMessages = async (userId: number, storage: any, organizationId: number): Promise<any[]> => {
  const config = await cacheConfigService.getConfig(organizationId);
  
  // If caching is disabled, bypass cache
  if (!config.messageCacheEnabled) {
    return await storage.getInternalMessages(userId);
  }

  // Include organizationId in cache key for multi-tenant isolation
  const cacheKey = `messages:${userId}:${organizationId}`;
  const cached = messagesCache.get(cacheKey, config.messageCacheTtl);

  if (cached !== null) {
    return cached;
  }

  const result = await storage.getInternalMessages(userId);
  messagesCache.set(cacheKey, result, config.messageCacheTtl);
  
  return result;
};

export const invalidateInternalMessages = (userId: number, organizationId: number) => {
  const cacheKey = `messages:${userId}:${organizationId}`;
  messagesCache.delete(cacheKey);
  console.log(`🗑️  Invalidated messages cache for user ${userId}:${organizationId}`);
};

// ============================================================================
// Cache Invalidation Helpers
// ============================================================================

// Call this after any notification mutation (mark read, create, etc.)
export const invalidateNotificationCache = (userId: number, organizationId: number) => {
  invalidateNotificationUnreadCount(userId, organizationId);
};

// Call this after any message mutation (mark read, send message, etc.)
export const invalidateMessageCache = (userId: number, organizationId: number) => {
  invalidateInternalMessages(userId, organizationId);
};

// Clear all caches (useful for testing or debugging)
export const clearAllQueryCaches = () => {
  notificationCache.clear();
  messagesCache.clear();
  console.log('🗑️  Cleared all query caches');
};

// Clear caches for a specific organization (when settings change)
export const clearOrganizationCaches = (organizationId: number) => {
  // Delete all notification cache entries for this org
  const notificationKeys = Array.from(notificationCache['cache'].keys()).filter(key => 
    key.endsWith(`:${organizationId}`)
  );
  for (const key of notificationKeys) {
    notificationCache.delete(key);
  }
  
  // Delete all message cache entries for this org
  const messageKeys = Array.from(messagesCache['cache'].keys()).filter(key => 
    key.endsWith(`:${organizationId}`)
  );
  for (const key of messageKeys) {
    messagesCache.delete(key);
  }
  
  console.log(`🗑️  Cleared ${notificationKeys.length + messageKeys.length} cache entries for organization ${organizationId}`);
};

// Cleanup expired entries periodically
setInterval(() => {
  notificationCache.cleanup();
  messagesCache.cleanup();
}, 60000); // Every minute
