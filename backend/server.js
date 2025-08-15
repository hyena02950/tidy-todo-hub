
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const connectDB = require('./config/database');
const config = require('./config/env');
const requestId = require('./middleware/requestId');
const securityHeaders = require('./middleware/securityHeaders');
const errorHandler = require('./middleware/errorHandler');
const { router: realtimeRouter, handleWebSocketUpgrade } = require('./routes/realtime');

// Import routes
const authRoutes = require('./routes/auth');
const vendorRoutes = require('./routes/vendors');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
const candidateRoutes = require('./routes/candidates');
const jobRoutes = require('./routes/jobs');
const interviewRoutes = require('./routes/interviews');
const invoiceRoutes = require('./routes/invoices');
const fileRoutes = require('./routes/files');
const secureFileRoutes = require('./routes/secureFiles');
const vendorDocumentRoutes = require('./routes/vendorDocuments');
const vendorDocumentReminderRoutes = require('./routes/vendorDocumentReminders');
const notificationRoutes = require('./routes/notifications');
const reminderRoutes = require('./routes/reminders');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Connect to database
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(requestId);
app.use(securityHeaders);

// CORS configuration
app.use(cors({
  origin: config.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/secure-files', secureFileRoutes);
app.use('/api/vendor-documents', vendorDocumentRoutes);
app.use('/api/vendor-document-reminders', vendorDocumentReminderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/realtime', realtimeRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: true,
    message: 'Route not found',
    code: 'ROUTE_NOT_FOUND'
  });
});

// Error handling middleware
app.use(errorHandler);

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  handleWebSocketUpgrade(request, socket, head, wss);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Received shutdown signal, closing server gracefully...');
  
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close all WebSocket connections
    wss.clients.forEach((ws) => {
      ws.terminate();
    });
    
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
server.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
  console.log(`WebSocket server ready for connections`);
});

module.exports = { app, server };
