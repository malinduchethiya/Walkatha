import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const POPUNDER_SWAP_SCRIPT = '<script src="/popunder-swap.js"></script>';
const POPUNDER_SCRIPT =
  '<script data-cfasync="false" src="https://ahuramazda.org/1/9275b71384eefb562fbf9d9fd275cc5e"></script>';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'preserve-adsterra-popunder-head',
      enforce: 'post',
      transformIndexHtml(html) {
        const cleaned = html
          .replace(/\s*<script[^>]*src="\/popunder-swap\.js"[^>]*><\/script>/gi, '')
          .replace(
            /\s*<script[^>]*src="https:\/\/ahuramazda\.org\/1\/9275b71384eefb562fbf9d9fd275cc5e"[^>]*><\/script>/gi,
            ''
          );
        return cleaned.replace(
          /<\/head>/i,
          `    ${POPUNDER_SWAP_SCRIPT}\n    ${POPUNDER_SCRIPT}\n  </head>`
        );
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
