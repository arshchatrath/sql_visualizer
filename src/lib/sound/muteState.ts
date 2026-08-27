// Deliberately has zero dependency on Tone.js (see sfx.ts) — this needs to
// be cheap enough to import synchronously from anywhere (a toggle button
// that renders before the audio engine has ever been touched), while the
// actual synths only load once a query is first executed.
const MUTE_KEY = 'datapulse_sfx_muted'

function loadMutedPref(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

let muted = loadMutedPref()
const listeners = new Set<(muted: boolean) => void>()

export function isMuted(): boolean {
  return muted
}

export function setMuted(next: boolean): void {
  muted = next
  try {
    localStorage.setItem(MUTE_KEY, next ? '1' : '0')
  } catch {
    // Private mode / storage disabled — mute preference just won't persist.
  }
  listeners.forEach((l) => l(muted))
}

export function toggleMuted(): boolean {
  setMuted(!muted)
  return muted
}

/** For the mute-toggle button to re-render if muted state changes from elsewhere. */
export function subscribeMuted(listener: (muted: boolean) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
