import { useDbStore } from '../../../../state/store'

export function LimitBlock() {
  const limit = useDbStore((s) => s.builder.limit)
  const setLimit = useDbStore((s) => s.setLimit)

  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span className="tracking-wide text-accent">LIMIT</span>
      <input
        type="number"
        min={1}
        value={limit ?? ''}
        onChange={(e) => setLimit(e.target.value === '' ? null : Number(e.target.value))}
        placeholder="none"
        data-focusable
        className="w-20 border border-border bg-panel-2 px-1.5 py-1 text-xs text-text placeholder:text-muted/60"
      />
    </label>
  )
}
