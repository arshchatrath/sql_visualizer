import type { ReactNode } from 'react'

interface PanelProps {
  title: string
  tag?: string
  right?: ReactNode
  children: ReactNode
}

export function Panel({ title, tag, right, children }: PanelProps) {
  return (
    <div className="flex min-h-0 flex-col border border-border">
      <div className="flex flex-none items-center justify-between border-b border-border px-4 py-2.5 text-xs tracking-wide text-muted">
        <span>
          {title} {tag && <span className="text-accent2">{tag}</span>}
        </span>
        {right}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
    </div>
  )
}
