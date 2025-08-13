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
  
  // Force HTTP for localhost and development
  if (mode === 'development' || backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
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
      // Don't set https property - undefined means HTTP
      hmr: {
        protocol: 'ws', // Force WebSocket (not WSS) for development
        port: 8080
      },
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false, // Allow HTTP connections
          ws: true, // Enable websocket proxying
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
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

    // Environment variables - ensure HTTP is used in development
    define: {
      'process.env': {
        VITE_API_BASE_URL: JSON.stringify(mode === 'development' ? 'http://localhost:3001' : backendUrl),
        VITE_NODE_ENV: JSON.stringify(mode),
        ...Object.fromEntries(
          Object.entries(env).map(([key, val]) => [`process.env.${key}`, JSON.stringify(val)])
        )
      }
    }
  };
});
