import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const POPUNDER_TAG =
  '<script data-cfasync="false" src="https://ahuramazda.org/1/9275b71384eefb562fbf9d9fd275cc5e"></script>';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'ensure-popunder-before-head-close',
      enforce: 'post',
      transformIndexHtml(html) {
        const stripped = html.replace(
          /<script[^>]*src="https:\/\/ahuramazda\.org\/1\/9275b71384eefb562fbf9d9fd275cc5e"[^>]*><\/script>\s*/gi,
          ''
        );
        return stripped.replace(/<\/head>/i, `    ${POPUNDER_TAG}\n  </head>`);
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
