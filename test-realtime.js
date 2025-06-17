// Real-time notification demonstration script
const WebSocket = require('ws');

console.log('Testing WebSocket real-time notifications...');

// Connect to the WebSocket server
const ws = new WebSocket('ws://localhost:5000/ws');

ws.on('open', () => {
  console.log('✓ WebSocket connected successfully');
  
  // Authenticate as a test user
  ws.send(JSON.stringify({
    type: 'auth',
    userId: 999,
    username: 'demo-user',
    userType: 'web'
  }));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📨 Received WebSocket message:', message);
    
    if (message.type === 'auth_success') {
      console.log('✓ WebSocket authenticated successfully');
    } else if (message.type === 'update') {
      console.log(`🔔 Real-time notification: ${message.eventType}`);
      console.log(`   Data:`, message.data);
    }
  } catch (error) {
    console.error('Error parsing WebSocket message:', error);
  }
});

ws.on('close', () => {
  console.log('❌ WebSocket connection closed');
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Keep the script running
setTimeout(() => {
  console.log('Demo listener running - create any record in the web interface to see real-time notifications');
}, 2000);