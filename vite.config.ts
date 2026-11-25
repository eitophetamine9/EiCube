import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    chunkSizeWarningLimit: 800,
    assetsInlineLimit: 4096,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        moves: resolve(__dirname, 'moves.html'),
      },
    },
  },
});

