// Deliberately has zero dependency on Tone.js (see sfx.ts) — this needs to
// be cheap enough to import synchronously from the mute button, which
// renders before the audio engine has ever been touched.
const MUTE_KEY = 'datapulse_sfx_muted'

function loadMutedPref(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

let muted = loadMutedPref()

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
}
