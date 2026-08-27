import type { Database } from 'sql.js'
import { runStatement, type ExecOutcome } from './engine'
import { quoteIdent } from './schema'

export interface RowChangeRow {
  /** SQLite's implicit rowid — stable identity for one physical row across the before/after snapshot. */
  rowid: number
  /** Column values before the statement ran. null for a freshly inserted row. */
  before: unknown[] | null
  /** Column values after the statement ran. null for a row that was deleted. */
  after: unknown[] | null
  /**
   * False for a row this statement never touched, carried along only so the
   * change can be seen in place. A deletion with nothing around it gives no
   * sense of *where* in the table it happened, so every mutation reports the
   * table as it now stands and marks which of those rows it actually hit.
   */
  affected: boolean
}

export interface RowChangeSet {
  table: string
  kind: 'insert' | 'update' | 'delete'
  columns: string[]
  rows: RowChangeRow[]
}

export interface MutationCaptureSpec {
  table: string
  mode: 'CREATE' | 'UPDATE' | 'DELETE'
  /** Exactly the WHERE clause the real statement uses (no leading "WHERE"), or '' for none. */
  whereSql: string
}

interface Snapshot {
  columns: string[]
  rows: { rowid: number; values: unknown[] }[]
}

// Untimed — deliberately not routed through runStatement, whose doc comment
// establishes it as the one true source of "real" elapsed time shown to the
// user. These snapshot reads are bookkeeping around that one timed call,
// not part of what a query actually cost.
function captureSnapshot(db: Database, table: string, whereSql: string): Snapshot {
  const sql = `SELECT rowid AS __rowid__, * FROM ${quoteIdent(table)}${whereSql ? ` WHERE ${whereSql}` : ''};`
  const result = db.exec(sql)
  if (result.length === 0) return { columns: [], rows: [] }
  const { columns, values } = result[0]
  const rowidIdx = columns.indexOf('__rowid__')
  return {
    columns: columns.filter((_, i) => i !== rowidIdx),
    rows: values
      .map((row) => ({
        rowid: Number(row[rowidIdx]),
        values: row.filter((_, i) => i !== rowidIdx),
      }))
      // Explicit, so a deleted row can be merged back into its original
      // position rather than relying on SQLite's scan order.
      .sort((a, b) => a.rowid - b.rowid),
  }
}

function getLastInsertRowid(db: Database): number | null {
  const result = db.exec('SELECT last_insert_rowid();')
  const value = result[0]?.values[0]?.[0]
  return typeof value === 'number' ? value : null
}

/**
 * Wraps the one real, timed statement execution with untimed row snapshots,
 * so the UI can animate exactly which rows a mutation touched and how — read
 * back from the live database, never fabricated. The rest of the table comes
 * back alongside them as context, so the change reads in place instead of in
 * isolation. `capture: null` (a SELECT, or a DATABASE-scope DDL statement)
 * skips all of this and behaves exactly like a plain runStatement call.
 */
export function runStatementWithRowCapture(
  db: Database,
  sql: string,
  capture: MutationCaptureSpec | null,
): { outcome: ExecOutcome; rowChanges: RowChangeSet | null } {
  // For UPDATE/DELETE the doomed rows have to be read while they still match
  // — afterwards they're either gone or already rewritten.
  let before: Snapshot | null = null
  if (capture && capture.mode !== 'CREATE') {
    before = captureSnapshot(db, capture.table, capture.whereSql)
  }

  const outcome = runStatement(db, sql)

  if (!capture || outcome.error) {
    return { outcome, rowChanges: null }
  }

  // One read of the table as it now stands. Whichever rows the statement hit
  // are picked out of this by rowid; the remainder ride along as context.
  const remaining = captureSnapshot(db, capture.table, '')
  const columns = remaining.columns.length > 0 ? remaining.columns : (before?.columns ?? [])

  if (capture.mode === 'CREATE') {
    const newRowid = getLastInsertRowid(db)
    if (newRowid == null) return { outcome, rowChanges: null }
    return {
      outcome,
      rowChanges: {
        table: capture.table,
        kind: 'insert',
        columns,
        rows: remaining.rows.map((r) => ({
          rowid: r.rowid,
          before: null,
          after: r.values,
          affected: r.rowid === newRowid,
        })),
      },
    }
  }

  if (capture.mode === 'DELETE') {
    // The deleted rows no longer exist in `remaining`, so they're merged back
    // in at their original rowid — they animate out from where they sat.
    const doomed: RowChangeRow[] = (before?.rows ?? []).map((r) => ({
      rowid: r.rowid,
      before: r.values,
      after: null,
      affected: true,
    }))
    const survivors: RowChangeRow[] = remaining.rows.map((r) => ({
      rowid: r.rowid,
      before: r.values,
      after: r.values,
      affected: false,
    }))
    return {
      outcome,
      rowChanges: {
        table: capture.table,
        kind: 'delete',
        columns,
        rows: [...doomed, ...survivors].sort((a, b) => a.rowid - b.rowid),
      },
    }
  }

  // UPDATE — the touched rowids are known from the before-snapshot, so the
  // post-statement read supplies both their new values and their neighbours.
  const targetIds = new Set((before?.rows ?? []).map((r) => r.rowid))
  const beforeById = new Map((before?.rows ?? []).map((r) => [r.rowid, r.values]))
  return {
    outcome,
    rowChanges: {
      table: capture.table,
      kind: 'update',
      columns,
      rows: remaining.rows.map((r) => ({
        rowid: r.rowid,
        // An untouched row's "before" is simply what it still holds.
        before: beforeById.get(r.rowid) ?? r.values,
        after: r.values,
        affected: targetIds.has(r.rowid),
      })),
    },
  }
}
