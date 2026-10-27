import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const api = 'http://127.0.0.1:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: { '/api': api, '/uploads': api },
  },
  preview: { host: true, port: 4173, proxy: { '/api': api, '/uploads': api } },
});
