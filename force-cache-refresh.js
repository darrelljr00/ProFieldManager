// Force cache refresh for missing images display
import { queryClient } from './client/src/lib/queryClient.js';

console.log('🔄 Forcing cache refresh for project 49 files...');

// Clear all project-related caches
const cacheKeys = [
  ['/api/projects', 49, 'files'],
  ['/api/projects', 49],
  ['/api/projects'],
  ['projects']
];

cacheKeys.forEach(key => {
  try {
    queryClient.invalidateQueries({ queryKey: key });
    console.log('✅ Invalidated cache for:', key);
  } catch (error) {
    console.log('⚠️ Could not invalidate:', key, error.message);
  }
});

console.log('🔄 Cache refresh completed');