import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const POPUNDER_SCRIPT =
  '<script data-cfasync="false" src="https://ahuramazda.org/1/9275b71384eefb562fbf9d9fd275cc5e"></script>';
const SOCIAL_LINK_SCRIPT =
  '<script data-cfasync="false" src="https://brijmohan.org/14/c05ac7bd55736617f6c7021ffa7f49da"></script>';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'preserve-adsterra-scripts',
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
        return cleaned
          .replace(
            /<\/head>/i,
            `    ${POPUNDER_SCRIPT}\n  </head>`
          )
          .replace(/<\/body>/i, `    ${SOCIAL_LINK_SCRIPT}\n  </body>`);
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
