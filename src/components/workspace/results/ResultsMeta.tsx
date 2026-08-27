import { useDbStore } from '../../../state/store'

export function ResultsMeta() {
  const outcome = useDbStore((s) => s.lastOutcome)
  if (!outcome) return null

  if (outcome.error) {
    return (
      <p className="text-xs text-accent" data-testid="results-meta">
        error: {outcome.error}
      </p>
    )
  }

  const elapsed = outcome.elapsedMs.toFixed(2)

  if (outcome.kind === 'rows') {
    return (
      <p className="text-xs text-muted" data-testid="results-meta">
        -- {outcome.result?.rows.length ?? 0} row(s) in {elapsed}ms
      </p>
    )
  }

  if (outcome.kind === 'rows-modified') {
    return (
      <p className="text-xs text-muted" data-testid="results-meta">
        -- {outcome.rowsModified} row(s) affected in {elapsed}ms — reload the page and this is gone
      </p>
    )
  }

  return (
    <p className="text-xs text-muted" data-testid="results-meta">
      -- done in {elapsed}ms
    </p>
  )
}
