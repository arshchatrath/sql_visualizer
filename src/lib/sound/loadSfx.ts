// sfx.ts is only ever reached through this dynamic import, which is what
// lets Vite split Tone.js into its own chunk (see sfx.ts).
export function loadSfx() {
  return import('./sfx')
}
