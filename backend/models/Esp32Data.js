const mongoose = require('mongoose');

const esp32DataSchema = new mongoose.Schema({
  // Mesh network identifiers
  nodeId: {
    type: String,
    required: true,
    index: true,
    comment: 'Sensor node ID (e.g., NODE_001, NODE_002)'
  },
  adminId: {
    type: String,
    required: false,
    index: true,
    comment: 'Admin/receiver ESP32 ID that collected this data'
  },
  
  // Sensor data
  temperature: {
    type: Number,
    required: false
  },
  humidity: {
    type: Number,
    required: false
  },
  gas: {
    type: Number,
    required: false,
    comment: 'Gas sensor reading'
  },
  waterLevel: {
    type: Number,
    required: false,
    comment: 'Water level sensor reading'
  },
  motion: {
    type: Boolean,
    required: false,
    comment: 'Motion sensor detection'
  },
  soilMoisture: {
    type: Number,
    required: false,
    comment: 'Soil moisture sensor reading'
  },
  
  // Legacy fields for backward compatibility
  sensor1: {
    type: Number,
    required: false
  },
  sensor2: {
    type: Number,
    required: false
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  receivedAt: {
    type: Date,
    default: Date.now,
    comment: 'When admin ESP32 received the data'
  },
  additionalData: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
esp32DataSchema.index({ nodeId: 1, timestamp: -1 });
esp32DataSchema.index({ adminId: 1, timestamp: -1 });
esp32DataSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Esp32Data', esp32DataSchema);

