import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      port: 5173
    },
    define: {
      // Expose environment variables without VITE_ prefix
      'import.meta.env.RELEASE': JSON.stringify(env.RELEASE || 'dev'),
      'import.meta.env.API_URL': JSON.stringify(env.API_URL || 'http://localhost:3000/api'),
    }
  };
});