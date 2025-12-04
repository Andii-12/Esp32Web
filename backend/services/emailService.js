const nodemailer = require('nodemailer');
const EmailRecipient = require('../models/EmailRecipient');

// Create reusable transporter
let transporter = null;

// Initialize email transporter
const initializeEmailService = () => {
  // Only initialize if email is configured
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('⚠️ Email service not configured. Email notifications will be disabled.');
    return false;
  }

  try {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    console.log('✅ Email service initialized');
    return true;
  } catch (error) {
    console.error('❌ Error initializing email service:', error);
    return false;
  }
};

// Get all active email recipients from database
const getEmailRecipients = async () => {
  try {
    const recipients = await EmailRecipient.find({ active: true }).select('email name');
    return recipients.map(r => r.email);
  } catch (error) {
    console.error('❌ Error fetching email recipients:', error);
    return [];
  }
};

// Send email notification to all recipients
const sendEmailNotification = async (subject, message, htmlMessage = null) => {
  if (!transporter) {
    console.log('⚠️ Email service not available, skipping email notification');
    return { success: false, error: 'Email service not configured' };
  }

  // Get recipients from database
  const recipients = await getEmailRecipients();
  
  if (recipients.length === 0) {
    console.log('⚠️ No email recipients configured in database');
    return { success: false, error: 'No email recipients configured' };
  }

  try {
    const mailOptions = {
      from: `"ESP32 Alert System" <${process.env.EMAIL_USER}>`,
      to: recipients.join(', '), // Send to all recipients
      subject: subject,
      text: message,
      html: htmlMessage || message.replace(/\n/g, '<br>')
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${recipients.length} recipient(s):`, info.messageId);
    console.log(`   Recipients: ${recipients.join(', ')}`);
    return { success: true, messageId: info.messageId, recipients: recipients };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
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

module.exports = {
  initializeEmailService,
  sendEmailNotification,
  sendTemperatureAlert,
  sendRainAlert,
  sendGasAlert,
  sendHumidityAlert
};

