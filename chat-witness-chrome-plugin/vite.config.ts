import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    cors: {
      origin: '*',
    },
    hmr: {
      port: 5173,
    },
  },
  plugins: [react(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        signer: 'signer.html',
      },
    },
  },
});
