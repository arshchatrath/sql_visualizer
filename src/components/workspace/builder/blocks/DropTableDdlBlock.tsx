import { useDbStore } from '../../../../state/store'

export function DropTableDdlBlock() {
  const builder = useDbStore((s) => s.builder)
  const setDropConfirmed = useDbStore((s) => s.setDropConfirmed)

  return (
    <div className="space-y-2" data-testid="drop-table-ddl-block">
      <span className="text-xs tracking-wide text-accent">DROP TABLE</span>
      <p className="text-xs text-muted">
        this permanently deletes <span className="text-text">{builder.table}</span> and all of its rows for the
        rest of this session.
      </p>
      <label className="flex items-center gap-2 text-xs text-accent2">
        <input
          type="checkbox"
          checked={builder.dropConfirmed}
          onChange={(e) => setDropConfirmed(e.target.checked)}
          data-focusable
          data-testid="drop-confirm-checkbox"
        />
        yes, drop {builder.table}
      </label>
    </div>
  )
}
