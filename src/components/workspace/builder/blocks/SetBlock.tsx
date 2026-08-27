import { useDbStore } from '../../../../state/store'

export function SetBlock() {
  const builder = useDbStore((s) => s.builder)
  const schema = useDbStore((s) => s.schema)
  const setSetValue = useDbStore((s) => s.setSetValue)

  const table = schema.find((t) => t.name === builder.table)
  if (!table) return null

  // Editing the primary key of an existing row makes for a confusing demo
  // (SQLite would happily do it, but it stops rowQuery/history from
  // referring to "the same row" in an obvious way) — leave it out of SET.
  const editableColumns = table.columns.filter((c) => !c.primaryKey)

  return (
    <div className="space-y-2">
      <span className="text-xs tracking-wide text-accent">SET</span>
      <div className="grid grid-cols-2 gap-2">
        {editableColumns.map((col) => (
          <label key={col.name} className="flex flex-col gap-1 text-xs text-muted">
            <span>
              {col.name} <span className="text-muted/60">{col.type.toLowerCase()}</span>
            </span>
            <input
              value={builder.setValues[col.name] ?? ''}
              onChange={(e) => setSetValue(col.name, e.target.value)}
              placeholder="unchanged"
              data-focusable
              className="border border-border bg-panel-2 px-1.5 py-1 text-xs text-text placeholder:text-muted/60"
            />
          </label>
        ))}
      </div>
    </div>
  )
}
