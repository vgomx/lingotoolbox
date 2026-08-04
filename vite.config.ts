import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GITHUB_PAGES is set by the deploy workflow; local dev and local builds stay at "/".
const base = process.env.GITHUB_PAGES ? '/lingotoolbox/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
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
