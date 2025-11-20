import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 3000
    },
    define: {
      // Expose environment variables without VITE_ prefix
      'import.meta.env.RELEASE': JSON.stringify(env.RELEASE || 'dev'),
      'import.meta.env.API_URL': JSON.stringify(env.API_URL || 'http://localhost:3000/api'),
    },
    build: {
      // Optimize chunk splitting
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate vendor chunks for better caching
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['framer-motion', 'lucide-react', 'react-hot-toast'],
          }
        }
      },
      // Increase chunk size warning limit (default is 500 kB)
      chunkSizeWarningLimit: 1000,
      // Enable minification
      minify: 'esbuild',
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Enable source maps for production debugging (optional)
      sourcemap: false,
      // Target modern browsers for smaller bundle
      target: 'esnext',
    },
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'framer-motion',
        'lucide-react',
        'react-hot-toast'
      ]
    }
  };
});