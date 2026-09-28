import { useDbStore } from '../../../../state/store'
import { ALTER_ACTIONS, SQL_COLUMN_TYPES, type SqlColumnType } from '../../../../lib/query/types'

export function AlterTableDdlBlock() {
  const builder = useDbStore((s) => s.builder)
  const schema = useDbStore((s) => s.schema)
  const setAlterAction = useDbStore((s) => s.setAlterAction)
  const setAlterAddColumn = useDbStore((s) => s.setAlterAddColumn)
  const setAlterRenameColumn = useDbStore((s) => s.setAlterRenameColumn)

  const table = schema.find((t) => t.name === builder.table)
  if (!table) return null

  const { alterAction, alterAddColumn, alterRenameColumn } = builder

  return (
    <div className="space-y-3">
      <span className="text-xs tracking-wide text-accent">ALTER TABLE {table.name}</span>

      <div className="flex gap-1 text-xs">
        {ALTER_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => setAlterAction(action)}
            data-focusable
            aria-pressed={alterAction === action}
            className={`border px-2 py-1 tracking-wide transition-colors ${
              alterAction === action ? 'border-accent2 bg-accent2 text-bg' : 'border-border text-muted hover:text-text'
            }`}
          >
            {action}
          </button>
        ))}
      </div>

      {alterAction === 'ADD COLUMN' ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            value={alterAddColumn.name}
            onChange={(e) => setAlterAddColumn({ ...alterAddColumn, name: e.target.value })}
            placeholder="new column name"
            data-focusable
            className="w-36 border border-border bg-panel-2 px-1.5 py-1 text-xs text-text placeholder:text-muted/60"
          />
          <select
            value={alterAddColumn.type}
            onChange={(e) => setAlterAddColumn({ ...alterAddColumn, type: e.target.value as SqlColumnType })}
            data-focusable
            className="border border-border bg-panel-2 px-1.5 py-1 text-xs text-accent2"
          >
            {SQL_COLUMN_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={alterRenameColumn.from}
            onChange={(e) => setAlterRenameColumn({ ...alterRenameColumn, from: e.target.value })}
            data-focusable
            className="border border-border bg-panel-2 px-1.5 py-1 text-xs text-text"
          >
            <option value="">column…</option>
            {table.columns.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted">→</span>
          <input
            value={alterRenameColumn.to}
            onChange={(e) => setAlterRenameColumn({ ...alterRenameColumn, to: e.target.value })}
            placeholder="new name"
            data-focusable
            className="w-32 border border-border bg-panel-2 px-1.5 py-1 text-xs text-text placeholder:text-muted/60"
          />
        </div>
      )}
    </div>
  )
}
