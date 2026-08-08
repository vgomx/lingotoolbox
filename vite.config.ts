import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

/**
 * The commit this bundle was built from, shown in Settings → About.
 *
 * Briefly shown nowhere at all: the Diagnostics card was its only reader, and
 * deleting that card left this define with no consumer while this comment went
 * on claiming otherwise. The stamp is the part worth keeping — it answers the
 * question below on its own.
 *
 * A service worker can serve an old build for a long time, and on an installed
 * app there is no address bar to reload from — so "is this phone running the fix
 * or the version before it" was a question we could only answer by looking for
 * a visual change and hoping we picked one that had actually shipped.
 */
const BUILD = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'dev'; }
})();
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GITHUB_PAGES is set by the deploy workflow; local dev and local builds stay at "/".
const base = process.env.GITHUB_PAGES ? '/lingotoolbox/' : '/';

/** --ink-700, the app surface. The OS splash then matches the app's own. */
const SURFACE_APP = '#23232F';

export default defineConfig({
  base,
  define: { __BUILD__: JSON.stringify(BUILD) },
  plugins: [
    react(),
    VitePWA({
      /*
       * The new build waits to be invited in.
       *
       * This was 'autoUpdate', on the reasoning that a static build has no
       * versioning story worth prompting about — which is true, and was still
       * the wrong call. autoUpdate does not mean "update now": the worker
       * fetches the new build and keeps serving the old one until the next
       * launch, so a deploy took two visits to appear and an installed app,
       * whose window is never really closed, could sit on an old build for
       * days. The symptom was a rail that kept showing yesterday's order.
       *
       * 'prompt' plus UpdatePrompt makes it one visit and one button. The
       * button matters: reloading unasked would throw away a review queue that
       * only exists in memory.
       */
      registerType: 'prompt',
      includeAssets: ['mark-violet.svg', 'icons/*.png'],
      manifest: {
        name: 'Lingo Toolbox',
        short_name: 'Lingo',
        description:
          'A set of tools for practising a language you are already learning — flashcards with spaced repetition, and more to come.',
        // Relative so the manifest works both at the root and under the
        // /lingotoolbox/ subpath GitHub Pages serves from.
        //
        // 'app', not '.': someone who installed this to their home screen has
        // long since read the pitch, and an installed icon that opens a
        // marketing page is not the app they installed. The scope stays at the
        // root so the landing page is still inside the PWA.
        start_url: 'app',
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
        globIgnores: [
          // 404.html is a copy of index.html for SPA deep links on Pages; precaching
          // it would ship the whole app twice.
          '**/404.html',
          // The 526 illustrations are 1.4 MB across 526 files. Precaching them
          // would more than double what a first visit downloads before the app is
          // usable, to show pictures most people never open the picker to see.
          // They are runtime-cached instead — and a glyph can only be on a card if
          // the picker was opened, which is what puts it in the cache.
          'openmoji/**',
          // The latin-ext cut of the two text faces. The four workspaces do not
          // need it: ã, ç, õ, ë and ñ all sit below U+0100, inside latin.
          // unicode-range means a browser only fetches these if a character in
          // the range actually appears, so leaving them out costs nothing until
          // someone writes a card in Polish, and saves 70 KB on a first visit
          // for everyone who never does. They are still served and still cached
          // at runtime once fetched.
          //
          // JetBrains Mono is deliberately NOT in this list. It sets the
          // phonetics, and IPA lives in latin-ext — ˈ is U+02C8 and ɛ is
          // U+025B — so /ˈlɛkər/ pulls that file on the very first card with a
          // pronunciation on it. Excluding it would have left the offline case
          // this whole change exists to fix reaching for the network anyway.
          // Measured, not assumed: it was the one latin-ext file the app
          // fetched on load.
          '**/baloo-2-*latin-ext-*.woff2',
          '**/nunito-sans-*latin-ext-*.woff2',
        ],
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /\/openmoji\/.*\.svg$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'openmoji-illustrations',
              // Comfortably above the vendored set, so browsing the whole picker
              // once does not start evicting glyphs already on someone's cards.
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
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
