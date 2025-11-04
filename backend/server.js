const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
// Configure CORS for production deployments (Railway + Vercel)
const allowedOrigin = process.env.FRONTEND_URL || undefined; // undefined -> reflect request origin in dev
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin like curl/postman or if FRONTEND_URL not set
    if (!origin || !allowedOrigin) return callback(null, true);
    if (origin === allowedOrigin) return callback(null, true);
    // Also allow localhost for local dev convenience
    if (origin === 'http://localhost:3000' || origin === 'http://127.0.0.1:3000') return callback(null, true);
    return callback(new Error('Not allowed by CORS'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: false,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Request logging middleware (for debugging)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/esp32')) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  }
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/esp32', require('./routes/esp32'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/esp32data', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
// Listen on all network interfaces (0.0.0.0) so ESP32 can connect
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server accessible at:`);
  console.log(`  - http://localhost:${PORT}`);
  console.log(`  - http://127.0.0.1:${PORT}`);
  console.log(`  - http://YOUR_LOCAL_IP:${PORT} (check with ipconfig/ifconfig)`);
});

