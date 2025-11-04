# Final Fix - Windows Firewall Issue

## Good News! ✅

Your IP addresses are correct:
- **ESP32**: `172.20.10.3` ✅
- **Server**: `172.20.10.4` ✅
- **ESP32 Code**: Already pointing to `http://172.20.10.4:5000` ✅

**They're on the same network!** The problem is likely **Windows Firewall blocking port 5000**.

## Fix: Allow Port 5000 Through Firewall

### Option 1: PowerShell (Quick - Run as Administrator)

**Right-click PowerShell → "Run as Administrator", then:**

```powershell
New-NetFirewallRule -DisplayName "Node.js Server Port 5000" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

### Option 2: Windows Firewall GUI

1. **Open Windows Defender Firewall:**
   - Press `Win + R`
   - Type: `wf.msc`
   - Press Enter

2. **Click "Inbound Rules"** (left sidebar)

3. **Click "New Rule..."** (right sidebar)

4. **Select "Port"** → Next

5. **Select "TCP"** and enter port `5000` → Next

6. **Select "Allow the connection"** → Next

7. **Check all boxes** (Domain, Private, Public) → Next

8. **Name it**: "Node.js Server Port 5000" → Finish

### Option 3: Allow Node.js Application (Alternative)

1. **Open Windows Defender Firewall**

2. **Click "Allow an app or feature through Windows Defender Firewall"**

3. **Click "Change settings"** (if needed)

4. **Click "Allow another app..."**

5. **Browse to Node.js:**
   - Usually at: `C:\Program Files\nodejs\node.exe`
   - Or: `C:\Program Files (x86)\nodejs\node.exe`

6. **Click "Add"** and check both "Private" and "Public"

7. **Click OK**

## Verify Server is Running

**Make sure backend server is running:**

```bash
cd backend
npm start
```

**You should see:**
```
MongoDB connected successfully
Server running on port 5000
Server accessible at:
  - http://localhost:5000
  - http://127.0.0.1:5000
  - http://YOUR_LOCAL_IP:5000
```

## Test Connection

**After allowing firewall, test:**

```powershell
# Test from your computer
curl http://172.20.10.4:5000/api/esp32/public/room

# Or test from another device on same network (like your iPhone)
# Open browser: http://172.20.10.4:5000/api/esp32/public/room
```

## After Fixing Firewall

**Check ESP32 Serial Monitor - you should see:**
```
POST http://172.20.10.4:5000/api/esp32/public/room -> 201
✅ Data sent successfully!
```

**Check backend terminal - you should see:**
```
=== ESP32 Data Received ===
Timestamp: ...
Request Body: {...}
✅ Data saved successfully
```

## Quick Checklist

- [ ] Server is running (`npm start` in backend folder)
- [ ] Windows Firewall allows port 5000 (see above)
- [ ] ESP32 code has correct URL: `http://172.20.10.4:5000/api/esp32/public/room`
- [ ] Both devices on same WiFi network (iPhone hotspot)
- [ ] Test connection works

## Still Not Working?

**If firewall fix doesn't work, try:**

1. **Temporarily disable firewall** (just to test):
   - Open Windows Defender Firewall
   - Turn off firewall for both Private and Public networks
   - Test if ESP32 can connect
   - If it works, re-enable firewall and use Option 1 or 2 above

2. **Check if server is actually listening:**
   ```powershell
   netstat -an | findstr :5000
   ```
   Should show: `0.0.0.0:5000` or `172.20.10.4:5000`

3. **Restart server** after firewall changes:
   ```bash
   # Stop server (Ctrl+C)
   # Then restart:
   cd backend
   npm start
   ```

