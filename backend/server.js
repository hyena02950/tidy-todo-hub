const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const connectDB = require('./config/database');
const config = require('./config/env');
const requestId = require('./middleware/requestId');
const { securityHeaders, additionalHeaders } = require('./middleware/securityHeaders');
const { globalErrorHandler } = require('./middleware/errorHandler');
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

// Enhanced startup process
let isServerReady = false;
let dbConnected = false;

// Connect to database with retry logic
const initializeDatabase = async () => {
  let retries = 5;
  while (retries > 0 && !dbConnected) {
    try {
      await connectDB();
      dbConnected = true;
      console.log('✅ Database initialization completed');
      break;
    } catch (err) {
      retries--;
      console.error(`❌ Database connection failed. Retries left: ${retries}`, err.message);
      if (retries === 0) {
        console.error('💥 Could not connect to database after multiple attempts');
        process.exit(1);
      }
      // Wait 5 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

// Security middleware - Updated for HTTP/HTTPS compatibility
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  originAgentCluster: false,
  hsts: false
}));

app.use(compression());
app.use(requestId);
app.use(securityHeaders);
app.use(additionalHeaders);

// CORS configuration - Updated for HTTP compatibility
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8080', 
      'http://localhost:5173',
      'https://localhost:3000',
      'https://localhost:8080',
      'https://localhost:5173',
      'http://13.235.100.18:8080',
      'https://13.235.100.18:8080'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS: Origin not allowed:', origin);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Origin', 'X-Requested-With', 'Accept']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root route handler
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Vendor Portal Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    ready: isServerReady,
    database: dbConnected ? 'connected' : 'disconnected',
    endpoints: {
      health: '/health',
      api: '/api',
      status: '/api/status',
      routes: '/api/debug/routes'
    }
  });
});

// Serve favicon to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// API routes with explicit path logging
console.log('🚀 Registering API routes...');
app.use('/api/auth', (req, res, next) => {
  console.log(`Auth Route: ${req.method} ${req.originalUrl}`);
  next();
}, authRoutes);

app.use('/api/vendors', (req, res, next) => {
  console.log(`Vendor Route: ${req.method} ${req.originalUrl}`);
  next();
}, vendorRoutes);

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

// Debug endpoint to list all registered routes
app.get('/api/debug/routes', (req, res) => {
  const routes = [];
  
  function extractRoutes(stack, basePath = '') {
    stack.forEach(layer => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        routes.push({
          path: basePath + layer.route.path,
          methods: methods
        });
      } else if (layer.name === 'router' && layer.handle.stack) {
        let routerPath = basePath;
        if (layer.regexp && layer.regexp.source) {
          const match = layer.regexp.source.match(/\^\\?([^\\]*)/);
          if (match) {
            routerPath += match[1].replace(/\\\//g, '/');
          }
        }
        extractRoutes(layer.handle.stack, routerPath);
      }
    });
  }
  
  extractRoutes(app._router.stack);
  
  res.json({
    success: true,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
    totalRoutes: routes.length
  });
});

// Enhanced health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: isServerReady && dbConnected ? 'OK' : 'STARTING',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    database: dbConnected ? 'connected' : 'disconnected',
    protocol: req.protocol,
    host: req.get('host'),
    ready: isServerReady
  });
});

// Readiness probe for PM2/K8s
app.get('/ready', (req, res) => {
  if (isServerReady && dbConnected) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ 
      status: 'not ready',
      database: dbConnected,
      server: isServerReady
    });
  }
});

app.get('/health-checks', (req, res) => {
  res.json({
    status: isServerReady && dbConnected ? 'OK' : 'STARTING',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    database: dbConnected ? 'connected' : 'disconnected',
    protocol: req.protocol,
    host: req.get('host')
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    ready: isServerReady
  });
});

// Catch-all for API routes with better debugging
app.use('/api/*', (req, res) => {
  console.log(`🔍 API Route not found: ${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  console.log('Available routes can be checked at: GET /api/debug/routes');
  
  res.status(404).json({
    error: true,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
    code: 'API_ROUTE_NOT_FOUND',
    hint: 'Check GET /api/debug/routes for available endpoints',
    availableEndpoints: [
      'GET /api/status',
      'GET /api/debug/routes',
      'POST /api/auth/login',
      'GET /api/health',
      'GET /health-checks'
    ]
  });
});

// 404 handler for non-API routes
app.use('*', (req, res) => {
  console.log(`🔍 Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: true,
    message: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware
app.use(globalErrorHandler);

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  handleWebSocketUpgrade(request, socket, head, wss);
});

// Enhanced graceful shutdown with PM2 compatibility
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log('⚠️ Force shutdown requested');
    process.exit(1);
  }
  
  isShuttingDown = true;
  console.log(`🛑 Received ${signal}, closing server gracefully...`);
  
  // Mark server as not ready
  isServerReady = false;
  
  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      console.error('❌ Error closing HTTP server:', err);
    } else {
      console.log('✅ HTTP server closed');
    }
    
    try {
      // Close all WebSocket connections
      console.log('🔌 Closing WebSocket connections...');
      wss.clients.forEach((ws) => {
        ws.terminate();
      });
      
      // Close database connection
      if (dbConnected) {
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        console.log('🗄️ Database connection closed');
      }
      
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force close after timeout
  const timeout = parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT) || 30000;
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, timeout);
};

// Handle multiple shutdown signals (PM2 compatible)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For PM2 and nodemon
process.on('SIGHUP', () => gracefulShutdown('SIGHUP')); // For PM2 reload

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// PM2 graceful start/stop
process.on('message', (msg) => {
  if (msg === 'shutdown') {
    gracefulShutdown('PM2_SHUTDOWN');
  }
});

// Initialize and start server
const startServer = async () => {
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Start HTTP server
    server.listen(config.PORT, '0.0.0.0', () => {
      isServerReady = true;
      console.log(`🚀 Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
      console.log(`🌐 Server accessible at: http://0.0.0.0:${config.PORT}`);
      console.log(`🔌 WebSocket server ready for connections`);
      console.log(`🔍 Debug routes at: http://0.0.0.0:${config.PORT}/api/debug/routes`);
      console.log(`📊 Database transaction mode: ${global.hasReplicaSet ? 'Full (Replica Set)' : 'Local (Single Node)'}`);
      
      // Signal PM2 that the app is ready
      if (process.send) {
        process.send('ready');
      }
    });
    
    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${config.PORT} is already in use`);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = { app, server };
