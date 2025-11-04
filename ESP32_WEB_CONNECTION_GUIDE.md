# ESP32 Admin to Web Server Connection Guide

This guide explains how to connect your ESP32 admin (receiver) to the web server.

## Connection Overview

The admin ESP32 connects to the web server using **WiFi and HTTP POST requests**:

```
ESP32 Admin → WiFi Network → Web Server (Node.js) → MongoDB
```

## Step-by-Step Setup

### Step 1: Configure WiFi on Admin ESP32

1. Open `esp32-code/admin-receiver.ino` in Arduino IDE

2. Find and update these lines (around line 10-13):
```cpp
#define WIFI_SSID "YOUR_WIFI_SSID"        // Your WiFi network name
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD" // Your WiFi password
```

3. Replace with your actual WiFi credentials:
```cpp
#define WIFI_SSID "MyHomeWiFi"
#define WIFI_PASSWORD "MyPassword123"
```

### Step 2: Find Your Web Server IP Address

You need to know your web server's IP address. Here are options:

#### Option A: Server Running on Same Computer (Local Development)

1. **Windows:**
   ```powershell
   ipconfig
   ```
   Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x)

2. **Mac/Linux:**
   ```bash
   ifconfig
   ```
   or
   ```bash
   ip addr show
   ```

3. Example: If your IP is `192.168.1.100`, your server URL will be:
   ```
   http://192.168.1.100:5000
   ```

#### Option B: Server Running on Different Computer/Server

1. Find the IP address of the computer running the Node.js server
2. Make sure both ESP32 and server are on the **same WiFi network**
3. Use that IP address in the SERVER_URL

#### Option C: Using Localhost (Only if ESP32 and Server on Same Computer)

⚠️ **This won't work!** ESP32 cannot use `localhost` or `127.0.0.1`. You must use the actual IP address.

### Step 3: Configure Server URL in Admin ESP32 Code

1. Find this line in `admin-receiver.ino` (around line 14):
```cpp
#define SERVER_URL "http://YOUR_SERVER_IP:5000/api/esp32/public/batch"
```

2. Replace `YOUR_SERVER_IP` with your actual server IP:
```cpp
// Example 1: Local development
#define SERVER_URL "http://192.168.1.100:5000/api/esp32/public/batch"

// Example 2: Using domain name (if you have one)
#define SERVER_URL "http://myserver.com:5000/api/esp32/public/batch"

// Example 3: Different port (if you changed backend port)
#define SERVER_URL "http://192.168.1.100:3001/api/esp32/public/batch"
```

### Step 4: Start Your Web Server

1. **Start MongoDB** (if running locally):
   ```bash
   # Windows
   net start MongoDB

   # Mac/Linux
   sudo systemctl start mongod
   # or
   mongod
   ```

2. **Start Backend Server:**
   ```bash
   cd backend
   npm install  # If not already done
   npm start
   ```

   You should see:
   ```
   MongoDB connected successfully
   Server running on port 5000
   ```

3. **Verify Server is Running:**
   - Open browser: `http://localhost:5000/api/esp32/public`
   - You might get an error (that's OK, it means server is running)
   - Or test with: `http://YOUR_SERVER_IP:5000/api/esp32/public`

### Step 5: Upload Code to Admin ESP32

1. Connect admin ESP32 to your computer via USB
2. Select the correct board in Arduino IDE:
   - Tools → Board → ESP32 Arduino → (select your ESP32 model)
3. Select the correct port:
   - Tools → Port → (select COM port on Windows or /dev/ttyUSB* on Mac/Linux)
4. Click Upload
5. Open Serial Monitor (115200 baud) to see connection status

### Step 6: Test the Connection

1. **Check Serial Monitor Output:**

   You should see:
   ```
   ESP32 Admin Receiver Starting...
   Admin ID: ADMIN_001
   Connecting to WiFi: MyHomeWiFi
   ......
   WiFi Connected!
   IP Address: 192.168.1.50
   MAC Address: XX:XX:XX:XX:XX:XX
   ESP-NOW Receiver Ready!
   ```

2. **When Data is Received from Sensor Nodes:**
   ```
   === Data Received ===
   From MAC: XX:XX:XX:XX:XX:XX
   Node ID: NODE_001
   Temperature: 25.5 °C
   ...
   ====================
   ```

3. **When Data is Sent to Server:**
   ```
   === Sending to Server ===
   URL: http://192.168.1.100:5000/api/esp32/public/batch
   HTTP Response code: 201
   Response: {"success":true,"message":"Processed 2 records",...}
   Data sent successfully!
   =======================
   ```

### Step 7: Verify Data in Web Dashboard

1. Start your React frontend:
   ```bash
   cd frontend
   npm install  # If not already done
   npm start
   ```

2. Open browser: `http://localhost:3000`
3. Login to your account
4. You should see data from your sensor nodes appearing in the dashboard

## Troubleshooting

### Problem: WiFi Connection Failed

**Symptoms:**
```
Connecting to WiFi: MyHomeWiFi
....................
WiFi Connection Failed!
```

**Solutions:**
1. ✅ Check WiFi SSID and password are correct (case-sensitive)
2. ✅ Make sure ESP32 is within WiFi range
3. ✅ Verify WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
4. ✅ Check WiFi credentials don't have special characters
5. ✅ Try restarting ESP32 (unplug and replug)

### Problem: Cannot Connect to Server

**Symptoms:**
```
Error sending data: -1
or
HTTP Response code: -1
```

**Solutions:**
1. ✅ Verify server is running (check backend terminal)
2. ✅ Check server IP address is correct
3. ✅ Make sure ESP32 and server are on **same WiFi network**
4. ✅ Check firewall isn't blocking port 5000
5. ✅ Verify MongoDB is running (if using local MongoDB)
6. ✅ Test server URL in browser: `http://YOUR_SERVER_IP:5000/api/esp32/public`

### Problem: Server Connection Timeout

**Symptoms:**
```
Error sending data: -11
```

**Solutions:**
1. ✅ Increase timeout in code (if needed)
2. ✅ Check server is accessible from another device on same network
3. ✅ Verify port 5000 is not blocked by router/firewall
4. ✅ Try pinging server IP from another device

### Problem: HTTP 400 or 500 Error

**Symptoms:**
```
HTTP Response code: 400
or
HTTP Response code: 500
```

**Solutions:**
1. ✅ Check server logs for error details
2. ✅ Verify JSON payload format is correct
3. ✅ Check MongoDB connection (backend terminal)
4. ✅ Verify data structure matches API requirements

### Problem: Data Not Appearing in Dashboard

**Solutions:**
1. ✅ Check backend terminal for incoming requests
2. ✅ Verify data is being saved to MongoDB:
   ```bash
   # Connect to MongoDB
   mongosh
   use esp32data
   db.esp32datas.find().pretty()
   ```
3. ✅ Check frontend is calling correct API endpoint
4. ✅ Verify authentication token is valid
5. ✅ Check browser console for errors

## Testing Connection Manually

You can test the server connection manually using curl or Postman:

### Test Single Endpoint:
```bash
curl -X POST http://YOUR_SERVER_IP:5000/api/esp32/public \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "TEST_NODE",
    "adminId": "ADMIN_001",
    "temperature": 25.5,
    "gas": 45.2,
    "waterLevel": 60.0,
    "motion": false,
    "soilMoisture": 75.5
  }'
```

### Test Batch Endpoint:
```bash
curl -X POST http://YOUR_SERVER_IP:5000/api/esp32/public/batch \
  -H "Content-Type: application/json" \
  -d '{
    "adminId": "ADMIN_001",
    "sensorData": [
      {
        "nodeId": "NODE_001",
        "temperature": 25.5,
        "gas": 45.2,
        "waterLevel": 60.0,
        "motion": true,
        "soilMoisture": 75.5
      },
      {
        "nodeId": "NODE_002",
        "temperature": 24.3,
        "gas": 42.1,
        "waterLevel": 55.0,
        "motion": false,
        "soilMoisture": 70.0
      }
    ]
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Processed 2 records",
  "saved": 2,
  "errors": 0,
  "data": [...]
}
```

## Network Requirements

### Same Network Required
⚠️ **Important:** The ESP32 admin and web server must be on the **same local network** (same WiFi) for direct IP connection.

### If Using Different Networks
If ESP32 and server are on different networks, you need:
- Public IP address for server
- Port forwarding configured on router
- Or use a cloud service (AWS, Heroku, etc.)

## Security Note

The `/api/esp32/public` endpoint is intentionally public (no authentication) so ESP32 devices can send data without credentials. For production, consider:
- Adding API key authentication
- Using HTTPS
- Implementing rate limiting
- Adding IP whitelist

## Quick Checklist

- [ ] WiFi SSID and password configured in admin ESP32 code
- [ ] Server IP address identified and configured
- [ ] Backend server running on port 5000
- [ ] MongoDB running and connected
- [ ] ESP32 and server on same WiFi network
- [ ] Code uploaded to admin ESP32
- [ ] Serial Monitor shows WiFi connected
- [ ] Serial Monitor shows successful HTTP requests
- [ ] Data appears in MongoDB
- [ ] Dashboard displays data

## Next Steps

Once connection is working:
1. Configure sensor nodes to send data to admin ESP32
2. Monitor Serial Monitor for data flow
3. Check dashboard for real-time updates
4. Set up alerts/notifications if needed

