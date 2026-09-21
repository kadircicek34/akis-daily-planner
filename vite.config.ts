import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: { assetsInlineLimit: 100000 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png', 'pwa-64x64.png'],
      manifest: {
        name: 'Akış — Günlük Planlayıcı',
        short_name: 'Akış',
        description: 'Gününüzü görsel bir zaman çizelgesinde planlayın.',
        theme_color: '#fffaf8',
        background_color: '#fffaf8',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        lang: 'tr',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html}']
      }
    })
  ]
})
