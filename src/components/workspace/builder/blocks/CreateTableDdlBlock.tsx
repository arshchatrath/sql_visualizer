import { useDbStore } from '../../../../state/store'
import type { SqlColumnType } from '../../../../lib/query/types'

const COLUMN_TYPES: SqlColumnType[] = ['INTEGER', 'TEXT', 'REAL']

export function CreateTableDdlBlock() {
  const builder = useDbStore((s) => s.builder)
  const setNewTableName = useDbStore((s) => s.setNewTableName)
  const addNewTableColumn = useDbStore((s) => s.addNewTableColumn)
  const updateNewTableColumn = useDbStore((s) => s.updateNewTableColumn)
  const removeNewTableColumn = useDbStore((s) => s.removeNewTableColumn)

  return (
    <div className="space-y-3" data-testid="create-table-ddl-block">
      <span className="text-xs tracking-wide text-accent">CREATE TABLE</span>

      <label className="flex flex-col gap-1 text-xs text-muted">
        <span>table name</span>
        <input
          value={builder.newTableName}
          onChange={(e) => setNewTableName(e.target.value)}
          placeholder="e.g. suppliers"
          data-focusable
          className="border border-border bg-panel-2 px-1.5 py-1 text-xs text-text placeholder:text-muted/60"
        />
      </label>

      <div className="space-y-2">
        {builder.newTableColumns.length === 0 && (
          <p className="text-xs text-muted">no columns yet — add at least one</p>
        )}
        {builder.newTableColumns.map((col) => (
          <div key={col.id} className="flex flex-wrap items-center gap-1.5">
            <input
              value={col.name}
              onChange={(e) => updateNewTableColumn(col.id, { name: e.target.value })}
              placeholder="column name"
              data-focusable
              className="w-32 border border-border bg-panel-2 px-1.5 py-1 text-xs text-text placeholder:text-muted/60"
            />
            <select
              value={col.type}
              onChange={(e) => updateNewTableColumn(col.id, { type: e.target.value as SqlColumnType })}
              data-focusable
              className="border border-border bg-panel-2 px-1.5 py-1 text-xs text-accent2"
            >
              {COLUMN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs text-muted">
              <input
                type="checkbox"
                checked={col.primaryKey}
                onChange={(e) => updateNewTableColumn(col.id, { primaryKey: e.target.checked })}
                data-focusable
              />
              PK
            </label>
            <label className="flex items-center gap-1 text-xs text-muted">
              <input
                type="checkbox"
                checked={col.notNull}
                disabled={col.primaryKey}
                onChange={(e) => updateNewTableColumn(col.id, { notNull: e.target.checked })}
                data-focusable
              />
              NOT NULL
            </label>
            <button
              type="button"
              onClick={() => removeNewTableColumn(col.id)}
              data-focusable
              className="text-xs text-muted hover:text-accent"
              aria-label={`remove column ${col.name || '(unnamed)'}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addNewTableColumn}
        data-focusable
        className="border border-border px-2 py-1 text-xs text-accent2 hover:bg-accent2 hover:text-bg"
      >
        + add column
      </button>
    </div>
  )
}
