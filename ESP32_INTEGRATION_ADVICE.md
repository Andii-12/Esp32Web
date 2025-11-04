# Integration Advice for Your ESP32 Code

## Current Status ✅

Your ESP32 code is already well-structured and has:
- ✅ WiFi connection setup
- ✅ HTTP POST functionality
- ✅ ESP-NOW receiver for sensor nodes
- ✅ Immediate forwarding to web server

## What You Need to Change

### 1. Update Server URL in Your ESP32 Code

**Current line in your code:**
```cpp
const char* SERVER_URL = "http://192.168.1.100:3000/api/ingest";
```

**Change to match our backend:**
```cpp
const char* SERVER_URL = "http://192.168.1.100:5000/api/esp32/public";
//                          ^^^^^^^^^^^^^^^^        ^^^^
//                          Your server IP      Changed port to 5000
```

**Or use batch endpoint (more efficient):**
```cpp
const char* SERVER_URL = "http://192.168.1.100:5000/api/esp32/public/batch";
```

### 2. Create New Backend Endpoint for Your Data Format

Your ESP32 sends data in this format:
```json
{
  "room_id": 1,
  "temperature": 25.5,
  "humidity": 60.0,
  "motion": 1,
  "rain": 0,
  "gas": 0,
  "ts": 1234567890
}
```

But our backend expects:
```json
{
  "nodeId": "NODE_001",
  "adminId": "ADMIN_001",
  "temperature": 25.5,
  "humidity": 60.0,
  "motion": true,
  ...
}
```

**Solution:** Create a new endpoint that accepts your format. See section below.

### 3. Update Your Server IP Address

Find your computer's IP address:

**Windows:**
```powershell
ipconfig
```
Look for IPv4 Address (e.g., `192.168.1.100`)

**Mac/Linux:**
```bash
ifconfig | grep "inet "
```

Update the IP in your ESP32 code.

### 4. Make Sure Backend Port is 5000

Your ESP32 code uses port 3000, but our backend uses port 5000 by default.

**Option A:** Change ESP32 to use port 5000 (recommended)
```cpp
const char* SERVER_URL = "http://192.168.1.100:5000/api/esp32/public";
```

**Option B:** Change backend port to 3000
- Edit `backend/.env` file:
  ```
  PORT=3000
  ```
- Restart backend server

## Create New Backend Endpoint

Add this to `backend/routes/esp32.js`:

```javascript
// Endpoint for your existing ESP32 code format
router.post('/public/room', async (req, res) => {
  try {
    const { 
      room_id, 
      temperature, 
      humidity, 
      motion, 
      rain, 
      gas, 
      ts 
    } = req.body;

    if (room_id === undefined) {
      return res.status(400).json({ message: 'room_id is required' });
    }

    // Convert your format to our database format
    const esp32Data = new Esp32Data({
      nodeId: `ROOM_${room_id}`,  // Convert room_id to nodeId format
      adminId: 'ADMIN_001',        // Or get from request if you add it
      temperature,
      humidity,
      motion: motion === 1,        // Convert 0/1 to boolean
      gas: gas === 1,              // Convert 0/1 to boolean
      // Map rain to waterLevel (0=dry, 1=wet)
      waterLevel: rain === 1 ? 100 : 0,
      timestamp: ts ? new Date(ts) : new Date(),
      receivedAt: new Date()
    });

    await esp32Data.save();

    res.status(201).json({
      success: true,
      message: 'Data received successfully',
      data: esp32Data
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
```

Then update your ESP32 code:
```cpp
const char* SERVER_URL = "http://192.168.1.100:5000/api/esp32/public/room";
```

## Testing Your Connection

### Step 1: Start Your Backend Server

```bash
cd backend
npm start
```

You should see:
```
MongoDB connected successfully
Server running on port 5000
```

### Step 2: Test Manually with curl

```bash
curl -X POST http://192.168.1.100:5000/api/esp32/public/room \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": 1,
    "temperature": 25.5,
    "humidity": 60.0,
    "motion": 1,
    "rain": 0,
    "gas": 0,
    "ts": 1234567890
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Data received successfully",
  "data": {...}
}
```

### Step 3: Check Serial Monitor

When your ESP32 sends data, you should see:
```
POST http://192.168.1.100:5000/api/esp32/public/room -> 201
```

### Step 4: Verify in Dashboard

1. Start frontend: `cd frontend && npm start`
2. Login to dashboard
3. You should see data from `ROOM_1` and `ROOM_2`

## Network Requirements

✅ **Same WiFi Network**: ESP32 and server must be on same network
✅ **WiFi SSID**: Already configured in your code (`iPhone`)
✅ **WiFi Password**: Already configured (`qwerty12345`)
✅ **Server IP**: Update `192.168.1.100` to your actual server IP

## Troubleshooting

### Problem: POST returns error code -1

**Check:**
1. ✅ Server is running (`npm start` in backend folder)
2. ✅ Server IP is correct in ESP32 code
3. ✅ Port matches (5000 in backend, 5000 in ESP32)
4. ✅ Both devices on same WiFi network
5. ✅ Firewall allows port 5000

**Test server manually:**
```bash
# Should return something (even if error)
curl http://192.168.1.100:5000/api/esp32/public/room
```

### Problem: WiFi connection timeout

**Check:**
1. ✅ WiFi SSID is correct (`iPhone`)
2. ✅ WiFi password is correct (`qwerty12345`)
3. ✅ WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
4. ✅ ESP32 is within WiFi range

### Problem: Data not appearing in dashboard

**Check:**
1. ✅ Backend terminal shows incoming requests
2. ✅ MongoDB is running
3. ✅ Data format matches endpoint expectations
4. ✅ Check MongoDB: `mongosh` → `use esp32data` → `db.esp32datas.find().pretty()`

## Recommended Changes Summary

1. **Change SERVER_URL in ESP32 code:**
   ```cpp
   const char* SERVER_URL = "http://YOUR_IP:5000/api/esp32/public/room";
   ```

2. **Add new endpoint to backend** (see code above)

3. **Update server IP** to your actual computer IP

4. **Test connection** before deploying

## Your Code Structure is Good! ✅

Your ESP32 code already has:
- ✅ Proper WiFi connection handling
- ✅ Immediate forwarding (sends data as soon as received)
- ✅ Error handling in HTTP POST
- ✅ Good data structure

Just need to:
- ✅ Match the endpoint URL
- ✅ Match the port number
- ✅ Add backend endpoint for your data format

## Quick Checklist

- [ ] Find your server IP address
- [ ] Update `SERVER_URL` in ESP32 code with correct IP and port 5000
- [ ] Add `/public/room` endpoint to backend (or use existing endpoint with adapter)
- [ ] Start backend server: `npm start` in backend folder
- [ ] Verify MongoDB is running
- [ ] Upload ESP32 code
- [ ] Check Serial Monitor for connection status
- [ ] Check backend terminal for incoming requests
- [ ] Verify data in dashboard

## Alternative: Use Existing Endpoint

If you don't want to create a new endpoint, you can modify your ESP32 code slightly to match existing format:

**In your `sendToWeb` function, change the JSON format:**

```cpp
String body = "{";
body += "\"nodeId\":\"ROOM_" + String(m.room_id) + "\",";
body += "\"adminId\":\"ADMIN_001\",";
body += "\"temperature\":" + String(m.temperature, 1) + ",";
body += "\"humidity\":" + String(m.humidity, 1) + ",";
body += "\"motion\":" + String(m.motion == 1 ? "true" : "false") + ",";
body += "\"gas\":" + String(m.gas == 1 ? "true" : "false") + ",";
body += "\"waterLevel\":" + String(m.rain == 1 ? "100" : "0");
body += "}";
```

Then use:
```cpp
const char* SERVER_URL = "http://192.168.1.100:5000/api/esp32/public";
```

This way you don't need to modify the backend at all!

