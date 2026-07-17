import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import { CodeInspectorPlugin } from 'code-inspector-plugin';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    envPrefix: ['CONSOLE_', 'VITE_'],
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
        //代理规则
        '/xingchen-api': {
          // target: 'https://agent.xfyun.cn',
          // target: 'http://172.29.201.92:8081',
          target: 'http://172.29.202.54:8080', // 联调服务器地址
          //  target: 'http://172.29.201.92:8080', // 测试服务器地址
          changeOrigin: true,
          headers: {
            Connection: 'keep-alive',
            'Keep-Alive': 'timeout=30, max=100',
          },
          rewrite: path => path.replace(/^\/xingchen-api/, ''),
        },
        '/chat-': {
          // target: "http://10.7.104.244:8080",
          //target: "http://agent.xfyun.cn",
          // target: 'http://172.29.201.92:8081',
          changeOrigin: true,
          headers: {
            Connection: 'keep-alive',
            'Keep-Alive': 'timeout=30, max=100',
          },
        },
        '/workflow': {
          // target: 'http://172.29.202.54:8080', // 联调服务器地址
          target: 'http://172.29.201.92:8080', // 测试服务器地址
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
