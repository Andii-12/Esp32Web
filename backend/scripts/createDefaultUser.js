const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

const createDefaultUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/esp32data', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { username: 'admin' },
        { email: 'admin@esp32.com' }
      ]
    });

    if (existingUser) {
      console.log('Default user already exists!');
      console.log('Username: admin');
      console.log('Email: admin@esp32.com');
      console.log('Password: (use the password you set when creating this user)');
      process.exit(0);
    }

    // Create default user
    const defaultUser = new User({
      username: 'admin',
      email: 'admin@esp32.com',
      password: 'admin123' // This will be hashed automatically by the pre-save hook
    });

    await defaultUser.save();

    console.log('Default user created successfully!');
    console.log('================================');
    console.log('Username: admin');
    console.log('Email: admin@esp32.com');
    console.log('Password: admin123');
    console.log('================================');
    console.log('Please change this password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating default user:', error);
    process.exit(1);
  }
};

createDefaultUser();

