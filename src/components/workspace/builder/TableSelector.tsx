import { useDbStore } from '../../../state/store'

export function TableSelector() {
  const schema = useDbStore((s) => s.schema)
  const table = useDbStore((s) => s.builder.table)
  const setTable = useDbStore((s) => s.setTable)

  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span>table</span>
      <select
        value={table ?? ''}
        onChange={(e) => setTable(e.target.value)}
        data-focusable
        data-coach-target="table-select"
        // Until a table is picked nothing else in the builder does anything,
        // so this control carries an accent edge to read as the live one —
        // it settles into the normal border treatment once that's done.
        className={`border bg-panel-2 px-2 py-1.5 text-xs text-text transition-colors ${
          table ? 'border-border' : 'border-accent text-accent'
        }`}
      >
        <option value="" disabled>
          select…
        </option>
        {schema.map((t) => (
          <option key={t.name} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  )
}
