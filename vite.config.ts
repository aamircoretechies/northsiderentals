import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget =
    env.VITE_DEV_PROXY_TARGET?.replace(/\/$/, '') ||
    'https://rcm-api.coretechiestest.org';

  return {
  plugins: [react(), tailwindcss()],
  base: '/',
  server: {
    headers: {
      // Allow popups opened by this page (e.g. Firebase Google sign-in) to
      // communicate back via window.closed without COOP blocking them.
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    proxy: {
      // Browser → same origin `/api/...` (no CORS). Dev server forwards to the real API.
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 3000,
  },
};
});
