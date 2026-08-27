import { useDbStore } from '../../../state/store'
import type { Scope } from '../../../lib/query/types'

const SCOPES: Scope[] = ['TABLE', 'DATABASE']

export function ScopeToggle() {
  const scope = useDbStore((s) => s.builder.scope)
  const setScope = useDbStore((s) => s.setScope)

  // Every mode has a DATABASE-scope meaning: READ -> JOIN across tables,
  // CREATE/UPDATE/DELETE -> schema DDL (create/alter/drop a table). So the
  // toggle is always enabled — availableBlocks (lib/query/blocks.ts) is
  // what actually decides which blocks render for the combination.
  return (
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="scope">
      {SCOPES.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={scope === s}
          data-focusable
          onClick={() => setScope(s)}
          className={`border px-3 py-1.5 text-xs tracking-wide transition-colors ${
            scope === s
              ? 'border-accent2 bg-accent2 text-bg'
              : 'border-border text-muted hover:border-accent-dim hover:text-text'
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
