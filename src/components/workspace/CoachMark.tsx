import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'

/** Fixed width so the box's placement can be solved without a second measure pass. */
const BOX_WIDTH = 236
/** Gap between the target's bottom edge and the top of the pointer. */
const GAP = 8
/** Keep the box this far from the viewport edges when clamped. */
const MARGIN = 8
/** Upper bound on the mark's own height, used to decide whether it fits below the target. */
const BOX_MAX_HEIGHT = 64

interface CoachMarkProps {
  /** CSS selector for the element being pointed at. Re-measured on resize; if it isn't on the page, nothing renders. */
  targetSelector: string
  label: string
  /** Called when the user presses Escape. */
  onDismiss: () => void
}

interface Placement {
  left: number
  top: number
  /** Distance from the box's left edge to the arrow, so it keeps aiming at the target even when the box is clamped against a viewport edge. */
  arrowOffset: number
  /** True when the mark sits above the target (pointing down) because there wasn't room below. */
  flipped: boolean
}

function measure(targetSelector: string): Placement | null {
  const target = document.querySelector(targetSelector)
  if (!target) return null
  const rect = target.getBoundingClientRect()
  // An element that has been unmounted or hidden reports a zero-area rect —
  // pointing at it would put the mark in the top-left corner.
  if (rect.width === 0 && rect.height === 0) return null

  // The mark is position:fixed, so if the target has been scrolled out of
  // view there is nothing on screen to point at — showing it anyway would
  // strand a floating callout next to unrelated content.
  const offscreen =
    rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth
  if (offscreen) return null

  const center = rect.left + rect.width / 2
  const maxLeft = window.innerWidth - BOX_WIDTH - MARGIN
  const left = Math.min(Math.max(center - BOX_WIDTH / 2, MARGIN), Math.max(maxLeft, MARGIN))

  const flipped = rect.bottom + GAP + BOX_MAX_HEIGHT > window.innerHeight
  return {
    left,
    top: flipped ? Math.max(rect.top - GAP - BOX_MAX_HEIGHT, MARGIN) : rect.bottom + GAP,
    arrowOffset: Math.min(Math.max(center - left, 12), BOX_WIDTH - 12),
    flipped,
  }
}

/**
 * A one-shot pointer at a real element on the page. It measures the target
 * rather than hardcoding coordinates, so it keeps aiming correctly as the
 * layout reflows, and it stays `pointer-events-none` throughout — the thing
 * being pointed at must remain clickable, which is the whole point.
 */
export function CoachMark({ targetSelector, label, onDismiss }: CoachMarkProps) {
  const [placement, setPlacement] = useState<Placement | null>(() => null)
  const boxRef = useRef<HTMLDivElement>(null)

  // Measure after paint (the panel grid must have laid out first), then keep
  // it aligned for as long as the mark is up.
  useLayoutEffect(() => {
    const update = () => setPlacement(measure(targetSelector))
    update()
    const raf = requestAnimationFrame(update)
    window.addEventListener('resize', update)
    // Capture phase: the panels scroll internally, so the scroll events that
    // move the target never reach window during the bubble phase.
    window.addEventListener('scroll', update, { capture: true, passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, { capture: true })
    }
  }, [targetSelector])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  useEffect(() => {
    if (!placement || !boxRef.current) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.set(boxRef.current, { opacity: 1, y: 0 })
        return
      }
      gsap.fromTo(
        boxRef.current,
        { opacity: 0, y: -6 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', delay: 0.35 },
      )
      // A slow bob keeps it readable as a hint rather than an alert.
      gsap.to(boxRef.current, {
        y: 4,
        duration: 1.1,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 0.75,
      })
    })
    return () => ctx.revert()
  }, [placement])

  if (!placement) return null

  return (
    <div
      ref={boxRef}
      data-testid="coach-mark"
      aria-hidden="true"
      className="pointer-events-none fixed z-50 opacity-0"
      style={{ left: placement.left, top: placement.top, width: BOX_WIDTH }}
    >
      {!placement.flipped && (
        <div className="text-[11px] leading-none text-accent">
          <span data-testid="coach-arrow" className="inline-block" style={{ marginLeft: placement.arrowOffset - 4 }}>
            ▲
          </span>
        </div>
      )}
      <div className="my-1 border border-accent bg-panel-2 px-2.5 py-1.5 text-[11px] text-accent shadow-[0_0_18px_rgb(255_176_32_/_18%)]">
        {label}
      </div>
      {placement.flipped && (
        <div className="text-[11px] leading-none text-accent">
          <span data-testid="coach-arrow" className="inline-block" style={{ marginLeft: placement.arrowOffset - 4 }}>
            ▼
          </span>
        </div>
      )}
    </div>
  )
}
