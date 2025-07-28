#!/usr/bin/env node

/**
 * Create Test User for Authentication Testing
 */

const bcrypt = require('bcryptjs');
const { db } = require('./server/db');
const { users } = require('./shared/schema');

async function createTestUser() {
  try {
    console.log('🔐 Creating test user for authentication...');
    
    const hashedPassword = await bcrypt.hash('testpass123', 12);
    
    const [user] = await db
      .insert(users)
      .values({
        username: 'testuser',
        email: 'test@profieldmanager.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: 'admin',
        organizationId: 1,
        isActive: true
      })
      .returning();
    
    console.log('✅ Test user created successfully:');
    console.log('📧 Email: test@profieldmanager.com');
    console.log('🔑 Password: testpass123');
    console.log('👤 Username: testuser');
    console.log('🆔 User ID:', user.id);
    
    return user;
  } catch (error) {
    if (error.message.includes('duplicate')) {
      console.log('ℹ️ Test user already exists');
      console.log('📧 Email: test@profieldmanager.com');
      console.log('🔑 Password: testpass123');
      console.log('👤 Username: testuser');
    } else {
      console.error('❌ Error creating test user:', error.message);
    }
  }
}

createTestUser().catch(console.error);