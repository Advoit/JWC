import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages `base` — relatives Basis-Pfad macht die App pfadunabhängig deploybar.
const isGhPages = process.env.GH_PAGES === 'true'

export default defineConfig({
  base: isGhPages ? '/JWC/' : './',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0'),
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'JWC – Versammlungsverwaltung',
        short_name: 'JWC',
        description:
          'Dynamische PWA zur Verwaltung aller Aktivitäten einer Versammlung – vollständig offline nutzbar mit optionaler Nextcloud-Sicherung.',
        theme_color: '#1d3324',
        background_color: '#101012',
        display: 'standalone',
        lang: 'de',
        start_url: '.',
        icons: [
          {
            src: 'icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
})