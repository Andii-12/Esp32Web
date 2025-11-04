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
    fetchData();
    fetchLatestDataAllNodes();

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchLatestDataAllNodes();
    }, 5000);

    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [nodeId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = nodeId ? { nodeId, limit: 50 } : { limit: 50 };
      const response = await axios.get('/api/esp32', { params });
      setData(response.data.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestDataAllNodes = async () => {
    try {
      const response = await axios.get('/api/esp32/latest/all-nodes');
      setLatestDataAllNodes(response.data.data || []);
    } catch (err) {
      // Silently fail for latest data to avoid spam
      console.error('Error fetching latest data:', err);
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

        {latestDataAllNodes.length > 0 && (
          <div className="mesh-nodes-section">
            <h2>Mesh Network - Latest Data from All Nodes</h2>
            <div className="nodes-grid">
              {latestDataAllNodes.map((nodeData) => (
                <div key={nodeData.nodeId} className="node-card">
                  <div className="node-header">
                    <h3>{nodeData.nodeId}</h3>
                    {nodeData.adminId && (
                      <span className="admin-badge">via {nodeData.adminId}</span>
                    )}
                  </div>
                  <div className="node-data-grid">
                    {nodeData.temperature !== undefined && (
                      <div className="data-item">
                        <span className="data-label">🌡️ Temperature:</span>
                        <span className="data-value">{nodeData.temperature.toFixed(1)}°C</span>
                      </div>
                    )}
                    {nodeData.humidity !== undefined && (
                      <div className="data-item">
                        <span className="data-label">💧 Humidity:</span>
                        <span className="data-value">{nodeData.humidity.toFixed(1)}%</span>
                      </div>
                    )}
                    {nodeData.gas !== undefined && (
                      <div className="data-item">
                        <span className="data-label">💨 Gas:</span>
                        <span className="data-value">{nodeData.gas.toFixed(1)}%</span>
                      </div>
                    )}
                    {nodeData.waterLevel !== undefined && (
                      <div className="data-item">
                        <span className="data-label">🌊 Water Level:</span>
                        <span className="data-value">{nodeData.waterLevel.toFixed(1)}%</span>
                      </div>
                    )}
                    {nodeData.motion !== undefined && (
                      <div className="data-item">
                        <span className="data-label">🚶 Motion:</span>
                        <span className={`data-value ${nodeData.motion ? 'motion-detected' : ''}`}>
                          {nodeData.motion ? 'Detected' : 'None'}
                        </span>
                      </div>
                    )}
                    {nodeData.soilMoisture !== undefined && (
                      <div className="data-item">
                        <span className="data-label">🌱 Soil Moisture:</span>
                        <span className="data-value">{nodeData.soilMoisture.toFixed(1)}%</span>
                      </div>
                    )}
                    <div className="data-item">
                      <span className="data-label">🕐 Timestamp:</span>
                      <span className="data-value-small">{formatDate(nodeData.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

