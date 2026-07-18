import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@tellplot/editor/styles.css',
        replacement: fileURLToPath(
          new URL('../../packages/editor/src/styles/editor.css', import.meta.url),
        ),
      },
      {
        find: '@tellplot/editor',
        replacement: fileURLToPath(new URL('../../packages/editor/src/index.ts', import.meta.url)),
      },
    ],
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
