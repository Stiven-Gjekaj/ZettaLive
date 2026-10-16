import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

// GitHub Pages serves the app from /ZettaLive/.
export default defineConfig({
  base: '/ZettaLive/',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fonts/karla.ttf', 'icons/apple-touch-icon.png', 'icons/icon.svg'],
      manifest: {
        name: 'ZettaLive',
        short_name: 'ZettaLive',
        description: 'Live TV from your IPTV playlists in the browser.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Keep only the app in the cache. Playlists, guides, and streams always come from the network.
        globPatterns: ['**/*.{js,css,html,svg,png,ttf}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
  },
})
