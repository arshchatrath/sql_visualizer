import { useState } from 'react'
import { isMuted, setMuted } from '../../lib/sound/muteState'

/** Small mute toggle for the row-execution sound effects, lives in the exec_log panel header. */
export function SoundToggle() {
  const [muted, setMutedState] = useState(isMuted)

  const toggle = () => {
    setMuted(!muted)
    setMutedState(!muted)
  }

  return (
    <button
      type="button"
      data-focusable
      onClick={toggle}
      aria-pressed={!muted}
      aria-label={muted ? 'unmute sound effects' : 'mute sound effects'}
      title={muted ? 'sound off' : 'sound on'}
      className="text-xs text-muted transition-colors hover:text-accent2"
    >
      {muted ? '♪ off' : '♪ on'}
    </button>
  )
}
