
module.exports = {
  apps: [{
    name: 'elika-portal-backend',
    script: './server.js',
    cwd: '/var/www/elika-portal/Vendors-portal/backend',
    instances: 1, // Changed from 'max' to 1 for stability
    exec_mode: 'fork', // Changed from 'cluster' to 'fork' for single instance
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    // Enhanced logging
    error_file: '/var/log/pm2/elika-portal-error.log',
    out_file: '/var/log/pm2/elika-portal-out.log',
    log_file: '/var/log/pm2/elika-portal.log',
    time: true,
    
    // Memory and process management
    max_memory_restart: '512M', // Reduced from 1G for smaller instances
    node_args: '--max-old-space-size=512',
    
    // Auto-restart configuration
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Enhanced monitoring
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    
    // Environment variables for production
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      // Ensure graceful shutdown handling
      GRACEFUL_SHUTDOWN_TIMEOUT: 30000
    },
    
    // Kill timeout for graceful shutdown
    kill_timeout: 5000,
    
    // Wait time before restart
    wait_ready: true,
    listen_timeout: 10000,
    
    // Process management
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
