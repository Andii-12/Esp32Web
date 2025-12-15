const axios = require('axios');
const EmailRecipient = require('../models/EmailRecipient');

// Brevo (Sendinblue) email service using HTTP API (no SMTP/ports needed)
// Required env vars:
// - BREVO_API_KEY  (you already added this in Railway)
// - EMAIL_USER     (used as sender email)

const BREVO_API_URL = process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email';

// Initialize email "service" – for Brevo this just checks config and logs
const initializeEmailService = async () => {
  if (!process.env.BREVO_API_KEY || !process.env.EMAIL_USER) {
    console.log('⚠️ Email service not configured. Email notifications will be disabled.');
    console.log('   Missing:', {
      BREVO_API_KEY: !process.env.BREVO_API_KEY,
      EMAIL_USER: !process.env.EMAIL_USER
    });
    return false;
  }

  console.log('✅ Email service (Brevo API) configured');
  console.log('   API URL:', BREVO_API_URL);
  console.log('   Sender email:', process.env.EMAIL_USER);
  return true;
};

// Get all active email recipients from database, fallback to EMAIL_USER if none
const getEmailRecipients = async () => {
  try {
    const recipients = await EmailRecipient.find({ active: true }).select('email name');
    const emails = recipients.map(r => r.email);

    // Fallback: if no DB recipients but EMAIL_USER is configured, use it
    if (emails.length === 0 && process.env.EMAIL_USER) {
      console.log('⚠️ No recipients in DB. Using EMAIL_USER as fallback recipient.');
      emails.push(process.env.EMAIL_USER);
    }

    return emails;
  } catch (error) {
    console.error('❌ Error fetching email recipients:', error);
    return [];
  }
};

// Send email notification to all recipients
const sendEmailNotification = async (subject, message, htmlMessage = null) => {
  // Ensure service is configured
  const ready = await initializeEmailService();
  if (!ready) {
    return { success: false, error: 'Email service not configured' };
  }

  // Get recipients from database
  const recipients = await getEmailRecipients();
  
  if (recipients.length === 0) {
    console.log('⚠️ No email recipients configured in database');
    console.log('   Please add email recipients through the web dashboard');
    return { success: false, error: 'No email recipients configured. Add recipients through the dashboard.' };
  }

  try {
    const payload = {
      sender: {
        email: process.env.EMAIL_USER,
        name: 'ESP32 Alert System'
      },
      to: recipients.map(email => ({ email })),
      subject,
      textContent: message,
      htmlContent: htmlMessage || message.replace(/\n/g, '<br>')
    };

    console.log(`📧 Attempting to send email to ${recipients.length} recipient(s) via Brevo...`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Recipients: ${recipients.join(', ')}`);

    const timeoutMs = parseInt(process.env.EMAIL_TIMEOUT_MS || '15000');
    const response = await axios.post(BREVO_API_URL, payload, {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      timeout: timeoutMs
    });

    console.log('✅ Email sent successfully via Brevo:', response.data.messageId || response.data);
    return { success: true, response: response.data, recipients };
  } catch (error) {
    console.error('❌ Error sending email via Brevo:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
};

// Send temperature alert email
const sendTemperatureAlert = async (roomId, temperature, isHigh) => {
  const threshold = isHigh ? '+40°C' : '-10°C';
  const condition = isHigh ? 'HIGH' : 'LOW';
  const subject = `🚨 ESP32 Alert: Temperature ${condition} in Room ${roomId}`;
  
  const message = `
ESP32 Alert System Notification

⚠️ TEMPERATURE ALERT

Room: ${roomId}
Current Temperature: ${temperature}°C
Threshold: ${threshold}
Status: ${condition} TEMPERATURE DETECTED

Time: ${new Date().toLocaleString()}

Please check the sensor and take appropriate action.
  `.trim();

  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">🚨 ESP32 Alert System Notification</h2>
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <h3 style="color: #856404; margin-top: 0;">⚠️ TEMPERATURE ALERT</h3>
        <p><strong>Room:</strong> ${roomId}</p>
        <p><strong>Current Temperature:</strong> <span style="color: #dc3545; font-size: 18px; font-weight: bold;">${temperature}°C</span></p>
        <p><strong>Threshold:</strong> ${threshold}</p>
        <p><strong>Status:</strong> <span style="color: #dc3545; font-weight: bold;">${condition} TEMPERATURE DETECTED</span></p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <p style="color: #666;">Please check the sensor and take appropriate action.</p>
    </div>
  `;

  return await sendEmailNotification(subject, message, htmlMessage);
};

// Send rain alert email
const sendRainAlert = async (roomId) => {
  const subject = `🌧️ ESP32 Alert: Rain Detected in Room ${roomId}`;
  
  const message = `
ESP32 Alert System Notification

🌧️ RAIN SENSOR ALERT

Room: ${roomId}
Status: RAIN DETECTED

Time: ${new Date().toLocaleString()}

The rain sensor has detected water. Please check the area.
  `.trim();

  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0d6efd;">🌧️ ESP32 Alert System Notification</h2>
      <div style="background-color: #cfe2ff; border-left: 4px solid #0d6efd; padding: 15px; margin: 20px 0;">
        <h3 style="color: #084298; margin-top: 0;">🌧️ RAIN SENSOR ALERT</h3>
        <p><strong>Room:</strong> ${roomId}</p>
        <p><strong>Status:</strong> <span style="color: #084298; font-weight: bold;">RAIN DETECTED</span></p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <p style="color: #666;">The rain sensor has detected water. Please check the area.</p>
    </div>
  `;

  return await sendEmailNotification(subject, message, htmlMessage);
};

// Send gas alert email
const sendGasAlert = async (roomId) => {
  const subject = `⚠️ ESP32 Alert: Gas Detected in Room ${roomId}`;
  
  const message = `
ESP32 Alert System Notification

⚠️ GAS SENSOR ALERT

Room: ${roomId}
Status: GAS DETECTED

Time: ${new Date().toLocaleString()}

WARNING: The MQ2 gas sensor has detected gas. Please check the area immediately and ensure proper ventilation.
  `.trim();

  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">⚠️ ESP32 Alert System Notification</h2>
      <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
        <h3 style="color: #721c24; margin-top: 0;">⚠️ GAS SENSOR ALERT</h3>
        <p><strong>Room:</strong> ${roomId}</p>
        <p><strong>Status:</strong> <span style="color: #dc3545; font-weight: bold; font-size: 18px;">GAS DETECTED</span></p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <p style="color: #721c24; font-weight: bold;">WARNING: The MQ2 gas sensor has detected gas. Please check the area immediately and ensure proper ventilation.</p>
    </div>
  `;

  return await sendEmailNotification(subject, message, htmlMessage);
};

// Send humidity alert email
const sendHumidityAlert = async (roomId, humidity) => {
  const threshold = '30%';
  const subject = `💧 ESP32 Alert: High Humidity in Room ${roomId}`;
  
  const message = `
ESP32 Alert System Notification

💧 HUMIDITY ALERT

Room: ${roomId}
Current Humidity: ${humidity}%
Threshold: ${threshold}
Status: HIGH HUMIDITY DETECTED

Time: ${new Date().toLocaleString()}

Please check the sensor and take appropriate action.
  `.trim();

  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0d6efd;">💧 ESP32 Alert System Notification</h2>
      <div style="background-color: #cfe2ff; border-left: 4px solid #0d6efd; padding: 15px; margin: 20px 0;">
        <h3 style="color: #084298; margin-top: 0;">💧 HUMIDITY ALERT</h3>
        <p><strong>Room:</strong> ${roomId}</p>
        <p><strong>Current Humidity:</strong> <span style="color: #0d6efd; font-size: 18px; font-weight: bold;">${humidity}%</span></p>
        <p><strong>Threshold:</strong> ${threshold}</p>
        <p><strong>Status:</strong> <span style="color: #084298; font-weight: bold;">HIGH HUMIDITY DETECTED</span></p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <p style="color: #666;">Please check the sensor and take appropriate action.</p>
    </div>
  `;

  return await sendEmailNotification(subject, message, htmlMessage);
};

// Test email function (for testing email configuration)
const testEmail = async (testRecipient) => {
  const ready = await initializeEmailService();
  if (!ready) {
    return { success: false, error: 'Email service not configured' };
  }

  const subject = '🧪 ESP32 Email Service Test';
  const message = `
ESP32 Alert System - Email Test

This is a test email to verify your email configuration is working correctly.

Time: ${new Date().toLocaleString()}

If you received this email, your email service is configured correctly!
  `.trim();

  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #667eea;">🧪 ESP32 Alert System - Email Test</h2>
      <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
        <p>This is a test email to verify your email configuration is working correctly.</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p style="color: #155724; font-weight: bold;">✅ If you received this email, your email service is configured correctly!</p>
      </div>
    </div>
  `;

  try {
    const payload = {
      sender: {
        email: process.env.EMAIL_USER,
        name: 'ESP32 Alert System'
      },
      to: [{ email: testRecipient || process.env.EMAIL_USER }],
      subject,
      textContent: message,
      htmlContent: htmlMessage
    };

    console.log(`📧 Sending test email to: ${testRecipient || process.env.EMAIL_USER}`);

    const timeoutMs = parseInt(process.env.EMAIL_TEST_TIMEOUT_MS || process.env.EMAIL_TIMEOUT_MS || '15000');
    const response = await axios.post(BREVO_API_URL, payload, {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      timeout: timeoutMs
    });

    console.log('✅ Test email sent successfully via Brevo:', response.data.messageId || response.data);
    return {
      success: true,
      response: response.data,
      recipient: testRecipient || process.env.EMAIL_USER
    };
  } catch (error) {
    console.error('❌ Error sending test email via Brevo:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
};

module.exports = {
  initializeEmailService,
  sendEmailNotification,
  sendTemperatureAlert,
  sendRainAlert,
  sendGasAlert,
  sendHumidityAlert,
  testEmail
};

