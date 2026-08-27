import { useDbStore } from '../../../../state/store'

export function InsertValuesBlock() {
  const builder = useDbStore((s) => s.builder)
  const schema = useDbStore((s) => s.schema)
  const setInsertValue = useDbStore((s) => s.setInsertValue)

  const table = schema.find((t) => t.name === builder.table)
  if (!table) return null

  return (
    <div className="space-y-2">
      <span className="text-xs tracking-wide text-accent">VALUES</span>
      <div className="grid grid-cols-2 gap-2">
        {table.columns.map((col) => (
          <label key={col.name} className="flex flex-col gap-1 text-xs text-muted">
            <span>
              {col.name} <span className="text-muted/60">{col.type.toLowerCase()}</span>
              {col.primaryKey && <span className="text-accent2"> (auto if blank)</span>}
            </span>
            <input
              value={builder.insertValues[col.name] ?? ''}
              onChange={(e) => setInsertValue(col.name, e.target.value)}
              placeholder={col.primaryKey ? 'auto' : col.type.toLowerCase()}
              data-focusable
              className="border border-border bg-panel-2 px-1.5 py-1 text-xs text-text placeholder:text-muted/60"
            />
          </label>
        ))}
      </div>
    </div>
  )
}
