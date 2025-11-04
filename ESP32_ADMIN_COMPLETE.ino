#include <esp_now.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

// -------- WiFi + Backend (edit these) --------
const char* WIFI_SSID  = "iPhone";
const char* WIFI_PASS  = "qwerty12345";
// Railway backend (no trailing slash)
const char* SERVER_URL = "https://esp32web-production.up.railway.app/api/esp32/public/room";
// If you set API_KEY on Railway, put the same value here; otherwise leave empty
const char* API_KEY    = "esp32_prod_key";  // e.g. "esp32_prod_key"

// -------- BUZZER --------
#define BUZZER_PIN 23

// -------- OLED --------
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// -------- DATA --------
typedef struct {
  float temperature;
  float humidity;
  int   motion;   // 0/1
  int   rain;     // 0=dry, 1=wet
  int   gas;      // 0=ok,  1=alert
  int   room_id;  // 1 or 2
} struct_message;

struct_message incomingData, room1, room2;
unsigned long lastRoom1 = 0, lastRoom2 = 0;

// -------- ALARM STATE --------
unsigned long alarmUntil = 0;
unsigned long nextBeepToggle = 0;
bool buzzState = false;

// -------- UI --------
void drawSignal(int x, int y, bool active) {
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

// -------- WiFi --------
void wifiConnect() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  unsigned long start = millis();
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < 15000) {
    delay(300);
    Serial.print(".");
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("✅ WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("❌ WiFi connect timeout (ESP-NOW continues).");
  }
}

// -------- HTTPS POST --------
void sendToWeb(const struct_message& m) {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi not connected, cannot send to web");
    return;
  }

  Serial.println("\n=== Sending to Web Server ===");
  Serial.print("Room ID: ");
  Serial.println(m.room_id);

  WiFiClientSecure client;
  client.setInsecure(); // Skip certificate validation for simplicity

  HTTPClient http;
  
  Serial.print("Connecting to: ");
  Serial.println(SERVER_URL);
  
  if (!http.begin(client, SERVER_URL)) {
    Serial.println("❌ HTTP begin failed");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  if (API_KEY && API_KEY[0] != '\0') {
    http.addHeader("X-API-Key", API_KEY);
    Serial.print("API Key: ");
    Serial.println(API_KEY);
  }
  
  http.setTimeout(10000); // 10 second timeout

  String body = "{";
  body += "\"room_id\":"      + String(m.room_id)      + ",";
  body += "\"temperature\":"  + String(m.temperature,1)+ ",";
  body += "\"humidity\":"     + String(m.humidity,1)   + ",";
  body += "\"motion\":"       + String(m.motion)       + ",";
  body += "\"rain\":"         + String(m.rain)         + ",";
  body += "\"gas\":"          + String(m.gas)          + ",";
  body += "\"ts\":"           + String((unsigned long)millis());
  body += "}";

  Serial.print("Payload: ");
  Serial.println(body);

  int code = http.POST(body);
  
  Serial.print("HTTP Response Code: ");
  Serial.println(code);

  if (code > 0) {
    if (code == 201) {
      Serial.println("✅ Data sent successfully!");
      String response = http.getString();
      Serial.print("Response: ");
      Serial.println(response);
    } else {
      Serial.print("⚠️ Server returned: ");
      Serial.println(code);
      String response = http.getString();
      Serial.print("Response: ");
      Serial.println(response);
    }
  } else {
    Serial.print("❌ POST failed: ");
    Serial.println(http.errorToString(code));
    Serial.println("Check:");
    Serial.println("  1. Server URL is correct");
    Serial.println("  2. Server is running");
    Serial.println("  3. WiFi is connected");
    Serial.println("  4. API key is correct (if used)");
  }

  http.end();
  Serial.println("============================\n");
}

// -------- ESPNOW --------
void OnDataRecv(const esp_now_recv_info * info, const uint8_t *incomingDataBytes, int len) {
  Serial.println("\n📡 ESP-NOW Data Received!");
  Serial.print("Data length: ");
  Serial.print(len);
  Serial.print(" bytes (expected: ");
  Serial.print(sizeof(incomingData));
  Serial.println(" bytes)");
  
  if (len >= (int)sizeof(incomingData)) {
    memcpy(&incomingData, incomingDataBytes, sizeof(incomingData));

    Serial.print("Room ID: ");
    Serial.println(incomingData.room_id);
    Serial.print("Temperature: ");
    Serial.print(incomingData.temperature);
    Serial.println("°C");
    Serial.print("Humidity: ");
    Serial.print(incomingData.humidity);
    Serial.println("%");

    if (incomingData.room_id == 1) { 
      room1 = incomingData; 
      lastRoom1 = millis();
      Serial.println("✅ Room 1 data updated");
    }
    if (incomingData.room_id == 2) { 
      room2 = incomingData; 
      lastRoom2 = millis();
      Serial.println("✅ Room 2 data updated");
    }

    // Immediately forward to web
    Serial.println("Forwarding to web server...");
    sendToWeb(incomingData);
  } else {
    Serial.println("❌ Data length mismatch!");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================");
  Serial.println("ESP32 Admin Receiver Starting...");
  Serial.println("========================================");

  // OLED
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("⚠️ OLED init failed - continuing without display");
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // BUZZER
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // ESP-NOW FIRST (preserves your working behavior)
  WiFi.mode(WIFI_STA);
  
  if (esp_now_init() != ESP_OK) {
    Serial.println("❌ ESP-NOW init failed");
    return;
  }
  
  esp_now_register_recv_cb(OnDataRecv);
  Serial.println("✅ ESP-NOW Receiver Ready!");

  // Then connect WiFi (for internet posting)
  wifiConnect();
  
  Serial.println("========================================");
  Serial.println("Setup complete!");
  Serial.println("Waiting for ESP-NOW data...");
  Serial.println("========================================\n");
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

  // ---- Beep pattern (non-blocking) ----
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

  // ---- Draw UI ----
  display.clearDisplay();

  // Header
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("R1");
  drawSignal(25, 7, r1Active);
  display.setCursor(70, 0);
  display.print("R2");
  drawSignal(95, 7, r2Active);

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
  delay(50);
}

