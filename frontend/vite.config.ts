import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const backendOrigin = env.VITE_BACKEND_ORIGIN || 'http://127.0.0.1:43175';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'jsdom',
      globals: false,
    },
    server: {
      host: '127.0.0.1',
      port: 43174,
      strictPort: true,
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
        },
        '/data': {
          target: backendOrigin,
          changeOrigin: true,
        },
      },
    },
  };
});
