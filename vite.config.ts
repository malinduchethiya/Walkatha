import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const POPUNDER_SWAP_SCRIPT = '<script src="/popunder-swap.js"></script>';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'preserve-crawler-safe-ad-loader',
      enforce: 'post',
      transformIndexHtml(html) {
        const cleaned = html
          .replace(/\s*<script[^>]*src="\/popunder-swap\.js"[^>]*><\/script>/gi, '')
          .replace(
            /\s*<script[^>]*src="https:\/\/ahuramazda\.org\/1\/9275b71384eefb562fbf9d9fd275cc5e"[^>]*><\/script>/gi,
            ''
          )
          .replace(
            /\s*<script[^>]*src="https:\/\/brijmohan\.org\/14\/c05ac7bd55736617f6c7021ffa7f49da"[^>]*><\/script>/gi,
            ''
          );
        return cleaned.replace(/<\/head>/i, `    ${POPUNDER_SWAP_SCRIPT}\n  </head>`);
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
