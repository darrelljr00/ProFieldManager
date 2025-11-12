import memoizee from 'memoizee';
import { NotificationService } from '../notificationService';

// ============================================================================
// Cached Notification Unread Count
// ============================================================================

const _getNotificationUnreadCount = async (userId: number, organizationId: number): Promise<number> => {
  return NotificationService.getUnreadCount(userId, organizationId);
};

export const getCachedNotificationUnreadCount = memoizee(_getNotificationUnreadCount, {
  promise: true,
  maxAge: 30000, // 30 seconds
  normalizer: (args) => {
    const [userId, organizationId] = args;
    return `notification:${userId}:${organizationId}`;
  },
});

export const invalidateNotificationUnreadCount = (userId: number, organizationId: number) => {
  const normalizedKey = `notification:${userId}:${organizationId}`;
  getCachedNotificationUnreadCount.delete(normalizedKey);
  console.log(`🗑️  Invalidated notification cache for user ${userId}:${organizationId}`);
};

// ============================================================================
// Cached Internal Messages (Full List)
// ============================================================================

const _getInternalMessages = async (userId: number, storage: any): Promise<any[]> => {
  return storage.getInternalMessages(userId);
};

export const getCachedInternalMessages = memoizee(_getInternalMessages, {
  promise: true,
  maxAge: 30000, // 30 seconds
  normalizer: (args) => {
    const [userId] = args;
    return `messages:${userId}`;
  },
});

export const invalidateInternalMessages = (userId: number, storage: any) => {
  const normalizedKey = `messages:${userId}`;
  getCachedInternalMessages.delete(normalizedKey);
  console.log(`🗑️  Invalidated messages cache for user ${userId}`);
};

// ============================================================================
// Cache Invalidation Helpers
// ============================================================================

// Call this after any notification mutation (mark read, create, etc.)
export const invalidateNotificationCache = (userId: number, organizationId: number) => {
  invalidateNotificationUnreadCount(userId, organizationId);
};

// Call this after any message mutation (mark read, send message, etc.)
export const invalidateMessageCache = (userId: number, storage: any) => {
  invalidateInternalMessages(userId, storage);
};

// Clear all caches (useful for testing or debugging)
export const clearAllQueryCaches = () => {
  getCachedNotificationUnreadCount.clear();
  getCachedInternalMessages.clear();
  console.log('🗑️  Cleared all query caches');
};
