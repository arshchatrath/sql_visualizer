import * as Tone from 'tone'
import { isMuted } from './muteState'

// Tone.js is a genuinely heavy dependency for a handful of synthesized
// blips — this module is only ever reached via lib/sound/loadSfx.ts's
// dynamic import, so it lands in its own chunk that loads in the
// background after the first query execution rather than blocking the
// initial bundle. Everything here is synthesized, not sampled — no audio
// asset files, nothing to fetch.

interface Synths {
  kill: any
  killNoise: any
  upgrade: any
  spawn: any
  blip: any
}

let synths: Synths | null = null
let started = false

/** Must run inside a real user gesture (a click handler) — browsers refuse to start an AudioContext otherwise. */
export async function ensureAudioStarted(): Promise<void> {
  if (started) return
  await Tone.start()
  started = true
}

function getSynths(): Synths {
  if (synths) return synths
  const reverb = new Tone.Reverb({ decay: 1.1, wet: 0.22 }).toDestination()
  synths = {
    // A punchy low thud + a short white-noise burst together read as an
    // "impact" — the classic game-audio trick for a hit/kill sound without
    // needing a sampled asset.
    kill: new Tone.MembraneSynth({
      pitchDecay: 0.02,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.25, sustain: 0 },
    }).toDestination(),
    killNoise: new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0 },
      volume: -8,
    }).toDestination(),
    // A bright ascending triangle-wave arpeggio, reverb-tailed — the
    // "power-up" cliché, played straight.
    upgrade: new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.15, sustain: 0.08, release: 0.2 },
      volume: -6,
    }).connect(reverb),
    // Soft sine rise with reverb tail — a row materializing.
    spawn: new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.05, release: 0.4 },
      volume: -6,
    }).connect(reverb),
    // A short, quiet square-wave click for a plain SELECT reveal — present
    // but never intrusive on a result set with many rows.
    blip: new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.04 },
      volume: -20,
    }).toDestination(),
  }
  return synths
}

export function playKill(): void {
  if (isMuted() || !started) return
  const s = getSynths()
  const now = Tone.now()
  s.kill.triggerAttackRelease('C1', '8n', now)
  s.killNoise.triggerAttackRelease('16n', now)
}

export function playUpgrade(): void {
  if (isMuted() || !started) return
  const s = getSynths()
  const now = Tone.now()
  ;['C4', 'E4', 'G4', 'C5'].forEach((note, i) => {
    s.upgrade.triggerAttackRelease(note, '32n', now + i * 0.05)
  })
}

export function playSpawn(): void {
  if (isMuted() || !started) return
  const s = getSynths()
  const now = Tone.now()
  s.spawn.triggerAttackRelease('A4', '8n', now)
  s.spawn.triggerAttackRelease('E5', '8n', now + 0.08)
}

export function playBlip(): void {
  if (isMuted() || !started) return
  getSynths().blip.triggerAttackRelease('A5', '32n')
}
