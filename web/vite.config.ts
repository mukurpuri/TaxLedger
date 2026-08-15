import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:3000',
      '/filings': 'http://localhost:3000',
      '/tax': 'http://localhost:3000',
      '/admin': 'http://localhost:3000',
      '/gst': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
});
