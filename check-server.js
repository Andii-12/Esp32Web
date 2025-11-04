// Quick script to check if server is accessible
// Run: node check-server.js

const http = require('http');
const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();

console.log('=== Server Connection Check ===\n');
console.log('Your local IP address:', localIP);
console.log('ESP32 should connect to:', `http://${localIP}:5000/api/esp32/public/room`);
console.log('\nTesting server...\n');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/esp32/public/room',
  method: 'GET',
  timeout: 3000
};

const req = http.request(options, (res) => {
  console.log('✅ Server is running!');
  console.log('Status Code:', res.statusCode);
  console.log('\n✅ ESP32 should use this URL:');
  console.log(`   http://${localIP}:5000/api/esp32/public/room`);
  process.exit(0);
});

req.on('error', (error) => {
  console.error('❌ Server is NOT running or not accessible');
  console.error('Error:', error.message);
  console.log('\n👉 Start the server:');
  console.log('   cd backend');
  console.log('   npm start');
  process.exit(1);
});

req.on('timeout', () => {
  console.error('❌ Connection timeout');
  console.log('👉 Server might not be running');
  req.destroy();
  process.exit(1);
});

req.end();

