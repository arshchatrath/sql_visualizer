import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'

interface TransitionOverlayProps {
  /** Increment this to play a new wipe. 0 = never played (stays hidden). */
  playToken: number
  /** Fired the instant the overlay reaches full coverage — swap content here. */
  onMidpoint: () => void
  /** Fired once the overlay has fully cleared again. */
  onComplete: () => void
}

const TARGET_CELL_PX = 64
const MIN_COLS = 8
const MAX_COLS = 40
const MIN_ROWS = 6
const MAX_ROWS = 24

function computeGrid() {
  const cols = Math.min(MAX_COLS, Math.max(MIN_COLS, Math.round(window.innerWidth / TARGET_CELL_PX)))
  const rows = Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.round(window.innerHeight / TARGET_CELL_PX)))
  return { cols, rows }
}

// A sparse, deterministic scatter of the cyan accent among the amber cells —
// two different-period patterns OR'd together so it reads as scattered
// rather than a mechanically regular diagonal (a single modulo would tile
// visibly). Deterministic (not Math.random()) so the grid doesn't reshuffle
// on every re-render.
function computeCellIsCyan(cols: number, rows: number) {
  const flags: boolean[] = []
  for (let i = 0; i < cols * rows; i++) {
    const row = Math.floor(i / cols)
    const col = i % cols
    flags.push((row * 7 + col * 13) % 23 === 0 || (row * 3 + col * 19) % 41 === 0)
  }
  return flags
}

/**
 * Full-screen cinematic wipe that swaps the landing screen for the
 * workspace: a glitch-snap bookends a mosaic of cells that assembles itself
 * from the center outward in 3D (perspective + rotateX, not a flat scale),
 * a bright flash sells the cut to the workspace underneath, a short status
 * beat holds, then the mosaic irises back open from the center to reveal
 * it. Orchestrated entirely with one GSAP timeline so the whole sequence's
 * pacing lives in one place.
 */
export function TransitionOverlay({ playToken, onMidpoint, onComplete }: TransitionOverlayProps) {
  const [{ cols, rows }] = useState(computeGrid)
  const cellIsCyan = useMemo(() => computeCellIsCyan(cols, rows), [cols, rows])
  const cellRefs = useRef<Array<HTMLDivElement | null>>([])
  const holdTextRef = useRef<HTMLSpanElement>(null)
  const shakeRef = useRef<HTMLDivElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const noiseRef = useRef<HTMLDivElement>(null)
  const sliceARef = useRef<HTMLDivElement>(null)
  const sliceBRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (playToken === 0) return // don't play on initial mount
    const cells = cellRefs.current
    if (cells.length === 0) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sweepDuration = reducedMotion ? 0.01 : 0.46
    const sweepStagger = reducedMotion ? 0 : 0.3
    const holdDuration = reducedMotion ? 0 : 0.32
    const textFade = reducedMotion ? 0.01 : 0.15
    const glitchDuration = reducedMotion ? 0.01 : 0.16
    const flashInDuration = reducedMotion ? 0.01 : 0.08
    const flashOutDuration = reducedMotion ? 0.01 : 0.24

    // A quick RGB-slice screen-tear: a couple of horizontal bars jump
    // sideways, a noise band flickers, the whole overlay jitters — all as
    // one simultaneous burst (each tween anchored to the previous one's
    // start via "<") so it reads as a single glitch, not a sequence.
    const glitchBurst = (tl: gsap.core.Timeline) => {
      tl.to(shakeRef.current, { keyframes: { x: [0, 6, -5, 3, -2, 0] }, duration: glitchDuration, ease: 'steps(5)' })
      tl.to(
        sliceARef.current,
        { keyframes: { x: [0, 34, -16, 6, 0], opacity: [0, 1, 1, 1, 0] }, duration: glitchDuration, ease: 'steps(4)' },
        '<',
      )
      tl.to(
        sliceBRef.current,
        { keyframes: { x: [0, -26, 20, -4, 0], opacity: [0, 1, 1, 1, 0] }, duration: glitchDuration, ease: 'steps(4)' },
        '<',
      )
      tl.to(noiseRef.current, { keyframes: { opacity: [0, 0.6, 0.15, 0.5, 0] }, duration: glitchDuration, ease: 'steps(4)' }, '<')
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete })

      glitchBurst(tl)

      tl.set(cells, { scale: 0, rotateX: -55 })
      tl.to(cells, {
        scale: 1,
        rotateX: 0,
        duration: sweepDuration,
        ease: 'power2.out',
        stagger: { grid: [rows, cols], from: 'center', amount: sweepStagger },
      })
      // Flash overlaps the tail of the assemble sweep so the cut to full
      // coverage lands on the brightest frame, then settles before the
      // status line reads.
      tl.to(flashRef.current, { opacity: 1, duration: flashInDuration }, `-=${Math.min(sweepDuration * 0.2, sweepDuration)}`)
      tl.call(onMidpoint)
      tl.to(flashRef.current, { opacity: 0, duration: flashOutDuration })
      tl.to(holdTextRef.current, { opacity: 1, duration: textFade }, reducedMotion ? undefined : '-=0.05')
      tl.to({}, { duration: holdDuration })
      tl.to(holdTextRef.current, { opacity: 0, duration: textFade })
      tl.to(cells, {
        scale: 0,
        rotateX: 50,
        duration: sweepDuration,
        ease: 'power2.in',
        stagger: { grid: [rows, cols], from: 'center', amount: sweepStagger },
      })

      glitchBurst(tl)
    })

    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playToken])

  return (
    <div ref={shakeRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-50">
      {/* A plain sibling of the grid, not a grid item within it — a
          spanning item that reserves the entire grid (row 1/-1 AND
          column 1/-1 at once) leaves auto-placement no free cells, and
          every cell div gets pushed into collapsed implicit rows. */}
      <div
        className="grid h-full w-full"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          perspective: '1400px',
        }}
      >
        {Array.from({ length: cols * rows }, (_, i) => (
          <div
            key={i}
            ref={(el) => {
              cellRefs.current[i] = el
            }}
            className={
              cellIsCyan[i]
                ? 'scale-0 border border-accent2/25 bg-accent2'
                : 'scale-0 border border-accent-dim/20 bg-accent'
            }
          />
        ))}
      </div>

      <span
        ref={holdTextRef}
        className="absolute inset-0 flex items-center justify-center gap-1.5 font-body text-xs tracking-[3px] text-bg opacity-0"
      >
        ▸ opening workspace
        <span className="animate-blink inline-block h-[1em] w-[0.5em] bg-bg align-middle" />
      </span>

      {/* A bright directional flash that sells the cut to full coverage —
          the moment the landing screen is swapped for the workspace
          underneath, masked entirely by this pulse rather than a bare cut. */}
      <div
        ref={flashRef}
        className="absolute inset-0 opacity-0"
        style={{
          background: 'radial-gradient(circle at center, rgb(255 176 32 / 95%) 0%, rgb(255 176 32 / 40%) 35%, transparent 70%)',
        }}
      />

      {/* Glitch bookends: a couple of RGB-tinted slice bars that jump
          sideways plus a flickering noise band, all driven by glitchBurst()
          above. Kept as their own layer, on top of everything, so the tear
          reads as a screen-level artifact rather than something happening
          "in" the cell mosaic. */}
      <div
        ref={noiseRef}
        className="absolute inset-0 opacity-0 mix-blend-overlay"
        style={{
          background:
            'repeating-linear-gradient(90deg, rgb(255 176 32 / 18%) 0px, rgb(255 176 32 / 18%) 2px, transparent 2px, transparent 6px)',
        }}
      />
      <div ref={sliceARef} className="absolute inset-x-0 h-[3px] bg-accent2 opacity-0" style={{ top: '32%' }} />
      <div ref={sliceBRef} className="absolute inset-x-0 h-[3px] bg-accent opacity-0" style={{ top: '61%' }} />
    </div>
  )
}
