import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { buildWordmarkParts } from '../../lib/ascii/wordmark'
import { BOOT_LINES } from '../../lib/landing/bootLines'

// three.js is a genuinely heavy dependency (~500KB) for what's a decorative
// background — split it into its own chunk so it loads in parallel with
// the rest of the app instead of blocking the initial bundle parse. No
// Suspense fallback needed: the scene is a background layer, so simply
// not being there yet for the first frame or two is invisible.
const DataGridScene = lazy(() => import('./DataGridScene').then((m) => ({ default: m.DataGridScene })))

interface LandingProps {
  onStart: () => void
}

const WORD = 'DATAPULSE'
const { top: TOP_LINE, bottom: BOTTOM_LINE, middleChars: MIDDLE_CHARS } = buildWordmarkParts(WORD)
const LETTER_INDICES = MIDDLE_CHARS.map((c, i) => (c.isLetter ? i : -1)).filter((i) => i >= 0)

// Restrained scramble charset for the wordmark's "resolve" beat — mostly
// letters plus a few technical symbols, never full-width/katakana noise.
// Keeps the effect reading as "compiling", not a generic matrix rain.
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+-/<>='.split('')

const BOOT_CHAR_SECONDS = 0.016
const BOOT_LINE_PAUSE = 0.1
const SCRAMBLE_DURATION = 0.9
const SCRAMBLE_STAGGER_MS = 500
const SCRAMBLE_SETTLE_MS = 260
const SCRAMBLE_BUCKET_MS = 40

export function Landing({ onStart }: LandingProps) {
  const startRef = useRef<HTMLButtonElement>(null)
  const taglineRef = useRef<HTMLParagraphElement>(null)
  const topRef = useRef<HTMLSpanElement>(null)
  const bottomRef = useRef<HTMLSpanElement>(null)
  const leftBorderRef = useRef<HTMLSpanElement>(null)
  const rightBorderRef = useRef<HTMLSpanElement>(null)
  const letterRefs = useRef<Array<HTMLSpanElement | null>>([])
  const lineTextRefs = useRef<Array<HTMLSpanElement | null>>([])
  const lineOkRefs = useRef<Array<HTMLSpanElement | null>>([])
  const cursorRefs = useRef<Array<HTMLSpanElement | null>>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => setReady(true) })

      // --- boot lines: type out character by character, one at a time ---
      BOOT_LINES.forEach((line, i) => {
        const textEl = lineTextRefs.current[i]
        const cursorEl = cursorRefs.current[i]
        const okEl = lineOkRefs.current[i]
        const proxy = { n: 0 }

        // Toggled via classList (not a GSAP opacity tween) so the CSS
        // animate-blink keyframe — which owns opacity while active — never
        // fights an inline style for the same property.
        tl.call(() => {
          cursorEl?.classList.remove('opacity-0')
          cursorEl?.classList.add('animate-blink')
        })
        tl.to(proxy, {
          n: line.text.length,
          duration: reducedMotion ? 0.01 : Math.max(0.25, line.text.length * BOOT_CHAR_SECONDS),
          ease: 'none',
          onUpdate: () => {
            if (textEl) textEl.textContent = line.text.slice(0, Math.round(proxy.n))
          },
        })
        if (okEl) {
          tl.to(okEl, { opacity: 1, duration: reducedMotion ? 0.01 : 0.15 })
        }
        tl.call(() => {
          cursorEl?.classList.remove('animate-blink')
          cursorEl?.classList.add('opacity-0')
        })
        tl.to({}, { duration: reducedMotion ? 0 : BOOT_LINE_PAUSE })
      })

      // --- wordmark box draws itself: top sweeps in, sides drop, bottom sweeps in ---
      const topProxy = { n: 0 }
      tl.to(topProxy, {
        n: TOP_LINE.length,
        duration: reducedMotion ? 0.01 : 0.4,
        ease: 'power1.out',
        onUpdate: () => {
          if (topRef.current) topRef.current.textContent = TOP_LINE.slice(0, Math.round(topProxy.n))
        },
      })

      tl.fromTo(
        [leftBorderRef.current, rightBorderRef.current],
        { opacity: 0, y: -6 },
        {
          opacity: 1,
          y: 0,
          duration: reducedMotion ? 0.01 : 0.22,
          stagger: reducedMotion ? 0 : 0.09,
          ease: 'power2.out',
        },
      )

      const bottomProxy = { n: 0 }
      tl.to(
        bottomProxy,
        {
          n: BOTTOM_LINE.length,
          duration: reducedMotion ? 0.01 : 0.4,
          ease: 'power1.out',
          onUpdate: () => {
            if (bottomRef.current) bottomRef.current.textContent = BOTTOM_LINE.slice(0, Math.round(bottomProxy.n))
          },
        },
        reducedMotion ? undefined : '-=0.1',
      )

      // letters resolve last — a brief, staggered scramble-to-settle
      const scrambleProxy = { t: 0 }
      const lastBucket: Record<number, number> = {}
      tl.to(scrambleProxy, {
        t: 1,
        duration: reducedMotion ? 0.01 : SCRAMBLE_DURATION,
        ease: 'none',
        onUpdate: () => {
          const elapsedMs = scrambleProxy.t * SCRAMBLE_DURATION * 1000
          LETTER_INDICES.forEach((idx, order) => {
            const el = letterRefs.current[idx]
            if (!el) return
            const startMs = (order / LETTER_INDICES.length) * SCRAMBLE_STAGGER_MS
            const settleMs = startMs + SCRAMBLE_SETTLE_MS
            if (elapsedMs < startMs) return
            if (elapsedMs >= settleMs) {
              el.textContent = MIDDLE_CHARS[idx].ch
              return
            }
            const bucket = Math.floor((elapsedMs - startMs) / SCRAMBLE_BUCKET_MS)
            if (lastBucket[idx] !== bucket) {
              lastBucket[idx] = bucket
              el.textContent = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
            }
          })
        },
        onComplete: () => {
          // Safety net: guarantee the correct wordmark even if a reduced
          // duration meant onUpdate never got to walk through every bucket.
          LETTER_INDICES.forEach((idx) => {
            const el = letterRefs.current[idx]
            if (el) el.textContent = MIDDLE_CHARS[idx].ch
          })
        },
      })

      tl.to(taglineRef.current, { opacity: 1, duration: reducedMotion ? 0.01 : 0.3 }, reducedMotion ? undefined : '-=0.15')

      tl.to(startRef.current, { opacity: 1, y: 0, duration: reducedMotion ? 0.01 : 0.4 })
    })

    return () => ctx.revert()
  }, [])

  return (
    <section className="scanlines isolate relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg px-8 text-center">
      {/* Ambient background: a real 3D grid plane drifting slowly toward
          the viewer (rows of data extending into space, literally) plus a
          slow breathing glow, so the screen has genuine depth at rest.
          Both freeze under prefers-reduced-motion — the 3D scene renders
          one static frame instead of animating, and the CSS glow's
          animation is frozen by the global rule in index.css. */}
      <Suspense fallback={null}>
        <DataGridScene />
      </Suspense>
      <div aria-hidden="true" className="landing-glow pointer-events-none -z-10" />

      {/* The boot lines and ASCII wordmark below are decorative flourish —
          box-drawing art reads as noise to a screen reader, so this heading
          gives assistive tech the actual page identity instead. */}
      <h1 className="sr-only">DATAPULSE — a terminal for talking to your data</h1>

      <div aria-hidden="true" className="min-h-[8em] text-left font-body text-[13px] leading-[1.8] text-muted">
        {BOOT_LINES.map((line, i) => (
          <div key={line.text} className="flex items-center gap-1.5">
            <span
              ref={(el) => {
                lineTextRefs.current[i] = el
              }}
            />
            {line.tone === 'ok' && (
              <span
                ref={(el) => {
                  lineOkRefs.current[i] = el
                }}
                className="text-accent2 opacity-0"
              >
                ok
              </span>
            )}
            <span
              ref={(el) => {
                cursorRefs.current[i] = el
              }}
              className="inline-block h-[1em] w-[0.5em] shrink-0 bg-accent2 opacity-0"
            />
          </div>
        ))}
      </div>

      <div aria-hidden="true" className="mt-6 mb-4">
        <div className="font-display text-[clamp(13px,2.6vw,22px)] leading-[1.3] font-bold text-accent">
          <div className="whitespace-pre">
            <span ref={topRef} />
          </div>
          <div className="whitespace-pre">
            <span ref={leftBorderRef} className="opacity-0">
              │
            </span>
            {MIDDLE_CHARS.map((c, i) =>
              c.isLetter ? (
                <span
                  key={i}
                  ref={(el) => {
                    letterRefs.current[i] = el
                  }}
                >
                  {' '}
                </span>
              ) : (
                <span key={i}>{c.ch}</span>
              ),
            )}
            <span ref={rightBorderRef} className="opacity-0">
              │
            </span>
          </div>
          <div className="whitespace-pre">
            <span ref={bottomRef} />
          </div>
        </div>
        <p ref={taglineRef} className="mt-3 text-[13px] tracking-[1px] text-muted opacity-0">
          a terminal for talking to your data
        </p>
      </div>

      <button
        ref={startRef}
        type="button"
        data-focusable
        disabled={!ready}
        onClick={onStart}
        className="mt-8 -translate-y-2 rounded-sm border border-accent-dim px-6 py-3.5 text-sm tracking-[1px] text-accent opacity-0 transition-all duration-150 hover:scale-[1.03] hover:bg-accent hover:text-bg hover:shadow-[0_0_24px_rgb(255_176_32_/_35%)] disabled:pointer-events-none"
      >
        $ ./start
        <span className="animate-blink ml-1.5 inline-block h-[1em] w-2 -translate-y-px bg-accent align-middle" />
      </button>
    </section>
  )
}
