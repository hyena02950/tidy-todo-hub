
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

// Connect to database
connectDB().catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});

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
  crossOriginOpenerPolicy: false, // Disable to prevent HTTP errors
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
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8080', 
      'http://localhost:5173',
      'https://localhost:3000',
      'https://localhost:8080',
      'https://localhost:5173',
      // Add production domains here
      'http://13.235.100.18:8080',
      'https://13.235.100.18:8080'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS: Origin not allowed:', origin);
      callback(null, true); // Allow all origins for now - can restrict later
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Origin', 'X-Requested-With', 'Accept']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root route handler - Fix for "Route not found" error
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Vendor Portal Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
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

// Health check endpoints - both variants
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    database: 'connected',
    protocol: req.protocol,
    host: req.get('host')
  });
});

app.get('/health-checks', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    database: 'connected',
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
    environment: config.NODE_ENV
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
server.listen(config.PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
  console.log(`🌐 Server accessible at: http://0.0.0.0:${config.PORT}`);
  console.log(`🔌 WebSocket server ready for connections`);
  console.log(`🔍 Debug routes at: http://0.0.0.0:${config.PORT}/api/debug/routes`);
});

module.exports = { app, server };
