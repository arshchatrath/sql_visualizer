import { useDbStore } from '../../../../state/store'
import { suggestJoinColumns } from '../../../../lib/query/join'
import type { TableSchema } from '../../../../lib/db/schema'

function columnOptionsFor(table: TableSchema) {
  return table.columns.map((c) => ({ value: `${table.name}.${c.name}`, label: `${table.name}.${c.name}` }))
}

export function JoinBlock() {
  const builder = useDbStore((s) => s.builder)
  const schema = useDbStore((s) => s.schema)
  const setJoinTable = useDbStore((s) => s.setJoinTable)
  const setJoinColumns = useDbStore((s) => s.setJoinColumns)

  const otherTables = schema.filter((t) => t.name !== builder.table)
  const primarySchema = schema.find((t) => t.name === builder.table)
  const joinedSchema = schema.find((t) => t.name === builder.join.table)

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

  const columnOptions = primarySchema && joinedSchema ? [...columnOptionsFor(primarySchema), ...columnOptionsFor(joinedSchema)] : []

  return (
    <div className="space-y-2" data-testid="join-block">
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

        {builder.join.table && columnOptions.length > 0 && (
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
              {columnOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
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
              {columnOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
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
