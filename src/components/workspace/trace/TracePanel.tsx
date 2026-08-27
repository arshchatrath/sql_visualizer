import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useDbStore } from '../../../state/store'
import { TRACE_BASE_DELAY_MS, TRACE_STAGGER_MS } from '../../../lib/trace/timing'
import { AsciiSpinner } from './AsciiSpinner'

/**
 * Renders whatever EXPLAIN QUERY PLAN actually returned for the last
 * statement, revealed stage by stage with a small GSAP-sequenced beat —
 * the timing is a cosmetic playback pace, not a claim about how long any
 * individual stage took; the elapsed time shown at the end is always the
 * real performance.now() measurement.
 *
 * When SQLite has no plan to give (a bare INSERT ... VALUES, CREATE
 * TABLE, ...) the list is empty and the trace stays short — no fabricated
 * stage is ever inserted here.
 */
export function TracePanel() {
  const trace = useDbStore((s) => s.lastTrace)
  const outcome = useDbStore((s) => s.lastOutcome)
  const lastSql = useDbStore((s) => s.lastSql)
  const executionId = useDbStore((s) => s.lastExecutionId)

  const [revealedCount, setRevealedCount] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const playedFor = useRef<number>(-1)

  useEffect(() => {
    if (executionId === 0 || playedFor.current === executionId) return
    playedFor.current = executionId

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setRevealedCount(0)
    setShowSummary(false)

    if (reducedMotion) {
      setRevealedCount(trace.length)
      setShowSummary(true)
      return
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline()
      tl.to({}, { duration: TRACE_BASE_DELAY_MS / 1000 })
      trace.forEach((_, i) => {
        tl.call(() => setRevealedCount(i + 1))
        tl.to({}, { duration: TRACE_STAGGER_MS / 1000 })
      })
      tl.call(() => setShowSummary(true))
    })
    return () => ctx.revert()
  }, [executionId, trace])

  if (!outcome || !lastSql) {
    return <p className="text-xs text-muted">no query executed yet</p>
  }

  return (
    <div className="space-y-1 font-body text-xs leading-relaxed" data-testid="trace-panel">
      <div className="mb-2 text-muted">$ {lastSql.trim().split('\n')[0]}</div>

      {outcome.error ? (
        <div className="text-accent">error: {outcome.error}</div>
      ) : trace.length === 0 ? (
        <div className="text-muted">(no query plan for this statement — executed directly)</div>
      ) : (
        trace.slice(0, revealedCount).map((stage, i) => (
          <div key={stage.id} className="text-text">
            &gt; {stage.detail}
            {!showSummary && i === revealedCount - 1 && <AsciiSpinner />}
          </div>
        ))
      )}

      {!outcome.error && showSummary && (
        <div className="mt-3 text-accent2" data-testid="trace-summary">
          {outcome.kind === 'rows' &&
            `-- ${outcome.result?.rows.length ?? 0} row(s) in ${outcome.elapsedMs.toFixed(2)}ms`}
          {outcome.kind === 'rows-modified' &&
            `-- ${outcome.rowsModified} row(s) affected in ${outcome.elapsedMs.toFixed(2)}ms`}
          {outcome.kind === 'none' && `-- done in ${outcome.elapsedMs.toFixed(2)}ms`}
        </div>
      )}
    </div>
  )
}
