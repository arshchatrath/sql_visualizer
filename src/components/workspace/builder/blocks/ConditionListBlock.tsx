import type { ColumnOption } from '../../../../lib/query/columns'
import type { ComparisonOperator, Condition } from '../../../../lib/query/types'

const OPERATORS: ComparisonOperator[] = ['=', '!=', '>', '>=', '<', '<=', 'LIKE']

interface ConditionListBlockProps {
  label: string
  emptyHint: string
  /** 'warn' flags the empty state as something to notice (e.g. an UPDATE/DELETE with no filter) rather than a routine default. */
  emptyHintTone?: 'muted' | 'warn'
  conditions: Condition[]
  columns: ColumnOption[]
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<Condition>) => void
  onRemove: (id: string) => void
}

export function ConditionListBlock({
  label,
  emptyHint,
  emptyHintTone = 'muted',
  conditions,
  columns,
  onAdd,
  onUpdate,
  onRemove,
}: ConditionListBlockProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-wide text-accent">{label}</span>
        <button type="button" data-focusable onClick={onAdd} className="text-xs text-accent2 hover:underline">
          + add condition
        </button>
      </div>

      {conditions.length === 0 && (
        <p className={`text-xs ${emptyHintTone === 'warn' ? 'text-accent' : 'text-muted'}`}>
          {emptyHintTone === 'warn' && '⚠ '}
          {emptyHint}
        </p>
      )}

      {conditions.map((c, i) => (
        <div key={c.id} className="flex flex-wrap items-center gap-1.5">
          {i > 0 ? (
            <select
              value={c.connector}
              onChange={(e) => onUpdate(c.id, { connector: e.target.value as Condition['connector'] })}
              data-focusable
              className="border border-border bg-panel-2 px-1.5 py-1 text-xs text-muted"
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
          ) : (
            <span className="w-[3.25rem] shrink-0" />
          )}
          <select
            value={c.column}
            onChange={(e) => onUpdate(c.id, { column: e.target.value })}
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
            value={c.operator}
            onChange={(e) => onUpdate(c.id, { operator: e.target.value as ComparisonOperator })}
            data-focusable
            className="border border-border bg-panel-2 px-1.5 py-1 text-xs text-accent"
          >
            {OPERATORS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
          <input
            value={c.value}
            onChange={(e) => onUpdate(c.id, { value: e.target.value })}
            placeholder="value"
            data-focusable
            className="w-24 border border-border bg-panel-2 px-1.5 py-1 text-xs text-text placeholder:text-muted/60"
          />
          <button
            type="button"
            data-focusable
            onClick={() => onRemove(c.id)}
            aria-label="remove condition"
            className="text-sm text-muted hover:text-accent"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
