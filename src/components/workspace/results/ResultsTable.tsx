import { useDbStore } from '../../../state/store'
import { RowAnimatedTable, type DisplayRow, type RowKind } from './RowAnimatedTable'

/**
 * Resolves the last execution to a single (kind, columns, rows) shape
 * regardless of whether it was a SELECT (outcome.result) or a TABLE-scope
 * mutation (lastRowChanges) — then hands off to RowAnimatedTable, remounted
 * per execution so its animation always starts clean.
 */
export function ResultsTable() {
  const outcome = useDbStore((s) => s.lastOutcome)
  const rowChanges = useDbStore((s) => s.lastRowChanges)
  const executionId = useDbStore((s) => s.lastExecutionId)
  const traceStageCount = useDbStore((s) => s.lastTrace.length)

  let kind: RowKind | null = null
  let columns: string[] = []
  let rows: DisplayRow[] = []

  if (rowChanges) {
    kind = rowChanges.kind
    columns = rowChanges.columns
    rows = rowChanges.rows.map((r) => ({
      key: r.rowid,
      before: r.before,
      after: r.after,
      affected: r.affected,
    }))
  } else if (outcome && !outcome.error && outcome.kind === 'rows' && outcome.result) {
    kind = 'select'
    columns = outcome.result.columns
    // Every row a SELECT returns is the result itself — none of it is context.
    rows = outcome.result.rows.map((r, i) => ({ key: i, before: null, after: r, affected: true }))
  }

  if (!kind) return null

  return <RowAnimatedTable key={executionId} kind={kind} columns={columns} rows={rows} traceStageCount={traceStageCount} />
}
