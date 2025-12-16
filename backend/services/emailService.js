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
        name: 'ESP32 Анхааруулгын Систем'
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
  const condition = isHigh ? 'ӨНДӨР' : 'БАГА';
  const subject = `🚨 ESP32 Анхааруулга: Өрөө ${roomId}-д Температур ${condition}`;
  
  const message = `
ESP32 Анхааруулгын Системийн Мэдэгдэл

⚠️ ТЕМПЕРАТУРЫН АНХААРУУЛГА

Өрөө: ${roomId}
Одоогийн Температур: ${temperature}°C
Босго: ${threshold}
Төлөв: ${condition} ТЕМПЕРАТУР ИЛРЭВ

Цаг: ${new Date().toLocaleString('mn-MN')}

Сенсорыг шалгаж, зохих арга хэмжээ аваарай.
  `.trim();

  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">🚨 ESP32 Анхааруулгын Системийн Мэдэгдэл</h2>
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <h3 style="color: #856404; margin-top: 0;">⚠️ ТЕМПЕРАТУРЫН АНХААРУУЛГА</h3>
        <p><strong>Өрөө:</strong> ${roomId}</p>
        <p><strong>Одоогийн Температур:</strong> <span style="color: #dc3545; font-size: 18px; font-weight: bold;">${temperature}°C</span></p>
        <p><strong>Босго:</strong> ${threshold}</p>
        <p><strong>Төлөв:</strong> <span style="color: #dc3545; font-weight: bold;">${condition} ТЕМПЕРАТУР ИЛРЭВ</span></p>
        <p><strong>Цаг:</strong> ${new Date().toLocaleString('mn-MN')}</p>
      </div>
      <p style="color: #666;">Сенсорыг шалгаж, зохих арга хэмжээ аваарай.</p>
    </div>
  `;

  return await sendEmailNotification(subject, message, htmlMessage);
};

// Send rain alert email
const sendRainAlert = async (roomId) => {
  const subject = `🌧️ ESP32 Анхааруулга: Өрөө ${roomId}-д Ус алдалт Илрэв`;
  
  const message = `
ESP32 Анхааруулгын Системийн Мэдэгдэл

🌧️ УС АЛДАЛТЫН АНХААРУУЛГА

Өрөө: ${roomId}
Төлөв: УС АЛДАЛТ ИЛРЭВ

Цаг: ${new Date().toLocaleString('mn-MN')}

Ус алдалт илрүүлсэн. Талбайг шалгаарай.
  `.trim();

  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0d6efd;">🌧️ ESP32 Анхааруулгын Системийн Мэдэгдэл</h2>
      <div style="background-color: #cfe2ff; border-left: 4px solid #0d6efd; padding: 15px; margin: 20px 0;">
        <h3 style="color: #084298; margin-top: 0;">🌧️ УС АЛДАЛТЫН АНХААРУУЛГА</h3>
        <p><strong>Өрөө:</strong> ${roomId}</p>
        <p><strong>Төлөв:</strong> <span style="color: #084298; font-weight: bold;">УС АЛДАЛТ ИЛРЭВ</span></p>
        <p><strong>Цаг:</strong> ${new Date().toLocaleString('mn-MN')}</p>
      </div>
      <p style="color: #666;">Ус алдалт илрүүлсэн. Талбайг шалгаарай.</p>
    </div>
  `;

  return await sendEmailNotification(subject, message, htmlMessage);
};

// Send gas alert email
const sendGasAlert = async (roomId) => {
  const subject = `⚠️ ESP32 Анхааруулга: Өрөө ${roomId}-д Хий Илрэв`;
  
  const message = `
ESP32 Анхааруулгын Системийн Мэдэгдэл

⚠️ ХИЙНИЙ СЕНСОРЫН АНХААРУУЛГА

Өрөө: ${roomId}
Төлөв: ХИЙ ИЛРЭВ

Цаг: ${new Date().toLocaleString('mn-MN')}

АНХААРУУЛГА: MQ2 хийн сенсор хий илрүүлсэн. Талбайг яаралтай шалгаж, зохих агааржуулалтыг хангаарай.
  `.trim();

  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">⚠️ ESP32 Анхааруулгын Системийн Мэдэгдэл</h2>
      <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
        <h3 style="color: #721c24; margin-top: 0;">⚠️ ХИЙНИЙ СЕНСОРЫН АНХААРУУЛГА</h3>
        <p><strong>Өрөө:</strong> ${roomId}</p>
        <p><strong>Төлөв:</strong> <span style="color: #dc3545; font-weight: bold; font-size: 18px;">ХИЙ ИЛРЭВ</span></p>
        <p><strong>Цаг:</strong> ${new Date().toLocaleString('mn-MN')}</p>
      </div>
      <p style="color: #721c24; font-weight: bold;">АНХААРУУЛГА: MQ2 хийн сенсор хий илрүүлсэн. Талбайг яаралтай шалгаж, зохих агааржуулалтыг хангаарай.</p>
    </div>
  `;

  return await sendEmailNotification(subject, message, htmlMessage);
};

// Send humidity alert email
const sendHumidityAlert = async (roomId, humidity) => {
  const threshold = '30%';
  const subject = `💧 ESP32 Анхааруулга: Өрөө ${roomId}-д Чийгшил Өндөр`;
  
  const message = `
ESP32 Анхааруулгын Системийн Мэдэгдэл

💧 ЧИЙГШЛИЙН АНХААРУУЛГА

Өрөө: ${roomId}
Одоогийн Чийгшил: ${humidity}%
Босго: ${threshold}
Төлөв: ӨНДӨР ЧИЙГШИЛ ИЛРЭВ

Цаг: ${new Date().toLocaleString('mn-MN')}

Сенсорыг шалгаж, зохих арга хэмжээ аваарай.
  `.trim();

  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0d6efd;">💧 ESP32 Анхааруулгын Системийн Мэдэгдэл</h2>
      <div style="background-color: #cfe2ff; border-left: 4px solid #0d6efd; padding: 15px; margin: 20px 0;">
        <h3 style="color: #084298; margin-top: 0;">💧 ЧИЙГШЛИЙН АНХААРУУЛГА</h3>
        <p><strong>Өрөө:</strong> ${roomId}</p>
        <p><strong>Одоогийн Чийгшил:</strong> <span style="color: #0d6efd; font-size: 18px; font-weight: bold;">${humidity}%</span></p>
        <p><strong>Босго:</strong> ${threshold}</p>
        <p><strong>Төлөв:</strong> <span style="color: #084298; font-weight: bold;">ӨНДӨР ЧИЙГШИЛ ИЛРЭВ</span></p>
        <p><strong>Цаг:</strong> ${new Date().toLocaleString('mn-MN')}</p>
      </div>
      <p style="color: #666;">Сенсорыг шалгаж, зохих арга хэмжээ аваарай.</p>
    </div>
  `;

  return await sendEmailNotification(subject, message, htmlMessage);
};

// Send motion alert email (for nighttime motion detection)
const sendMotionAlert = async (roomId) => {
  const subject = `🚶 ESP32 Анхааруулга: Өрөө ${roomId}-д Шөнөд Хөдөлгөөн Илрэв`;
  
  const message = `
ESP32 Анхааруулгын Системийн Мэдэгдэл

🚶 ХӨДӨЛГӨӨНИЙ АНХААРУУЛГА (ШӨНӨД)

Өрөө: ${roomId}
Төлөв: ШӨНӨД ХӨДӨЛГӨӨН ИЛРЭВ

Цаг: ${new Date().toLocaleString('mn-MN')}

Шөнийн цагаар (22:00 - 06:00) хөдөлгөөн илрүүлсэн. Талбайг яаралтай шалгаарай.
  `.trim();

  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">🚶 ESP32 Анхааруулгын Системийн Мэдэгдэл</h2>
      <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
        <h3 style="color: #721c24; margin-top: 0;">🚶 ХӨДӨЛГӨӨНИЙ АНХААРУУЛГА (ШӨНӨД)</h3>
        <p><strong>Өрөө:</strong> ${roomId}</p>
        <p><strong>Төлөв:</strong> <span style="color: #dc3545; font-weight: bold; font-size: 18px;">ШӨНӨД ХӨДӨЛГӨӨН ИЛРЭВ</span></p>
        <p><strong>Цаг:</strong> ${new Date().toLocaleString('mn-MN')}</p>
      </div>
      <p style="color: #721c24; font-weight: bold;">Шөнийн цагаар (22:00 - 06:00) хөдөлгөөн илрүүлсэн. Талбайг яаралтай шалгаарай.</p>
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

  const subject = '🧪 ESP32 Имэйл Үйлчилгээний Туршилт';
  const message = `
ESP32 Анхааруулгын Систем - Имэйл Туршилт

Энэ бол таны имэйл тохиргоо зөв ажиллаж байгаа эсэхийг шалгах туршилтын имэйл юм.

Цаг: ${new Date().toLocaleString('mn-MN')}

Хэрэв та энэ имэйлийг хүлээн авсан бол, таны имэйл үйлчилгээ зөв тохируулагдсан байна!
  `.trim();

  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #667eea;">🧪 ESP32 Анхааруулгын Систем - Имэйл Туршилт</h2>
      <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
        <p>Энэ бол таны имэйл тохиргоо зөв ажиллаж байгаа эсэхийг шалгах туршилтын имэйл юм.</p>
        <p><strong>Цаг:</strong> ${new Date().toLocaleString('mn-MN')}</p>
        <p style="color: #155724; font-weight: bold;">✅ Хэрэв та энэ имэйлийг хүлээн авсан бол, таны имэйл үйлчилгээ зөв тохируулагдсан байна!</p>
      </div>
    </div>
  `;

  try {
    const payload = {
      sender: {
        email: process.env.EMAIL_USER,
        name: 'ESP32 Анхааруулгын Систем'
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
  sendMotionAlert,
  testEmail
};

