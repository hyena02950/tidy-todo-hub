
const AppError = require('../utils/AppError');

// Global error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details with more context
  console.error(`${new Date().toISOString()}: Error ${req.id ? `[${req.id}]` : ''}: ${error.message}`);
  console.error('Request details:', {
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack trace:', err.stack);
  }

  // Enhanced validation error handling
  if (error.code === 'VALIDATION_ERROR' && error.details) {
    console.error('Detailed validation errors:', JSON.stringify(error.details, null, 2));
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID';
    error = new AppError(message, 400, 'INVALID_ID');
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = new AppError(message, 400, 'DUPLICATE_FIELD');
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new AppError(message, 400, 'VALIDATION_ERROR');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401, 'TOKEN_EXPIRED');
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('File too large', 400, 'FILE_TOO_LARGE');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new AppError('Unexpected file field', 400, 'UNEXPECTED_FILE');
  }

  // Rate limiting errors
  if (err.status === 429) {
    error = new AppError('Too many requests', 429, 'RATE_LIMIT_EXCEEDED');
  }

  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    error = new AppError('CORS policy violation', 403, 'CORS_ERROR');
  }

  // Send error response
  const statusCode = error.statusCode || 500;
  const response = {
    error: true,
    message: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR'
  };

  // Add validation details if available
  if (error.details && Array.isArray(error.details)) {
    response.details = error.details;
  }

  // Add additional details in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.fullError = error;
  }

  // Add request ID if available
  if (req.id) {
    response.requestId = req.id;
  }

  res.status(statusCode).json(response);
};

// 404 handler for unmatched routes
const notFoundHandler = (req, res) => {
  const message = `Route ${req.originalUrl} not found`;
  console.warn(`${new Date().toISOString()}: 404 - ${message} [${req.method}]`);
  
  res.status(404).json({
    error: true,
    message,
    code: 'ROUTE_NOT_FOUND'
  });
};

module.exports = {
  globalErrorHandler,
  notFoundHandler
};
