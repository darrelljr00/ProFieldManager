#!/usr/bin/env node

/**
 * Mobile App OTA Update Deployment Script
 * 
 * This script automates the deployment of Over-The-Air updates
 * for the Pro Field Manager mobile app using Expo EAS Updates.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  MOBILE_DIR: path.join(__dirname, '../mobile/expo-app'),
  CHANNELS: {
    development: 'development',
    preview: 'preview', 
    production: 'production'
  },
  DEFAULT_CHANNEL: 'production'
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      stdio: 'inherit',
      cwd: CONFIG.MOBILE_DIR,
      ...options
    });
    return result;
  } catch (error) {
    log(`❌ Command failed: ${command}`, 'red');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

function validateEnvironment() {
  log('🔍 Validating environment...', 'blue');

  // Check if we're in the mobile directory
  if (!fs.existsSync(CONFIG.MOBILE_DIR)) {
    log(`❌ Mobile app directory not found: ${CONFIG.MOBILE_DIR}`, 'red');
    process.exit(1);
  }

  // Check if app.json exists
  const appJsonPath = path.join(CONFIG.MOBILE_DIR, 'app.json');
  if (!fs.existsSync(appJsonPath)) {
    log('❌ app.json not found. Please set up Expo project first.', 'red');
    process.exit(1);
  }

  // Check if EAS is configured
  const easJsonPath = path.join(CONFIG.MOBILE_DIR, 'eas.json');
  if (!fs.existsSync(easJsonPath)) {
    log('❌ eas.json not found. Running EAS configuration...', 'yellow');
    execCommand('eas build:configure');
    execCommand('eas update:configure');
  }

  log('✅ Environment validation complete', 'green');
}

function getAppVersion() {
  try {
    const appJsonPath = path.join(CONFIG.MOBILE_DIR, 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    return appJson.expo.version;
  } catch (error) {
    log('⚠️ Could not read app version, using default', 'yellow');
    return '1.0.0';
  }
}

function updateAppVersion() {
  try {
    const appJsonPath = path.join(CONFIG.MOBILE_DIR, 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    const currentVersion = appJson.expo.version;
    const versionParts = currentVersion.split('.');
    const patchVersion = parseInt(versionParts[2]) + 1;
    const newVersion = `${versionParts[0]}.${versionParts[1]}.${patchVersion}`;
    
    appJson.expo.version = newVersion;
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
    
    log(`📝 Updated app version: ${currentVersion} → ${newVersion}`, 'green');
    return newVersion;
  } catch (error) {
    log(`⚠️ Could not update app version: ${error.message}`, 'yellow');
    return getAppVersion();
  }
}

function deployUpdate(channel, message, autoVersion = true) {
  log(`\n🚀 Deploying OTA update to ${channel} channel...`, 'magenta');
  
  const version = autoVersion ? updateAppVersion() : getAppVersion();
  const timestamp = new Date().toISOString();
  const finalMessage = message || `Auto-update v${version} - ${timestamp}`;

  log(`📦 Version: ${version}`, 'cyan');
  log(`📢 Message: ${finalMessage}`, 'cyan');
  log(`📡 Channel: ${channel}`, 'cyan');

  // Deploy the update
  const updateCommand = `eas update --branch ${channel} --message "${finalMessage}"`;
  
  log(`\n⚡ Executing: ${updateCommand}`, 'blue');
  execCommand(updateCommand);

  log(`\n✅ OTA update deployed successfully!`, 'green');
  log(`🎯 Users on the ${channel} channel will receive this update automatically.`, 'green');
}

function showUsage() {
  log('\n📱 Pro Field Manager - Mobile OTA Update Deployment', 'magenta');
  log('\nUsage:', 'yellow');
  log('  node scripts/deploy-mobile-update.js [channel] [message]', 'cyan');
  log('\nChannels:', 'yellow');
  log('  development - For testing and development', 'cyan');
  log('  preview     - For internal testing and staging', 'cyan');  
  log('  production  - For live users (default)', 'cyan');
  log('\nExamples:', 'yellow');
  log('  node scripts/deploy-mobile-update.js', 'cyan');
  log('  node scripts/deploy-mobile-update.js production "Bug fixes and improvements"', 'cyan');
  log('  node scripts/deploy-mobile-update.js preview "Testing new features"', 'cyan');
  log('\nFeatures:', 'yellow');
  log('  ✨ Automatic version bumping', 'green');
  log('  🔄 OTA updates without APK rebuild', 'green');
  log('  📱 Instant deployment to user devices', 'green');
  log('  🎯 Channel-based deployment control', 'green');
  log('  📊 Update tracking and monitoring', 'green');
}

function main() {
  const args = process.argv.slice(2);
  
  // Show help if requested
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    return;
  }

  log('🚀 Pro Field Manager - Mobile OTA Update Deployment\n', 'magenta');

  // Parse arguments
  const channel = args[0] || CONFIG.DEFAULT_CHANNEL;
  const message = args[1];

  // Validate channel
  if (!Object.values(CONFIG.CHANNELS).includes(channel)) {
    log(`❌ Invalid channel: ${channel}`, 'red');
    log(`Available channels: ${Object.values(CONFIG.CHANNELS).join(', ')}`, 'yellow');
    process.exit(1);
  }

  // Validate environment and deploy
  validateEnvironment();
  deployUpdate(channel, message);

  // Show next steps
  log('\n📋 Next Steps:', 'yellow');
  log('1. 📱 Users will receive the update automatically on next app launch', 'cyan');
  log('2. 🔄 Updates apply after app restart (not immediate)', 'cyan');
  log('3. 📊 Monitor update adoption in Expo dashboard', 'cyan');
  log('4. 🐛 If issues arise, deploy a hotfix with the same command', 'cyan');
  
  log('\n💡 Tips:', 'yellow');
  log('• Test updates on preview channel before production', 'cyan');
  log('• Use descriptive commit messages for tracking', 'cyan');
  log('• Monitor app analytics after deployment', 'cyan');
  log('• Keep update sizes small for faster downloads', 'cyan');
}

// Handle unhandled errors
process.on('uncaughtException', (error) => {
  log(`❌ Uncaught Exception: ${error.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`, 'red');
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  deployUpdate,
  validateEnvironment,
  updateAppVersion,
  CONFIG
};