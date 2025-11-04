# Quick Start: Connect ESP32 Admin to Web Server

## 🎯 Simple 3-Step Connection

### Step 1: Find Your Server IP Address

**Windows:**
```powershell
ipconfig
```
Look for `IPv4 Address` - it looks like `192.168.1.100`

**Mac/Linux:**
```bash
ifconfig | grep "inet "
```
Look for IP address starting with `192.168.` or `10.0.`

### Step 2: Update ESP32 Code

Open `esp32-code/admin-receiver.ino` and change these 3 lines:

```cpp
// Line 15: Your WiFi name
#define WIFI_SSID "MyWiFiName"

// Line 16: Your WiFi password  
#define WIFI_PASSWORD "MyWiFiPassword"

// Line 17: Replace YOUR_SERVER_IP with the IP from Step 1
#define SERVER_URL "http://192.168.1.100:5000/api/esp32/public/batch"
```

**Example:**
```cpp
#define WIFI_SSID "HomeNetwork"
#define WIFI_PASSWORD "Password123"
#define SERVER_URL "http://192.168.1.50:5000/api/esp32/public/batch"
```

### Step 3: Start Your Server

Open terminal/command prompt:

```bash
# Terminal 1: Start MongoDB (if local)
# Windows: net start MongoDB
# Mac/Linux: sudo systemctl start mongod

# Terminal 2: Start Backend
cd backend
npm start
```

You should see:
```
MongoDB connected successfully
Server running on port 5000
```

### Step 4: Upload & Test

1. Upload `admin-receiver.ino` to your ESP32
2. Open Serial Monitor (115200 baud)
3. You should see:
   ```
   WiFi Connected!
   IP Address: 192.168.1.XX
   ```

## ✅ Connection Successful?

Check Serial Monitor for:
```
=== Sending to Server ===
HTTP Response code: 201
Data sent successfully!
```

## ❌ Problems?

### Can't Connect to WiFi?
- Check SSID and password (case-sensitive!)
- Make sure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)

### Can't Connect to Server?
- Make sure ESP32 and server are on **same WiFi network**
- Check server is running: `npm start` in backend folder
- Verify IP address is correct
- Try opening in browser: `http://YOUR_SERVER_IP:5000/api/esp32/public`

### Still Not Working?
See detailed guide: `ESP32_WEB_CONNECTION_GUIDE.md`

