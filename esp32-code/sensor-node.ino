/*
 * ESP32 Sensor Node (ESP-NOW Sender)
 * Sends sensor data to Admin ESP32 via ESP-NOW
 * 
 * Sensors: Temperature, Gas, Water Level, Motion, Soil Moisture
 */

#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <ArduinoJson.h>

// ========== CONFIGURATION ==========
// Change these for each sensor node
#define NODE_ID "NODE_001"  // Change to NODE_002 for second sensor node
#define ADMIN_MAC_ADDRESS {0xXX, 0xXX, 0xXX, 0xXX, 0xXX, 0xXX}  // Replace with admin ESP32 MAC address

// Sensor pins (adjust according to your setup)
#define TEMP_SENSOR_PIN 34
#define GAS_SENSOR_PIN 35
#define WATER_LEVEL_PIN 32
#define MOTION_SENSOR_PIN 33
#define SOIL_MOISTURE_PIN 36

// ESP-NOW settings
uint8_t adminMacAddress[] = ADMIN_MAC_ADDRESS;

// ========== DATA STRUCTURE ==========
typedef struct sensor_data {
  char nodeId[20];
  float temperature;
  float gas;
  float waterLevel;
  bool motion;
  float soilMoisture;
  unsigned long timestamp;
} sensor_data_t;

sensor_data_t sensorData;

// ========== ESP-NOW CALLBACK ==========
void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  Serial.print("Packet Send Status: ");
  if (status == ESP_NOW_SEND_SUCCESS) {
    Serial.println("Delivery Success");
  } else {
    Serial.println("Delivery Fail");
  }
}

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("ESP32 Sensor Node Starting...");
  Serial.print("Node ID: ");
  Serial.println(NODE_ID);
  
  // Initialize sensor pins
  pinMode(MOTION_SENSOR_PIN, INPUT);
  pinMode(TEMP_SENSOR_PIN, INPUT);
  pinMode(GAS_SENSOR_PIN, INPUT);
  pinMode(WATER_LEVEL_PIN, INPUT);
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  
  // Initialize WiFi in Station mode
  WiFi.mode(WIFI_STA);
  
  // Initialize ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("Error initializing ESP-NOW");
    return;
  }
  
  // Register callback
  esp_now_register_send_cb(OnDataSent);
  
  // Add admin as peer
  esp_now_peer_info_t peerInfo;
  memcpy(peerInfo.peer_addr, adminMacAddress, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;
  
  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("Failed to add peer");
    return;
  }
  
  Serial.println("Sensor Node Ready!");
  Serial.println("Waiting for sensor readings...");
}

// ========== READ SENSORS ==========
void readSensors() {
  // Read temperature (example: using analog sensor, convert to Celsius)
  // Adjust this based on your actual temperature sensor
  int tempRaw = analogRead(TEMP_SENSOR_PIN);
  sensorData.temperature = (tempRaw / 4095.0) * 100.0; // Example conversion
  
  // Read gas sensor
  int gasRaw = analogRead(GAS_SENSOR_PIN);
  sensorData.gas = (gasRaw / 4095.0) * 100.0; // Percentage or PPM
  
  // Read water level sensor
  int waterRaw = analogRead(WATER_LEVEL_PIN);
  sensorData.waterLevel = (waterRaw / 4095.0) * 100.0; // Percentage
  
  // Read motion sensor (digital)
  sensorData.motion = digitalRead(MOTION_SENSOR_PIN) == HIGH;
  
  // Read soil moisture sensor
  int soilRaw = analogRead(SOIL_MOISTURE_PIN);
  sensorData.soilMoisture = (soilRaw / 4095.0) * 100.0; // Percentage
  
  // Set node ID and timestamp
  strcpy(sensorData.nodeId, NODE_ID);
  sensorData.timestamp = millis();
}

// ========== SEND DATA ==========
void sendSensorData() {
  readSensors();
  
  // Print sensor data
  Serial.println("\n=== Sensor Data ===");
  Serial.print("Node ID: ");
  Serial.println(sensorData.nodeId);
  Serial.print("Temperature: ");
  Serial.print(sensorData.temperature);
  Serial.println(" °C");
  Serial.print("Gas: ");
  Serial.print(sensorData.gas);
  Serial.println(" %");
  Serial.print("Water Level: ");
  Serial.print(sensorData.waterLevel);
  Serial.println(" %");
  Serial.print("Motion: ");
  Serial.println(sensorData.motion ? "Detected" : "None");
  Serial.print("Soil Moisture: ");
  Serial.print(sensorData.soilMoisture);
  Serial.println(" %");
  Serial.println("==================\n");
  
  // Send via ESP-NOW
  esp_err_t result = esp_now_send(adminMacAddress, (uint8_t *) &sensorData, sizeof(sensor_data_t));
  
  if (result == ESP_OK) {
    Serial.println("Data sent successfully!");
  } else {
    Serial.print("Error sending data: ");
    Serial.println(result);
  }
}

// ========== MAIN LOOP ==========
void loop() {
  // Send sensor data every 5 seconds
  sendSensorData();
  delay(5000);
}

