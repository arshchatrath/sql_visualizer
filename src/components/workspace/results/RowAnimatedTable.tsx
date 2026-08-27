import { Fragment, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { formatCellValue, computeColumnWidths, borderLine } from '../../../lib/ascii/tableLayout'
import { addScrambleTween } from '../../../lib/animation/scramble'
import { loadSfx } from '../../../lib/sound/loadSfx'
import { traceRevealDurationMs, RESULTS_FOLLOW_DELAY_MS } from '../../../lib/trace/timing'

export type RowKind = 'select' | 'insert' | 'update' | 'delete'

export interface DisplayRow {
  key: string | number
  before: unknown[] | null
  after: unknown[] | null
  /** False for a row shown only to give the change context — it renders, but performs no effect. */
  affected: boolean
}

interface RowAnimatedTableProps {
  kind: RowKind
  columns: string[]
  rows: DisplayRow[]
  /** Trace stage count for the execution these rows belong to — used only to time this animation's start against the trace panel's own staged reveal (see ResultsPanel), so the row choreography doesn't finish before its container has even faded in. */
  traceStageCount: number
}

/*
 * Pacing, in seconds, kept together so the whole sequence can be tuned as one
 * thing rather than by hunting numbers through the choreography below.
 *
 * These are deliberately unhurried: the point of the kill / upgrade / spawn
 * effects is to be *watched*, and at the previous tempo each row was over
 * before the eye could land on it.
 */
const T = {
  /** Push-in on the table as its rows arrive. */
  zoom: 0.85,
  /** Longest the per-row cascade may span in total, however many rows there are. */
  cascadeWindow: 1.9,
  /** Upper bound on the gap between consecutive rows. */
  rowStaggerMax: 0.17,
  /** How often the scramble re-randomizes — slower than a blur, so it reads as resolving. */
  scrambleBucketMs: 48,
  select: { fade: 0.34 },
  insert: { rise: 0.62, flash: 0.09, scramble: 0.55, scrambleAt: 0.14, fadeOut: 0.72, fadeOutAt: 0.85 },
  update: { glowIn: 0.26, scramble: 0.52, scrambleAt: 0.16, glowOut: 0.75, glowOutAt: 0.8 },
  delete: { flash: 0.14, shake: 0.3, strike: 0.24, strikeAt: 0.1, collapse: 0.5, collapseAt: 0.5 },
} as const

function computeWidths(columns: string[], rows: DisplayRow[]): number[] {
  const candidateRows: string[][] = []
  rows.forEach((r) => {
    if (r.before) candidateRows.push(r.before.map(formatCellValue))
    if (r.after) candidateRows.push(r.after.map(formatCellValue))
  })
  return computeColumnWidths(columns, candidateRows)
}

/**
 * Renders one execution's affected rows as a box-drawing table built from
 * real DOM per row/cell (not one preformatted string) so each row can be
 * animated independently — spawning in for an INSERT, a scramble-resolve
 * per changed cell for an UPDATE, a hit-and-collapse for a DELETE, and a
 * plain staggered reveal for a SELECT. Remounted fresh per execution (see
 * ResultsTable's `key={executionId}`), so this component's own effect only
 * ever needs to run its intro sequence once.
 */
export function RowAnimatedTable({ kind, columns, rows, traceStageCount }: RowAnimatedTableProps) {
  const tableRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Array<HTMLDivElement | null>>([])
  const cellRefs = useRef<Array<Array<HTMLSpanElement | null>>>([])
  const strikeRefs = useRef<Array<HTMLDivElement | null>>([])

  const widths = computeWidths(columns, rows)
  // SELECT and INSERT paint their rows in from nothing; UPDATE and DELETE act
  // on a table that is already on screen, so its rows must not flash.
  const entering = kind === 'select' || kind === 'insert'

  useEffect(() => {
    if (rows.length === 0) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Cap the cascade's total span: a deliberate 0.17s between rows reads
    // beautifully on a handful of rows, but on a large result set it would
    // turn into a minute-long crawl, so the gap tightens as rows grow.
    // Time the cascade off the rows that actually animate. On an UPDATE or
    // DELETE the context rows are already sitting there untouched, so pacing
    // against the full table would leave a long dead pause before anything
    // happened whenever the hit rows sat near the bottom.
    const animatingCount = entering ? rows.length : rows.filter((r) => r.affected).length
    const rowStagger = reducedMotion
      ? 0
      : Math.min(T.rowStaggerMax, T.cascadeWindow / Math.max(animatingCount, 1))
    const d = (full: number) => (reducedMotion ? 0.01 : full)
    // Same pacing ResultsPanel uses to fade its container in — without
    // this, the row choreography (a few hundred ms) starts the instant
    // this component mounts and can finish before the still-fading-in
    // container ever reaches visible opacity.
    const startDelay = reducedMotion ? 0 : (traceRevealDurationMs(traceStageCount) + RESULTS_FOLLOW_DELAY_MS) / 1000

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: startDelay })

      // A slow push-in as the rows land, anchored top-left so the table grows
      // into place instead of drifting away from the panel's corner.
      if (!reducedMotion && tableRef.current) {
        tl.fromTo(
          tableRef.current,
          { scale: 0.94, opacity: 0.55, transformOrigin: 'top left' },
          { scale: 1, opacity: 1, duration: T.zoom, ease: 'power2.out', transformOrigin: 'top left' },
          0,
        )
      }

      // Counts only the rows performing an effect, so an UPDATE that hits
      // rows 8 and 9 starts as promptly as one that hits rows 1 and 2.
      let effectOrdinal = 0

      rows.forEach((row, i) => {
        const rowEl = rowRefs.current[i]
        if (!rowEl) return
        // An untouched row in a table that's already on screen has nothing to
        // do — it stays exactly where it is while the change plays out.
        if (!row.affected && !entering) return
        const startAt = (entering ? i : effectOrdinal) * rowStagger
        if (row.affected) effectOrdinal += 1
        const cellsForRow = cellRefs.current[i] ?? []
        // Padded to the column width, exactly as the cell was first rendered.
        // The scramble tween ends by writing this string straight into the
        // cell, so an unpadded value here would silently shrink the cell the
        // moment it resolved — dragging everything to its right out of line
        // with the borders, which are sized from these same widths.
        const afterTexts = columns.map((_, j) => formatCellValue(row.after?.[j]).padEnd(widths[j]))
        // Context rows take the plain reveal, never the mutation's effect —
        // nothing was done to them, so nothing should appear to happen.
        const rowKind = row.affected ? kind : 'select'

        if (rowKind === 'delete') {
          tl.call(() => void loadSfx().then((sfx) => sfx.playKill()), undefined, startAt)
          tl.to(rowEl, { backgroundColor: 'rgb(255 90 90 / 30%)', duration: d(T.delete.flash) }, startAt)
          if (!reducedMotion) {
            tl.to(
              rowEl,
              { keyframes: { x: [0, 6, -6, 4, -3, 0] }, duration: T.delete.shake, ease: 'steps(5)' },
              startAt,
            )
          }
          const strikeEl = strikeRefs.current[i]
          if (strikeEl) {
            tl.to(
              strikeEl,
              { scaleX: 1, duration: d(T.delete.strike), ease: 'power2.out' },
              startAt + (reducedMotion ? 0 : T.delete.strikeAt),
            )
          }
          tl.to(
            rowEl,
            {
              scaleY: 0,
              opacity: 0,
              y: 6,
              duration: d(T.delete.collapse),
              ease: 'power3.in',
              transformOrigin: 'top center',
              // A killed row shouldn't just sit there invisible — once it's
              // fully collapsed, take it out of layout/text-flow entirely
              // so it's really gone, not merely painted transparent.
              onComplete: () => {
                rowEl.style.display = 'none'
              },
            },
            startAt + (reducedMotion ? 0 : T.delete.collapseAt),
          )
        } else if (rowKind === 'insert') {
          tl.set(rowEl, { scaleY: 0, opacity: 0, transformOrigin: 'top center' }, startAt)
          tl.call(() => void loadSfx().then((sfx) => sfx.playSpawn()), undefined, startAt)
          tl.to(
            rowEl,
            { scaleY: 1, opacity: 1, duration: d(T.insert.rise), ease: reducedMotion ? 'none' : 'back.out(1.8)' },
            startAt,
          )
          tl.to(rowEl, { backgroundColor: 'rgb(87 230 199 / 22%)', duration: d(T.insert.flash) }, startAt)
          columns.forEach((_, j) => {
            addScrambleTween(tl, cellsForRow[j], afterTexts[j], {
              duration: d(T.insert.scramble),
              position: startAt + (reducedMotion ? 0 : T.insert.scrambleAt),
              bucketMs: T.scrambleBucketMs,
            })
          })
          tl.to(
            rowEl,
            { backgroundColor: 'rgb(87 230 199 / 0%)', duration: d(T.insert.fadeOut) },
            startAt + (reducedMotion ? 0 : T.insert.fadeOutAt),
          )
        } else if (rowKind === 'update') {
          const changed = columns.map((_, j) => row.before?.[j] !== row.after?.[j])
          if (changed.some(Boolean)) {
            tl.call(() => void loadSfx().then((sfx) => sfx.playUpgrade()), undefined, startAt)
          }
          tl.to(
            rowEl,
            { boxShadow: '0 0 0 1px rgb(255 176 32 / 55%), 0 0 16px rgb(255 176 32 / 30%)', duration: d(T.update.glowIn) },
            startAt,
          )
          columns.forEach((_, j) => {
            if (changed[j]) {
              addScrambleTween(tl, cellsForRow[j], afterTexts[j], {
                duration: d(T.update.scramble),
                position: startAt + (reducedMotion ? 0 : T.update.scrambleAt),
                bucketMs: T.scrambleBucketMs,
              })
            }
          })
          tl.to(
            rowEl,
            { boxShadow: '0 0 0 0 rgb(255 176 32 / 0%)', duration: d(T.update.glowOut) },
            startAt + (reducedMotion ? 0 : T.update.glowOutAt),
          )
        } else {
          tl.fromTo(
            rowEl,
            { opacity: 0, y: 4 },
            { opacity: 1, y: 0, duration: d(T.select.fade), ease: 'power1.out' },
            startAt,
          )
        }
      })

      if (kind === 'select') {
        tl.call(() => void loadSfx().then((sfx) => sfx.playBlip()), undefined, 0)
      }
    })

    return () => ctx.revert()
    // Deliberately empty deps: this component is remounted fresh per
    // execution (keyed by executionId in ResultsTable), so this effect
    // only ever needs to run its one intro sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (columns.length === 0) return null

  const headerCells = columns.map((c, j) => c.padEnd(widths[j])).join(' │ ')

  return (
    <div ref={tableRef} className="overflow-auto text-[11px] leading-relaxed text-accent2" data-testid="results-table">
      <div className="whitespace-pre">{borderLine(widths, '┌', '┬', '┐')}</div>
      <div className="whitespace-pre">{`│ ${headerCells} │`}</div>
      <div className="whitespace-pre">{borderLine(widths, '├', '┼', '┤')}</div>
      {rows.map((row, i) => {
        const source = kind === 'update' || kind === 'delete' ? row.before : row.after
        return (
          <div
            key={row.key}
            ref={(el) => {
              rowRefs.current[i] = el
            }}
            className={`relative whitespace-pre ${entering ? 'opacity-0' : ''}`}
          >
            {'│ '}
            {columns.map((_, j) => (
              <Fragment key={j}>
                {j > 0 && ' │ '}
                <span
                  ref={(el) => {
                    if (!cellRefs.current[i]) cellRefs.current[i] = []
                    cellRefs.current[i][j] = el
                  }}
                >
                  {formatCellValue(source?.[j]).padEnd(widths[j])}
                </span>
              </Fragment>
            ))}
            {' │'}
            {/* Only a row actually being killed gets a strike-through. */}
            {kind === 'delete' && row.affected && (
              <div
                ref={(el) => {
                  strikeRefs.current[i] = el
                }}
                aria-hidden="true"
                className="absolute inset-x-0 top-1/2 h-px origin-left scale-x-0 bg-accent"
              />
            )}
          </div>
        )
      })}
      <div className="whitespace-pre">{borderLine(widths, '└', '┴', '┘')}</div>
    </div>
  )
}
