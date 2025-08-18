
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI not defined in environment variables');
    }

    const options = {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      bufferCommands: false,
      authSource: 'admin',
      // Enhanced transaction support with fallback for single-node
      readPreference: 'primary',
      readConcern: { level: 'local' }, // Changed from 'majority' for single-node compatibility
      writeConcern: { w: 1, j: true }, // Changed from 'majority' for single-node compatibility
      retryWrites: true,
      retryReads: true,
      // Add connection stability options
      heartbeatFrequencyMS: 10000,
      serverSelectionTimeoutMS: 5000,
    };

    console.log('🔄 Attempting to connect to MongoDB...');
    await mongoose.connect(uri, options);

    console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`👤 User: ${mongoose.connection.user || 'none'}`);
    
    // Check if replica set is available for transactions
    const admin = mongoose.connection.db.admin();
    try {
      const result = await admin.replSetGetStatus();
      console.log('✅ Replica Set detected - Full transactions enabled');
      global.hasReplicaSet = true;
    } catch (error) {
      console.log('ℹ️ Single-node MongoDB detected - Using local transactions');
      global.hasReplicaSet = false;
      // For single-node instances, we'll use regular operations instead of transactions
    }

    return mongoose.connection;

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('Troubleshooting:');
    console.log('- Verify MONGODB_URI in .env');
    console.log('- Check MongoDB server status');
    console.log('- Validate network connectivity');
    console.log('- Confirm authentication credentials');
    console.log('- For full transactions, ensure replica set is configured');
    
    throw error;
  }
};

// Connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected - attempting reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ Mongoose reconnected to DB');
});

// Transaction error handling
mongoose.connection.on('error', (err) => {
  if (err.message && err.message.includes('transaction')) {
    console.error('❌ Transaction error:', err);
  }
});

// Enhanced graceful shutdown with better signal handling
const gracefulShutdown = async (signal) => {
  console.log(`🛑 Received ${signal}, closing database connection gracefully...`);
  try {
    await mongoose.connection.close();
    console.log('✅ Mongoose connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
};

// Handle multiple shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

module.exports = connectDB;
