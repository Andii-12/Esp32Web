import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import axios from 'axios';

// Configure Axios baseURL for production deployments (Vercel)
// If REACT_APP_API_BASE is defined, all requests will use that as the base
// Otherwise, fall back to same-origin (dev uses CRA proxy)
axios.defaults.baseURL = process.env.REACT_APP_API_BASE || '';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

