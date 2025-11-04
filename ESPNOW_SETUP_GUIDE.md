# ESP-NOW Setup Guide - Getting Data from Sender to Admin

## Problem: Admin ESP32 Not Receiving Data

If your admin ESP32 is not receiving data from sender ESP32s, follow these steps:

## Step 1: Get Admin ESP32 MAC Address

**Upload the updated admin code** (ESP32_ADMIN_FIXED.ino) and check Serial Monitor.

**You should see:**
```
📡 Admin ESP32 MAC Address: A4:CF:12:3D:45:67

👉 IMPORTANT: Copy this MAC address to your sender ESP32 code!
   Format for sender code:
   uint8_t adminMacAddress[] = {0xA4, 0xCF, 0x12, 0x3D, 0x45, 0x67};
```

**Copy this MAC address!** You'll need it for the sender ESP32.

## Step 2: Sender ESP32 Code Requirements

Your sender ESP32 code **MUST** have:

1. **Same data structure** (struct_message) - must match exactly!
2. **Correct MAC address** - must be the admin ESP32's MAC
3. **WiFi mode** - must be `WIFI_STA`
4. **ESP-NOW initialized** correctly

## Step 3: Verify Sender ESP32 Code

**Your sender ESP32 code should look like this:**

```cpp
#include <esp_now.h>
#include <WiFi.h>

// REPLACE WITH YOUR ADMIN ESP32 MAC ADDRESS
uint8_t adminMacAddress[] = {0xA4, 0xCF, 0x12, 0x3D, 0x45, 0x67};  // From Step 1

// MUST MATCH ADMIN'S STRUCT EXACTLY!
typedef struct {
  float temperature;
  float humidity;
  int motion;
  int rain;
  int gas;
  int room_id;  // 1 or 2
} struct_message;

struct_message sensorData;

void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  if (status == ESP_NOW_SEND_SUCCESS) {
    Serial.println("✅ Delivery Success");
  } else {
    Serial.println("❌ Delivery Fail");
  }
}

void setup() {
  Serial.begin(115200);
  
  // WiFi mode - MUST be WIFI_STA
  WiFi.mode(WIFI_STA);
  
  // Initialize ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("❌ ESP-NOW init failed");
    return;
  }
  
  esp_now_register_send_cb(OnDataSent);
  
  // Add admin as peer
  esp_now_peer_info_t peerInfo;
  memcpy(peerInfo.peer_addr, adminMacAddress, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;
  
  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("❌ Failed to add admin as peer");
    return;
  }
  
  Serial.println("✅ Sender ESP32 ready!");
  Serial.print("Sending to Admin MAC: ");
  for (int i = 0; i < 6; i++) {
    Serial.print(adminMacAddress[i], HEX);
    if (i < 5) Serial.print(":");
  }
  Serial.println();
}

void loop() {
  // Read your sensors here
  sensorData.temperature = 25.5;  // Your sensor reading
  sensorData.humidity = 60.0;
  sensorData.motion = 0;
  sensorData.rain = 0;
  sensorData.gas = 0;
  sensorData.room_id = 1;  // or 2
  
  // Send via ESP-NOW
  esp_err_t result = esp_now_send(adminMacAddress, (uint8_t *) &sensorData, sizeof(struct_message));
  
  if (result != ESP_OK) {
    Serial.print("❌ Send error: ");
    Serial.println(result);
  }
  
  delay(5000);  // Send every 5 seconds
}
```

## Step 4: Troubleshooting

### Issue 1: "Delivery Fail" on Sender

**Check:**
- ✅ MAC address is correct (copy from admin Serial Monitor)
- ✅ Both ESP32s are powered on
- ✅ Both ESP32s are within range (ESP-NOW works up to ~200m)
- ✅ Both using same WiFi channel (if using WiFi)

### Issue 2: No Data Received on Admin

**Check Serial Monitor for:**
- ✅ "ESP-NOW Receiver Ready!" message
- ✅ MAC address printed
- ✅ Any "ESP-NOW DATA RECEIVED!" messages

**If you see nothing:**
- Check sender is actually sending (look for "Delivery Success")
- Check MAC address matches
- Check data structure matches exactly

### Issue 3: Data Length Mismatch

**Error:** "Data length mismatch"

**Fix:**
- Make sure sender and receiver use **exact same struct_message**
- Same number of fields
- Same field types
- Same field order

### Issue 4: WiFi Mode Issue

**Both ESP32s must use:**
```cpp
WiFi.mode(WIFI_STA);
```

**Not:**
```cpp
WiFi.mode(WIFI_AP);  // Wrong!
WiFi.mode(WIFI_AP_STA);  // Might work but not recommended
```

## Testing Steps

1. **Upload admin code** → Check Serial Monitor for MAC address
2. **Copy MAC address** → Update sender ESP32 code
3. **Upload sender code** → Check Serial Monitor for "Delivery Success"
4. **Check admin Serial Monitor** → Should see "ESP-NOW DATA RECEIVED!"

## Expected Output

**Admin ESP32 Serial Monitor:**
```
📡 ESP-NOW DATA RECEIVED!
Received from MAC: A4:CF:12:3D:45:67
Data length: 24 bytes (expected: 24 bytes)

--- Received Data ---
Room ID: 1
Temperature: 25.5 °C
Humidity: 60.0 %
...
✅ Room 1 data updated
Forwarding to web server...
```

**Sender ESP32 Serial Monitor:**
```
✅ Delivery Success
```

## Common Mistakes

1. ❌ Wrong MAC address (copy exactly from admin)
2. ❌ Different struct_message structure
3. ❌ WiFi mode not WIFI_STA
4. ❌ ESP-NOW not initialized
5. ❌ Admin not added as peer on sender

## Still Not Working?

1. **Check Serial Monitors** on both ESP32s
2. **Verify MAC address** matches exactly
3. **Check data structure** is identical
4. **Try restarting** both ESP32s
5. **Check distance** - move ESP32s closer together

