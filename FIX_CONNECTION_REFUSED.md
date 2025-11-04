# Fix "Connection Refused" Error

## Current Situation

- ✅ ESP32 WiFi: Connected (IP: `172.20.10.3`)
- ✅ ESP32 Code: Working (sending data)
- ❌ Server Connection: Refused at `172.20.10.4:5000`

## Quick Fix Steps

### Step 1: Verify Server is Running ✅

**Open a new terminal and check:**

```bash
cd backend
npm start
```

**You MUST see:**
```
MongoDB connected successfully
Server running on port 5000
Server accessible at:
  - http://localhost:5000
  - http://127.0.0.1:5000
  - http://YOUR_LOCAL_IP:5000
```

**If server is NOT running → Start it now!**

### Step 2: Verify Your Computer's IP Address ✅

**Find your actual IP address:**

**Windows PowerShell:**
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "127.*"}
```

**Or Command Prompt:**
```cmd
ipconfig
```

Look for your WiFi adapter's IPv4 address.

**Is it `172.20.10.4`?**
- ✅ If YES → Continue to Step 3
- ❌ If NO → Update ESP32 code with correct IP

### Step 3: Test Server Accessibility ✅

**Test if server responds on your computer:**

```powershell
# Test localhost
curl http://localhost:5000/api/esp32/public/room

# Test with your IP
curl http://172.20.10.4:5000/api/esp32/public/room
```

**Or use the test script:**
```powershell
.\test-connection-windows.ps1
```

### Step 4: Check Windows Firewall ✅

**Windows Firewall might be blocking port 5000.**

**Option A: Allow Node.js through Firewall (Recommended)**

1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Find "Node.js" and check both "Private" and "Public"
4. Click OK

**Option B: Allow Port 5000 (PowerShell as Administrator)**

```powershell
# Run PowerShell as Administrator
New-NetFirewallRule -DisplayName "Node.js Server Port 5000" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

**Option C: Temporarily Disable Firewall (for testing only)**

1. Open Windows Defender Firewall
2. Turn off firewall temporarily
3. Test if ESP32 can connect
4. Re-enable firewall and use Option A or B

### Step 5: Verify Server is Listening on All Interfaces ✅

The server code is already updated to listen on `0.0.0.0` (all interfaces), but make sure you restarted it after the update.

**Restart server:**
```bash
# Stop current server (Ctrl+C)
# Then restart:
cd backend
npm start
```

### Step 6: Test from ESP32 Network ✅

**If you have another device on the same WiFi network (iPhone), test:**

Open Safari/Chrome on your iPhone and go to:
```
http://172.20.10.4:5000/api/esp32/public/room
```

If this works → Server is accessible
If this fails → Firewall or IP issue

## Common Issues & Solutions

### Issue 1: Server Not Running

**Symptoms:**
- No response from `http://localhost:5000`
- Terminal shows nothing

**Fix:**
```bash
cd backend
npm start
```

### Issue 2: Wrong IP Address

**Symptoms:**
- ESP32 uses `172.20.10.4` but your IP is different

**Fix:**
1. Find your actual IP: `ipconfig`
2. Update ESP32 code:
   ```cpp
   const char* SERVER_URL = "http://YOUR_ACTUAL_IP:5000/api/esp32/public/room";
   ```

### Issue 3: Firewall Blocking

**Symptoms:**
- Server works on `localhost` but not from ESP32
- `curl http://172.20.10.4:5000` fails

**Fix:**
- Allow Node.js through firewall (see Step 4)
- Or allow port 5000 specifically

### Issue 4: Server Only Listening on Localhost

**Symptoms:**
- Server works locally but not from network

**Fix:**
- Already fixed in `server.js` - listens on `0.0.0.0`
- Make sure you restarted the server after update

### Issue 5: Mobile Hotspot Isolation

**Symptoms:**
- Devices can't communicate with each other

**Fix:**
- Check iPhone hotspot settings
- Some hotspots have "AP Isolation" enabled
- Disable it if possible (varies by device)

## Quick Diagnostic Commands

**1. Check if server is running:**
```powershell
curl http://localhost:5000/api/esp32/public/room
```

**2. Check your IP:**
```powershell
ipconfig
```

**3. Test server on network IP:**
```powershell
curl http://172.20.10.4:5000/api/esp32/public/room
```

**4. Check if port 5000 is listening:**
```powershell
netstat -an | findstr :5000
```

Should show: `0.0.0.0:5000` or `:::5000`

## Expected Results

**✅ When working correctly:**

1. **Server terminal shows:**
   ```
   Server running on port 5000
   === ESP32 Data Received ===
   Timestamp: ...
   Request Body: {...}
   ✅ Data saved successfully
   ```

2. **ESP32 Serial Monitor shows:**
   ```
   POST http://172.20.10.4:5000/api/esp32/public/room -> 201
   ✅ Data sent successfully!
   ```

3. **Dashboard shows data:**
   - Data appears in the web dashboard

## Still Not Working?

**Run these checks:**

1. ✅ Is server running? (`npm start` in backend folder)
2. ✅ Is your IP actually `172.20.10.4`? (`ipconfig`)
3. ✅ Is firewall allowing port 5000?
4. ✅ Did you restart server after code update?
5. ✅ Can you access `http://172.20.10.4:5000` from another device?

**Share the results and we can fix it!**

