import { useDbStore } from '../../../state/store'
import { RowAnimatedTable } from './RowAnimatedTable'

/**
 * Hands the last execution's rows to RowAnimatedTable — a TABLE-scope
 * mutation's captured before/after rows, or a SELECT's result set —
 * remounted per execution so its animation always starts clean.
 */
export function ResultsTable() {
  const outcome = useDbStore((s) => s.lastOutcome)
  const rowChanges = useDbStore((s) => s.lastRowChanges)
  const executionId = useDbStore((s) => s.lastExecutionId)
  const traceStageCount = useDbStore((s) => s.lastTrace.length)

  if (rowChanges) {
    return <RowAnimatedTable key={executionId} {...rowChanges} traceStageCount={traceStageCount} />
  }

  if (outcome?.result) {
    // Every row a SELECT returns is the result itself — none of it is context.
    // It has no rowid, so its index stands in as the row's key.
    const rows = outcome.result.rows.map((after, i) => ({ rowid: i, before: null, after, affected: true }))
    return (
      <RowAnimatedTable
        key={executionId}
        kind="select"
        columns={outcome.result.columns}
        rows={rows}
        traceStageCount={traceStageCount}
      />
    )
  }

  return null
}
