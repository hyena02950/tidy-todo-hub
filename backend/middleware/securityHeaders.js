
const helmet = require('helmet');

// Check if we're in a secure context (HTTPS or localhost or development)
const isSecureContext = (req) => {
  return req.secure || 
         req.get('x-forwarded-proto') === 'https' ||
         req.hostname === 'localhost' ||
         req.hostname === '127.0.0.1' ||
         process.env.NODE_ENV === 'development';
};

// Check if we should apply strict security policies (only for production HTTPS)
const shouldApplyStrictSecurity = (req) => {
  return process.env.NODE_ENV === 'production' && 
         (req.secure || req.get('x-forwarded-proto') === 'https');
};

// Enhanced security headers configuration
const securityHeaders = helmet({
  // Content Security Policy - Updated for HTTP/HTTPS compatibility
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.elika.com", "ws:", "wss:", "http:", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'"],
      formAction: ["'self'"],
      // Don't upgrade insecure requests for HTTP compatibility
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  
  // Cross-Origin Embedder Policy - disable for React apps
  crossOriginEmbedderPolicy: false,
  
  // Cross-Origin Opener Policy - COMPLETELY DISABLE to fix HTTP errors
  crossOriginOpenerPolicy: false,
  
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: "cross-origin" },
  
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  
  // Frameguard
  frameguard: { action: 'deny' },
  
  // Hide Powered-By header
  hidePoweredBy: true,
  
  // HTTP Strict Transport Security - only for production HTTPS
  hsts: false, // Will be set conditionally in additionalHeaders
  
  // IE No Open
  ieNoOpen: true,
  
  // No Sniff
  noSniff: true,
  
  // Origin Agent Cluster - DISABLE to fix browser warning
  originAgentCluster: false,
  
  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: false,
  
  // Referrer Policy
  referrerPolicy: { policy: "no-referrer" },
  
  // X-XSS-Protection
  xssFilter: true,
});

// Additional custom security headers with environment awareness
const additionalHeaders = (req, res, next) => {
  const isSecure = isSecureContext(req);
  const shouldUseStrictSecurity = shouldApplyStrictSecurity(req);
  
  // Prevent caching of sensitive data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Only set HSTS for production HTTPS connections
  if (shouldUseStrictSecurity) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Permissions Policy - less restrictive for development
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  }
  
  // EXPLICITLY REMOVE problematic headers for HTTP compatibility
  res.removeHeader('Origin-Agent-Cluster');
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  
  next();
};

module.exports = {
  securityHeaders,
  additionalHeaders
};
