import { useEffect, useState } from 'react'
import { useDbStore } from '../../../state/store'
import { loadSfx } from '../../../lib/sound/loadSfx'

export function ExecuteButton() {
  const sql = useDbStore((s) => s.generatedSql)
  const mode = useDbStore((s) => s.builder.mode)
  const scope = useDbStore((s) => s.builder.scope)
  const dropConfirmed = useDbStore((s) => s.builder.dropConfirmed)
  const execute = useDbStore((s) => s.execute)

  const isDropTable = scope === 'DATABASE' && mode === 'DELETE'
  const blocked = !sql || (isDropTable && !dropConfirmed)

  // Read the real platform rather than showing every user both spellings.
  const [shortcutLabel, setShortcutLabel] = useState('ctrl+')
  useEffect(() => {
    if (/mac|iphone|ipad/i.test(navigator.userAgent)) setShortcutLabel('⌘')
  }, [])

  const handleClick = () => {
    // Kick off the (code-split) audio engine's load + AudioContext start
    // right inside this click — browsers only allow starting audio from a
    // real user gesture — without making the query itself wait on it.
    void loadSfx().then((sfx) => sfx.ensureAudioStarted())
    execute()
  }

  // Ctrl/Cmd+Enter runs the query from anywhere, including from inside a
  // value input — the usual "I've finished typing, go" chord in a SQL tool,
  // so nobody has to reach for the mouse between edits.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return
      if (blocked) return
      e.preventDefault()
      handleClick()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked, execute])

  return (
    <div className="flex items-center gap-3 self-start">
      <button
        type="button"
        data-focusable
        disabled={blocked}
        onClick={handleClick}
        className="border border-accent-dim px-5 py-2.5 text-xs tracking-wide text-accent2 transition-colors hover:bg-accent2 hover:text-bg disabled:pointer-events-none disabled:opacity-40"
      >
        ▶ EXECUTE
      </button>
      <span className="text-[10px] text-muted" data-testid="execute-hint">
        {shortcutLabel}⏎
      </span>
    </div>
  )
}
