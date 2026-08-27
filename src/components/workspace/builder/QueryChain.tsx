import { useDbStore } from '../../../state/store'

/** The current clause chain, chip by chip — derived from generateQuery(), never hardcoded. */
export function QueryChain() {
  const chain = useDbStore((s) => s.activeChain)

  if (chain.length === 0) {
    return <p className="text-xs text-muted">pick a table to start composing a query</p>
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="query-chain">
      {chain.map((step, i) => (
        <span key={`${step}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-border">→</span>}
          <span className="border border-border px-2 py-0.5 text-[11px] tracking-wide text-accent2">{step}</span>
        </span>
      ))}
    </div>
  )
}
