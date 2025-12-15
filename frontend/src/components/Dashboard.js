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
  const [refreshInterval, setRefreshInterval] = useState(null);
  
  // Email recipients state
  const [emailRecipients, setEmailRecipients] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newEmailName, setNewEmailName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    console.log('[Dashboard] Component mounted, starting data fetch...');
    fetchData();
    fetchLatestDataAllNodes();
    fetchEmailRecipients();

    // Auto-refresh every 200ms for real-time updates (reduced delay)
    const interval = setInterval(() => {
      fetchLatestDataAllNodes();
    }, 200);

    setRefreshInterval(interval);
    console.log('[Dashboard] Auto-refresh interval started (300ms - real-time)');

    return () => {
      if (interval) clearInterval(interval);
      console.log('[Dashboard] Component unmounted, interval cleared');
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('[Dashboard] Fetching data history...');
      const params = { limit: 50 };
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Check if room is online (data received within last 5 seconds - real-time)
  const isRoomOnline = (nodeId) => {
    const roomData = latestDataAllNodes.find(n => n.nodeId === nodeId);
    if (!roomData) return false;
    
    // Use receivedAt (server time) if available, otherwise use timestamp
    const timeField = roomData.receivedAt || roomData.timestamp;
    if (!timeField) return false;
    
    const now = new Date();
    const dataTime = new Date(timeField);
    
    // Check if date is valid
    if (isNaN(dataTime.getTime())) return false;
    
    const diffSeconds = (now - dataTime) / 1000;
    // Online if data received within last 5 seconds (ESP32 sends every 2 seconds)
    return diffSeconds < 5;
  };

  // Check if Admin is online (any room has sent data within last 5 seconds - real-time)
  const isAdminOnline = () => {
    if (latestDataAllNodes.length === 0) return false;
    
    const now = new Date();
    const hasRecentData = latestDataAllNodes.some(roomData => {
      // Use receivedAt (server time) if available, otherwise use timestamp
      const timeField = roomData.receivedAt || roomData.timestamp;
      if (!timeField) return false;
      
      const dataTime = new Date(timeField);
      if (isNaN(dataTime.getTime())) return false;
      
      const diffSeconds = (now - dataTime) / 1000;
      // Admin online if any room sent data within last 5 seconds (real-time)
      return diffSeconds < 5;
    });
    return hasRecentData;
  };

  // Fetch email recipients
  const fetchEmailRecipients = async () => {
    try {
      const response = await axios.get('/api/email-recipients');
      setEmailRecipients(response.data.data || []);
    } catch (err) {
      console.error('[Dashboard] Error fetching email recipients:', err);
    }
  };

  // Add email recipient
  const handleAddEmail = async (e) => {
    e.preventDefault();
    setEmailError('');
    
    if (!newEmail) {
      setEmailError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailLoading(true);
    try {
      await axios.post('/api/email-recipients', {
        email: newEmail,
        name: newEmailName
      });
      setNewEmail('');
      setNewEmailName('');
      await fetchEmailRecipients();
    } catch (err) {
      setEmailError(err.response?.data?.message || 'Failed to add email recipient');
    } finally {
      setEmailLoading(false);
    }
  };

  // Delete email recipient
  const handleDeleteEmail = async (id) => {
    if (!window.confirm('Are you sure you want to remove this email recipient?')) {
      return;
    }

    try {
      await axios.delete(`/api/email-recipients/${id}`);
      await fetchEmailRecipients();
    } catch (err) {
      setEmailError(err.response?.data?.message || 'Failed to remove email recipient');
    }
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
        {error && <div className="error-message">{error}</div>}

        {/* Admin Section */}
        <div className="admin-section">
          <div className="admin-header">
            <h2>Admin</h2>
            <span className={`status-badge ${isAdminOnline() ? 'online' : 'offline'}`}>
              {isAdminOnline() ? '🟢 Online' : '🔴 Offline'}
            </span>
          </div>
          <div className="admin-info">
            <p>Admin ESP32 Receiver Status</p>
            <p className="admin-id">Admin ID: ADMIN_001</p>
            {!isAdminOnline() && latestDataAllNodes.length === 0 && (
              <p style={{ color: '#dc3545', marginTop: '10px' }}>⚠️ No data received from ESP32</p>
            )}
          </div>
        </div>

        {/* Email Recipients Section */}
        <div className="admin-section">
          <div className="admin-header">
            <h2>📧 Email Alert Recipients</h2>
            <span className="status-badge online">
              {emailRecipients.length} {emailRecipients.length === 1 ? 'Recipient' : 'Recipients'}
            </span>
          </div>
          <div className="admin-info">
            <p>Manage email addresses that will receive alert notifications</p>
            {emailError && <div className="error-message" style={{ marginTop: '10px' }}>{emailError}</div>}

            {/* Add Email Form */}
            <form onSubmit={handleAddEmail} style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Email address"
                required
                style={{
                  flex: '1',
                  minWidth: '200px',
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              <input
                type="text"
                value={newEmailName}
                onChange={(e) => setNewEmailName(e.target.value)}
                placeholder="Name (optional)"
                style={{
                  flex: '1',
                  minWidth: '150px',
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              <button
                type="submit"
                disabled={emailLoading}
                style={{
                  padding: '10px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {emailLoading ? 'Adding...' : 'Add Recipient'}
              </button>
            </form>

            {/* Email Recipients List */}
            {emailRecipients.length > 0 ? (
              <div style={{ marginTop: '20px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#333' }}>Current Recipients:</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {emailRecipients.map((recipient) => (
                    <div
                      key={recipient._id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0'
                      }}
                    >
                      <div>
                        <strong style={{ color: '#667eea' }}>{recipient.email}</strong>
                        {recipient.name && (
                          <span style={{ color: '#666', marginLeft: '10px' }}>({recipient.name})</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteEmail(recipient._id)}
                        style={{
                          padding: '6px 12px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ marginTop: '15px', color: '#999', fontStyle: 'italic' }}>
                No email recipients configured. Add recipients above to receive alert notifications.
              </p>
            )}
          </div>
        </div>

        {/* Room Sections */}
        <div className="rooms-section">
          <h2>Sensor Rooms</h2>
          <div className="rooms-grid">
            {/* Room 1 */}
            <div className="room-card">
              <div className="room-header">
                <div>
                  <h3>Room 1</h3>
                  {(() => {
                    const room1Data = latestDataAllNodes.find(n => n.nodeId === 'ROOM_1');
                    return room1Data && room1Data.battery !== undefined ? (
                      <p className="room-battery">
                        🔋 {typeof room1Data.battery === 'number' ? room1Data.battery.toFixed(0) + '%' : 'N/A'}
                      </p>
                    ) : null;
                  })()}
                </div>
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
                      <span className="sensor-value">
                        {room1Data.temperature !== undefined && typeof room1Data.temperature === 'number' 
                          ? room1Data.temperature.toFixed(1) + '°C' 
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="sensor-row">
                      <span className="sensor-label">💧 Humidity:</span>
                      <span className="sensor-value">
                        {room1Data.humidity !== undefined && typeof room1Data.humidity === 'number' 
                          ? room1Data.humidity.toFixed(1) + '%' 
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="sensor-row">
                      <span className="sensor-label">💨 Gas:</span>
                      <span className="sensor-value">
                        {room1Data.gasSensorConnected === false ? (
                          <span style={{ color: '#999', fontStyle: 'italic' }}>Not Connected</span>
                        ) : room1Data.gas !== undefined && room1Data.gas !== null
                          ? (typeof room1Data.gas === 'boolean' 
                              ? (room1Data.gas ? <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Alert</span> : 'OK')
                              : (typeof room1Data.gas === 'number' ? room1Data.gas.toFixed(1) + '%' : 'N/A'))
                          : 'N/A'}
                        {room1Data.gasRaw !== undefined && room1Data.gasRaw !== null && room1Data.gasSensorConnected !== false && (
                          <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>
                            (Raw: {room1Data.gasRaw})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="sensor-row">
                      <span className="sensor-label">💧 Water Sensor:</span>
                      <span className={`sensor-value ${room1Data.waterLevel > 0 ? 'motion-detected' : ''}`}>
                        {room1Data.rainSensorConnected === false ? (
                          <span style={{ color: '#999', fontStyle: 'italic' }}>Not Connected</span>
                        ) : room1Data.waterLevel !== undefined && room1Data.waterLevel !== null
                          ? (room1Data.waterLevel > 0 ? <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Wet</span> : 'Dry')
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="sensor-row">
                      <span className="sensor-label">🚶 Motion:</span>
                      <span className={`sensor-value ${room1Data.motion ? 'motion-detected' : ''}`}>
                        {room1Data.motion ? 'Detected' : 'None'}
                      </span>
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
                <div>
                  <h3>Room 2</h3>
                  {(() => {
                    const room2Data = latestDataAllNodes.find(n => n.nodeId === 'ROOM_2');
                    return room2Data && room2Data.battery !== undefined ? (
                      <p className="room-battery">
                        🔋 {typeof room2Data.battery === 'number' ? room2Data.battery.toFixed(0) + '%' : 'N/A'}
                      </p>
                    ) : null;
                  })()}
                </div>
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
                      <span className="sensor-value">
                        {room2Data.temperature !== undefined && typeof room2Data.temperature === 'number' 
                          ? room2Data.temperature.toFixed(1) + '°C' 
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="sensor-row">
                      <span className="sensor-label">💧 Humidity:</span>
                      <span className="sensor-value">
                        {room2Data.humidity !== undefined && typeof room2Data.humidity === 'number' 
                          ? room2Data.humidity.toFixed(1) + '%' 
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="sensor-row">
                      <span className="sensor-label">💨 Gas:</span>
                      <span className="sensor-value">
                        {room2Data.gasSensorConnected === false ? (
                          <span style={{ color: '#999', fontStyle: 'italic' }}>Not Connected</span>
                        ) : room2Data.gas !== undefined && room2Data.gas !== null
                          ? (typeof room2Data.gas === 'boolean' 
                              ? (room2Data.gas ? <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Alert</span> : 'OK')
                              : (typeof room2Data.gas === 'number' ? room2Data.gas.toFixed(1) + '%' : 'N/A'))
                          : 'N/A'}
                        {room2Data.gasRaw !== undefined && room2Data.gasRaw !== null && room2Data.gasSensorConnected !== false && (
                          <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>
                            (Raw: {room2Data.gasRaw})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="sensor-row">
                      <span className="sensor-label">💧 Water Sensor:</span>
                      <span className={`sensor-value ${room2Data.waterLevel > 0 ? 'motion-detected' : ''}`}>
                        {room2Data.rainSensorConnected === false ? (
                          <span style={{ color: '#999', fontStyle: 'italic' }}>Not Connected</span>
                        ) : room2Data.waterLevel !== undefined && room2Data.waterLevel !== null
                          ? (room2Data.waterLevel > 0 ? <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Wet</span> : 'Dry')
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="sensor-row">
                      <span className="sensor-label">🚶 Motion:</span>
                      <span className={`sensor-value ${room2Data.motion ? 'motion-detected' : ''}`}>
                        {room2Data.motion ? 'Detected' : 'None'}
                      </span>
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
                    <th>Water Sensor</th>
                    <th>Motion</th>
                    <th>Battery</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item._id}>
                      <td>{item.nodeId || item.deviceId}</td>
                      <td>{item.adminId || '-'}</td>
                      <td>{item.temperature !== undefined && typeof item.temperature === 'number' ? `${item.temperature.toFixed(1)}°C` : '-'}</td>
                      <td>{item.humidity !== undefined && typeof item.humidity === 'number' ? `${item.humidity.toFixed(1)}%` : '-'}</td>
                      <td>
                        {item.gasSensorConnected === false ? (
                          <span style={{ color: '#999', fontStyle: 'italic' }}>Not Connected</span>
                        ) : item.gas !== undefined && item.gas !== null
                          ? (typeof item.gas === 'boolean' 
                              ? (item.gas ? <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Alert</span> : 'OK')
                              : (typeof item.gas === 'number' ? `${item.gas.toFixed(1)}%` : '-'))
                          : '-'}
                        {item.gasRaw !== undefined && item.gasRaw !== null && item.gasSensorConnected !== false && (
                          <span style={{ fontSize: '11px', color: '#888', marginLeft: '5px' }}>
                            (Raw: {item.gasRaw})
                          </span>
                        )}
                      </td>
                      <td>
                        {item.rainSensorConnected === false ? (
                          <span style={{ color: '#999', fontStyle: 'italic' }}>Not Connected</span>
                        ) : item.waterLevel !== undefined && item.waterLevel !== null
                          ? (item.waterLevel > 0 ? <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Wet</span> : 'Dry')
                          : '-'}
                      </td>
                      <td>{item.motion !== undefined ? (item.motion ? 'Yes' : 'No') : '-'}</td>
                      <td>{item.battery !== undefined && typeof item.battery === 'number' ? `${item.battery.toFixed(0)}%` : '-'}</td>
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


