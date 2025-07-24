#!/usr/bin/env tsx
/**
 * File Migration Script - Move files from Replit ephemeral storage to AWS S3
 * This script solves the disappearing images issue by migrating to permanent cloud storage
 */

import { fileManager } from './fileManager';
import { s3Service } from './s3Service';
import { storage } from './storage';

async function runMigration() {
  console.log('🚀 Starting file migration to AWS S3...');
  console.log('This will solve the disappearing images issue permanently.');
  
  try {
    // Check S3 configuration
    if (!s3Service.isConfigured()) {
      console.error('❌ AWS S3 not configured. Please set environment variables:');
      console.error('   AWS_ACCESS_KEY_ID');
      console.error('   AWS_SECRET_ACCESS_KEY');
      console.error('   AWS_S3_BUCKET_NAME');
      console.error('   AWS_REGION');
      process.exit(1);
    }

    console.log('✅ S3 configuration verified');
    
    // Run the migration
    const result = await fileManager.migrateToS3();
    
    console.log('\n📊 Migration Results:');
    console.log(`   Files migrated: ${result.migrated}`);
    console.log(`   Files failed: ${result.failed}`);
    console.log(`   Total processed: ${result.results.length}`);
    
    if (result.migrated > 0) {
      console.log('\n✅ File persistence issue resolved!');
      console.log('   Your files are now stored permanently on AWS S3');
      console.log('   They will never disappear due to Replit storage limitations');
      
      // Optionally clean up local files
      const cleanup = process.env.CLEANUP_LOCAL_FILES === 'true';
      if (cleanup) {
        console.log('\n🧹 Cleaning up local files...');
        await fileManager.cleanupLocalFiles(result.results.filter(r => r.success));
        console.log('✅ Local file cleanup complete');
      }
    }
    
    if (result.failed > 0) {
      console.log('\n⚠️  Some files failed to migrate:');
      result.results
        .filter(r => !r.success)
        .forEach(r => console.log(`   - ${r.fileName}: ${r.error}`));
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('🎉 Migration complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration error:', error);
      process.exit(1);
    });
}

export { runMigration };