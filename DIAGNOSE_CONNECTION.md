# Diagnosing "Connection Refused" Error

## What This Error Means

`POST failed: connection refused` means:
- ✅ ESP32 WiFi is connected (it can send HTTP requests)
- ✅ ESP32 code is working (data is being sent)
- ❌ Server is not reachable at `192.168.92.1:5000`

## Quick Fixes

### Step 1: Verify Server is Running ✅

**Check if backend server is running:**
```bash
cd backend
npm start
```

**You should see:**
```
MongoDB connected successfully
Server running on port 5000
```

**If not running, start it now!**

### Step 2: Verify IP Address ✅

**Find your actual server IP address:**

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter

**Mac/Linux:**
```bash
ifconfig | grep "inet "
```

**Common IP ranges:**
- `192.168.1.x`
- `192.168.0.x`
- `192.168.92.x` (yours might be different!)
- `10.0.x.x`

### Step 3: Test Server is Accessible ✅

**From your computer (where server runs), test:**
```bash
curl http://localhost:5000/api/esp32/public/room
```

**Or test with your actual IP:**
```bash
curl http://192.168.92.1:5000/api/esp32/public/room
```

If this works → Server is running
If this fails → Server not running or wrong port

### Step 4: Update ESP32 Code with Correct IP ✅

**Once you find your actual IP, update ESP32 code:**

```cpp
const char* SERVER_URL = "http://YOUR_ACTUAL_IP:5000/api/esp32/public/room";
```

**Example if your IP is `192.168.1.100`:**
```cpp
const char* SERVER_URL = "http://192.168.1.100:5000/api/esp32/public/room";
```

### Step 5: Check Firewall ✅

**Windows Firewall:**
1. Open Windows Defender Firewall
2. Allow Node.js through firewall
3. Or temporarily disable firewall to test

**Or allow port 5000:**
```powershell
# Run as Administrator
netsh advfirewall firewall add rule name="Node.js Server" dir=in action=allow protocol=TCP localport=5000
```

## Common Issues

### Issue 1: Server IP is `192.168.92.1` but that's wrong

**Fix:** Find your actual IP and update ESP32 code

### Issue 2: Server is running on different port

**Check:** Look at backend terminal - what port does it say?
```
Server running on port 5000
```

**If different port:** Update ESP32 code or change backend port in `.env`

### Issue 3: Server only listens on localhost

**Fix:** Make sure server binds to all interfaces (0.0.0.0)

The server should already be configured correctly, but verify in `backend/server.js`:
```javascript
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Issue 4: ESP32 and server on different networks

**Fix:** Both must be on same WiFi network ("iPhone" in your case)

## Quick Test Script

Run this to test your server:

```bash
# Test 1: Server running locally
curl http://localhost:5000/api/esp32/public/room

# Test 2: Find your IP and test
# (Replace with your actual IP)
curl http://192.168.92.1:5000/api/esp32/public/room

# Test 3: Send test data
curl -X POST http://localhost:5000/api/esp32/public/room \
  -H "Content-Type: application/json" \
  -d "{\"room_id\":1,\"temperature\":25.5,\"humidity\":60,\"motion\":0,\"rain\":0,\"gas\":0}"
```

## Step-by-Step Solution

1. **Find your server IP:**
   ```powershell
   ipconfig
   ```
   Note the IPv4 address (e.g., `192.168.1.100`)

2. **Verify server is running:**
   ```bash
   cd backend
   npm start
   ```

3. **Test server from your computer:**
   ```bash
   curl http://YOUR_IP:5000/api/esp32/public/room
   ```

4. **Update ESP32 code with correct IP:**
   ```cpp
   const char* SERVER_URL = "http://YOUR_IP:5000/api/esp32/public/room";
   ```

5. **Upload updated code to ESP32**

6. **Check Serial Monitor** - should see `POST ... -> 201`

## Still Not Working?

### Check if ESP32 can reach your computer:

**From ESP32 Serial Monitor, you're sending to:**
```
http://192.168.92.1:5000
```

**This means:**
- ESP32 expects server at `192.168.92.1`
- Port: `5000`

**Verify:**
1. Is your computer's IP actually `192.168.92.1`?
2. Is server running on port 5000?
3. Can you ping `192.168.92.1` from another device?

### Alternative: Use Computer's Actual IP

If your computer's IP is different (e.g., `192.168.1.100`), update ESP32:
```cpp
const char* SERVER_URL = "http://192.168.1.100:5000/api/esp32/public/room";
```

