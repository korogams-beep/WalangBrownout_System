import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // ISSUE-007: Include both the loopback aliases so that requests from
    // 127.0.0.1:5173 are not blocked alongside the standard localhost:5173.
    // Browsers and some tools (e.g. Postman, curl) use 127.0.0.1 directly
    // instead of resolving the `localhost` hostname, which caused CORS
    // rejections when the origin header read "http://127.0.0.1:5173".
    cors: {
      origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ],
    },
  },
});
