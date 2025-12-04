const express = require('express');
const EmailRecipient = require('../models/EmailRecipient');
const auth = require('../middleware/auth');
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

module.exports = router;

