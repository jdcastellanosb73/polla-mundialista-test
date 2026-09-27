import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH is set by the GitHub Pages workflow (the app is served under
// /<repo-name>/ there). Locally it defaults to '/'.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  base: process.env.BASE_PATH || '/',
});
