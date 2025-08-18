
require('dotenv').config();

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

module.exports = {
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/vendor-portal',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Server
  PORT: parseInt(process.env.PORT) || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // CORS - Updated for HTTP/HTTPS compatibility
  CORS_ORIGINS: process.env.CORS_ORIGINS ? 
    process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()) : 
    [
      'http://localhost:3000', 
      'http://localhost:5173', 
      'http://localhost:8080',
      'https://localhost:3000',
      'https://localhost:5173', 
      'https://localhost:8080',
      // Add production IPs
      'http://13.235.100.18:8080',
      'https://13.235.100.18:8080',
      'http://13.235.100.18:3000',
      'https://13.235.100.18:3000'
    ],
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // Admin Bootstrap
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@elika.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  
  // BCrypt
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  
  // File Upload
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB) || 10,
  ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES ? 
    process.env.ALLOWED_FILE_TYPES.split(',') : 
    ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
  
  // AWS S3 Configuration
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  
  // File Storage Mode
  FILE_STORAGE_MODE: process.env.FILE_STORAGE_MODE || 'local', // 'local' or 's3'
  
  // Security Settings
  REQUIRE_EMAIL_VERIFICATION: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
  ENABLE_2FA_FOR_ADMINS: process.env.ENABLE_2FA_FOR_ADMINS !== 'false', // Default to true
  
  // Session Settings
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  
  // Account Security
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
  ACCOUNT_LOCK_TIME: parseInt(process.env.ACCOUNT_LOCK_TIME) || 2 * 60 * 60 * 1000, // 2 hours
};
