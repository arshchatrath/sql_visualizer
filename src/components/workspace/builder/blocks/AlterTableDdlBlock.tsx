import { useDbStore } from '../../../../state/store'
import type { AlterAction, SqlColumnType } from '../../../../lib/query/types'

const COLUMN_TYPES: SqlColumnType[] = ['INTEGER', 'TEXT', 'REAL']

export function AlterTableDdlBlock() {
  const builder = useDbStore((s) => s.builder)
  const schema = useDbStore((s) => s.schema)
  const setAlterAction = useDbStore((s) => s.setAlterAction)
  const setAlterAddColumn = useDbStore((s) => s.setAlterAddColumn)
  const setAlterRenameColumn = useDbStore((s) => s.setAlterRenameColumn)

  const table = schema.find((t) => t.name === builder.table)
  if (!table) return null

  return (
    <div className="space-y-3" data-testid="alter-table-ddl-block">
      <span className="text-xs tracking-wide text-accent">ALTER TABLE {builder.table}</span>

      <div className="flex gap-1 text-xs">
        {(['add-column', 'rename-column'] as AlterAction[]).map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => setAlterAction(action)}
            data-focusable
            aria-pressed={builder.alterAction === action}
            className={`border px-2 py-1 tracking-wide transition-colors ${
              builder.alterAction === action
                ? 'border-accent2 bg-accent2 text-bg'
                : 'border-border text-muted hover:text-text'
            }`}
          >
            {action === 'add-column' ? 'ADD COLUMN' : 'RENAME COLUMN'}
          </button>
        ))}
      </div>

      {builder.alterAction === 'add-column' ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            value={builder.alterAddColumn.name}
            onChange={(e) => setAlterAddColumn({ ...builder.alterAddColumn, name: e.target.value })}
            placeholder="new column name"
            data-focusable
            className="w-36 border border-border bg-panel-2 px-1.5 py-1 text-xs text-text placeholder:text-muted/60"
          />
          <select
            value={builder.alterAddColumn.type}
            onChange={(e) =>
              setAlterAddColumn({ ...builder.alterAddColumn, type: e.target.value as SqlColumnType })
            }
            data-focusable
            className="border border-border bg-panel-2 px-1.5 py-1 text-xs text-accent2"
          >
            {COLUMN_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={builder.alterRenameColumn.from}
            onChange={(e) => setAlterRenameColumn({ ...builder.alterRenameColumn, from: e.target.value })}
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
            value={builder.alterRenameColumn.to}
            onChange={(e) => setAlterRenameColumn({ ...builder.alterRenameColumn, to: e.target.value })}
            placeholder="new name"
            data-focusable
            className="w-32 border border-border bg-panel-2 px-1.5 py-1 text-xs text-text placeholder:text-muted/60"
          />
        </div>
      )}
    </div>
  )
}
