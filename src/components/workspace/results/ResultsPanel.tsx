import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useDbStore } from '../../../state/store'
import { traceRevealDurationMs, RESULTS_FOLLOW_DELAY_MS } from '../../../lib/trace/timing'
import { ResultsTable } from './ResultsTable'
import { ResultsMeta } from './ResultsMeta'

/** Fades results in right after the trace panel finishes its staged reveal for the same execution. */
export function ResultsPanel() {
  const outcome = useDbStore((s) => s.lastOutcome)
  const trace = useDbStore((s) => s.lastTrace)
  const executionId = useDbStore((s) => s.lastExecutionId)
  const containerRef = useRef<HTMLDivElement>(null)
  const animatedFor = useRef<number>(-1)

  useEffect(() => {
    if (!outcome || executionId === 0 || animatedFor.current === executionId) return
    animatedFor.current = executionId

    const el = containerRef.current
    if (!el) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const delaySeconds = reducedMotion ? 0 : (traceRevealDurationMs(trace.length) + RESULTS_FOLLOW_DELAY_MS) / 1000

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: reducedMotion ? 0.01 : 0.35, delay: delaySeconds, ease: 'power1.out' },
      )
    })
    return () => ctx.revert()
  }, [outcome, executionId, trace.length])

  if (!outcome) {
    return <p className="text-xs text-muted">no results yet — build a query and hit execute</p>
  }

  return (
    <div ref={containerRef} className="space-y-2" data-testid="results-panel">
      <ResultsTable />
      <ResultsMeta />
    </div>
  )
}
