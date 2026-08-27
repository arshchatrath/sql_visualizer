// The only static import of sfx.ts's dynamic-import wrapper anywhere in the
// app — keeping the `import('./sfx')` call itself as the sole entry point
// is what lets Vite split Tone.js into its own chunk (see sfx.ts).
type SfxModule = typeof import('./sfx')

let modulePromise: Promise<SfxModule> | null = null

export function loadSfx(): Promise<SfxModule> {
  if (!modulePromise) modulePromise = import('./sfx')
  return modulePromise
}
