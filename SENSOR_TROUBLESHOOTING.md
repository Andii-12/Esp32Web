# Sensor Troubleshooting Guide

If water sensor and gas sensor values are not changing on the dashboard, follow these steps:

## 1. Check Serial Monitor Output

Open the Serial Monitor (115200 baud) and look for sensor readings:

```
Rain sensor (pin 35): HIGH (dry) -> rain=0
Gas sensor (pin 36): 250 (threshold: 500) -> gas=0
```

### What to look for:
- **Rain sensor**: Should show HIGH (dry) or LOW (wet)
- **Gas sensor**: Should show a number (0-4095 on ESP32)

## 2. Rain Sensor Issues

### If rain sensor always shows 0 (dry):
- **Check wiring**: 
  - VCC → 3.3V or 5V
  - GND → GND
  - DO (Digital Out) → GPIO35
- **Test manually**: Touch the sensor pads with wet finger - should change from HIGH to LOW
- **If not connected**: The pin will read HIGH (dry) due to INPUT_PULLUP

### If rain sensor always shows 1 (wet):
- Sensor might be faulty or shorted
- Check if sensor is actually wet
- Try cleaning the sensor

## 3. Gas Sensor (MQ2) Issues

### If gas sensor always shows 0 (no gas):
1. **Check the reading value** in Serial Monitor:
   - If reading is always 0: Sensor not connected or not powered
   - If reading is low (0-100): Normal for clean air, threshold might be too high
   - If reading is 200-500: Some gas present, but below threshold

2. **Adjust threshold**:
   - Open `ESP32_DHT22_WEB.ino`
   - Find `#define GAS_THRESHOLD 500`
   - Lower it to 200-300 if you want more sensitivity
   - Raise it to 800-1000 if you get false positives

3. **Check wiring**:
   - VCC → 5V (MQ2 needs 5V, not 3.3V)
   - GND → GND
   - A0 (Analog Out) → GPIO36
   - D0 (Digital Out) → Not used in this code

4. **Warm-up time**: MQ2 sensors need 1-2 minutes to warm up after power on

### If gas sensor always shows 1 (gas detected):
- Threshold is too low
- Sensor might be faulty
- Increase `GAS_THRESHOLD` value

## 4. Testing Sensors

### Test Rain Sensor:
```cpp
// Add this to loop() temporarily for testing
int rainTest = digitalRead(RAIN_SENSOR_PIN);
Serial.print("Rain pin reading: ");
Serial.println(rainTest == HIGH ? "HIGH (dry)" : "LOW (wet)");
```

### Test Gas Sensor:
```cpp
// Add this to loop() temporarily for testing
int gasTest = analogRead(GAS_SENSOR_PIN);
Serial.print("Gas sensor reading: ");
Serial.println(gasTest);
```

## 5. Disable Sensors

If sensors are not connected, set pins to -1:

```cpp
#define RAIN_SENSOR_PIN -1    // Disable rain sensor
#define GAS_SENSOR_PIN -1     // Disable gas sensor
```

## 6. Common Issues

### Issue: Sensors show same value always
**Solution**: 
- Check physical connections
- Verify power supply (especially MQ2 needs 5V)
- Check if sensors are actually working (test with multimeter)

### Issue: Gas sensor reads 0 always
**Solution**:
- MQ2 needs 5V power (not 3.3V)
- Wait 1-2 minutes for warm-up
- Lower the threshold value
- Check if A0 pin is connected to GPIO36

### Issue: Rain sensor reads wrong value
**Solution**:
- Check if DO (digital output) is connected, not AO (analog output)
- Verify pull-up resistor (code uses INPUT_PULLUP)
- Test with wet finger to see if value changes

## 7. Verify Backend Receives Data

Check backend logs when ESP32 sends data:
```
=== ESP32 Data Received ===
Request Body: {
  "room_id": 1,
  "temperature": 25.5,
  "humidity": 60.0,
  "rain": 0,
  "gas": 0,
  ...
}
Sensor values - Rain: 0, Gas: 0
```

If backend shows different values than ESP32 Serial Monitor, there might be a transmission issue.

## 8. Calibration

### Gas Sensor Calibration:
1. Let sensor warm up for 2 minutes in clean air
2. Note the reading in clean air (should be 0-100)
3. Set threshold to: `clean_air_reading + 200-300`
4. Example: If clean air reads 50, set threshold to 300-350

### Rain Sensor:
- Usually works with default settings
- HIGH = dry, LOW = wet
- If inverted, change the logic in code

## Still Not Working?

1. **Check Serial Monitor** - This is the most important step
2. **Verify wiring** - Double-check all connections
3. **Test with multimeter** - Check if sensors are outputting signals
4. **Try different pins** - In case of pin issues
5. **Check sensor specifications** - Make sure sensors are compatible with ESP32

