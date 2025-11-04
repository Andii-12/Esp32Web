# ESP32 Admin to Web Server Connection Diagram

## Visual Connection Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ESP32 ADMIN (Receiver)                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  ESP-NOW     │    │    WiFi      │    │   HTTP       │  │
│  │  Receiver    │───▶│   Client     │───▶│   POST       │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         ▲                    │                    │          │
│         │                    │                    │          │
└─────────┼────────────────────┼────────────────────┼──────────┘
          │                    │                    │
          │                    │                    │
    ESP-NOW              WiFi Network         HTTP Request
    (Wireless)           (Router)             (Port 5000)
          │                    │                    │
          │                    │                    │
┌─────────┼────────────────────┼────────────────────┼──────────┐
│         ▼                    ▼                    ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Sensor      │    │   WiFi       │    │   Node.js    │  │
│  │  Node 1      │    │   Router     │    │   Server     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
│  ┌──────────────┐                                    │      │
│  │  Sensor      │                                    │      │
│  │  Node 2      │                                    ▼      │
│  └──────────────┘                            ┌──────────────┐│
│                                              │   MongoDB    ││
│                                              │   Database   ││
│                                              └──────────────┘│
│                                                              │
│                    WEB APPLICATION                           │
│                    (Your Computer/Server)                    │
└──────────────────────────────────────────────────────────────┘
```

## Connection Details

### 1. ESP32 Admin WiFi Connection
- **Protocol**: WiFi (802.11)
- **Mode**: Station (STA) - connects to existing WiFi network
- **Required**: WiFi SSID and password
- **Frequency**: 2.4GHz (ESP32 doesn't support 5GHz)

### 2. HTTP Connection to Web Server
- **Protocol**: HTTP (can be upgraded to HTTPS)
- **Method**: POST
- **Endpoint**: `/api/esp32/public/batch`
- **Content-Type**: `application/json`
- **Port**: 5000 (default, can be changed)

### 3. Network Requirements

```
ESP32 Admin           WiFi Router          Web Server
    │                     │                    │
    │───(WiFi)───────────▶│                    │
    │                     │                    │
    │                     │───(HTTP)──────────▶│
    │                     │    Port 5000       │
    │                     │                    │
    │                     │                    │
```

**Important**: All three must be on the **same local network** (same WiFi)!

## Configuration Example

### ESP32 Admin Code:
```cpp
// WiFi Configuration
#define WIFI_SSID "MyHomeWiFi"           // Same WiFi network
#define WIFI_PASSWORD "MyPassword123"    // Same WiFi password

// Server Configuration
#define SERVER_URL "http://192.168.1.100:5000/api/esp32/public/batch"
//                          ^^^^^^^^^^^^^^^^
//                          This is your computer's IP on the WiFi network
```

### Network Setup:
```
WiFi Router: "MyHomeWiFi"
  ├── ESP32 Admin (IP: 192.168.1.50)
  ├── Your Computer/Server (IP: 192.168.1.100) ← Server runs here
  └── Other devices...
```

## Step-by-Step Connection Process

### Phase 1: WiFi Connection
```
1. ESP32 Admin starts
2. Connects to WiFi using SSID and password
3. Gets IP address from router (DHCP)
4. Prints connection status
```

**Expected Output:**
```
Connecting to WiFi: MyHomeWiFi
......
WiFi Connected!
IP Address: 192.168.1.50
```

### Phase 2: Data Collection
```
1. ESP32 Admin receives data from sensor nodes via ESP-NOW
2. Stores data in buffer
3. Waits for more data or timer trigger
```

### Phase 3: HTTP POST to Server
```
1. ESP32 Admin creates JSON payload
2. Connects to server via HTTP
3. Sends POST request with sensor data
4. Receives response (201 = success)
5. Clears buffer if successful
```

**Expected Output:**
```
=== Sending to Server ===
URL: http://192.168.1.100:5000/api/esp32/public/batch
HTTP Response code: 201
Response: {"success":true,"message":"Processed 2 records",...}
✅ Data sent successfully!
```

## Troubleshooting Network Issues

### Check WiFi Connection
- ✅ ESP32 gets IP address
- ✅ Can ping ESP32 from computer: `ping 192.168.1.50`
- ✅ ESP32 can ping router: Check Serial Monitor

### Check Server Connection
- ✅ Server is running: `npm start` in backend folder
- ✅ Server is accessible: Open `http://192.168.1.100:5000/api/esp32/public` in browser
- ✅ Port 5000 is not blocked by firewall
- ✅ ESP32 and server on same network

### Test Connection Manually
```bash
# From your computer, test if server responds:
curl http://192.168.1.100:5000/api/esp32/public

# Or test with data:
curl -X POST http://192.168.1.100:5000/api/esp32/public \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"TEST","adminId":"ADMIN_001","temperature":25.5}'
```

## Network Configuration Tips

### Finding Your Computer's IP Address

**Windows:**
```powershell
ipconfig
# Look for "IPv4 Address" under your WiFi adapter
```

**Mac/Linux:**
```bash
ifconfig | grep "inet "
# or
hostname -I
```

### Common IP Address Ranges
- Home networks: `192.168.1.x` or `192.168.0.x`
- Office networks: `10.0.x.x` or `172.16.x.x`
- Your ESP32 and server should be in the same range

### Port Configuration
- Default backend port: `5000`
- Can be changed in `backend/.env`: `PORT=3000`
- Update ESP32 code if you change port: `...:3000/api/esp32/...`

## Security Considerations

### Current Setup (Development)
- HTTP (not encrypted)
- No authentication on public endpoint
- Only works on local network

### Production Recommendations
- Use HTTPS (SSL certificate)
- Add API key authentication
- Implement rate limiting
- Add IP whitelist for ESP32 devices
- Use VPN for remote access

## Quick Connection Checklist

- [ ] WiFi SSID configured in ESP32 code
- [ ] WiFi password configured in ESP32 code
- [ ] Server IP address found and configured
- [ ] Server port configured (default 5000)
- [ ] ESP32 and server on same WiFi network
- [ ] Backend server running (`npm start`)
- [ ] MongoDB running (if local)
- [ ] Firewall allows port 5000
- [ ] Serial Monitor shows WiFi connected
- [ ] Serial Monitor shows HTTP 201 response

