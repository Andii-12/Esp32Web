# ESP32 Mesh Network Code

This directory contains Arduino code for the ESP32 mesh network setup.

## Required Libraries

Install these libraries in Arduino IDE before uploading:

1. **ArduinoJson** (by Benoit Blanchon)
   - Version: 6.x or 7.x
   - Install via: Library Manager → Search "ArduinoJson"
   - Or download from: https://github.com/bblanchon/ArduinoJson

## Files

### sensor-node.ino
Code for sensor node ESP32s that collect sensor data and send it to the admin ESP32 via ESP-NOW.

**Configuration:**
- `NODE_ID`: Change to "NODE_001" or "NODE_002" for each sensor node
- `ADMIN_MAC_ADDRESS`: MAC address of the admin ESP32
- Sensor pins: Adjust according to your wiring

### admin-receiver.ino
Code for admin ESP32 that receives data from sensor nodes via ESP-NOW and forwards it to the web server via WiFi HTTP.

**Configuration:**
- `WIFI_SSID`: Your WiFi network name
- `WIFI_PASSWORD`: Your WiFi password
- `SERVER_URL`: Your web server URL (e.g., `http://192.168.1.100:5000/api/esp32/public/batch`)

## Getting MAC Addresses

Before configuring the code, you need to get the MAC address of each ESP32:

1. Upload this simple sketch to each ESP32:
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

2. Open Serial Monitor (115200 baud) and note the MAC address

3. Convert MAC address format:
   - Serial Monitor shows: `XX:XX:XX:XX:XX:XX`
   - Code needs: `{0xXX, 0xXX, 0xXX, 0xXX, 0xXX, 0xXX}`

**Example:**
- Serial Monitor: `A4:CF:12:3D:45:67`
- Code format: `{0xA4, 0xCF, 0x12, 0x3D, 0x45, 0x67}`

## Upload Instructions

1. **Sensor Nodes:**
   - Update `NODE_ID` (NODE_001 for first node, NODE_002 for second)
   - Update `ADMIN_MAC_ADDRESS` with admin ESP32 MAC
   - Update sensor pin numbers if different
   - Upload to sensor node ESP32

2. **Admin ESP32:**
   - Update WiFi credentials
   - Update `SERVER_URL` with your server IP/domain
   - Upload to admin ESP32

## Testing

1. Open Serial Monitor (115200 baud) for all ESP32s
2. Sensor nodes should show: "Data sent successfully!" every 5 seconds
3. Admin ESP32 should show: "Data received" messages and "Data sent successfully!" to server

## Troubleshooting

- **No data received**: Check MAC addresses match exactly
- **WiFi connection failed**: Check SSID and password
- **Server connection failed**: Check server IP and port, verify server is running
- **Compilation errors**: Make sure ArduinoJson library is installed

