/*
 * ESP32 Admin Receiver (ESP-NOW Receiver + WiFi HTTP Client)
 * Receives data from sensor nodes via ESP-NOW
 * Sends collected data to web server via HTTP POST
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <esp_now.h>
#include <ArduinoJson.h>
#include <vector>

// ========== CONFIGURATION ==========
#define ADMIN_ID "ADMIN_001"
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define SERVER_URL "http://YOUR_SERVER_IP:5000/api/esp32/public/batch"
// Or use single endpoint: "http://YOUR_SERVER_IP:5000/api/esp32/public"

// Sensor node MAC addresses (update with your sensor nodes' MAC addresses)
uint8_t node1MacAddress[] = {0xXX, 0xXX, 0xXX, 0xXX, 0xXX, 0xXX}; // NODE_001
uint8_t node2MacAddress[] = {0xXX, 0xXX, 0xXX, 0xXX, 0xXX, 0xXX}; // NODE_002

// ========== DATA STRUCTURES ==========
typedef struct sensor_data {
  char nodeId[20];
  float temperature;
  float gas;
  float waterLevel;
  bool motion;
  float soilMoisture;
  unsigned long timestamp;
} sensor_data_t;

// Buffer to store received sensor data
struct NodeData {
  sensor_data_t data;
  unsigned long receivedAt;
};

std::vector<NodeData> sensorDataBuffer;

// ========== ESP-NOW CALLBACK ==========
void OnDataRecv(const uint8_t * mac, const uint8_t *incomingData, int len) {
  sensor_data_t receivedData;
  memcpy(&receivedData, incomingData, sizeof(receivedData));
  
  // Create node data entry
  NodeData nodeData;
  nodeData.data = receivedData;
  nodeData.receivedAt = millis();
  
  // Add to buffer
  sensorDataBuffer.push_back(nodeData);
  
  // Print received data
  Serial.println("\n=== Data Received ===");
  Serial.print("From MAC: ");
  for (int i = 0; i < 6; i++) {
    Serial.print(mac[i], HEX);
    if (i < 5) Serial.print(":");
  }
  Serial.println();
  Serial.print("Node ID: ");
  Serial.println(receivedData.nodeId);
  Serial.print("Temperature: ");
  Serial.print(receivedData.temperature);
  Serial.println(" °C");
  Serial.print("Gas: ");
  Serial.print(receivedData.gas);
  Serial.println(" %");
  Serial.print("Water Level: ");
  Serial.print(receivedData.waterLevel);
  Serial.println(" %");
  Serial.print("Motion: ");
  Serial.println(receivedData.motion ? "Detected" : "None");
  Serial.print("Soil Moisture: ");
  Serial.print(receivedData.soilMoisture);
  Serial.println(" %");
  Serial.println("====================\n");
}

// ========== WIFI SETUP ==========
void setupWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_AP_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("MAC Address: ");
    Serial.println(WiFi.macAddress());
    Serial.print("Server URL: ");
    Serial.println(SERVER_URL);
  } else {
    Serial.println("\n❌ WiFi Connection Failed!");
    Serial.println("Check:");
    Serial.println("  1. WiFi SSID is correct");
    Serial.println("  2. WiFi password is correct");
    Serial.println("  3. WiFi is 2.4GHz (not 5GHz)");
    Serial.println("  4. ESP32 is within WiFi range");
  }
}

// ========== ESP-NOW SETUP ==========
void setupESPNow() {
  // Initialize ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("Error initializing ESP-NOW");
    return;
  }
  
  // Register callback
  esp_now_register_recv_cb(OnDataRecv);
  
  Serial.println("ESP-NOW Receiver Ready!");
}

// ========== SEND DATA TO SERVER (BATCH) ==========
void sendDataToServerBatch() {
  if (sensorDataBuffer.empty()) {
    Serial.println("No data to send");
    return;
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, cannot send data");
    setupWiFi();
    return;
  }
  
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  DynamicJsonDocument doc(4096);
  doc["adminId"] = ADMIN_ID;
  JsonArray sensorDataArray = doc.createNestedArray("sensorData");
  
  for (const auto& nodeData : sensorDataBuffer) {
    JsonObject dataObj = sensorDataArray.createNestedObject();
    dataObj["nodeId"] = nodeData.data.nodeId;
    dataObj["temperature"] = nodeData.data.temperature;
    dataObj["gas"] = nodeData.data.gas;
    dataObj["waterLevel"] = nodeData.data.waterLevel;
    dataObj["motion"] = nodeData.data.motion;
    dataObj["soilMoisture"] = nodeData.data.soilMoisture;
    dataObj["timestamp"] = nodeData.data.timestamp;
    dataObj["receivedAt"] = nodeData.receivedAt;
  }
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  Serial.println("\n=== Sending to Server ===");
  Serial.println("URL: " + String(SERVER_URL));
  Serial.println("Payload:");
  Serial.println(jsonPayload);
  
  // Set timeout (10 seconds)
  http.setTimeout(10000);
  
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    
    String response = http.getString();
    Serial.println("Response: " + response);
    
    if (httpResponseCode == 201) {
      Serial.println("✅ Data sent successfully!");
      sensorDataBuffer.clear(); // Clear buffer after successful send
    } else {
      Serial.print("⚠️ Server returned error code: ");
      Serial.println(httpResponseCode);
    }
  } else {
    Serial.print("❌ Error sending data. Code: ");
    Serial.println(httpResponseCode);
    Serial.println("Check:");
    Serial.println("  1. Server IP address is correct");
    Serial.println("  2. Server is running (npm start)");
    Serial.println("  3. ESP32 and server on same WiFi network");
    Serial.println("  4. Firewall allows port 5000");
  }
  
  http.end();
  Serial.println("=======================\n");
}

// ========== SEND DATA TO SERVER (SINGLE) ==========
void sendDataToServerSingle(const NodeData& nodeData) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, cannot send data");
    setupWiFi();
    return;
  }
  
  HTTPClient http;
  http.begin("http://YOUR_SERVER_IP:5000/api/esp32/public"); // Single endpoint
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  DynamicJsonDocument doc(512);
  doc["nodeId"] = nodeData.data.nodeId;
  doc["adminId"] = ADMIN_ID;
  doc["temperature"] = nodeData.data.temperature;
  doc["gas"] = nodeData.data.gas;
  doc["waterLevel"] = nodeData.data.waterLevel;
  doc["motion"] = nodeData.data.motion;
  doc["soilMoisture"] = nodeData.data.soilMoisture;
  doc["timestamp"] = nodeData.data.timestamp;
  doc["receivedAt"] = nodeData.receivedAt;
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0 && httpResponseCode == 201) {
    Serial.println("Data sent successfully!");
  } else {
    Serial.print("Error sending data: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("ESP32 Admin Receiver Starting...");
  Serial.print("Admin ID: ");
  Serial.println(ADMIN_ID);
  
  // Setup WiFi
  setupWiFi();
  
  // Setup ESP-NOW
  setupESPNow();
  
  Serial.println("Admin Receiver Ready!");
  Serial.println("Waiting for sensor data...");
}

// ========== MAIN LOOP ==========
void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    setupWiFi();
    delay(5000);
  }
  
  // Send data to server every 10 seconds if buffer has data
  // Or send immediately when data is received (uncomment below)
  if (sensorDataBuffer.size() > 0) {
    sendDataToServerBatch();
    delay(1000);
  }
  
  delay(1000); // Small delay to prevent watchdog issues
}

