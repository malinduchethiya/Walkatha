import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const POPUNDER_SCRIPT_TAG =
  '<script data-cfasync="false" src="https://ahuramazda.org/1/9275b71384eefb562fbf9d9fd275cc5e"></script>';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'place-popunder-before-head-close',
      enforce: 'post',
      transformIndexHtml(html) {
        const cleaned = html.replace(
          /\s*<script[^>]*src="https:\/\/ahuramazda\.org\/1\/9275b71384eefb562fbf9d9fd275cc5e"[^>]*><\/script>/gi,
          ''
        );
        return cleaned.replace(/<\/head>/i, `    ${POPUNDER_SCRIPT_TAG}\n  </head>`);
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/analytics'],
          'lucide-vendor': ['lucide-react'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
