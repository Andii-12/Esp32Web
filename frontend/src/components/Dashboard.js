import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [data, setData] = useState([]);
  const [latestDataAllNodes, setLatestDataAllNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nodeId, setNodeId] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    console.log('[Dashboard] Component mounted, starting data fetch...');
    fetchData();
    fetchLatestDataAllNodes();

    // Auto-refresh every 1 second for real-time updates
    const interval = setInterval(() => {
      fetchLatestDataAllNodes();
    }, 1000);

    setRefreshInterval(interval);
    console.log('[Dashboard] Auto-refresh interval started (1 second)');

    return () => {
      if (interval) clearInterval(interval);
      console.log('[Dashboard] Component unmounted, interval cleared');
    };
  }, [nodeId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('[Dashboard] Fetching data history...', { nodeId });
      const params = nodeId ? { nodeId, limit: 50 } : { limit: 50 };
      const response = await axios.get('/api/esp32', { params });
      console.log('[Dashboard] Data history received:', {
        count: response.data.data?.length || 0,
        data: response.data.data
      });
      setData(response.data.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
      console.error('[Dashboard] ❌ Error fetching data:', err);
      console.error('[Dashboard] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestDataAllNodes = async () => {
    try {
      console.log('[Dashboard] Fetching latest data from all nodes...');
      const response = await axios.get('/api/esp32/latest/all-nodes');
      const data = response.data.data || [];
      
      console.log('[Dashboard] Received data:', {
        count: data.length,
        nodes: data.map(d => ({ nodeId: d.nodeId, temperature: d.temperature, timestamp: d.timestamp }))
      });
      
      if (data.length > 0) {
        console.log('[Dashboard] ✅ ESP32 data is coming!');
        data.forEach(node => {
          console.log(`[Dashboard] Node ${node.nodeId}:`, {
            temperature: node.temperature,
            humidity: node.humidity,
            timestamp: node.timestamp,
            isOnline: isRoomOnline(node.nodeId)
          });
        });
      } else {
        console.log('[Dashboard] ⚠️ No ESP32 data received yet');
      }
      
      setLatestDataAllNodes(data);
    } catch (err) {
      console.error('[Dashboard] ❌ Error fetching latest data:', err);
      console.error('[Dashboard] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
    }
  };

  const handleNodeFilter = () => {
    fetchData();
    fetchLatestDataAllNodes();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Check if room is online (data received within last 10 seconds)
  const isRoomOnline = (nodeId) => {
    const roomData = latestDataAllNodes.find(n => n.nodeId === nodeId);
    if (!roomData) return false;
    const now = new Date();
    const dataTime = new Date(roomData.timestamp || roomData.receivedAt);
    const diffSeconds = (now - dataTime) / 1000;
    return diffSeconds < 10; // Online if data received within last 10 seconds
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>ESP32 Data Dashboard</h1>
          <p>Welcome, {user?.username}</p>
        </div>
        <button onClick={logout} className="logout-button">
          Logout
        </button>
      </header>

      <div className="dashboard-content">
        <div className="filter-section">
          <input
            type="text"
            placeholder="Filter by Node ID (leave empty for all nodes)"
            value={nodeId}
            onChange={(e) => setNodeId(e.target.value)}
            className="filter-input"
          />
          <button onClick={handleNodeFilter} className="filter-button">
            Filter
          </button>
          <button onClick={fetchData} className="refresh-button">
            Refresh
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Admin Section */}
        <div className="admin-section">
          <div className="admin-header">
            <h2>Admin</h2>
            <span className="status-badge online">Online</span>
          </div>
          <div className="admin-info">
            <p>Admin ESP32 Receiver Status</p>
            <p className="admin-id">Admin ID: ADMIN_001</p>
          </div>
        </div>

        {/* Room Sections */}
        <div className="rooms-section">
          <h2>Sensor Rooms</h2>
          <div className="rooms-grid">
            {/* Room 1 */}
            <div className="room-card">
              <div className="room-header">
                <h3>Room 1</h3>
                <span className={`status-badge ${isRoomOnline('ROOM_1') ? 'online' : 'offline'}`}>
                  {isRoomOnline('ROOM_1') ? '🟢 Online' : '🔴 Offline'}
                </span>
              </div>
              {(() => {
                const room1Data = latestDataAllNodes.find(n => n.nodeId === 'ROOM_1');
                return room1Data ? (
                  <div className="room-data">
                    <div className="sensor-row">
                      <span className="sensor-label">🌡️ Temperature:</span>
                      <span className="sensor-value">{room1Data.temperature !== undefined ? room1Data.temperature.toFixed(1) + '°C' : 'N/A'}</span>
                    </div>
                    <div className="sensor-row">
                      <span className="sensor-label">💧 Humidity:</span>
                      <span className="sensor-value">{room1Data.humidity !== undefined ? room1Data.humidity.toFixed(1) + '%' : 'N/A'}</span>
                    </div>
                    <div className="sensor-row">
                      <span className="sensor-label">💨 Gas:</span>
                      <span className="sensor-value">{room1Data.gas !== undefined ? room1Data.gas.toFixed(1) + '%' : 'N/A'}</span>
                    </div>
                    <div className="sensor-row">
                      <span className="sensor-label">🌊 Water Level:</span>
                      <span className="sensor-value">{room1Data.waterLevel !== undefined ? room1Data.waterLevel.toFixed(1) + '%' : 'N/A'}</span>
                    </div>
                    <div className="sensor-row">
                      <span className="sensor-label">🚶 Motion:</span>
                      <span className={`sensor-value ${room1Data.motion ? 'motion-detected' : ''}`}>
                        {room1Data.motion ? 'Detected' : 'None'}
                      </span>
                    </div>
                    <div className="sensor-row">
                      <span className="sensor-label">🌱 Soil Moisture:</span>
                      <span className="sensor-value">{room1Data.soilMoisture !== undefined ? room1Data.soilMoisture.toFixed(1) + '%' : 'N/A'}</span>
                    </div>
                    <div className="sensor-row timestamp-row">
                      <span className="sensor-label">🕐 Last Update:</span>
                      <span className="sensor-value-small">{formatDate(room1Data.timestamp)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="room-data">
                    <p className="no-room-data">No data received from Room 1</p>
                  </div>
                );
              })()}
            </div>

            {/* Room 2 */}
            <div className="room-card">
              <div className="room-header">
                <h3>Room 2</h3>
                <span className={`status-badge ${isRoomOnline('ROOM_2') ? 'online' : 'offline'}`}>
                  {isRoomOnline('ROOM_2') ? '🟢 Online' : '🔴 Offline'}
                </span>
              </div>
              {(() => {
                const room2Data = latestDataAllNodes.find(n => n.nodeId === 'ROOM_2');
                return room2Data ? (
                  <div className="room-data">
                    <div className="sensor-row">
                      <span className="sensor-label">🌡️ Temperature:</span>
                      <span className="sensor-value">{room2Data.temperature !== undefined ? room2Data.temperature.toFixed(1) + '°C' : 'N/A'}</span>
                    </div>
                    <div className="sensor-row">
                      <span className="sensor-label">💧 Humidity:</span>
                      <span className="sensor-value">{room2Data.humidity !== undefined ? room2Data.humidity.toFixed(1) + '%' : 'N/A'}</span>
                    </div>
                    <div className="sensor-row">
                      <span className="sensor-label">💨 Gas:</span>
                      <span className="sensor-value">{room2Data.gas !== undefined ? room2Data.gas.toFixed(1) + '%' : 'N/A'}</span>
                    </div>
                    <div className="sensor-row">
                      <span className="sensor-label">🌊 Water Level:</span>
                      <span className="sensor-value">{room2Data.waterLevel !== undefined ? room2Data.waterLevel.toFixed(1) + '%' : 'N/A'}</span>
                    </div>
                    <div className="sensor-row">
                      <span className="sensor-label">🚶 Motion:</span>
                      <span className={`sensor-value ${room2Data.motion ? 'motion-detected' : ''}`}>
                        {room2Data.motion ? 'Detected' : 'None'}
                      </span>
                    </div>
                    <div className="sensor-row">
                      <span className="sensor-label">🌱 Soil Moisture:</span>
                      <span className="sensor-value">{room2Data.soilMoisture !== undefined ? room2Data.soilMoisture.toFixed(1) + '%' : 'N/A'}</span>
                    </div>
                    <div className="sensor-row timestamp-row">
                      <span className="sensor-label">🕐 Last Update:</span>
                      <span className="sensor-value-small">{formatDate(room2Data.timestamp)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="room-data">
                    <p className="no-room-data">No data received from Room 2</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="data-history">
          <h2>Data History</h2>
          {loading ? (
            <div className="loading">Loading data...</div>
          ) : data.length === 0 ? (
            <div className="no-data">No data available. ESP32 can send data to /api/esp32/public endpoint.</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Node ID</th>
                    <th>Admin ID</th>
                    <th>Temperature</th>
                    <th>Humidity</th>
                    <th>Gas</th>
                    <th>Water Level</th>
                    <th>Motion</th>
                    <th>Soil Moisture</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item._id}>
                      <td>{item.nodeId || item.deviceId}</td>
                      <td>{item.adminId || '-'}</td>
                      <td>{item.temperature !== undefined ? `${item.temperature.toFixed(1)}°C` : '-'}</td>
                      <td>{item.humidity !== undefined ? `${item.humidity.toFixed(1)}%` : '-'}</td>
                      <td>{item.gas !== undefined ? `${item.gas.toFixed(1)}%` : '-'}</td>
                      <td>{item.waterLevel !== undefined ? `${item.waterLevel.toFixed(1)}%` : '-'}</td>
                      <td>{item.motion !== undefined ? (item.motion ? 'Yes' : 'No') : '-'}</td>
                      <td>{item.soilMoisture !== undefined ? `${item.soilMoisture.toFixed(1)}%` : '-'}</td>
                      <td>{formatDate(item.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


