# ESP32 Connection Test Guide

## Problem: HTTP Response Code -1 (Connection Refused)

This means the ESP32 cannot establish a TCP connection to the Railway server. This is NOT an HTTPS issue - it's a network connectivity issue.

## Quick Tests

### Test 1: Verify Server is Accessible

From your computer (where ESP32 WiFi can reach), test:

```bash
curl -X POST https://esp32web-production.up.railway.app/api/esp32/public/room \
  -H "Content-Type: application/json" \
  -H "X-API-Key: esp32_prod_key" \
  -d '{"room_id":2,"temperature":25.3,"humidity":13.3,"motion":0,"rain":1,"gas":0,"ts":123456}'
```

**Expected:** `{"success":true,...}`

**If this fails:** Server is not accessible or not running

### Test 2: Check Railway Server Status

1. Go to Railway dashboard
2. Check if your service is running (should show "Running")
3. Check logs for any errors
4. Verify the URL is correct: `esp32web-production.up.railway.app`

### Test 3: Verify API Key

**In Railway Environment Variables:**
- `API_KEY` = `esp32_prod_key` (must match ESP32 code)

**In ESP32 Code:**
- `API_KEY` = `"esp32_prod_key"` (must match Railway)

## Common Issues & Solutions

### Issue 1: Server Not Running on Railway

**Solution:**
- Check Railway dashboard - service should be "Running"
- Check Railway logs for startup errors
- Restart the service if needed

### Issue 2: Wrong Server URL

**Solution:**
- Verify Railway service URL
- Check Railway → Settings → Domains
- The URL should be: `https://esp32web-production.up.railway.app`

### Issue 3: API Key Mismatch

**Solution:**
- Railway: `API_KEY=esp32_prod_key`
- ESP32: `const char* API_KEY = "esp32_prod_key";`
- Must match exactly (case-sensitive)

### Issue 4: HTTPS Certificate Issue

**Solution:**
- The code uses `client.setInsecure()` which should work
- If still failing, try using HTTP instead (temporarily):
  - Change `https://` to `http://` in SERVER_URL
  - Note: Railway might not support HTTP, only HTTPS

### Issue 5: Railway Service Not Receiving Requests

**Solution:**
- Check Railway logs when ESP32 sends data
- You should see: `=== ESP32 Data Received ===`
- If not, requests aren't reaching the server

## Diagnostic Steps

1. **Upload updated ESP32 code** (with retries and better error handling)
2. **Check Serial Monitor** - it will show:
   - WiFi connection status
   - Server URL being used
   - Connection attempts
   - Test GET response

3. **Check Railway Logs** - Look for:
   - Incoming requests
   - Any errors

4. **Test from computer** - Use curl to verify server works

## Alternative: Use HTTP Instead of HTTPS (if Railway supports it)

If HTTPS continues to fail, try HTTP (temporary test):

```cpp
const char* SERVER_URL = "http://esp32web-production.up.railway.app/api/esp32/public/room";
```

And use regular WiFiClient instead of WiFiClientSecure:

```cpp
WiFiClient client;  // Instead of WiFiClientSecure
HTTPClient http;
http.begin(client, SERVER_URL);  // Instead of http.begin(client, SERVER_URL)
```

**Note:** Railway typically only supports HTTPS, so this might not work.

## What the Updated Code Does

The updated ESP32 code now:
- ✅ Retries connection 3 times
- ✅ Retries POST request 3 times
- ✅ Shows detailed error information
- ✅ Tests server connectivity with GET request
- ✅ Shows WiFi status and IP address

Upload the updated code and check Serial Monitor for the detailed diagnostics.

