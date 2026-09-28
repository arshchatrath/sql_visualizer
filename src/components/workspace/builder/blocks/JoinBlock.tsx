import { useDbStore } from '../../../../state/store'
import { availableColumns } from '../../../../lib/query/columns'
import { suggestJoinColumns } from '../../../../lib/query/join'

export function JoinBlock() {
  const builder = useDbStore((s) => s.builder)
  const schema = useDbStore((s) => s.schema)
  const setJoinTable = useDbStore((s) => s.setJoinTable)
  const setJoinColumns = useDbStore((s) => s.setJoinColumns)

  const otherTables = schema.filter((t) => t.name !== builder.table)
  const columns = availableColumns(builder, schema)

  function handlePickTable(tableName: string) {
    if (!tableName) {
      setJoinTable(null)
      return
    }
    setJoinTable(tableName)
    if (builder.table) {
      const suggestion = suggestJoinColumns(builder.table, tableName, schema)
      if (suggestion) setJoinColumns(suggestion.left, suggestion.right)
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-xs tracking-wide text-accent">JOIN</span>
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={builder.join.table ?? ''}
          onChange={(e) => handlePickTable(e.target.value)}
          data-focusable
          className="border border-border bg-panel-2 px-1.5 py-1 text-xs text-text"
        >
          <option value="">select a table…</option>
          {otherTables.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>

        {builder.join.table && (
          <>
            <span className="text-xs text-muted">ON</span>
            <select
              value={builder.join.leftColumn ?? ''}
              onChange={(e) => setJoinColumns(e.target.value, builder.join.rightColumn ?? '')}
              data-focusable
              className="border border-border bg-panel-2 px-1.5 py-1 text-xs text-accent2"
            >
              <option value="" disabled>
                column…
              </option>
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">=</span>
            <select
              value={builder.join.rightColumn ?? ''}
              onChange={(e) => setJoinColumns(builder.join.leftColumn ?? '', e.target.value)}
              data-focusable
              className="border border-border bg-panel-2 px-1.5 py-1 text-xs text-accent2"
            >
              <option value="" disabled>
                column…
              </option>
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {!builder.join.table && (
        <p className="text-xs text-muted">pick a second table to join against {builder.table}</p>
      )}
    </div>
  )
}
