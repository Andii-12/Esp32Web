const express = require('express');
const Esp32Data = require('../models/Esp32Data');
const auth = require('../middleware/auth');
const router = express.Router();

// In-memory storage for real-time data (no MongoDB persistence)
const realTimeDataStore = new Map(); // nodeId -> latest data

// Get all ESP32 data (protected) - Real-time from memory (returns latest only)
router.get('/', auth, async (req, res) => {
  try {
    const { nodeId, deviceId, adminId } = req.query;
    
    // Get all data from memory
    let data = Array.from(realTimeDataStore.values());
    
    // Filter by nodeId if provided
    if (nodeId || deviceId) {
      const targetNodeId = nodeId || deviceId;
      data = data.filter(d => d.nodeId === targetNodeId);
    }
    
    // Filter by adminId if provided
    if (adminId) {
      data = data.filter(d => d.adminId === adminId);
    }
    
    // Sort by timestamp (newest first)
    data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get latest ESP32 data (protected)
router.get('/latest', auth, async (req, res) => {
  try {
    const { nodeId, deviceId, adminId } = req.query;
    
    const query = {};
    if (nodeId) query.nodeId = nodeId;
    else if (deviceId) query.nodeId = deviceId; // Backward compatibility
    if (adminId) query.adminId = adminId;
    
    const data = await Esp32Data.findOne(query)
      .sort({ timestamp: -1 })
      .exec();

    if (!data) {
      return res.status(404).json({ message: 'No data found' });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get latest data from all nodes (protected) - Real-time from memory
router.get('/latest/all-nodes', auth, async (req, res) => {
  try {
    // Get all data from memory store
    const data = Array.from(realTimeDataStore.values());
    
    // Filter by adminId if provided
    const { adminId } = req.query;
    const filteredData = adminId 
      ? data.filter(d => d.adminId === adminId)
      : data;
    
    // Sort by nodeId
    filteredData.sort((a, b) => a.nodeId.localeCompare(b.nodeId));

    res.json({
      success: true,
      count: filteredData.length,
      data: filteredData
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Post ESP32 data (protected - can be made public if needed)
router.post('/', auth, async (req, res) => {
  try {
    const { deviceId, temperature, humidity, sensor1, sensor2, additionalData } = req.body;

    if (!deviceId) {
      return res.status(400).json({ message: 'Device ID is required' });
    }

    const esp32Data = new Esp32Data({
      deviceId,
      temperature,
      humidity,
      sensor1,
      sensor2,
      additionalData,
      timestamp: new Date()
    });

    await esp32Data.save();

    res.status(201).json({
      success: true,
      message: 'Data saved successfully',
      data: esp32Data
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Public endpoint for ESP32 to send data (for mesh network - admin ESP32 sends collected data)
router.post('/public', async (req, res) => {
  try {
    // Optional API key check (enabled if API_KEY is set)
    if (process.env.API_KEY) {
      const provided = req.header('x-api-key') || req.header('X-API-Key');
      if (!provided || provided !== process.env.API_KEY) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
    }
    const { 
      nodeId, 
      adminId, 
      temperature, 
      humidity, 
      gas, 
      waterLevel, 
      motion, 
      soilMoisture,
      sensor1, 
      sensor2, 
      timestamp,
      receivedAt,
      additionalData 
    } = req.body;

    // Support both old format (deviceId) and new format (nodeId)
    const finalNodeId = nodeId || req.body.deviceId;
    
    if (!finalNodeId) {
      return res.status(400).json({ message: 'Node ID or Device ID is required' });
    }

    const esp32Data = new Esp32Data({
      nodeId: finalNodeId,
      adminId: adminId || 'ADMIN_001',
      temperature,
      humidity,
      gas,
      waterLevel,
      motion,
      soilMoisture,
      sensor1,
      sensor2,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
      additionalData
    });

    await esp32Data.save();

    res.status(201).json({
      success: true,
      message: 'Data received successfully',
      data: esp32Data
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Batch endpoint for admin ESP32 to send multiple sensor readings at once
router.post('/public/batch', async (req, res) => {
  try {
    // Optional API key check (enabled if API_KEY is set)
    if (process.env.API_KEY) {
      const provided = req.header('x-api-key') || req.header('X-API-Key');
      if (!provided || provided !== process.env.API_KEY) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
    }
    const { adminId, sensorData } = req.body;

    if (!adminId) {
      return res.status(400).json({ message: 'Admin ID is required' });
    }

    if (!Array.isArray(sensorData) || sensorData.length === 0) {
      return res.status(400).json({ message: 'Sensor data array is required' });
    }

    const savedData = [];
    const errors = [];

    for (const data of sensorData) {
      try {
        const { 
          nodeId, 
          temperature, 
          humidity, 
          gas, 
          waterLevel, 
          motion, 
          soilMoisture,
          sensor1, 
          sensor2, 
          timestamp,
          receivedAt,
          additionalData 
        } = data;

        if (!nodeId) {
          errors.push({ nodeId: data.nodeId || 'unknown', error: 'Node ID is required' });
          continue;
        }

        const esp32Data = new Esp32Data({
          nodeId,
          adminId,
          temperature,
          humidity,
          gas,
          waterLevel,
          motion,
          soilMoisture,
          sensor1,
          sensor2,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
          additionalData
        });

        await esp32Data.save();
        savedData.push(esp32Data);
      } catch (error) {
        errors.push({ nodeId: data.nodeId || 'unknown', error: error.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `Processed ${sensorData.length} records`,
      saved: savedData.length,
      errors: errors.length,
      data: savedData,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Endpoint for room-based ESP32 code (accepts room_id format)
router.post('/public/room', async (req, res) => {
  try {
    // Optional API key check (enabled if API_KEY is set)
    if (process.env.API_KEY) {
      const provided = req.header('x-api-key') || req.header('X-API-Key');
      if (!provided || provided !== process.env.API_KEY) {
        console.log('❌ API Key mismatch or missing');
        return res.status(401).json({ message: 'Unauthorized' });
      }
    }
    // Log incoming request for debugging
    console.log('\n=== ESP32 Data Received ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    
    const { 
      room_id, 
      temperature, 
      humidity, 
      motion, 
      rain, 
      gas, 
      ts 
    } = req.body;

    if (room_id === undefined) {
      console.log('❌ Error: room_id is missing');
      return res.status(400).json({ message: 'room_id is required' });
    }

    const nodeId = `ROOM_${room_id}`;  // Convert room_id to nodeId format
    const adminId = 'ADMIN_001';        // Default admin ID

    // Store in memory for real-time display (no MongoDB save)
    realTimeDataStore.set(nodeId, {
      nodeId: nodeId,
      adminId: 'ADMIN_001',
      temperature,
      humidity,
      motion: motion === 1,
      gas: gas === 1,
      waterLevel: rain === 1 ? 100 : 0,
      timestamp: ts ? new Date(ts) : new Date(),
      receivedAt: new Date(),
      _id: nodeId // For compatibility with frontend
    });
    
    console.log('✅ Data stored in memory (real-time)');
    console.log('Node ID:', nodeId);
    console.log('=========================\n');

    res.status(201).json({
      success: true,
      message: 'Data received successfully',
      data: realTimeDataStore.get(nodeId)
    });
  } catch (error) {
    console.error('❌ Error saving data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

