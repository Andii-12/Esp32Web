const express = require('express');
const EmailRecipient = require('../models/EmailRecipient');
const auth = require('../middleware/auth');
const { testEmail, initializeEmailService, sendEmailNotification } = require('../services/emailService');
const router = express.Router();

// Get all email recipients (protected)
router.get('/', auth, async (req, res) => {
  try {
    const recipients = await EmailRecipient.find({ active: true })
      .sort({ createdAt: -1 })
      .select('-__v');
    
    res.json({
      success: true,
      count: recipients.length,
      data: recipients
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add new email recipient (protected)
router.post('/', auth, async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if email already exists
    const existing = await EmailRecipient.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.active) {
        return res.status(400).json({ message: 'Email already exists in recipients list' });
      } else {
        // Reactivate if it was previously deleted
        existing.active = true;
        if (name) existing.name = name;
        existing.addedBy = req.user.userId;
        await existing.save();
        return res.json({
          success: true,
          message: 'Email recipient added successfully',
          data: existing
        });
      }
    }

    // Create new recipient
    const recipient = new EmailRecipient({
      email: email.toLowerCase(),
      name: name || '',
      addedBy: req.user.userId,
      active: true
    });

    await recipient.save();

    res.status(201).json({
      success: true,
      message: 'Email recipient added successfully',
      data: recipient
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete email recipient (protected)
router.delete('/:id', auth, async (req, res) => {
  try {
    const recipient = await EmailRecipient.findById(req.params.id);
    
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Soft delete by setting active to false
    recipient.active = false;
    await recipient.save();

    res.json({
      success: true,
      message: 'Email recipient removed successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update email recipient (protected)
router.put('/:id', auth, async (req, res) => {
  try {
    const { email, name, active } = req.body;
    const recipient = await EmailRecipient.findById(req.params.id);
    
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    if (email) {
      // Check if new email already exists
      const existing = await EmailRecipient.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      if (existing) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      recipient.email = email.toLowerCase();
    }

    if (name !== undefined) recipient.name = name;
    if (active !== undefined) recipient.active = active;

    await recipient.save();

    res.json({
      success: true,
      message: 'Email recipient updated successfully',
      data: recipient
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test email configuration (protected)
router.post('/test', auth, async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check email service status (Brevo HTTP API)
    const emailStatus = {
      configured: !!(process.env.BREVO_API_KEY && process.env.EMAIL_USER),
      host: 'Brevo API (https)',
      port: '443',
      user: process.env.EMAIL_USER || 'Not set',
      secure: true
    };

    if (!emailStatus.configured) {
      return res.status(400).json({
        success: false,
        message: 'Email service not configured',
        status: emailStatus
      });
    }

    // Get recipients count
    const recipientCount = await EmailRecipient.countDocuments({ active: true });

    // Test email service initialization
    const initialized = await initializeEmailService();
    if (!initialized) {
      return res.status(500).json({
        success: false,
        message: 'Email service failed to initialize',
        status: emailStatus,
        recipientCount
      });
    }

    let result;
    let targetDescription;

    if (email) {
      // If a specific email is provided, send ONLY to that address
      result = await testEmail(email);
      targetDescription = email;
    } else {
      // Otherwise, send a test email to all current recipients using the normal notification pipeline
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

      result = await sendEmailNotification(subject, message, htmlMessage);
      targetDescription = recipientCount === 1 
        ? '1 configured recipient'
        : `${recipientCount} configured recipients`;
    }

    res.json({
      success: result.success,
      message: result.success 
        ? `Test email sent successfully to ${targetDescription}` 
        : `Failed to send test email: ${result.error || result.status}`,
      status: emailStatus,
      recipientCount,
      testResult: result
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = router;

