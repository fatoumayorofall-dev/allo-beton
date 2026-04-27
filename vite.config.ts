import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,          // pas de sourcemaps en prod
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Découper les gros bundles
        manualChunks: {
          'vendor-react':   ['react', 'react-dom'],
          'vendor-recharts':['recharts'],
          'vendor-lucide':  ['lucide-react'],
        },
      },
    },
  },
  // En dev : proxy l'API locale
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

