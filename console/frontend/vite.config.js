import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import { CodeInspectorPlugin } from 'code-inspector-plugin';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    envPrefix: ['CONSOLE_', 'VITE_'],
    build: {
      rollupOptions: {
        maxParallelFileOps: 1,
      },
      commonjsOptions: {
        strictRequires: true,
      },
    },
    plugins: [
      commonjs(),
      isDev &&
        CodeInspectorPlugin({
          bundler: 'vite',
          editor: 'cursor',
        }),
      react(),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/xingchen-api': {
          target: 'http://172.29.202.54:8080',
          changeOrigin: true,
          headers: {
            Connection: 'keep-alive',
            'Keep-Alive': 'timeout=30, max=100',
          },
          rewrite: path => path.replace(/^\/xingchen-api/, ''),
        },
        '/chat-': {
          changeOrigin: true,
          headers: {
            Connection: 'keep-alive',
            'Keep-Alive': 'timeout=30, max=100',
          },
        },
        '/workflow': {
          target: 'http://172.29.201.92:8080',
          changeOrigin: true,
          headers: {
            Connection: 'keep-alive',
            'Keep-Alive': 'timeout=30, max=100',
          },
        },
      },
    },
  };
});
