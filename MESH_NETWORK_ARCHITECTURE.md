# ESP32 Mesh Network Architecture

## System Overview

This system implements a mesh-like network using ESP32 boards with ESP-NOW protocol for local communication and WiFi for cloud connectivity.

```
┌─────────────────┐         ┌─────────────────┐
│   Sensor Node 1 │         │   Sensor Node 2 │
│   (ESP32)       │         │   (ESP32)       │
│                 │         │                 │
│ - Temperature   │         │ - Temperature   │
│ - Gas           │         │ - Gas           │
│ - Water Level   │         │ - Water Level   │
│ - Motion        │         │ - Motion        │
│ - Soil Moisture │         │ - Soil Moisture │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │      ESP-NOW              │
         │      (Wireless)           │
         │                           │
         └───────────┬───────────────┘
                     │
         ┌───────────▼───────────┐
         │   Admin ESP32         │
         │   (Receiver/Gateway)  │
         │                       │
         │ - Receives ESP-NOW    │
         │ - Collects all data   │
         │ - Sends to Web Server │
         └───────────┬───────────┘
                     │
                     │ WiFi HTTP POST
                     │
         ┌───────────▼───────────┐
         │   Web Application     │
         │   (Node.js Backend)   │
         │   MongoDB Database    │
         │   React Frontend      │
         └───────────────────────┘
```

## Components

### 1. Sensor Nodes (2x ESP32)
- **Role**: Collect sensor data and send to admin ESP32
- **Communication**: ESP-NOW (peer-to-peer, no WiFi router needed)
- **Sensors**:
  - Temperature sensor
  - Gas sensor
  - Water level sensor
  - Motion sensor (PIR)
  - Soil moisture sensor
- **Code**: `esp32-code/sensor-node.ino`

### 2. Admin ESP32 (Receiver/Gateway)
- **Role**: Receive data from sensor nodes and forward to web server
- **Communication**:
  - ESP-NOW: Receives data from sensor nodes
  - WiFi + HTTP: Sends data to web server
- **Code**: `esp32-code/admin-receiver.ino`

### 3. Web Application
- **Backend**: Node.js + Express + MongoDB
- **Frontend**: React.js
- **Endpoints**:
  - `POST /api/esp32/public` - Single data entry
  - `POST /api/esp32/public/batch` - Multiple data entries (recommended)

## Data Flow

1. **Sensor Reading**: Each sensor node reads its sensors every 5 seconds
2. **ESP-NOW Transmission**: Sensor data is sent to admin ESP32 via ESP-NOW
3. **Data Collection**: Admin ESP32 collects data from all nodes
4. **Batch Upload**: Admin ESP32 sends collected data to web server every 10 seconds (or when buffer has data)
5. **Database Storage**: Web server stores data in MongoDB
6. **Dashboard Display**: React frontend displays real-time data from all nodes

## Setup Instructions

### Step 1: Get MAC Addresses

1. Upload a simple sketch to each ESP32 to print its MAC address:
```cpp
#include <WiFi.h>
void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_MODE_STA);
  Serial.print("MAC Address: ");
  Serial.println(WiFi.macAddress());
}
void loop() {}
```

2. Note down the MAC addresses:
   - Admin ESP32 MAC: `XX:XX:XX:XX:XX:XX`
   - Sensor Node 1 MAC: `XX:XX:XX:XX:XX:XX`
   - Sensor Node 2 MAC: `XX:XX:XX:XX:XX:XX`

### Step 2: Configure Sensor Nodes

1. Open `esp32-code/sensor-node.ino`
2. Update configuration:
   ```cpp
   #define NODE_ID "NODE_001"  // Change to NODE_002 for second node
   #define ADMIN_MAC_ADDRESS {0xXX, 0xXX, 0xXX, 0xXX, 0xXX, 0xXX}
   ```
3. Update sensor pins according to your wiring
4. Upload to sensor node ESP32s

### Step 3: Configure Admin ESP32

1. Open `esp32-code/admin-receiver.ino`
2. Update configuration:
   ```cpp
   #define WIFI_SSID "YOUR_WIFI_SSID"
   #define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
   #define SERVER_URL "http://YOUR_SERVER_IP:5000/api/esp32/public/batch"
   ```
3. Update sensor node MAC addresses (if needed for filtering)
4. Upload to admin ESP32

### Step 4: Update Web Server IP

Replace `YOUR_SERVER_IP` with your actual server IP address:
- If running locally: `http://192.168.1.XXX:5000`
- If using domain: `http://yourdomain.com:5000`

### Step 5: Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### Step 6: Configure MongoDB

1. Create `.env` file in `backend/`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/esp32data
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

2. Start MongoDB service

### Step 7: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

## API Endpoints

### Public Endpoints (for ESP32)

#### Single Data Entry
```
POST /api/esp32/public
Content-Type: application/json

{
  "nodeId": "NODE_001",
  "adminId": "ADMIN_001",
  "temperature": 25.5,
  "gas": 45.2,
  "waterLevel": 60.0,
  "motion": true,
  "soilMoisture": 75.5,
  "timestamp": 1234567890,
  "receivedAt": 1234567900
}
```

#### Batch Data Entry (Recommended)
```
POST /api/esp32/public/batch
Content-Type: application/json

{
  "adminId": "ADMIN_001",
  "sensorData": [
    {
      "nodeId": "NODE_001",
      "temperature": 25.5,
      "gas": 45.2,
      "waterLevel": 60.0,
      "motion": true,
      "soilMoisture": 75.5,
      "timestamp": 1234567890,
      "receivedAt": 1234567900
    },
    {
      "nodeId": "NODE_002",
      "temperature": 24.3,
      "gas": 42.1,
      "waterLevel": 55.0,
      "motion": false,
      "soilMoisture": 70.0,
      "timestamp": 1234567891,
      "receivedAt": 1234567901
    }
  ]
}
```

### Protected Endpoints (require authentication)

#### Get All Data
```
GET /api/esp32?nodeId=NODE_001&limit=50
Authorization: Bearer <token>
```

#### Get Latest from All Nodes
```
GET /api/esp32/latest/all-nodes
Authorization: Bearer <token>
```

## Database Schema

```javascript
{
  nodeId: "NODE_001",           // Sensor node identifier
  adminId: "ADMIN_001",         // Admin ESP32 identifier
  temperature: 25.5,            // Temperature in Celsius
  gas: 45.2,                    // Gas sensor reading (%)
  waterLevel: 60.0,             // Water level (%)
  motion: true,                 // Motion detected (boolean)
  soilMoisture: 75.5,           // Soil moisture (%)
  timestamp: Date,              // When sensor read the data
  receivedAt: Date,             // When admin ESP32 received it
  createdAt: Date,              // When stored in database
  updatedAt: Date
}
```

## Troubleshooting

### ESP-NOW Issues
- **No data received**: Check MAC addresses match exactly
- **Range issues**: ESP-NOW works best within 200m (line of sight)
- **Interference**: Use different WiFi channel or reduce power

### WiFi Issues
- **Admin ESP32 not connecting**: Check WiFi credentials
- **Server connection failed**: Verify server IP and port
- **Timeout errors**: Check network connectivity

### Data Not Appearing
- **Check Serial Monitor**: Both admin and sensor nodes should show activity
- **Check Server Logs**: Backend should log incoming requests
- **Check MongoDB**: Verify data is being saved
- **Check Frontend**: Ensure you're logged in and refreshing

## Advantages of This Architecture

1. **Low Power**: ESP-NOW doesn't require WiFi connection for sensor nodes
2. **Range**: ESP-NOW can reach up to 200m (better than WiFi)
3. **Low Latency**: Direct peer-to-peer communication
4. **Scalability**: Easy to add more sensor nodes
5. **Reliability**: Admin ESP32 can buffer data if server is temporarily unavailable
6. **Cost Effective**: No need for WiFi router for sensor nodes

## Future Enhancements

- Add encryption for ESP-NOW communication
- Implement acknowledgment system for data delivery
- Add data compression for batch transfers
- Implement OTA (Over-The-Air) updates
- Add sensor calibration and configuration endpoints
- Implement alerting system for threshold violations

