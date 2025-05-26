import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.VITE_PORT) || 5582,
    proxy: {
      '/api': {
        target: 'http://localhost:5581',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: Number(process.env.VITE_PORT) || 5582,
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
});