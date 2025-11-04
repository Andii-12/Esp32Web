// Quick test script to verify ESP32 connection
// Run with: node test-connection.js

const http = require('http');

const testData = {
  room_id: 1,
  temperature: 25.5,
  humidity: 60.0,
  motion: 0,
  rain: 0,
  gas: 0,
  ts: Date.now()
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/esp32/public/room',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing ESP32 endpoint...');
console.log('Sending:', testData);

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    if (res.statusCode === 201) {
      console.log('✅ SUCCESS! Endpoint is working correctly.');
    } else {
      console.log('❌ ERROR: Unexpected status code');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection Error:', error.message);
  console.log('Make sure the backend server is running: cd backend && npm start');
});

req.write(postData);
req.end();

