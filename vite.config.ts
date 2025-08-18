import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';

export default defineConfig(({ mode }) => {
  // Load env vars based on mode
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const isProduction = mode === 'production';
  
  // Ensure backend URL uses HTTP for development and local environments
  let backendUrl = env.VITE_API_BASE_URL || 'http://localhost:3001';
  
  // Force HTTP for localhost and development - CRITICAL FIX
  if (mode === 'development' || backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
    backendUrl = backendUrl.replace('https://', 'http://');
  }
  
  // For production IPs, use HTTP unless explicitly HTTPS
  if (backendUrl.includes('13.235.100.18') && !backendUrl.startsWith('https://')) {
    backendUrl = backendUrl.replace('https://', 'http://');
  }

  return {
    // Base path configuration
    base: '/',
    
    // Server configuration
    server: {
      host: '0.0.0.0',
      port: 8080,
      strictPort: true,
      // Remove https: false to fix TypeScript error - defaults to HTTP
      hmr: {
        protocol: 'ws', // Force WebSocket (not WSS) for development
        port: 8080
      },
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false, // Allow HTTP connections - CRITICAL
          ws: true, // Enable websocket proxying
          headers: {
            'Origin': backendUrl
          },
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('🔥 Proxy error:', err.message);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('📤 Sending Request to Backend:', req.method, req.url);
              console.log('📤 Target:', backendUrl);
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

    // Environment variables - FORCE HTTP for backend communication
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
