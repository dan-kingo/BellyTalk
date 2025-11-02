import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'https://bellytalk.onrender.com',
        changeOrigin: true,
      },
    },
  },
});
