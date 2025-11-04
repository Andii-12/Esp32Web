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
const char* SERVER_URL = "http://172.20.10.4:5000/api/esp32/public/room";  // Updated to .4

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
  WiFi.mode(WIFI_STA);  // Station mode required for ESP-NOW
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
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
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
  }
  
  http.end();
}

// ---------- ESPNOW ----------
void OnDataRecv(const esp_now_recv_info * info, const uint8_t *incomingDataBytes, int len) {
  Serial.println("\n========================================");
  Serial.println("📡 ESP-NOW DATA RECEIVED!");
  Serial.println("========================================");
  Serial.print("Received from MAC: ");
  for (int i = 0; i < 6; i++) {
    Serial.print(info->src_addr[i], HEX);
    if (i < 5) Serial.print(":");
  }
  Serial.println();
  Serial.print("Data length: ");
  Serial.print(len);
  Serial.print(" bytes (expected: ");
  Serial.print(sizeof(incomingData));
  Serial.println(" bytes)");
  
  if (len >= (int)sizeof(incomingData)) {
    memcpy(&incomingData, incomingDataBytes, sizeof(incomingData));

    Serial.println("\n--- Received Data ---");
    Serial.print("Room ID: ");
    Serial.println(incomingData.room_id);
    Serial.print("Temperature: ");
    Serial.print(incomingData.temperature);
    Serial.println(" °C");
    Serial.print("Humidity: ");
    Serial.print(incomingData.humidity);
    Serial.println(" %");
    Serial.print("Motion: ");
    Serial.println(incomingData.motion ? "YES" : "NO");
    Serial.print("Rain: ");
    Serial.println(incomingData.rain ? "WET" : "DRY");
    Serial.print("Gas: ");
    Serial.println(incomingData.gas ? "ALERT" : "OK");
    Serial.println("--------------------\n");

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
    Serial.print("❌ Data length mismatch! Expected ");
    Serial.print(sizeof(incomingData));
    Serial.print(" bytes, got ");
    Serial.print(len);
    Serial.println(" bytes");
    Serial.println("Make sure sender uses same struct_message structure!");
  }
  Serial.println("========================================\n");
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================");
  Serial.println("ESP32 Admin Receiver Starting...");
  Serial.println("========================================");

  // BUZZER
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // OLED - Try to initialize (non-blocking)
  Wire.begin(21, 22);
  delay(200);
  
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
    displayAvailable = false;
  }

  // WIFI - Must be done before ESP-NOW
  Serial.println("\n--- WiFi Setup ---");
  wifiConnect();

  // Print MAC address for sender ESP32s
  Serial.println("\n--- ESP-NOW Setup ---");
  Serial.print("📡 Admin ESP32 MAC Address: ");
  String macStr = WiFi.macAddress();
  Serial.println(macStr);
  Serial.println("\n👉 IMPORTANT: Copy this MAC address to your sender ESP32 code!");
  Serial.println("   Format for sender code:");
  Serial.print("   uint8_t adminMacAddress[] = {");
  uint8_t mac[6];
  WiFi.macAddress(mac);
  for (int i = 0; i < 6; i++) {
    Serial.print("0x");
    if (mac[i] < 0x10) Serial.print("0");
    Serial.print(mac[i], HEX);
    if (i < 5) Serial.print(", ");
  }
  Serial.println("};");
  Serial.println();

  // ESPNOW - Initialize after WiFi
  if (esp_now_init() != ESP_OK) {
    Serial.println("❌ ESP-NOW init failed");
    Serial.println("   Try restarting the ESP32");
    if (displayAvailable) {
      display.setCursor(0, 10);
      display.println("ESPNOW FAIL");
      display.display();
    }
    return;
  }
  
  esp_now_register_recv_cb(OnDataRecv);
  
  Serial.println("✅ ESP-NOW Receiver Ready!");
  Serial.println("✅ Waiting for data from sender ESP32s...");
  Serial.println("========================================\n");
  
  if (displayAvailable) {
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println(WiFi.status() == WL_CONNECTED ? "WiFi OK" : "WiFi FAIL");
    display.println("ESPNOW OK");
    display.println("Waiting...");
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

