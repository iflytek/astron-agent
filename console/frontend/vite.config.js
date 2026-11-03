import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import { CodeInspectorPlugin } from 'code-inspector-plugin';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    build: {
      rollupOptions: {
        maxParallelFileOps: 1, // 限制并行文件操作数为1
      },
      commonjsOptions: {
        strictRequires: true, // 强制所有 CommonJS 模块都被严格处理
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
        '/console-api': {
          target: process.env.CONSOLE_DEV_BACKEND || 'http://127.0.0.1:8080',
          rewrite: path => path.replace(/^\/console-api/, ''),
        },
      },
    },
    preview: {
      proxy: {
        '/console-api': {
          target: process.env.CONSOLE_DEV_BACKEND || 'http://127.0.0.1:8080',
          rewrite: path => path.replace(/^\/console-api/, ''),
        },
      },
    },
  };
});
