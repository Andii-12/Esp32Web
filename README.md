# ESP32 Data Dashboard

A full-stack web application for collecting and displaying data from ESP32 devices. Features authentication and real-time data visualization.

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)

## Project Structure

```
EspWeb/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   └── Esp32Data.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── esp32.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Auth.css
│   │   │   └── Dashboard.css
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```bash
cp .env.example .env
```

4. Edit `.env` and update the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/esp32data
JWT_SECRET=your_secret_key_change_this_in_production
NODE_ENV=development
```

5. Start the backend server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Features

### Authentication
- User registration and login
- JWT-based authentication
- Protected routes for ESP32 data

### ESP32 Data Management
- Store data from ESP32 devices
- View latest data in real-time (auto-refreshes every 5 seconds)
- View data history in a table format
- Filter data by device ID

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

#### ESP32 Data (Protected)
- `GET /api/esp32` - Get all ESP32 data (with optional deviceId query parameter)
- `GET /api/esp32/latest` - Get latest ESP32 data
- `POST /api/esp32` - Post ESP32 data (requires authentication)

#### ESP32 Data (Public)
- `POST /api/esp32/public` - Post ESP32 data without authentication (for ESP32 devices)

## ESP32 Integration

To send data from your ESP32 device, use the public endpoint:

```cpp
// Example ESP32 code snippet
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://YOUR_SERVER_IP:5000/api/esp32/public";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    // Create JSON payload
    String jsonData = "{";
    jsonData += "\"deviceId\":\"ESP32_001\",";
    jsonData += "\"temperature\":" + String(25.5) + ",";
    jsonData += "\"humidity\":" + String(60.0) + ",";
    jsonData += "\"sensor1\":" + String(analogRead(A0)) + ",";
    jsonData += "\"sensor2\":" + String(analogRead(A1));
    jsonData += "}";
    
    int httpResponseCode = http.POST(jsonData);
    
    if (httpResponseCode > 0) {
      Serial.println("Data sent successfully");
    } else {
      Serial.println("Error sending data");
    }
    
    http.end();
  }
  
  delay(5000); // Send data every 5 seconds
}
```

## Data Schema

### User
- `username` (String, required, unique)
- `email` (String, required, unique)
- `password` (String, required, hashed)

### ESP32Data
- `deviceId` (String, required)
- `temperature` (Number, optional)
- `humidity` (Number, optional)
- `sensor1` (Number, optional)
- `sensor2` (Number, optional)
- `timestamp` (Date, auto-generated)
- `additionalData` (Mixed, optional)

## Security Notes

- Change the `JWT_SECRET` in production
- Use HTTPS in production
- Consider adding rate limiting for the public endpoint
- Implement proper CORS configuration for production

## License

ISC

