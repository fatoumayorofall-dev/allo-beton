import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En développement, les appels /api sont relayés vers le serveur Fabima (npm run server).
const api = { '/api': { target: 'http://localhost:8787', changeOrigin: true } };

export default defineConfig({
  plugins: [react()],
  server: { port: 5174, proxy: api },
  preview: { proxy: api },
});
