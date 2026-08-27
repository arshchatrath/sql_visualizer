export interface BootLine {
  text: string
  tone?: 'ok'
}

// Atmospheric boot copy for the landing screen only — not a claim about the
// live database, which doesn't exist yet at this point in the flow. The
// execution trace shown once inside the workspace is driven entirely by
// real EXPLAIN QUERY PLAN output (see lib/db/explainPlan.ts), never by
// scripted lines like these.
export const BOOT_LINES: BootLine[] = [
  { text: 'booting datapulse ...' },
  { text: 'loading query engine (sql.js / wasm) ...' },
  { text: 'engine ready', tone: 'ok' },
  { text: 'workspace ready', tone: 'ok' },
]
