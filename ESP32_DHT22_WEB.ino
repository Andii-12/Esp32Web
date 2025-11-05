#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "DHT.h"

// ====== USER SETTINGS ======
#define DHTPIN   19        // DHT22 data pin (change if needed)
#define DHTTYPE  DHT22
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_ADDR 0x3C     // Common I2C address for 128x64 SSD1306

// WiFi and Server Settings
const char* WIFI_SSID  = "iPhone";  // Change to your WiFi SSID
const char* WIFI_PASS  = "qwerty12345";  // Change to your WiFi password
const char* SERVER_URL = "https://esp32web-production.up.railway.app/api/esp32/public/room";  // Your server URL
const char* API_KEY    = "esp32_prod_key";  // API key if enabled on server (leave empty string "" if not used)

// Room ID (1 or 2 - change this to identify different ESP32 devices)
#define ROOM_ID 1

// Timing
unsigned long lastRead = 0;
const unsigned long readIntervalMs = 2000;  // Read sensor every 2 seconds (DHT22 minimum) and send immediately

// ====== OBJECTS ======
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
DHT dht(DHTPIN, DHTTYPE);

// Connection status
bool wifiConnected = false;
bool lastSendSuccess = false;

// Battery reading (if connected to battery via voltage divider on ADC pin)
// If not using battery, set BATTERY_PIN to -1 to disable
#define BATTERY_PIN 34  // ADC1_CH6 (GPIO34) - Change to your battery voltage divider pin, or -1 to disable
#define BATTERY_MIN_VOLTAGE 3.0  // Minimum battery voltage (empty)
#define BATTERY_MAX_VOLTAGE 4.2  // Maximum battery voltage (full)
#define BATTERY_DIVIDER_RATIO 2.0  // Voltage divider ratio (if using 2:1 divider, change accordingly)

// Read battery percentage
float readBatteryPercentage() {
  #if BATTERY_PIN >= 0
    // Read analog value (0-4095 for 12-bit ADC)
    int analogValue = analogRead(BATTERY_PIN);
    
    // Convert to voltage (ESP32 ADC is 12-bit, Vref = 3.3V)
    float voltage = (analogValue / 4095.0) * 3.3 * BATTERY_DIVIDER_RATIO;
    
    // Convert voltage to percentage (linear mapping)
    float percentage = ((voltage - BATTERY_MIN_VOLTAGE) / (BATTERY_MAX_VOLTAGE - BATTERY_MIN_VOLTAGE)) * 100.0;
    
    // Clamp to 0-100%
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    
    return percentage;
  #else
    return -1; // Battery reading disabled
  #endif
}

void showCenteredText(const String& line1, const String& line2 = "", const String& line3 = "") {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Line 1 (big)
  display.setTextSize(2);
  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds(line1, 0, 0, &x1, &y1, &w, &h);
  int x = (SCREEN_WIDTH - w) / 2;
  int y = 8; // top padding
  display.setCursor(x, y);
  display.print(line1);

  // Line 2 (small)
  if (line2.length()) {
    display.setTextSize(1);
    display.getTextBounds(line2, 0, 0, &x1, &y1, &w, &h);
    x = (SCREEN_WIDTH - w) / 2;
    y = 8 + 20 + 8; // spacing under big text
    display.setCursor(x, y);
    display.print(line2);
  }

  // Line 3 (small) - status
  if (line3.length()) {
    display.setTextSize(1);
    display.getTextBounds(line3, 0, 0, &x1, &y1, &w, &h);
    x = (SCREEN_WIDTH - w) / 2;
    y = 8 + 20 + 8 + 12 + 8; // spacing under line 2
    display.setCursor(x, y);
    display.print(line3);
  }

  display.display();
}

// WiFi Connection
void wifiConnect() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    return;
  }
  
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  unsigned long start = millis();
  int attempts = 0;
  
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < 30000) {
    delay(500);
    attempts++;
    if (attempts % 4 == 0) {
      Serial.print(".");
    }
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n✅ WiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    wifiConnected = false;
    Serial.println("\n❌ WiFi connection failed");
  }
}

// Send data to web server
void sendToWeb(float temperature, float humidity) {
  if (!wifiConnected) {
    Serial.println("WiFi not connected, cannot send data");
    lastSendSuccess = false;
    return;
  }

  Serial.println("\n=== Sending to Web Server ===");
  Serial.print("Temperature: ");
  Serial.print(temperature, 1);
  Serial.print("°C, Humidity: ");
  Serial.print(humidity, 1);
  Serial.println("%");

  WiFiClientSecure client;
  client.setInsecure(); // For Railway HTTPS (uses Let's Encrypt)
  client.setTimeout(15);

  HTTPClient http;
  
  // Try to begin connection with retries
  int beginAttempts = 0;
  bool httpBeginSuccess = false;
  
  while (beginAttempts < 3 && !httpBeginSuccess) {
    httpBeginSuccess = http.begin(client, SERVER_URL);
    if (!httpBeginSuccess) {
      beginAttempts++;
      Serial.print("HTTP begin attempt ");
      Serial.print(beginAttempts);
      Serial.println(" failed, retrying...");
      delay(500);
    }
  }
  
  if (!httpBeginSuccess) {
    Serial.println("❌ HTTP begin failed after 3 attempts");
    lastSendSuccess = false;
    return;
  }

  http.addHeader("Content-Type", "application/json");
  if (API_KEY && strlen(API_KEY) > 0) {
    http.addHeader("X-API-Key", API_KEY);
  }
  
  http.setTimeout(15000);
  http.setReuse(false);

  // Read battery percentage
  float batteryPercent = readBatteryPercentage();

  // Create JSON payload matching backend format
  String body = "{";
  body += "\"room_id\":" + String(ROOM_ID) + ",";
  body += "\"temperature\":" + String(temperature, 1) + ",";
  body += "\"humidity\":" + String(humidity, 1) + ",";
  body += "\"motion\":0,";  // No motion sensor
  body += "\"rain\":0,";    // No rain sensor
  body += "\"gas\":0,";     // No gas sensor
  if (batteryPercent >= 0) {
    body += "\"battery\":" + String(batteryPercent, 1) + ",";
  }
  body += "\"ts\":" + String((unsigned long)millis());
  body += "}";

  Serial.print("Payload: ");
  Serial.println(body);

  // Try POST with retries
  int code = -1;
  int postAttempts = 0;
  
  while (postAttempts < 3 && code <= 0) {
    code = http.POST(body);
    postAttempts++;
    
    if (code <= 0) {
      Serial.print("POST attempt ");
      Serial.print(postAttempts);
      Serial.print(" failed with code: ");
      Serial.println(code);
      if (postAttempts < 3) {
        delay(1000);
      }
    }
  }
  
  Serial.print("HTTP Response Code: ");
  Serial.println(code);

  if (code > 0) {
    if (code == 201) {
      Serial.println("✅ Data sent successfully!");
      String response = http.getString();
      Serial.print("Response: ");
      Serial.println(response);
      lastSendSuccess = true;
    } else {
      Serial.print("⚠️ Server returned: ");
      Serial.println(code);
      String response = http.getString();
      Serial.print("Response: ");
      Serial.println(response);
      lastSendSuccess = false;
    }
  } else {
    Serial.print("❌ POST failed after 3 attempts: ");
    Serial.println(http.errorToString(code));
    lastSendSuccess = false;
  }

  http.end();
  Serial.println("============================\n");
}

void setup() {
  // Serial
  Serial.begin(115200);
  delay(100);
  Serial.println("\n========================================");
  Serial.println("ESP32 DHT22 Web Sender Starting...");
  Serial.println("========================================");
  Serial.print("Room ID: ");
  Serial.println(ROOM_ID);

  // DHT
  dht.begin();
  Serial.println("DHT22 sensor initialized");

  // OLED
  Wire.begin(21, 22); // SDA=21, SCL=22 on ESP32
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("SSD1306 init failed. Check wiring/address.");
    showCenteredText("OLED ERROR", "Check wiring");
    for (;;);
  }

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Splash screen
  showCenteredText("ESP32", "DHT22 + Web", "Initializing...");
  delay(1000);

  // Connect WiFi
  wifiConnect();
  
  if (wifiConnected) {
    showCenteredText("WiFi OK", WiFi.localIP().toString(), "Ready!");
  } else {
    showCenteredText("WiFi FAIL", "Check settings", "Retrying...");
  }
  
  delay(1000);
}

void loop() {
  unsigned long now = millis();
  
  // Check WiFi connection periodically
  if (now % 60000 == 0) { // Check every 60 seconds
    if (WiFi.status() != WL_CONNECTED) {
      wifiConnected = false;
      wifiConnect();
    }
  }

  // Read sensor
  if (now - lastRead >= readIntervalMs) {
    lastRead = now;

    float h = dht.readHumidity();
    float t = dht.readTemperature(); // Celsius

    if (isnan(h) || isnan(t)) {
      Serial.println("DHT read failed");
      showCenteredText("UNREADABLE", "DHT read failed", wifiConnected ? "WiFi OK" : "WiFi OFF");
      return;
    }

    // Format display text
    char line1[24];
    char line2[32];
    char line3[32];
    snprintf(line1, sizeof(line1), "%.1f\xC2\xB0""C", t);  // °C
    snprintf(line2, sizeof(line2), "Humidity: %.1f%%", h);
    
    // Status line
    String statusLine = "";
    if (wifiConnected) {
      statusLine = lastSendSuccess ? "✓ Sent" : "WiFi OK";
    } else {
      statusLine = "WiFi OFF";
    }
    
    snprintf(line3, sizeof(line3), "%s", statusLine.c_str());

    // Show on OLED
    showCenteredText(String(line1), String(line2), String(line3));

    // Serial log
    Serial.print("T=");
    Serial.print(t, 1);
    Serial.print("°C  H=");
    Serial.print(h, 1);
    Serial.print("%  WiFi=");
    Serial.println(wifiConnected ? "ON" : "OFF");

    // Send to web server immediately after reading
    if (wifiConnected) {
      sendToWeb(t, h);
    } else {
      Serial.println("WiFi not connected, skipping web send");
    }
  }
  
  delay(100); // Small delay to prevent watchdog issues
}

