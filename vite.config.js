import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          i18n: ['i18next', 'i18next-browser-languagedetector', 'react-i18next'],
          tree: ['reactflow'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});
