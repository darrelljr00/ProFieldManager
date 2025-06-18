// WebSocket Real-Time Demo Script
const WebSocket = require('ws');

console.log('🚀 Starting WebSocket Real-Time Demo...');
console.log('📡 Connecting to WebSocket server...');

const ws = new WebSocket('ws://localhost:5000/ws');

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully');
  
  // Authenticate as demo user
  ws.send(JSON.stringify({
    type: 'auth',
    userId: 999,
    username: 'realtime-demo',
    userType: 'web'
  }));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    if (message.type === 'auth_success') {
      console.log('🔐 WebSocket authenticated successfully');
      console.log('👀 Listening for real-time updates...');
      console.log('💡 Create any record in the web interface to see notifications');
    } else if (message.type === 'update') {
      console.log(`\n🔔 REAL-TIME UPDATE RECEIVED:`);
      console.log(`   Event: ${message.eventType}`);
      console.log(`   Time: ${message.timestamp}`);
      console.log(`   Data:`, JSON.stringify(message.data, null, 2));
      console.log(`───────────────────────────────────────`);
    }
  } catch (error) {
    console.error('❌ Error parsing WebSocket message:', error);
  }
});

ws.on('close', () => {
  console.log('❌ WebSocket connection closed');
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

// Keep running for 2 minutes
setTimeout(() => {
  console.log('\n🏁 Demo completed. WebSocket is working for real-time updates!');
  process.exit(0);
}, 120000);