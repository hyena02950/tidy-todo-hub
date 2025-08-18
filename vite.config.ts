import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';

export default defineConfig(({ mode }) => {
  // Load env vars based on mode
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const isProduction = mode === 'production';
  
  // Ensure backend URL uses HTTP consistently - CRITICAL FIX for SSL errors
  let backendUrl = env.VITE_API_BASE_URL || 'http://localhost:3001';
  
  // FORCE HTTP for all local development and IP addresses to prevent SSL errors
  if (mode === 'development' || 
      backendUrl.includes('localhost') || 
      backendUrl.includes('127.0.0.1') ||
      backendUrl.includes('13.235.100.18')) {
    backendUrl = backendUrl.replace('https://', 'http://');
    // Ensure it starts with http://
    if (!backendUrl.startsWith('http://')) {
      backendUrl = 'http://' + backendUrl.replace(/^https?:\/\//, '');
    }
  }

  console.log(`🔧 Backend URL configured as: ${backendUrl}`);

  return {
    // Base path configuration
    base: '/',
    
    // Server configuration - FIXED for HTTP compatibility
    server: {
      host: '0.0.0.0',
      port: 8080,
      strictPort: true,
      // Explicitly disable HTTPS to prevent SSL errors
      https: false,
      hmr: {
        protocol: 'ws', // Force WebSocket (not WSS) for development
        port: 8080,
        host: 'localhost' // Explicit host for HMR
      },
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false, // CRITICAL: Allow HTTP connections
          ws: true, // Enable websocket proxying
          // Force HTTP protocol
          protocol: 'http:',
          headers: {
            'Origin': backendUrl,
            'X-Forwarded-Proto': 'http'
          },
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('🔥 Proxy error:', err.message);
              console.log('🔧 Check if backend is running on:', backendUrl);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('📤 Sending Request to Backend:', req.method, req.url);
              console.log('📤 Target:', backendUrl);
              // Force HTTP protocol headers
              proxyReq.setHeader('X-Forwarded-Proto', 'http');
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('📥 Received Response from Backend:', proxyRes.statusCode, req.url);
            });
          },
          rewrite: (path) => path
        }
      }
    },

    // Build configuration
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: !isProduction,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom']
          },
          assetFileNames: 'assets/[name]-[hash][extname]',
          entryFileNames: 'assets/[name]-[hash].js'
        }
      }
    },

    // Plugins
    plugins: [
      react(),
      mode === 'development' && componentTagger()
    ].filter(Boolean),

    // Resolve aliases
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@assets': path.resolve(__dirname, './src/assets')
      }
    },

    // Environment variables - FORCE HTTP for backend communication to prevent SSL errors
    define: {
      'process.env': {
        VITE_API_BASE_URL: JSON.stringify(backendUrl),
        VITE_NODE_ENV: JSON.stringify(mode),
        ...Object.fromEntries(
          Object.entries(env).map(([key, val]) => [`process.env.${key}`, JSON.stringify(val)])
        )
      }
    }
  };
});
