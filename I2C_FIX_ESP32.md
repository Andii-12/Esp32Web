# Fixing I2C Errors on ESP32

## What These Errors Mean

The I2C errors you're seeing:
```
E (13537) i2c.master: i2c_master_multi_buffer_transmit(1186): I2C transaction failed
E (13544) i2c.master: I2C hardware NACK detected
```

These indicate the ESP32 cannot communicate with the OLED display (SSD1306) via I2C. This is **NOT blocking** your WiFi/HTTP data transmission, but the display won't work.

## Quick Fixes

### Fix 1: Check I2C Wiring

The OLED display needs proper I2C connections:

**Standard I2C Pins for ESP32:**
- **SDA (Data)**: GPIO 21 (default)
- **SCL (Clock)**: GPIO 22 (default)

**Wiring:**
```
OLED Display    →    ESP32
VCC            →    3.3V or 5V
GND            →    GND
SDA            →    GPIO 21
SCL            →    GPIO 22
```

**Common Issues:**
- ✅ Wrong pins (verify GPIO 21/22)
- ✅ Loose connections
- ✅ Missing pull-up resistors (some displays need 4.7kΩ resistors on SDA/SCL)
- ✅ Wrong voltage (3.3V vs 5V)

### Fix 2: Add I2C Initialization Delay

Add a small delay after I2C initialization:

```cpp
void setup() {
  Serial.begin(115200);
  delay(1000);  // Add delay before I2C init
  
  // OLED
  Wire.begin(21, 22);  // Explicitly set SDA=21, SCL=22
  delay(100);  // Wait for I2C to stabilize
  
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED init failed - continuing anyway");
    // Don't hang, just continue without display
  }
  
  // ... rest of setup
}
```

### Fix 3: Make Display Optional (Recommended)

If you don't need the display, make it optional so errors don't spam:

```cpp
bool displayAvailable = false;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Try to initialize OLED (non-blocking)
  Wire.begin(21, 22);  // SDA, SCL
  delay(100);
  
  if (display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    displayAvailable = true;
    Serial.println("OLED Display: OK");
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("Booting...");
    display.display();
  } else {
    Serial.println("OLED Display: Not available (continuing without display)");
    displayAvailable = false;
  }
  
  // ... rest of setup
}
```

Then wrap all display calls:

```cpp
void loop() {
  // ... your existing code ...
  
  // Only update display if available
  if (displayAvailable) {
    display.clearDisplay();
    // ... all your display code ...
    display.display();
  }
  
  delay(50);
}
```

### Fix 4: Use Different I2C Pins

If GPIO 21/22 don't work, try different pins:

```cpp
// In setup()
#define OLED_SDA 4   // Try different GPIO
#define OLED_SCL 5   // Try different GPIO

Wire.begin(OLED_SDA, OLED_SCL);
```

### Fix 5: Check I2C Address

Some displays use address 0x3D instead of 0x3C:

```cpp
// Try both addresses
if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
  Serial.println("Trying address 0x3D...");
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3D)) {
    Serial.println("OLED not found");
    displayAvailable = false;
  }
}
```

## Complete Fixed Setup Code

Here's a safer version that handles I2C errors gracefully:

```cpp
#include <esp_now.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

// ---------- WIFI (edit these) ----------
const char* WIFI_SSID = "iPhone";
const char* WIFI_PASS = "qwerty12345";
const char* SERVER_URL = "http://192.168.92.1:5000/api/esp32/public/room";

// ---------- BUZZER ----------
#define BUZZER_PIN 23

// ---------- OLED ----------
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
bool displayAvailable = false;

// ---------- DATA ----------
typedef struct {
  float temperature;
  float humidity;
  int motion;
  int rain;
  int gas;
  int room_id;
} struct_message;

struct_message incomingData, room1, room2;
unsigned long lastRoom1 = 0, lastRoom2 = 0;

// ---------- ALARM STATE ----------
unsigned long alarmUntil = 0;
unsigned long nextBeepToggle = 0;
bool buzzState = false;

// ---------- UI ----------
void drawSignal(int x, int y, bool active) {
  if (!displayAvailable) return;
  
  if (active) {
    display.fillRect(x,   y,   2, 2, SSD1306_WHITE);
    display.fillRect(x+3, y-2, 2, 4, SSD1306_WHITE);
    display.fillRect(x+6, y-4, 2, 6, SSD1306_WHITE);
    display.fillRect(x+9, y-6, 2, 8, SSD1306_WHITE);
  } else {
    display.drawLine(x,   y-6, x+10, y+2, SSD1306_WHITE);
    display.drawLine(x,   y+2, x+10, y-6, SSD1306_WHITE);
  }
}

// ---------- WIFI ----------
bool wifiConnect(unsigned long timeoutMs = 12000) {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long start = millis();
  Serial.print("WiFi connecting to ");
  Serial.print(WIFI_SSID);
  Serial.print(" ...");
  
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < timeoutMs) {
    delay(250);
    Serial.print('.');
  }
  
  bool ok = WiFi.status() == WL_CONNECTED;
  Serial.println(ok ? "\nWiFi connected." : "\nWiFi connect timeout.");
  if (ok) {
    Serial.print("IP: "); Serial.println(WiFi.localIP());
  }
  return ok;
}

// ---------- WEB POST ----------
void sendToWeb(const struct_message& m) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping web send");
    return;
  }

  HTTPClient http;
  if (!http.begin(SERVER_URL)) {
    Serial.println("HTTP begin failed");
    return;
  }
  
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);  // 10 second timeout

  // Make JSON
  String body = "{";
  body += "\"room_id\":" + String(m.room_id) + ",";
  body += "\"temperature\":" + String(m.temperature, 1) + ",";
  body += "\"humidity\":" + String(m.humidity, 1) + ",";
  body += "\"motion\":" + String(m.motion) + ",";
  body += "\"rain\":" + String(m.rain) + ",";
  body += "\"gas\":" + String(m.gas) + ",";
  body += "\"ts\":" + String((unsigned long)millis());
  body += "}";

  Serial.print("Sending to server: ");
  Serial.println(body);
  
  int code = http.POST(body);
  
  if (code > 0) {
    Serial.printf("POST %s -> %d\n", SERVER_URL, code);
    if (code == 201) {
      Serial.println("✅ Data sent successfully!");
    } else {
      Serial.printf("⚠️ Server returned: %d\n", code);
      String response = http.getString();
      Serial.println("Response: " + response);
    }
  } else {
    Serial.printf("❌ POST failed: %s\n", http.errorToString(code).c_str());
    Serial.println("Check:");
    Serial.println("  1. Server IP is correct");
    Serial.println("  2. Server is running");
    Serial.println("  3. Both on same WiFi network");
  }
  
  http.end();
}

// ---------- ESPNOW ----------
void OnDataRecv(const esp_now_recv_info * info, const uint8_t *incomingDataBytes, int len) {
  if (len >= (int)sizeof(incomingData)) {
    memcpy(&incomingData, incomingDataBytes, sizeof(incomingData));

    if (incomingData.room_id == 1) { 
      room1 = incomingData; 
      lastRoom1 = millis(); 
    }
    if (incomingData.room_id == 2) { 
      room2 = incomingData; 
      lastRoom2 = millis(); 
    }

    // Immediately forward to web
    sendToWeb(incomingData);
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);  // Wait for Serial to initialize

  // BUZZER
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // OLED - Try to initialize (non-blocking)
  Wire.begin(21, 22);  // SDA=21, SCL=22
  delay(200);  // Wait for I2C to stabilize
  
  if (display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    displayAvailable = true;
    Serial.println("✅ OLED Display: OK");
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("Booting...");
    display.display();
  } else {
    Serial.println("⚠️ OLED Display: Not available (continuing without display)");
    Serial.println("   I2C errors are normal if display is not connected");
    displayAvailable = false;
  }

  // WIFI
  wifiConnect();

  // ESPNOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("❌ ESP-NOW init failed");
    if (displayAvailable) {
      display.setCursor(0, 10);
      display.println("ESPNOW FAIL");
      display.display();
    }
    return;
  }
  esp_now_register_recv_cb(OnDataRecv);

  Serial.println("✅ ESP-NOW Receiver Ready!");
  
  if (displayAvailable) {
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println(WiFi.status() == WL_CONNECTED ? "WiFi OK" : "WiFi FAIL");
    display.println("ESPNOW OK");
    display.display();
    delay(700);
  }
}

void loop() {
  // ---- Check alerts from both rooms ----
  bool r1Active = (millis() - lastRoom1 < 5000);
  bool r2Active = (millis() - lastRoom2 < 5000);
  bool alertR1 = (room1.motion == 1) || (room1.rain == 1) || (room1.gas == 1);
  bool alertR2 = (room2.motion == 1) || (room2.rain == 1) || (room2.gas == 1);

  if (alertR1 || alertR2) {
    alarmUntil = millis() + 3000UL;
  }

  // ---- Beep pattern ----
  if (millis() < alarmUntil) {
    if (millis() >= nextBeepToggle) {
      buzzState = !buzzState;
      digitalWrite(BUZZER_PIN, buzzState ? HIGH : LOW);
      nextBeepToggle = millis() + 200;
    }
  } else {
    if (buzzState) {
      buzzState = false;
      digitalWrite(BUZZER_PIN, LOW);
    }
  }

  // ---- Draw UI (only if display available) ----
  if (displayAvailable) {
    display.clearDisplay();
    
    // Header
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.print("R1");
    drawSignal(25, 7, r1Active);
    display.setCursor(70, 0);
    display.print("R2");
    drawSignal(95, 7, r2Active);
    
    if (WiFi.status() == WL_CONNECTED) {
      display.fillRect(62, 0, 4, 4, SSD1306_WHITE);
    } else {
      display.drawRect(62, 0, 4, 4, SSD1306_WHITE);
    }
    
    // Room 1
    display.setTextSize(2);
    display.setCursor(5, 10);
    display.print((int)room1.temperature); display.print("C");
    display.setTextSize(1);
    display.setCursor(5, 28);
    display.print("Hum:"); display.print((int)room1.humidity); display.print("%");
    display.setCursor(5, 40);
    display.print("M:"); display.print(room1.motion ? "YES":"NO");
    display.setCursor(5, 50);
    display.print("R:"); display.print(room1.rain ? "WET":"DRY");
    display.setCursor(5, 58);
    display.print("G:"); display.print(room1.gas ? "ALERT":"OK");
    
    // Room 2
    display.setTextSize(2);
    display.setCursor(70, 10);
    display.print((int)room2.temperature); display.print("C");
    display.setTextSize(1);
    display.setCursor(70, 28);
    display.print("Hum:"); display.print((int)room2.humidity); display.print("%");
    display.setCursor(70, 40);
    display.print("M:"); display.print(room2.motion ? "YES":"NO");
    display.setCursor(70, 50);
    display.print("R:"); display.print(room2.rain ? "WET":"DRY");
    display.setCursor(70, 58);
    display.print("G:"); display.print(room2.gas ? "ALERT":"OK");
    
    display.display();
  }
  
  delay(50);
}
```

## Important Notes

1. **I2C errors won't block WiFi/HTTP** - Your data will still be sent to the server
2. **Check Serial Monitor for WiFi/HTTP messages** - Look for "POST ... -> 201" to verify data is being sent
3. **Display is optional** - The code will work without it
4. **Wiring is critical** - Double-check SDA/SCL connections

## What to Check Now

Since you're seeing I2C errors, check:

1. **Is data still being sent?** Look for:
   ```
   POST http://192.168.92.1:5000/api/esp32/public/room -> 201
   ✅ Data sent successfully!
   ```

2. **If you see POST messages** → I2C errors are just display issues, data is working!

3. **If you DON'T see POST messages** → Check WiFi connection and server IP

The I2C errors are separate from your WiFi/HTTP functionality. Focus on seeing POST success messages in Serial Monitor to confirm data is being sent to your server.

