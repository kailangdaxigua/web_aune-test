import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0', // 监听所有网络接口，允许局域网访问
    port: 3000,
    open: true,
    // // 允许通过域名访问
    // allowedHosts: [
    //   'localhost',
    //   '127.0.0.1',
    //   '192.168.3.126',
    //   'test.btyedream.com',
    //   '.btyedream.com', // 允许所有 btyedream.com 子域名
    // ],
    // // CORS 配置
    // cors: true,
    // // 如果使用了代理，可能需要配置 strictPort
    // strictPort: false,
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia'],
          'supabase': ['@supabase/supabase-js'],
          'echarts': ['echarts'],
        },
      },
    },
  },
})

