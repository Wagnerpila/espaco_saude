import path from 'node:path'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    react(),
    // Celulares Android com Chrome/WebView desatualizado não rodam o bundle
    // moderno (ES2020 + APIs novas) e ficavam com tela branca. Gera também um
    // bundle legado com polyfills (só baixado por navegador antigo) e injeta
    // polyfills das APIs novas (structuredClone, Object.hasOwn, Array.at...)
    // no bundle moderno pra quem suporta módulos mas é de antes delas.
    legacy({
      targets: ['defaults', 'chrome >= 64', 'android >= 7', 'safari >= 12'],
      modernPolyfills: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
