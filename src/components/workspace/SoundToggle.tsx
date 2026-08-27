import { useEffect, useState } from 'react'
import { isMuted, subscribeMuted, toggleMuted } from '../../lib/sound/muteState'

/** Small mute toggle for the row-execution sound effects, lives in the exec_log panel header. */
export function SoundToggle() {
  const [muted, setMutedState] = useState(isMuted)

  useEffect(() => subscribeMuted(setMutedState), [])

  return (
    <button
      type="button"
      data-focusable
      onClick={() => toggleMuted()}
      aria-pressed={!muted}
      aria-label={muted ? 'unmute sound effects' : 'mute sound effects'}
      title={muted ? 'sound off' : 'sound on'}
      className="text-xs text-muted transition-colors hover:text-accent2"
    >
      {muted ? '♪ off' : '♪ on'}
    </button>
  )
}
