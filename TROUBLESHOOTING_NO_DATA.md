# Troubleshooting: No Data Showing in Dashboard

## Quick Checklist

### Step 1: Check Backend Server is Running ✅

```bash
cd backend
npm start
```

**You should see:**
```
MongoDB connected successfully
Server running on port 5000
```

**If not:**
- Check MongoDB is running: `mongod` or `net start MongoDB`
- Check port 5000 is not in use
- Check `.env` file exists with correct settings

### Step 2: Check ESP32 is Sending Data ✅

**Open Serial Monitor (115200 baud) and look for:**
```
WiFi connected.
IP: 192.168.92.XX
POST http://192.168.92.1:5000/api/esp32/public/room -> 201
```

**If you see:**
- `POST failed: -1` → Server connection issue
- `POST failed: -11` → Connection timeout
- `WiFi connect timeout` → WiFi issue

### Step 3: Check Backend Terminal for Incoming Requests ✅

**When ESP32 sends data, you should see:**
```
=== ESP32 Data Received ===
Timestamp: 2024-01-01T12:00:00.000Z
Request Body: {
  "room_id": 1,
  "temperature": 25.5,
  ...
}
✅ Data saved successfully
Node ID: ROOM_1
```

**If you DON'T see this:**
- ESP32 is not reaching the server
- Check IP address is correct
- Check both devices on same network

### Step 4: Check MongoDB Has Data ✅

**Connect to MongoDB:**
```bash
mongosh
use esp32data
db.esp32datas.find().pretty()
```

**You should see documents with:**
- `nodeId: "ROOM_1"` or `"ROOM_2"`
- Temperature, humidity, etc.

**If empty:**
- Data is not being saved
- Check backend logs for errors
- Check MongoDB connection

### Step 5: Check Dashboard is Fetching Data ✅

**Open browser console (F12) and check:**
- Network tab → Look for `/api/esp32` requests
- Console tab → Look for errors

**Common issues:**
- 401 Unauthorized → Not logged in
- 404 Not Found → Wrong endpoint
- CORS errors → Backend CORS issue

## Common Problems & Solutions

### Problem 1: ESP32 Shows "POST failed: -1"

**Causes:**
- Server not running
- Wrong IP address
- Wrong port
- Firewall blocking port 5000

**Solutions:**
1. ✅ Verify server is running: `npm start` in backend folder
2. ✅ Check IP address:
   - ESP32 code: `192.168.92.1`
   - Server IP: Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   - They must match!
3. ✅ Test server manually:
   ```bash
   curl http://192.168.92.1:5000/api/esp32/public/room
   ```
4. ✅ Check firewall allows port 5000

### Problem 2: Backend Shows No Incoming Requests

**Causes:**
- ESP32 and server on different networks
- Wrong IP address in ESP32 code
- Router blocking communication

**Solutions:**
1. ✅ Verify both devices on same WiFi network
2. ✅ Ping ESP32 from server: `ping 192.168.92.XX` (ESP32 IP)
3. ✅ Check router doesn't have client isolation enabled

### Problem 3: Data Saves but Dashboard Shows "No data available"

**Causes:**
- Dashboard fetching wrong endpoint
- Authentication issue
- Data format mismatch

**Solutions:**
1. ✅ Check browser console for errors
2. ✅ Verify you're logged in
3. ✅ Check Network tab shows successful GET requests
4. ✅ Verify data in MongoDB has correct format

### Problem 4: MongoDB Connection Error

**Causes:**
- MongoDB not running
- Wrong connection string
- Permission issues

**Solutions:**
1. ✅ Start MongoDB:
   ```bash
   # Windows
   net start MongoDB
   
   # Mac/Linux
   sudo systemctl start mongod
   # or
   mongod
   ```
2. ✅ Check connection string in `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/esp32data
   ```
3. ✅ Test MongoDB connection:
   ```bash
   mongosh
   ```

## Test Connection Manually

### Test 1: Server is Accessible

```bash
curl http://192.168.92.1:5000/api/esp32/public/room
```

Should return something (even if error).

### Test 2: Send Test Data

```bash
curl -X POST http://192.168.92.1:5000/api/esp32/public/room \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": 1,
    "temperature": 25.5,
    "humidity": 60.0,
    "motion": 0,
    "rain": 0,
    "gas": 0,
    "ts": 1234567890
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Data received successfully",
  "data": {...}
}
```

### Test 3: Check Data in MongoDB

```bash
mongosh
use esp32data
db.esp32datas.find().sort({timestamp: -1}).limit(5).pretty()
```

Should show recent data entries.

## Debugging Steps

### Enable More Logging

The backend now logs all ESP32 requests. Check your terminal where `npm start` is running.

### Check ESP32 Serial Monitor

Make sure ESP32 Serial Monitor shows:
- WiFi connected
- POST requests being sent
- Response codes (201 = success)

### Check Dashboard Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh dashboard
4. Look for `/api/esp32` requests
5. Check status codes and responses

## Still Not Working?

### Double Check These:

1. ✅ **Server IP**: Is `192.168.92.1` correct? Run `ipconfig` to verify
2. ✅ **Port**: ESP32 uses port 5000, server runs on port 5000
3. ✅ **Network**: Both devices on same WiFi network
4. ✅ **MongoDB**: Running and connected
5. ✅ **Server**: Running with `npm start`
6. ✅ **ESP32**: Sending data (check Serial Monitor)
7. ✅ **Dashboard**: Logged in and refreshing

### Get More Info:

Add this to your ESP32 code temporarily to see more details:

```cpp
void sendToWeb(const struct_message& m) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return;
  }
  
  Serial.print("Connecting to: ");
  Serial.println(SERVER_URL);
  
  HTTPClient http;
  if (!http.begin(SERVER_URL)) {
    Serial.println("HTTP begin failed");
    return;
  }
  
  http.addHeader("Content-Type", "application/json");
  
  // ... rest of your code ...
  
  int code = http.POST(body);
  Serial.print("HTTP Code: ");
  Serial.println(code);
  
  if (code > 0) {
    String response = http.getString();
    Serial.print("Response: ");
    Serial.println(response);
  }
  
  http.end();
}
```

