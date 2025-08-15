
import mongoose from 'mongoose';
import dotenv from 'dotenv';

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
      // Enhanced transaction support
      readPreference: 'primary',
      readConcern: { level: 'majority' },
      writeConcern: { w: 'majority', j: true },
      retryWrites: true,
      retryReads: true
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
      console.log('✅ Replica Set detected - Transactions enabled');
    } catch (error) {
      console.log('⚠️ No replica set detected - Transactions may be limited');
    }

    return mongoose.connection;

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('Troubleshooting:');
    console.log('- Verify MONGODB_URI in .env');
    console.log('- Check MongoDB server status');
    console.log('- Validate network connectivity');
    console.log('- Confirm authentication credentials');
    console.log('- For transactions, ensure replica set is configured');
    
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
  console.log('⚠️ Mongoose disconnected');
});

// Transaction error handling
mongoose.connection.on('error', (err) => {
  if (err.message && err.message.includes('transaction')) {
    console.error('❌ Transaction error:', err);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🛑 Mongoose connection closed (app termination)');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
  process.exit(0);
});

export default connectDB;
