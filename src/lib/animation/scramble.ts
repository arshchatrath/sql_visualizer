// gsap.core.Timeline / gsap.Position are declared as global ambient types
// by gsap's own .d.ts (a `declare namespace gsap` merged onto the module),
// so they resolve here without any import — this file never touches the
// `gsap` runtime value itself, only `tl`, the Timeline instance passed in.

// Mostly letters/digits plus a few technical symbols — the same restrained
// charset the landing wordmark uses, so this reads as "the system
// resolving a value" rather than generic matrix-rain noise.
export const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+-/<>='.split('')

interface ScrambleOptions {
  duration: number
  /** Absolute timeline position (seconds) or a GSAP position string. Defaults to appending sequentially. */
  position?: gsap.Position
  /** How often (ms) the scrambled text re-randomizes while resolving. */
  bucketMs?: number
}

/**
 * Adds a tween to `tl` that scrambles `el`'s text through random characters
 * before settling on `finalText`. Keeps `finalText`'s length throughout —
 * a monospace cell's column width never shifts mid-animation — so this
 * reads as "the real value resolving out of noise," not a length-morph.
 */
export function addScrambleTween(
  tl: gsap.core.Timeline,
  el: HTMLElement | null | undefined,
  finalText: string,
  opts: ScrambleOptions,
): void {
  if (!el) return
  const len = finalText.length
  const bucketMs = opts.bucketMs ?? 35
  const proxy = { t: 0 }
  let lastBucket = -1

  tl.to(
    proxy,
    {
      t: 1,
      duration: opts.duration,
      ease: 'none',
      onUpdate: () => {
        const elapsedMs = proxy.t * opts.duration * 1000
        const bucket = Math.floor(elapsedMs / bucketMs)
        if (bucket === lastBucket) return
        lastBucket = bucket
        if (proxy.t >= 1) {
          el.textContent = finalText
          return
        }
        let s = ''
        for (let i = 0; i < len; i++) s += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
        el.textContent = s
      },
      onComplete: () => {
        el.textContent = finalText
      },
    },
    opts.position,
  )
}
