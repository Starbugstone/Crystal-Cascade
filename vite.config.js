import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src',
      phaser3spectorjs: path.resolve(__dirname, 'testing/mocks/phaser3spectorjs.js'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.js'],
  },
});
