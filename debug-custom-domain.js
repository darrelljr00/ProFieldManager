#!/usr/bin/env node

/**
 * Custom Domain Upload Diagnostic Tool
 * This script helps diagnose and fix upload issues on profieldmanager.com
 */

console.log('🔍 CUSTOM DOMAIN UPLOAD DIAGNOSTIC TOOL');
console.log('=====================================');

// Check Cloudinary configuration
console.log('\n1. CLOUDINARY CONFIGURATION:');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING');

// Test Cloudinary connectivity
async function testCloudinary() {
  try {
    const { v2: cloudinary } = require('cloudinary');
    
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    
    console.log('\n2. CLOUDINARY CONNECTIVITY TEST:');
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful:', result);
    
    return true;
  } catch (error) {
    console.log('❌ Cloudinary connection failed:', error.message);
    return false;
  }
}

// Check database connectivity
async function testDatabase() {
  try {
    console.log('\n3. DATABASE CONNECTIVITY TEST:');
    const { db } = require('./server/db');
    
    // Simple query to test connection
    const result = await db.raw('SELECT NOW() as current_time');
    console.log('✅ Database connection successful:', result.rows[0]);
    
    return true;
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return false;
  }
}

// Main diagnostic function
async function runDiagnostics() {
  console.log('\n🚀 Starting comprehensive diagnostics...\n');
  
  const cloudinaryOk = await testCloudinary();
  const databaseOk = await testDatabase();
  
  console.log('\n📊 DIAGNOSTIC RESULTS:');
  console.log('======================');
  console.log('Cloudinary:', cloudinaryOk ? '✅ OK' : '❌ FAILED');
  console.log('Database:', databaseOk ? '✅ OK' : '❌ FAILED');
  
  if (cloudinaryOk && databaseOk) {
    console.log('\n✅ All systems operational. Issue likely authentication-related.');
    console.log('💡 SOLUTION: User must login from profieldmanager.com to store auth token locally.');
  } else {
    console.log('\n❌ Infrastructure issues detected. Fix configuration before testing uploads.');
  }
}

// Run diagnostics
runDiagnostics().catch(console.error);