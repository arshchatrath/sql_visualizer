import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Emit asset URLs relative to index.html instead of rooted at "/".
  //
  // Hosted anywhere other than a domain root — GitHub Pages serves this repo
  // at /<repo-name>/, for instance — the default "/" base makes every script
  // and stylesheet request resolve to the wrong path and 404, leaving a blank
  // page with no obvious cause. Relative URLs work from a subpath and from a
  // domain root alike.
  //
  // Safe here specifically because DATAPULSE is a single page with no client
  // -side router: nothing ever navigates to a nested URL from which a
  // relative path would resolve differently.
  base: './',
  plugins: [react(), tailwindcss()],
})
