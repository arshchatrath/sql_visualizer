import { useDbStore } from '../../../state/store'
import type { CrudMode } from '../../../lib/query/types'

const MODES: CrudMode[] = ['CREATE', 'READ', 'UPDATE', 'DELETE']

export function ModeToggle() {
  const mode = useDbStore((s) => s.builder.mode)
  const setMode = useDbStore((s) => s.setMode)

  return (
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="CRUD mode">
      {MODES.map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          data-focusable
          onClick={() => setMode(m)}
          className={`border px-3 py-1.5 text-xs tracking-wide transition-colors ${
            mode === m
              ? 'border-accent bg-accent text-bg'
              : 'border-border text-muted hover:border-accent-dim hover:text-text'
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  )
}
