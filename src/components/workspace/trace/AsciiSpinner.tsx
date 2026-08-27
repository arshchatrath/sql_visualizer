import { useEffect, useState } from 'react'

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

/** A small terminal-style progress indicator for whichever stage is currently revealing. */
export function AsciiSpinner() {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return
    const id = window.setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 80)
    return () => window.clearInterval(id)
  }, [])

  return (
    <span aria-hidden="true" className="ml-1 text-accent2">
      {FRAMES[frame]}
    </span>
  )
}
