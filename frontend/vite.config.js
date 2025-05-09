import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/LoopList/', // Replace 'looplist' with your repository name
  build: {
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['react-calendar', 'react-icons'],
        },
      },
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
})
