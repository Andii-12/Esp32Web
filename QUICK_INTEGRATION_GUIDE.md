# Quick Integration Guide for Your ESP32 Code

## ✅ Your Code is Good - Minimal Changes Needed!

Your ESP32 code already has everything needed. Just make these 2 small changes:

## Step 1: Update Server URL (2 lines to change)

**Find this line in your ESP32 code:**
```cpp
const char* SERVER_URL = "http://192.168.1.100:3000/api/ingest";
```

**Change to:**
```cpp
const char* SERVER_URL = "http://192.168.1.100:5000/api/esp32/public/room";
```

**What changed:**
- Port: `3000` → `5000` (our backend uses port 5000)
- Endpoint: `/api/ingest` → `/api/esp32/public/room` (new endpoint I created for your format)
- IP: Keep `192.168.1.100` or update to your actual server IP

## Step 2: Update Server IP Address

**Find your computer's IP address:**

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" - something like `192.168.1.100`

**Mac/Linux:**
```bash
ifconfig | grep "inet "
```

**Update the IP in your ESP32 code:**
```cpp
const char* SERVER_URL = "http://YOUR_ACTUAL_IP:5000/api/esp32/public/room";
```

## Step 3: Start Your Backend Server

```bash
cd backend
npm start
```

You should see:
```
MongoDB connected successfully
Server running on port 5000
```

## Step 4: Test Connection

1. **Upload your ESP32 code** (with updated URL)
2. **Open Serial Monitor** (115200 baud)
3. **Look for:**
   ```
   WiFi connected.
   IP: 192.168.1.XX
   POST http://192.168.1.100:5000/api/esp32/public/room -> 201
   ```

## ✅ That's It!

Your ESP32 code will:
- ✅ Connect to WiFi (already working)
- ✅ Receive data from sensor nodes via ESP-NOW (already working)
- ✅ Send data to web server (just updated URL)
- ✅ Data will be stored in MongoDB
- ✅ Data will appear in dashboard

## Verify It's Working

### Check Backend Terminal:
You should see incoming requests when ESP32 sends data.

### Check Dashboard:
1. Start frontend: `cd frontend && npm start`
2. Login
3. You should see data from `ROOM_1` and `ROOM_2`

## Troubleshooting

### Problem: POST returns -1 or error

**Solution:**
1. Check server is running: `npm start` in backend folder
2. Check IP address is correct
3. Check both devices on same WiFi network
4. Test manually:
   ```bash
   curl -X POST http://YOUR_IP:5000/api/esp32/public/room \
     -H "Content-Type: application/json" \
     -d '{"room_id":1,"temperature":25.5,"humidity":60,"motion":0,"rain":0,"gas":0}'
   ```

### Problem: Data not in dashboard

**Solution:**
1. Check backend terminal shows requests
2. Check MongoDB: `mongosh` → `use esp32data` → `db.esp32datas.find().pretty()`
3. Refresh dashboard

## Summary

**Only 2 things to change:**
1. ✅ Update `SERVER_URL` in ESP32 code (change port and endpoint)
2. ✅ Update IP address to your actual server IP

**Everything else stays the same!** Your code structure is perfect. ✅

