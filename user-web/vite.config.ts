import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [
tailwindcss()
  ],
  server: {
    port: 3000,
    headers: {
      'Permissions-Policy': 'microphone=*, camera=*, display-capture=*',
      'Feature-Policy': 'microphone *; camera *',
    },
  },
});
