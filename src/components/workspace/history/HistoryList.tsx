import { useDbStore } from '../../../state/store'

function relativeTime(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}

export function HistoryList() {
  const history = useDbStore((s) => s.history)
  const restore = useDbStore((s) => s.restoreHistoryEntry)

  if (history.length === 0) {
    return <p className="text-xs text-muted">no executions yet — run a query to start building history</p>
  }

  return (
    <ul className="space-y-1" data-testid="history-list">
      {history.map((entry) => (
        <li key={entry.id}>
          <button
            type="button"
            data-focusable
            onClick={() => restore(entry.id)}
            title="restore this query into the builder"
            className="w-full border border-transparent px-2 py-1.5 text-left transition-colors hover:border-border hover:bg-panel-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] tracking-wide text-accent">
                {entry.chain.join(' → ') || entry.sql.split('\n')[0]}
              </span>
              <span className="shrink-0 text-[10px] text-muted">{relativeTime(entry.timestamp)}</span>
            </div>
            <div className="truncate text-[11px] text-muted">{entry.sql.split('\n')[0]}</div>
            <div className={`text-[10px] ${entry.summary === 'error' ? 'text-accent' : 'text-accent2'}`}>
              {entry.summary} · {entry.elapsedMs.toFixed(2)}ms
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
