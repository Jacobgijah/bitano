import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy /v1/* to the API during dev so the browser calls same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/v1': 'http://localhost:4000' },
  },
});
