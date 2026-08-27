import { useDbStore } from '../../../../state/store'
import { availableColumns } from '../../../../lib/query/columns'

export function OrderByBlock() {
  const builder = useDbStore((s) => s.builder)
  const schema = useDbStore((s) => s.schema)
  const addOrderBy = useDbStore((s) => s.addOrderBy)
  const updateOrderBy = useDbStore((s) => s.updateOrderBy)
  const removeOrderBy = useDbStore((s) => s.removeOrderBy)
  const columns = availableColumns(builder, schema)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-wide text-accent">ORDER BY</span>
        <button type="button" data-focusable onClick={addOrderBy} className="text-xs text-accent2 hover:underline">
          + add sort
        </button>
      </div>

      {builder.orderBy.length === 0 && <p className="text-xs text-muted">unsorted (natural row order)</p>}

      {builder.orderBy.map((o) => (
        <div key={o.id} className="flex flex-wrap items-center gap-1.5">
          <select
            value={o.column}
            onChange={(e) => updateOrderBy(o.id, { column: e.target.value })}
            data-focusable
            className="border border-border bg-panel-2 px-1.5 py-1 text-xs text-text"
          >
            <option value="" disabled>
              column…
            </option>
            {columns.map((col) => (
              <option key={col.value} value={col.value}>
                {col.label}
              </option>
            ))}
          </select>
          <select
            value={o.direction}
            onChange={(e) => updateOrderBy(o.id, { direction: e.target.value as 'ASC' | 'DESC' })}
            data-focusable
            className="border border-border bg-panel-2 px-1.5 py-1 text-xs text-accent"
          >
            <option value="ASC">ASC</option>
            <option value="DESC">DESC</option>
          </select>
          <button
            type="button"
            data-focusable
            onClick={() => removeOrderBy(o.id)}
            aria-label="remove sort"
            className="text-sm text-muted hover:text-accent"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
