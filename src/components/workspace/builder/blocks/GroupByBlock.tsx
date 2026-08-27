import { useDbStore } from '../../../../state/store'
import { availableColumns } from '../../../../lib/query/columns'
import type { AggregateFn } from '../../../../lib/query/types'

const AGG_FUNCTIONS: AggregateFn[] = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']

export function GroupByBlock() {
  const builder = useDbStore((s) => s.builder)
  const schema = useDbStore((s) => s.schema)
  const toggleGroupByColumn = useDbStore((s) => s.toggleGroupByColumn)
  const setGroupByAggregate = useDbStore((s) => s.setGroupByAggregate)
  const columns = availableColumns(builder, schema)

  return (
    <div className="space-y-2">
      <span className="text-xs tracking-wide text-accent">GROUP BY</span>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {columns.map((col) => (
          <label key={col.value} className="flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={builder.groupBy.includes(col.value)}
              onChange={() => toggleGroupByColumn(col.value)}
              data-focusable
              className="accent-accent2"
            />
            {col.label}
          </label>
        ))}
      </div>

      {builder.groupBy.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-muted">aggregate</span>
          <select
            value={builder.groupByAggregate?.fn ?? ''}
            onChange={(e) => {
              const fn = e.target.value as AggregateFn | ''
              if (!fn) {
                setGroupByAggregate(null)
                return
              }
              // Only COUNT(*) is valid SQL — SUM/AVG/MIN/MAX always need a
              // real column, so switching to one of those drops a '*'
              // selection back to an actual column instead of offering it.
              const current = builder.groupByAggregate?.column
              const keepCurrent = current && (fn === 'COUNT' || current !== '*')
              const column = keepCurrent ? current! : fn === 'COUNT' ? '*' : (columns[0]?.value ?? '')
              setGroupByAggregate({ fn, column })
            }}
            data-focusable
            className="border border-border bg-panel-2 px-1.5 py-1 text-xs text-text"
          >
            <option value="">none</option>
            {AGG_FUNCTIONS.map((fn) => (
              <option key={fn} value={fn}>
                {fn}
              </option>
            ))}
          </select>
          {builder.groupByAggregate && (
            <select
              value={builder.groupByAggregate.column}
              onChange={(e) => setGroupByAggregate({ fn: builder.groupByAggregate!.fn, column: e.target.value })}
              data-focusable
              className="border border-border bg-panel-2 px-1.5 py-1 text-xs text-text"
            >
              {builder.groupByAggregate.fn === 'COUNT' && <option value="*">* (all rows)</option>}
              {columns.map((col) => (
                <option key={col.value} value={col.value}>
                  {col.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  )
}
