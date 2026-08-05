import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GITHUB_PAGES is set by the deploy workflow; local dev and local builds stay at "/".
const base = process.env.GITHUB_PAGES ? '/lingotoolbox/' : '/';

/** --ink-700, the app surface. The OS splash then matches the app's own. */
const SURFACE_APP = '#23232F';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // The app is a static build with no versioning story of its own, so a new
      // deploy should simply become the app. Prompting to reload would be asking
      // about something the reader has no way to reason about.
      registerType: 'autoUpdate',
      includeAssets: ['mark-violet.svg', 'icons/*.png'],
      manifest: {
        name: 'Lingo Toolbox',
        short_name: 'Lingo',
        description:
          'A set of tools for practising a language you are already learning — flashcards with spaced repetition, and more to come.',
        // Relative so the manifest works both at the root and under the
        // /lingotoolbox/ subpath GitHub Pages serves from.
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        theme_color: SURFACE_APP,
        background_color: SURFACE_APP,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          // Kept separate from the plain icons: a launcher that crops to a circle
          // would otherwise clip the rounded-square lockup's corners.
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // 404.html is a copy of index.html for SPA deep links on Pages; precaching
        // it would ship the whole app twice.
        globIgnores: ['**/404.html'],
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // The type is still pulled from Google Fonts at runtime, which is the
            // one thing standing between this and a genuinely offline first load.
            // Caching it means offline works from the second visit; self-hosting
            // the .woff2 files would make it work from the first.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    // lingo-ds is a file: dependency with its own node_modules/react. Without this the
    // production build bundles two copies of React and only one gets wired up as the
    // hook dispatcher, which fails at runtime as a blank page.
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // Vite's dep optimizer repeatedly re-optimizes the symlinked local package and
    // forces full-page reloads in a loop. Excluding it keeps dev sessions stable.
    exclude: ['lingo-ds'],
  },
  server: {
    watch: {
      ignored: ['**/lingo-ds/node_modules/**'],
    },
  },
});
