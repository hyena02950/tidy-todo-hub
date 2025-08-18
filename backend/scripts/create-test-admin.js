

const mongoose = require('mongoose');
const User = require('../models/User');
const env = require('../config/env');

async function createTestAdmin() {
  try {
    // Connect to MongoDB with proper error handling
    console.log('Connecting to MongoDB...');
    console.log('MongoDB URI:', env.MONGODB_URI ? 'Set' : 'Not set');
    
    if (!env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      bufferCommands: false,
      authSource: 'admin',
      retryWrites: true,
      retryReads: true
    });
    
    console.log('✅ Connected to MongoDB');

    // Check if test admin already exists
    const existingAdmin = await User.findOne({ email: 'test-admin@elika.com' });
    
    if (existingAdmin) {
      console.log('✅ Test admin already exists:', existingAdmin.email);
      return;
    }

    // Create test admin user
    const testAdmin = new User({
      email: 'test-admin@elika.com',
      password: 'password123',
      roles: [{ role: 'elika_admin' }],
      profile: {
        fullName: 'Test Admin',
        companyName: 'Elika',
        phone: '+1-555-0123'
      },
      emailVerified: true,
      isActive: true
    });

    await testAdmin.save();
    console.log('✅ Test admin user created successfully!');
    console.log('Email: test-admin@elika.com');
    console.log('Password: password123');

  } catch (error) {
    console.error('❌ Error creating test admin:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('MongoDB connection failed. Please check:');
      console.error('- MongoDB server is running');
      console.error('- MONGODB_URI is correct');
      console.error('- Network connectivity to MongoDB');
      console.error('- Authentication credentials if required');
    }
    
    if (error.name === 'MongoParseError') {
      console.error('MongoDB URI parsing failed. Please check the format of MONGODB_URI');
    }
    
    console.error('Full error:', error);
  } finally {
    try {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError.message);
    }
  }
}

// Run if called directly
if (require.main === module) {
  createTestAdmin();
}

module.exports = createTestAdmin;

