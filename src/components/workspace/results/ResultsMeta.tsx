import { useDbStore } from '../../../state/store'
import { summarizeOutcome } from '../../../lib/db/engine'

export function ResultsMeta() {
  const outcome = useDbStore((s) => s.lastOutcome)
  if (!outcome) return null

  if (outcome.error) {
    return <p className="text-xs text-accent">error: {outcome.error}</p>
  }

  return (
    <p className="text-xs text-muted">
      -- {summarizeOutcome(outcome)} in {outcome.elapsedMs.toFixed(2)}ms
      {outcome.kind === 'rows-modified' && ' — reload the page and this is gone'}
    </p>
  )
}
