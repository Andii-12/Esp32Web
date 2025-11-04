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
const char* SERVER_URL = "http://172.20.10.4:5000/api/esp32/public/room";

// ---------- BUZZER ----------
#define BUZZER_PIN 23

// ---------- OLED ----------
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ---------- DATA ----------
typedef struct {
  float temperature;
  float humidity;
  int motion;   // 0/1
  int rain;     // 0=dry, 1=wet
  int gas;      // 0=ok,  1=alert
  int room_id;  // 1 or 2
} struct_message;

struct_message incomingData, room1, room2;
unsigned long lastRoom1 = 0, lastRoom2 = 0;

// ---------- ALARM STATE ----------
unsigned long alarmUntil = 0;
unsigned long nextBeepToggle = 0;
bool buzzState = false;

// ---------- UI ----------
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

// ---------- WEB POST ----------
void sendToWeb(const struct_message& m) {
  // Only send if WiFi is connected
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
  http.setTimeout(10000);

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
    Serial.printf("POST -> %d\n", code);
    if (code == 201) {
      Serial.println("✅ Data sent successfully!");
    } else {
      Serial.printf("⚠️ Server returned: %d\n", code);
    }
  } else {
    Serial.printf("❌ POST failed: %s\n", http.errorToString(code).c_str());
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

    // Immediately forward to web if WiFi is connected
    sendToWeb(incomingData);
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  // OLED
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED init failed - continuing anyway");
    // Don't hang, continue without display
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // BUZZER
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // ESP-NOW Setup (MUST be done before WiFi.begin())
  // Set WiFi mode first (required for ESP-NOW)
  WiFi.mode(WIFI_STA);
  
  // Initialize ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed");
    return;
  }
  esp_now_register_recv_cb(OnDataRecv);
  
  Serial.println("✅ ESP-NOW Receiver Ready!");

  // Now connect to WiFi (ESP-NOW will continue working)
  Serial.print("WiFi connecting to ");
  Serial.print(WIFI_SSID);
  Serial.print("...");
  
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - wifiStart) < 10000) {
    delay(250);
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n⚠️ WiFi connection timeout - ESP-NOW will still work");
  }
}

void loop() {
  // ---- Check alerts from both rooms ----
  bool r1Active = (millis() - lastRoom1 < 5000);
  bool r2Active = (millis() - lastRoom2 < 5000);

  bool alertR1 = (room1.motion == 1) || (room1.rain == 1) || (room1.gas == 1);
  bool alertR2 = (room2.motion == 1) || (room2.rain == 1) || (room2.gas == 1);

  // If any alert is present, (re)start a 3s beep window
  if (alertR1 || alertR2) {
    alarmUntil = millis() + 3000UL;
  }

  // ---- Beep pattern (non-blocking) for 3 seconds window ----
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

