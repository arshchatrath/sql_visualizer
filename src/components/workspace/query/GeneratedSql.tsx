import { useEffect, useRef, useState } from 'react'
import { useDbStore } from '../../../state/store'
import { tokenizeSql } from '../../../lib/query/highlight'

type SqlStatus = 'modified' | 'rebuilding' | 'ready'

const STATUS_LABEL: Record<SqlStatus, string> = {
  modified: 'modified',
  rebuilding: 'rebuilding…',
  ready: 'ready',
}

const STATUS_CLASS: Record<SqlStatus, string> = {
  modified: 'text-accent',
  rebuilding: 'text-muted',
  ready: 'text-accent2',
}

/**
 * The generated SQL, kept accurate at all times — only the status badge
 * runs a short cosmetic modified → rebuilding → ready beat on change.
 */
export function GeneratedSql() {
  const sql = useDbStore((s) => s.generatedSql)
  const [status, setStatus] = useState<SqlStatus>('ready')
  const prevSql = useRef(sql)

  useEffect(() => {
    if (sql === prevSql.current) return
    prevSql.current = sql
    setStatus('modified')
    const toRebuilding = window.setTimeout(() => setStatus('rebuilding'), 140)
    const toReady = window.setTimeout(() => setStatus('ready'), 340)
    return () => {
      window.clearTimeout(toRebuilding)
      window.clearTimeout(toReady)
    }
  }, [sql])

  const tokens = tokenizeSql(sql)

  return (
    <div className="flex h-full flex-col gap-2" data-testid="generated-sql">
      <div className="flex items-center justify-between text-xs">
        <span className="tracking-wide text-muted">generated query</span>
        <span data-testid="sql-status" className={STATUS_CLASS[status]}>
          {STATUS_LABEL[status]}
        </span>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto text-xs leading-relaxed whitespace-pre-wrap">
        {sql ? (
          tokens.map((t, i) => (
            <span key={i} className={t.keyword ? 'text-accent' : 'text-text'}>
              {t.text}
            </span>
          ))
        ) : (
          <span className="text-muted">-- build a query above</span>
        )}
      </pre>
    </div>
  )
}
